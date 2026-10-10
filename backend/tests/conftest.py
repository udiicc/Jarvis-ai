import pytest

@pytest.fixture(autouse=True)
def isolate_local_secrets(monkeypatch):
    # Test runs must never read a developer's .env or make billed API calls.
    monkeypatch.setattr("app.config.load_dotenv", lambda *args, **kwargs: None)
    for name in ("AI_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL", "OLLAMA_TIMEOUT_SECONDS", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_TIMEOUT_SECONDS", "OPENAI_MAX_OUTPUT_TOKENS", "JARVIS_REQUESTS_PER_MINUTE", "JARVIS_SYSTEM_INSTRUCTION"):
        monkeypatch.delenv(name, raising=False)
