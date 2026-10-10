import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .assistant import Assistant
from .logging_config import configure_logging
from .routes import router


def create_app():
    settings = Settings.from_environment()
    logger = configure_logging(settings.log_level)
    # SDK HTTP debug logging can include sensitive content; suppress it regardless of app verbosity.
    for name in ("openai", "httpx", "httpx2", "httpcore", "httpcore2"):
        logging.getLogger(name).setLevel(logging.CRITICAL)

    @asynccontextmanager
    async def lifespan(app):
        try:
            yield
        finally:
            await app.state.assistant.close()

    app = FastAPI(title="JARVIS", version="0.1.0", lifespan=lifespan)
    app.state.assistant = Assistant(settings)
    app.add_middleware(
        CORSMiddleware, allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def log_request(request, call_next):
        started = time.monotonic()
        response = await call_next(request)
        # Do not log message bodies or credentials.
        logger.info("%s %s status=%s duration_ms=%.1f", request.method,
                    request.url.path, response.status_code, (time.monotonic() - started) * 1000)
        return response

    app.include_router(router)
    return app


app = create_app()
