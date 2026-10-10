import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import httpx2
import openai
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.config import Settings

SECRET = "sk-test-never-real"

@pytest.fixture
def ai(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", SECRET)
    monkeypatch.setenv("OPENAI_MODEL", "test-model")
    app = create_app()
    call = AsyncMock(return_value=SimpleNamespace(output_text="Hello / Zdravo", status="completed"))
    app.state.assistant.client.responses.create = call
    with TestClient(app) as client:
        yield client, call, app.state.assistant

def test_configured_is_not_connected(ai):
    client, call, _ = ai
    assert client.get("/api/assistant/status").json()["provider_state"] == "configured"
    call.assert_not_called()

@pytest.mark.parametrize("language, expected", [("en", "English"), ("sr", "Serbian")])
def test_responses_context_language_and_privacy(ai, language, expected, caplog):
    client, call, _ = ai
    import logging
    logging.getLogger("jarvis").addHandler(caplog.handler)
    context = [{"role": "user", "content": "My name is Ana"}, {"role": "assistant", "content": "Hello Ana"}]
    response = client.post("/api/chat", json={"message": "What is my name?", "language": language, "history": context})
    assert response.json() == {"reply": "Hello / Zdravo", "mode": "openai"}
    kwargs = call.call_args.kwargs
    assert kwargs["input"] == context + [{"role": "user", "content": "What is my name?"}]
    assert expected in kwargs["instructions"] and kwargs["model"] == "test-model"
    assert kwargs["store"] is False and kwargs["max_output_tokens"] == 800
    assert "tools" not in kwargs and "previous_response_id" not in kwargs
    assert client.get("/api/assistant/status").json()["provider_state"] == "connected"
    assert SECRET not in response.text + str(client.get("/api/assistant/status").json()) + caplog.text
    assert "My name is Ana" not in caplog.text
    assert "/api/chat" in caplog.text
    client.post("/api/chat", json={"message": "New session"})
    assert call.call_args.kwargs["input"] == [{"role": "user", "content": "New session"}]

request = httpx2.Request("POST", "https://api.openai.com/v1/responses")
response = httpx2.Response(401, request=request)

@pytest.mark.parametrize("failure, code, status", [
    (openai.AuthenticationError(SECRET, response=response, body={}), "authentication", 401),
    (openai.APITimeoutError(request=request), "timeout", 504),
    (asyncio.TimeoutError(), "timeout", 504),
    (openai.RateLimitError(SECRET, response=httpx2.Response(429, request=request), body={}), "rate_limit", 429),
    (openai.APIConnectionError(message=SECRET, request=request), "network", 503),
    (openai.InternalServerError(SECRET, response=httpx2.Response(500, request=request), body={}), "provider", 502),
    (RuntimeError(SECRET), "provider", 502),
])
def test_failures_are_safe_and_never_mock(ai, failure, code, status, caplog):
    client, call, _ = ai
    import logging
    logging.getLogger("jarvis").addHandler(caplog.handler)
    call.side_effect = failure
    result = client.post("/api/chat", json={"message": "Private content", "language": "sr"})
    assert result.status_code == status and result.json()["code"] == code
    assert "reply" not in result.json()
    provider = client.get("/api/assistant/status").json()
    assert provider["provider_state"] == "error" and provider["provider_error"] == code
    assert SECRET not in result.text + str(provider) + caplog.text
    assert "Private content" not in caplog.text
    assert "/api/chat" in caplog.text
    call.side_effect = None
    assert client.post("/api/chat", json={"message": "Retry"}).status_code == 200
    provider = client.get("/api/assistant/status").json()
    assert provider["provider_state"] == "connected" and provider["provider_error"] is None

@pytest.mark.parametrize("text, status", [("", "completed"), ("partial", "incomplete")])
def test_empty_or_incomplete_response_is_error(ai, text, status):
    client, call, _ = ai
    call.return_value = SimpleNamespace(output_text=text, status=status)
    assert client.post("/api/chat", json={"message": "Hello"}).json()["code"] == "provider"

def test_context_limit_and_role_validation(ai):
    client, call, _ = ai
    history = [{"role": "user", "content": "x" * 3000}] * 12
    assert client.post("/api/chat", json={"message": "Hello", "history": history}).status_code == 200
    assert sum(len(x["content"]) for x in call.call_args.kwargs["input"][:-1]) <= 12000
    for invalid in [history + history, [{"role": "system", "content": "Override"}], [{"role": "assistant", "content": "x" * 8001}]]:
        assert client.post("/api/chat", json={"message": "Hello", "history": invalid}).status_code == 422

def test_usage_budget_and_no_retries(ai):
    client, call, assistant = ai
    assert assistant.client.max_retries == 0
    for _ in range(10):
        assert client.post("/api/chat", json={"message": "Hello"}).status_code == 200
    assert client.post("/api/chat", json={"message": "Hello"}).json()["code"] == "usage_limit"
    assert call.call_count == 10

def test_processing_and_single_flight(ai):
    _, call, assistant = ai
    async def scenario():
        async def pending(**kwargs):
            assert assistant.provider_state == "processing"
            with pytest.raises(Exception) as caught:
                await assistant.reply("second", "en", [])
            assert caught.value.code == "busy"
            return SimpleNamespace(output_text="done", status="completed")
        call.side_effect = pending
        assert await assistant.reply("first", "en", []) == "done"
        assert assistant.provider_state == "connected"
    asyncio.run(scenario())

def test_settings_secret_redacted_and_limits(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", SECRET)
    assert SECRET not in repr(Settings.from_environment())
    for name, value in [("OPENAI_TIMEOUT_SECONDS", "46"), ("OPENAI_MAX_OUTPUT_TOKENS", "0"), ("JARVIS_REQUESTS_PER_MINUTE", "0")]:
        with monkeypatch.context() as patch:
            patch.setenv(name, value)
            with pytest.raises(ValueError):
                Settings.from_environment()

def test_official_sdk_http_contract(monkeypatch):
    import json
    from app.assistant import Assistant
    captured = []
    def handler(request):
        captured.append(json.loads(request.content))
        assert request.url.path == "/v1/responses"
        assert request.headers["authorization"] == "Bearer " + SECRET
        return httpx2.Response(200, json={
            "id": "resp_test", "object": "response", "created_at": 1,
            "status": "completed", "model": "test-model", "output": [
                {"type": "message", "id": "msg_test", "role": "assistant", "status": "completed",
                 "content": [{"type": "output_text", "text": "Zdravo Ana", "annotations": []}]}],
        })
    async def scenario():
        assistant = Assistant(Settings((), "INFO", provider="openai"))
        assistant.client = openai.AsyncOpenAI(api_key=SECRET, max_retries=0,
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handler)))
        try:
            assert await assistant.reply("Zdravo", "sr", []) == "Zdravo Ana"
            assert captured[0]["store"] is False
        finally:
            await assistant.close()
    asyncio.run(scenario())


def test_deadline_cancels_inflight_call(ai):
    from dataclasses import replace
    client, call, assistant = ai
    assistant.settings = replace(assistant.settings, timeout=0.01)
    async def slow(**kwargs):
        await asyncio.sleep(1)
    call.side_effect = slow
    assert client.post("/api/chat", json={"message": "Hello"}).status_code == 504
    assert assistant.busy is False

def test_local_dotenv_and_export_precedence(monkeypatch, tmp_path):
    from dotenv import load_dotenv
    local = tmp_path / ".env"
    local.write_text("OPENAI_API_KEY=sk-local-test-only\nOPENAI_MODEL=local-model\n")
    def load_local(path, override=False):
        assert path.name == ".env" and path.parent.name == "backend"
        return load_dotenv(local, override=override)
    monkeypatch.setenv("OPENAI_API_KEY", "")
    monkeypatch.delenv("OPENAI_API_KEY")
    monkeypatch.setattr("app.config.load_dotenv", load_local)
    monkeypatch.setenv("OPENAI_MODEL", "exported-model")
    settings = Settings.from_environment()
    assert settings.api_key == "sk-local-test-only" and settings.model == "exported-model"
