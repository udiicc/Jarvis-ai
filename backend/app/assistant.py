"""Server-side text-only provider; no tools, action execution, or stored conversations."""
import asyncio
from collections import deque
import time

import openai
from openai import AsyncOpenAI

from .config import Settings
from .ollama import OllamaProvider, OllamaError


class AssistantError(Exception):
    def __init__(self, code: str, status: int = 502):
        self.code = code
        self.status = status


ERROR_MESSAGES = {
    "missing_key": ("OpenAI is selected but no backend API key is configured.", "OpenAI je izabran, ali backend API ključ nije podešen."),
    "ollama_offline": ("Ollama is not running. Start the Ollama app on your Mac.", "Ollama nije pokrenut. Pokrenite Ollama aplikaciju na Mac-u."),
    "ollama_model": ("The configured Ollama model is not installed. Check OLLAMA_MODEL against ollama list.", "Podešeni Ollama model nije instaliran. Proverite OLLAMA_MODEL i ollama list."),
    "ollama_timeout": ("Local inference timed out. Close other heavy apps or increase OLLAMA_TIMEOUT_SECONDS.", "Lokalni AI zahtev je istekao. Zatvorite zahtevne aplikacije ili povećajte OLLAMA_TIMEOUT_SECONDS."),
    "ollama_network": ("The local Ollama connection failed. Check the Ollama app and loopback URL.", "Lokalna Ollama veza nije uspela. Proverite aplikaciju i lokalni URL."),
    "ollama_provider": ("Ollama could not complete the request. Check its version and model configuration.", "Ollama nije uspeo da obradi zahtev. Proverite verziju i model."),
    "ollama_thinking": ("Ollama returned no usable final answer. Update Ollama to a version supporting think:false.", "Ollama nije vratio konačan odgovor. Ažurirajte Ollama na verziju koja podržava think:false."),
    "ollama_remote": ("Cloud-backed Ollama models are disabled. Select an installed local model.", "Ollama cloud modeli su onemogućeni. Izaberite instalirani lokalni model."),
    "authentication": ("OpenAI authentication failed. Check the backend API key.", "OpenAI autentifikacija nije uspela. Proverite API ključ u backend konfiguraciji."),
    "timeout": ("The AI request timed out. Please try again.", "AI zahtev je istekao. Pokušajte ponovo."),
    "rate_limit": ("OpenAI rate or quota limit reached. Check your API billing and limits.", "Dostignut je OpenAI limit ili kvota. Proverite naplatu i limite API-ja."),
    "network": ("Could not reach OpenAI. Check the backend network connection.", "OpenAI nije dostupan. Proverite mrežnu vezu backend-a."),
    "provider": ("OpenAI could not complete the request. Check the model configuration or try again.", "OpenAI nije uspeo da obradi zahtev. Proverite model ili pokušajte ponovo."),
    "usage_limit": ("JARVIS request limit reached. Wait a minute before trying again.", "Dostignut je JARVIS limit zahteva. Sačekajte minut pre ponovnog pokušaja."),
    "busy": ("JARVIS is processing another request. Please wait.", "JARVIS obrađuje drugi zahtev. Sačekajte."),
}


class Assistant:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.selected = ("openai" if settings.api_key else "mock") if settings.provider == "auto" else settings.provider
        self.ollama = OllamaProvider(settings) if self.selected == "ollama" else None
        self.client = AsyncOpenAI(api_key=settings.api_key, timeout=settings.timeout,
                                  max_retries=0) if self.selected == "openai" and settings.api_key else None
        self.provider_state = "mock" if self.selected == "mock" else "configured"
        self.revision = 0
        self.error_code = None
        self.attempts = deque()
        self.busy = False

    @property
    def mode(self):
        return self.selected

    async def reply(self, message: str, language: str, history: list):
        if self.mode == "mock":
            if language == "sr":
                return "Primio sam vašu poruku. Trenutno sam u demo režimu. AI, glas, memorija i automatizacija još nisu povezani."
            return "Message received. I'm running in demo mode. AI, voice, memory, and automation are not connected yet."
        if self.mode == "openai" and self.client is None:
            self.provider_state = "error"
            self.error_code = "missing_key"
            raise AssistantError("missing_key", 503)
        # Single-flight and process-wide budget; no automatic billed retries.
        now = time.monotonic()
        while self.attempts and self.attempts[0] <= now - 60:
            self.attempts.popleft()
        if self.busy:
            raise AssistantError("busy", 429)
        if len(self.attempts) >= self.settings.requests_per_minute:
            raise AssistantError("usage_limit", 429)
        self.attempts.append(now)
        self.busy = True
        self.revision += 1
        self.provider_state = "processing"
        self.error_code = None
        try:
            # Bound history to 12 recent messages / 12,000 characters, excluding current input.
            context = []
            remaining = 12000
            for item in reversed(history[-12:]):
                if len(item.content) > remaining:
                    break
                context.insert(0, {"role": item.role, "content": item.content})
                remaining -= len(item.content)
            context.append({"role": "user", "content": message})
            preference = "Serbian" if language == "sr" else "English"
            instructions = self.settings.instruction + f"\nDefault language: {preference}. Respond naturally in the user's language, honoring explicit language requests."
            if self.ollama:
                try:
                    text = await asyncio.wait_for(self.ollama.reply(instructions, context), timeout=self.settings.ollama_timeout)
                except asyncio.TimeoutError:
                    raise AssistantError("ollama_timeout", 504) from None
                except OllamaError as error:
                    raise AssistantError(error.code, error.status) from None
                self.provider_state = "connected"
                return text
            response = await asyncio.wait_for(self.client.responses.create(
                model=self.settings.model,
                instructions=instructions,
                input=context, store=False, max_output_tokens=self.settings.max_output_tokens,
            ), timeout=self.settings.timeout)
            text = response.output_text.strip()
            if not text or response.status != "completed":
                raise AssistantError("provider")
            self.provider_state = "connected"
            return text
        except openai.AuthenticationError:
            raise AssistantError("authentication", 401) from None
        except (openai.APITimeoutError, asyncio.TimeoutError):
            raise AssistantError("timeout", 504) from None
        except openai.RateLimitError:
            raise AssistantError("rate_limit", 429) from None
        except openai.APIConnectionError:
            raise AssistantError("network", 503) from None
        except AssistantError:
            raise
        except Exception:
            # Never expose SDK exception strings, request bodies, or provider errors.
            raise AssistantError("provider") from None
        finally:
            self.busy = False
            if self.provider_state == "processing":
                self.provider_state = "error"

    async def refresh_provider(self):
        if not self.ollama or self.busy:
            return
        revision = self.revision
        try:
            await self.ollama.check_model()
            if not self.busy and revision == self.revision:
                # A tags check proves service/model availability, not successful inference.
                if self.provider_state == "error" and self.error_code not in {"ollama_offline", "ollama_model", "ollama_network"}:
                    return  # Tags availability cannot clear a failed inference.
                if self.provider_state != "connected":
                    self.provider_state = "ready"
                self.error_code = None
        except OllamaError as error:
            if not self.busy and revision == self.revision:
                self.provider_state = "error"
                self.error_code = error.code

    async def close(self):
        if self.ollama:
            await self.ollama.close()
        if self.client:
            await self.client.close()
