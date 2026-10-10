import json
import logging

from fastapi.testclient import TestClient
from app.main import create_app
from app.logging_config import JsonFormatter

client = TestClient(create_app())


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_status():
    status = client.get("/api/assistant/status").json()
    assert status["mode"] == "mock"
    assert status["platform_target"] == "macOS"
    assert status["capabilities"] == {"chat": True, "voice": False, "memory": False, "automation": False}


def test_mock_chat_languages():
    for language, expected in [("en", "demo mode"), ("sr", "demo režimu")]:
        response = client.post("/api/chat", json={"message": "Hello", "language": language})
        assert response.status_code == 200
        assert expected in response.json()["reply"]
        assert response.json()["mode"] == "mock"


def test_invalid_chat():
    for payload in [{"message": ""}, {"message": " "}, {"message": "x" * 2001},
                    {"message": "hello", "language": "de"}]:
        assert client.post("/api/chat", json=payload).status_code == 422


def test_cors():
    response = client.options("/api/chat", headers={"Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    response = client.options("/api/chat", headers={"Origin": "https://untrusted.example",
        "Access-Control-Request-Method": "POST"})
    assert response.status_code == 400


def test_configuration(monkeypatch):
    monkeypatch.setenv("JARVIS_ALLOWED_ORIGINS", "http://localhost:6000")
    configured = TestClient(create_app())
    response = configured.get("/api/health", headers={"Origin": "http://localhost:6000"})
    assert response.headers["access-control-allow-origin"] == "http://localhost:6000"


def test_structured_log():
    record = logging.LogRecord("jarvis", logging.INFO, "", 0, "request finished", (), None)
    assert json.loads(JsonFormatter().format(record))["event"] == "request finished"
