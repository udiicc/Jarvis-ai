from dataclasses import dataclass, field
from pathlib import Path
import os

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
        return cls(origins, level, os.getenv("OPENAI_API_KEY", "").strip(),
                   os.getenv("OPENAI_MODEL", defaults.model).strip() or defaults.model,
                   os.getenv("JARVIS_SYSTEM_INSTRUCTION", defaults.instruction), timeout, tokens, limit)
