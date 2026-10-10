import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .logging_config import configure_logging
from .routes import router


def create_app():
    settings = Settings.from_environment()
    logger = configure_logging(settings.log_level)
    app = FastAPI(title="JARVIS", version="0.1.0")
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
