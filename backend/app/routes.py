from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from .assistant import MockAssistant

router = APIRouter(prefix="/api")
assistant = MockAssistant()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    language: Literal["en", "sr"] = "en"

    @field_validator("message")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("Message must not be blank")
        return value.strip()


class ChatResponse(BaseModel):
    reply: str
    mode: Literal["mock"] = "mock"


@router.get("/health")
def health():
    return {"status": "ok", "service": "jarvis-backend", "version": "0.1.0"}


@router.get("/assistant/status")
def assistant_status():
    return {
        "status": "ready", "mode": "mock", "platform_target": "macOS",
        "languages": ["en", "sr"],
        "capabilities": {"chat": True, "voice": False, "memory": False, "automation": False},
    }


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    return ChatResponse(reply=assistant.reply(request.message, request.language))
