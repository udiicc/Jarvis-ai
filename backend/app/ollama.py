"""Loopback-only native Ollama client. No proxies, redirects, tools, or model pulls."""
import re

import httpx


class OllamaError(Exception):
    def __init__(self, code, status=502):
        self.code = code
        self.status = status


def final_answer(content):
    if not isinstance(content, str):
        raise OllamaError("ollama_provider")
    # Defensive compatibility with older templates: fail closed on unmatched tags.
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.S | re.I)
    if re.search(r"</?think\b", content, flags=re.I):
        raise OllamaError("ollama_thinking")
    content = content.strip()
    if not content:
        raise OllamaError("ollama_thinking")
    return content


class OllamaProvider:
    def __init__(self, settings):
        self.settings = settings
        self.client = httpx.AsyncClient(base_url=settings.ollama_base_url,
            timeout=httpx.Timeout(settings.ollama_timeout, connect=3),
            trust_env=False, follow_redirects=False)

    async def check_model(self):
        try:
            response = await self.client.get("/api/tags", timeout=3)
            response.raise_for_status()
            models = response.json()["models"]
            model = next((m for m in models if m.get("name") == self.settings.ollama_model
                          or m.get("model") == self.settings.ollama_model), None)
            if model is None:
                raise OllamaError("ollama_model", 404)
            if model.get("remote_host") or model.get("remote_model"):
                raise OllamaError("ollama_remote")
        except httpx.TimeoutException:
            raise OllamaError("ollama_timeout", 504) from None
        except httpx.ConnectError:
            raise OllamaError("ollama_offline", 503) from None
        except httpx.RequestError:
            raise OllamaError("ollama_network", 503) from None
        except OllamaError:
            raise
        except Exception:
            raise OllamaError("ollama_provider") from None

    async def reply(self, instructions, context):
        # Check locally installed model metadata before every inference; never pull or use cloud tags.
        await self.check_model()
        try:
            response = await self.client.post("/api/chat", json={
                "model": self.settings.ollama_model,
                "messages": [{"role": "system", "content": instructions}, *context],
                "stream": False, "think": False, "keep_alive": "2m",
                "options": {"num_ctx": 4096, "num_predict": 512},
            })
            if response.status_code == 404:
                raise OllamaError("ollama_model", 404)
            response.raise_for_status()
            data = response.json()
            if data.get("done") is not True or data.get("done_reason") == "length":
                raise OllamaError("ollama_provider")
            message = data["message"]
            if message.get("role") != "assistant" or message.get("tool_calls"):
                raise OllamaError("ollama_provider")
            # Never read or return message.thinking, raw error bodies, or usage metadata.
            return final_answer(message.get("content"))
        except httpx.TimeoutException:
            raise OllamaError("ollama_timeout", 504) from None
        except httpx.ConnectError:
            raise OllamaError("ollama_offline", 503) from None
        except httpx.RequestError:
            raise OllamaError("ollama_network", 503) from None
        except OllamaError:
            raise
        except Exception:
            raise OllamaError("ollama_provider") from None

    async def close(self):
        await self.client.aclose()
