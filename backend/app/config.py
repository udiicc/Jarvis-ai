from dataclasses import dataclass, field
from pathlib import Path
import os
from urllib.parse import urlsplit

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    allowed_origins: tuple[str, ...]
    log_level: str
    api_key: str = field(default="", repr=False)
    model: str = "gpt-4.1-mini"
    instruction: str = "You are JARVIS, a helpful personal AI assistant. Be natural, concise, and honest. You have no access to files, messaging, calendars, tools, or computer controls. Never claim to have executed actions."
    timeout: float = 25
    max_output_tokens: int = 800
    requests_per_minute: int = 10

    provider: str = "auto"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "qwen3:4b"
    ollama_timeout: float = 120

    @classmethod
    def from_environment(cls):
        # Only the backend's explicit local file; exported variables take precedence.
        load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)
        level = os.getenv("JARVIS_LOG_LEVEL", "INFO").upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("Invalid JARVIS_LOG_LEVEL")
        origins = tuple(origin.strip() for origin in os.getenv(
            "JARVIS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if origin.strip())
        defaults = cls(origins, level)
        timeout = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "25"))
        tokens = int(os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "800"))
        limit = int(os.getenv("JARVIS_REQUESTS_PER_MINUTE", "10"))
        if not 1 <= timeout <= 45 or not 32 <= tokens <= 4096 or not 1 <= limit <= 60:
            raise ValueError("AI timeout, output token, or request limit is outside the supported range")
        provider = os.getenv("AI_PROVIDER", "auto").strip().lower()
        if provider not in {"auto", "mock", "openai", "ollama"}:
            raise ValueError("AI_PROVIDER must be auto, mock, openai, or ollama")
        local_url = os.getenv("OLLAMA_BASE_URL", defaults.ollama_base_url).rstrip("/")
        url = urlsplit(local_url)
        if (url.scheme != "http" or url.hostname not in {"127.0.0.1", "::1"}
                or url.username or url.password or url.path or url.query or url.fragment):
            raise ValueError("OLLAMA_BASE_URL must be an HTTP loopback URL without credentials or a path")
        local_model = os.getenv("OLLAMA_MODEL", defaults.ollama_model).strip()
        if not local_model or "cloud" in local_model.lower():
            raise ValueError("OLLAMA_MODEL must name a local model, not a cloud model")
        local_timeout = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120"))
        if not 10 <= local_timeout <= 300:
            raise ValueError("OLLAMA_TIMEOUT_SECONDS must be between 10 and 300")
        return cls(origins, level, os.getenv("OPENAI_API_KEY", "").strip(),
                   os.getenv("OPENAI_MODEL", defaults.model).strip() or defaults.model,
                   os.getenv("JARVIS_SYSTEM_INSTRUCTION", defaults.instruction), timeout, tokens, limit,
                   provider, local_url, local_model, local_timeout)
