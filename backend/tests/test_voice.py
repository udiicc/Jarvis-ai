import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
import wave

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import create_app
from app.voice import VoiceService

@pytest.fixture
def local(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    app = create_app()
    with TestClient(app, base_url="http://127.0.0.1") as client:
        yield client, app.state.voice, app.state.assistant


def test_audio_limits_and_local_origin(local):
    client, voice, _ = local
    voice.transcribe = AsyncMock(return_value="Jarvise, otvori zadatke.")
    assert client.post("/api/voice/transcribe", content=b"").status_code == 422
    assert client.post("/api/voice/transcribe", content=b"x" * (8 * 1024 * 1024 + 1)).status_code == 413
    assert client.post("/api/voice/transcribe", content=b"audio", headers={"Origin": "https://external.example"}).status_code == 403
    result = client.post("/api/voice/transcribe?language=sr", content=b"audio")
    assert result.json()["text"] == "Jarvise, otvori zadatke."
    assert voice.transcribe.call_args.args[:2] == (b"audio", "sr")


def test_transcription_failure_sanitized(local):
    client, voice, _ = local
    voice.transcribe = AsyncMock(side_effect=RuntimeError("sensitive audio"))
    result = client.post("/api/voice/transcribe", content=b"audio")
    assert result.status_code == 503 and "sensitive" not in result.text


def test_voice_cannot_use_paid_provider(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    app = create_app()
    app.state.assistant.reply = AsyncMock()
    with TestClient(app, base_url="http://127.0.0.1") as client:
        result = client.post("/api/chat", json={"message": "Hello", "source": "voice"})
        assert result.status_code == 409 and result.json()["code"] == "voice_provider"
        app.state.assistant.reply.assert_not_called()


def test_speech_response_and_failure(local):
    client, voice, _ = local
    voice.speak = AsyncMock(return_value=(b"RIFFtest", True))
    result = client.post("/api/voice/speak", json={"text": "Final answer", "language": "en"})
    assert result.content == b"RIFFtest" and result.headers["content-type"] == "audio/wav"
    assert result.headers["cache-control"] == "no-store"
    voice.speak = AsyncMock(side_effect=HTTPException(503, "No Serbian voice installed"))
    assert "No Serbian voice" in client.post("/api/voice/speak", json={"text": "Zdravo", "language": "sr"}).text


def test_whisper_args_cleanup_and_sequential(monkeypatch, tmp_path):
    model = tmp_path / "ggml-base.bin"; model.write_bytes(b"model")
    monkeypatch.setenv("WHISPER_MODEL_PATH", str(model))
    monkeypatch.setattr("app.voice.shutil.which", lambda name: name)
    voice = VoiceService(); calls = []
    async def run(*args, **kwargs):
        calls.append(args)
        if args[0] == "ffmpeg":
            with wave.open(args[-1], "w") as output:
                output.setnchannels(1); output.setsampwidth(2); output.setframerate(16000); output.writeframes(b"\0\0" * 16000)
        else:
            Path(args[args.index("-of") + 1] + ".txt").write_text("Zdravo")
        return ""
    voice.run = run
    assert asyncio.run(voice.transcribe(b"audio", "sr", SimpleNamespace(busy=False))) == "Zdravo"
    assert calls[1][0] == "whisper-cli" and calls[1][calls[1].index("-l") + 1] == "sr"
    assert not Path(calls[0][-1]).exists()
    assert voice.busy is False


def test_native_voice_selection_and_reasoning_guard(monkeypatch):
    monkeypatch.setattr("app.voice.shutil.which", lambda name: name)
    voice = VoiceService()
    voice.voices = AsyncMock(return_value=[{"name": "Samantha", "language": "en_US"}])
    async def scenario():
        with pytest.raises(HTTPException) as missing:
            await voice.speak("Zdravo", "sr", SimpleNamespace(busy=False))
        assert "No suitable local voice" in missing.value.detail
        with pytest.raises(HTTPException) as reasoning:
            await voice.speak("<think>secret</think>", "en", SimpleNamespace(busy=False))
        assert reasoning.value.status_code == 422
    asyncio.run(scenario())


def test_cancel_kills_active_process_and_chat(local):
    client, voice, _ = local
    process = SimpleNamespace(returncode=None, kill=lambda: setattr(process, "returncode", -9), wait=AsyncMock())
    voice.processes = [process]
    assert client.post("/api/voice/cancel").status_code == 200
    assert process.returncode == -9 and process.wait.call_count == 1


def test_audio_blocks_simultaneous_inference(local):
    client, voice, assistant = local
    voice.busy = True
    assistant.reply = AsyncMock()
    assert client.post("/api/chat", json={"message": "Hello"}).status_code == 409
    assistant.reply.assert_not_called()


def test_native_say_arguments_and_ephemeral_files(monkeypatch):
    monkeypatch.setattr("app.voice.shutil.which", lambda name: name)
    monkeypatch.setenv("VOICE_TTS_RATE", "160")
    voice = VoiceService()
    voice.voices = AsyncMock(return_value=[{"name": "Samantha", "language": "en_US"}])
    calls = []
    async def run(*args, **kwargs):
        calls.append((args, kwargs))
        if args[0] == "say":
            Path(args[args.index("-o") + 1]).write_bytes(b"AIFF")
        else:
            Path(args[-1]).write_bytes(b"RIFF")
        return ""
    voice.run = run
    assert asyncio.run(voice.speak("Final answer", "en", SimpleNamespace(busy=False))) == (b"RIFF", True)
    assert calls[0][0][1:5] == ("-v", "Samantha", "-r", "160")
    assert calls[0][1]["input"] == b"Final answer"
    assert not Path(calls[1][0][-1]).exists()


def test_cancel_stops_pending_voice_inference():
    voice = VoiceService()
    async def scenario():
        task = asyncio.create_task(asyncio.sleep(60))
        voice.chat_task = task
        await voice.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    asyncio.run(scenario())
