from typing import Literal

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from .assistant import AssistantError, ERROR_MESSAGES

router = APIRouter(prefix="/api")


class ContextMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "sr"] = "en"
    history: list[ContextMessage] = Field(default_factory=list, max_length=12)

    @field_validator("message")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Message must not be blank")
        return value.strip()


class ChatResponse(BaseModel):
    reply: str
    mode: Literal["mock", "openai"] = "mock"


@router.get("/health")
def health():
    return {"status": "ok", "service": "jarvis-backend", "version": "0.1.0"}


@router.get("/assistant/status")
async def assistant_status(request: Request):
    assistant = request.app.state.assistant
    return {
        "status": "ready", "mode": assistant.mode, "platform_target": "macOS",
        "provider_state": assistant.provider_state, "provider_error": assistant.error_code,
        "languages": ["en", "sr"],
        "capabilities": {"chat": True, "voice": False, "memory": False, "automation": False},
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request):
    assistant = request.app.state.assistant
    try:
        reply = await assistant.reply(payload.message, payload.language, payload.history)
        return ChatResponse(reply=reply, mode=assistant.mode)
    except AssistantError as error:
        if error.code not in {"busy", "usage_limit"}:
            assistant.error_code = error.code
        return JSONResponse(status_code=error.status, content={
            "detail": ERROR_MESSAGES[error.code][payload.language == "sr"], "code": error.code,
        })
