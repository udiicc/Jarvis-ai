from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    allowed_origins: tuple[str, ...]
    log_level: str

    @classmethod
    def from_environment(cls):
        level = os.getenv("JARVIS_LOG_LEVEL", "INFO").upper()
        if level not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
            raise ValueError("Invalid JARVIS_LOG_LEVEL")
        origins = tuple(origin.strip() for origin in os.getenv(
            "JARVIS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",") if origin.strip())
        return cls(origins, level)
