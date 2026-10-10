import asyncio
import json
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app


@pytest.fixture
def local(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    # Even a configured OpenAI key must not initialize that provider.
    monkeypatch.setenv("OPENAI_API_KEY", "sk-dummy-unused")
    with patch("app.assistant.AsyncOpenAI", side_effect=AssertionError("OpenAI must not be used")):
        app = create_app()
    requests = []
    state = {"failure": None, "models": [{"name": "qwen3:4b"}], "content": "Zdravo Ana", "thinking": "PRIVATE THOUGHT", "done": True}
    def handler(request):
        requests.append(request)
        assert request.url.host == "127.0.0.1"
        if state["failure"]:
            if isinstance(state["failure"], Exception):
                raise state["failure"]
            return httpx.Response(state["failure"], json={"error": "private internal detail"})
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": state["models"]})
        assert request.url.path == "/api/chat"
        return httpx.Response(200, json={"done": state["done"], "message": {
            "role": "assistant", "content": state["content"], "thinking": state["thinking"]}})
    app.state.assistant.ollama.client = httpx.AsyncClient(base_url="http://127.0.0.1:11434", transport=httpx.MockTransport(handler), trust_env=False)
    with TestClient(app) as client:
        yield client, state, requests, app.state.assistant


@pytest.mark.parametrize("language, expected", [("sr", "Serbian"), ("en", "English")])
def test_local_chat_context_thinking_and_status(local, language, expected):
    client, state, requests, assistant = local
    status = client.get("/api/assistant/status").json()
    assert status["mode"] == "ollama" and status["model"] == "qwen3:4b"
    assert status["provider_state"] == "ready"  # Installed, not inference-verified.
    history = [{"role": "user", "content": "I am Ana"}, {"role": "assistant", "content": "Hello Ana"}]
    result = client.post("/api/chat", json={"message": "My name?", "language": language, "history": history})
    assert result.json() == {"reply": "Zdravo Ana", "mode": "ollama"}
    assert "PRIVATE THOUGHT" not in result.text
    payload = json.loads(requests[-1].content)
    assert expected in payload["messages"][0]["content"]
    assert payload["messages"][1:] == history + [{"role": "user", "content": "My name?"}]
    assert payload["model"] == "qwen3:4b" and payload["think"] is False and payload["stream"] is False
    assert payload["options"] == {"num_ctx": 4096, "num_predict": 512}
    assert "tools" not in payload and assistant.client is None
    assert client.get("/api/assistant/status").json()["provider_state"] == "connected"
    assert all(r.url.path in {"/api/tags", "/api/chat"} for r in requests)


@pytest.mark.parametrize("failure, code, status", [
    (httpx.ConnectError("private"), "ollama_offline", 503),
    (httpx.ReadTimeout("private"), "ollama_timeout", 504),
    (httpx.RemoteProtocolError("private"), "ollama_network", 503),
    (500, "ollama_provider", 502),
    (302, "ollama_provider", 502),
])
def test_errors_no_fallback(local, failure, code, status):
    client, state, _, _ = local
    state["failure"] = failure
    result = client.post("/api/chat", json={"message": "Hello", "language": "sr"})
    assert result.status_code == status and result.json()["code"] == code
    assert "private" not in result.text and "reply" not in result.json()
    assert client.get("/api/assistant/status").json()["provider_error"] == code
    state["failure"] = None
    assert client.post("/api/chat", json={"message": "Retry"}).status_code == 200


@pytest.mark.parametrize("models, code", [([], "ollama_model"), ([{"name": "qwen3:4b", "remote_host": "https://ollama.com"}], "ollama_remote")])
def test_missing_or_remote_model_never_inferred(local, models, code):
    client, state, requests, _ = local
    state["models"] = models
    assert client.post("/api/chat", json={"message": "Hello"}).json()["code"] == code
    assert all(r.url.path != "/api/chat" for r in requests)


@pytest.mark.parametrize("content, answer", [("<think>private reasoning</think> Final answer", "Final answer"), ("<think>unfinished", None), ("private</think>answer", None), ("", None)])
def test_legacy_think_tags_fail_closed(local, content, answer):
    client, state, _, _ = local
    state["content"] = content
    result = client.post("/api/chat", json={"message": "Hello"})
    assert "private" not in result.text
    if answer:
        assert result.json()["reply"] == answer
    else:
        assert result.json()["code"] == "ollama_thinking"


def test_no_key_needed(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    app = create_app()
    assert app.state.assistant.mode == "ollama" and app.state.assistant.client is None
    asyncio.run(app.state.assistant.close())


@pytest.mark.parametrize("name, value", [("OLLAMA_BASE_URL", "https://external.example"), ("OLLAMA_BASE_URL", "http://localhost:11434"), ("OLLAMA_BASE_URL", "http://127.0.0.1:11434/api"), ("OLLAMA_MODEL", "qwen3:cloud"), ("OLLAMA_TIMEOUT_SECONDS", "301"), ("AI_PROVIDER", "unknown")])
def test_configuration_restrictions(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValueError):
        Settings.from_environment()


def test_slow_request_deadline(local):
    from dataclasses import replace
    client, _, _, assistant = local
    assistant.settings = replace(assistant.settings, ollama_timeout=0.01)
    async def slow(*args):
        await asyncio.sleep(1)
    assistant.ollama.reply = slow
    assert client.post("/api/chat", json={"message": "Hello"}).json()["code"] == "ollama_timeout"
    assert assistant.busy is False
    assert client.get("/api/assistant/status").json()["provider_error"] == "ollama_timeout"


def test_explicit_openai_missing_key_no_mock(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    with TestClient(create_app()) as client:
        response = client.post("/api/chat", json={"message": "Hello"})
        assert response.status_code == 503 and response.json()["code"] == "missing_key"


def test_local_context_bounded_and_history_not_stored(local):
    client, _, requests, _ = local
    history = [{"role": "user", "content": "x" * 3000}] * 12
    assert client.post("/api/chat", json={"message": "Hello", "history": history}).status_code == 200
    context = json.loads(requests[-1].content)["messages"][1:-1]
    assert len(context) <= 12 and sum(len(m["content"]) for m in context) <= 12000
    assert client.post("/api/chat", json={"message": "New session"}).status_code == 200
    assert json.loads(requests[-1].content)["messages"][1:] == [{"role": "user", "content": "New session"}]
