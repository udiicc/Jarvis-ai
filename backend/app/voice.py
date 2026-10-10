"""Ephemeral local audio processing via fixed whisper.cpp, ffmpeg, and macOS say commands."""
import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
import platform
import re
import shutil
import tempfile
import wave
from urllib.parse import urlsplit

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Literal

router = APIRouter(prefix="/api/voice")


def local_only(request: Request):
    origin = request.headers.get("origin")
    if request.url.hostname not in {"localhost", "127.0.0.1", "::1"} or (
        origin and urlsplit(origin).hostname not in {"localhost", "127.0.0.1", "::1"}
    ):
        raise HTTPException(403, "Voice endpoints are local-only.")


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    language: Literal["en", "sr"] = "en"


class VoiceService:
    def __init__(self):
        self.whisper = os.getenv("WHISPER_CPP_BIN", "whisper-cli")
        self.model = Path(os.getenv("WHISPER_MODEL_PATH", "~/Library/Application Support/Jarvis/ggml-base.bin")).expanduser()
        self.rate = int(os.getenv("VOICE_TTS_RATE", "175"))
        if not 80 <= self.rate <= 300:
            raise ValueError("VOICE_TTS_RATE must be between 80 and 300")
        self.busy = False
        self.processes = set()
        self.chat_task = None

    async def run(self, *args, timeout=90, input=None):
        process = await asyncio.create_subprocess_exec(*args, stdin=asyncio.subprocess.PIPE if input else asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        self.processes.add(process)
        try:
            output, _ = await asyncio.wait_for(process.communicate(input), timeout)
            if process.returncode:
                raise HTTPException(503, "Local audio processing failed. Check the installed tools and model.")
            return output.decode("utf-8", errors="replace")
        except asyncio.TimeoutError:
            raise HTTPException(504, "Local audio processing timed out.") from None
        finally:
            if process.returncode is None:
                process.kill()
                await process.wait()
            self.processes.discard(process)

    @asynccontextmanager
    async def exclusive(self, assistant):
        if self.busy or assistant.busy:
            raise HTTPException(409, "JARVIS is busy. Wait for the current operation.")
        self.busy = True
        try:
            yield
        finally:
            self.busy = False

    def stt_ready(self):
        return bool(shutil.which(self.whisper) and shutil.which("ffmpeg") and self.model.is_file())

    def require_stt(self):
        if not shutil.which(self.whisper) or not shutil.which("ffmpeg") or not self.model.is_file():
            raise HTTPException(503, "Install whisper.cpp and ffmpeg, and configure WHISPER_MODEL_PATH with a downloaded multilingual model.")

    async def transcribe(self, audio, language, assistant):
        self.require_stt()
        async with self.exclusive(assistant):
            with tempfile.TemporaryDirectory(prefix="jarvis-audio-") as directory:
                source = Path(directory) / "recording"
                wav = Path(directory) / "audio.wav"
                source.write_bytes(audio)
                # Disable network protocols and cap decoded duration; recordings are deleted on all exits.
                await self.run("ffmpeg", "-nostdin", "-loglevel", "error", "-protocol_whitelist", "file,pipe",
                    "-i", str(source), "-t", "31", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav), timeout=15)
                with wave.open(str(wav)) as recording:
                    if recording.getnframes() / recording.getframerate() > 30.5:
                        raise HTTPException(413, "Recordings must be at most 30 seconds.")
                output = Path(directory) / "transcript"
                await self.run(self.whisper, "-m", str(self.model), "-f", str(wav), "-l", language,
                    "-otxt", "-of", str(output), "-np", "-nt", "-t", "4", timeout=90)
                text = output.with_suffix(".txt").read_text().strip()
                if not text or len(text) > 2000:
                    raise HTTPException(422, "No usable speech detected. Try a shorter, clearer recording.")
                return text

    async def voices(self):
        if platform.system() != "Darwin" or not shutil.which("say"):
            return []
        output = await self.run("say", "-v", "?", timeout=5)
        return [{"name": match[1].strip(), "language": match[2]} for line in output.splitlines()
                if (match := re.match(r"^(.+?)\s+([a-z]{2}[_-][A-Z]{2})\s+#", line))]

    async def speak(self, text, language, assistant):
        if "<think" in text.lower() or "</think" in text.lower():
            raise HTTPException(422, "Only final assistant answers can be spoken.")
        if not shutil.which("ffmpeg"):
            raise HTTPException(503, "Install ffmpeg for local speech playback.")
        async with self.exclusive(assistant):
            voices = await self.voices()
            configured = os.getenv(f"VOICE_TTS_VOICE_{language.upper()}", "")
            voice = next((v for v in voices if v["name"] == configured), None) if configured else next(
                (v for v in voices if v["language"].startswith(language)), None)
            if not voice:
                raise HTTPException(503, "No suitable local voice is available for this language. Install a macOS voice or configure VOICE_TTS_VOICE_EN / VOICE_TTS_VOICE_SR. The answer remains available as text.")
            with tempfile.TemporaryDirectory(prefix="jarvis-speech-") as directory:
                source, output = Path(directory) / "speech.aiff", Path(directory) / "speech.wav"
                await self.run("say", "-v", voice["name"], "-r", str(self.rate), "-o", str(source), "-f", "-",
                    input=text.encode(), timeout=90)
                await self.run("ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(source), str(output), timeout=15)
                return output.read_bytes(), voice["language"].startswith(language)

    async def cancel(self):
        if self.chat_task and not self.chat_task.done():
            self.chat_task.cancel()
        for process in list(self.processes):
            if process.returncode is None:
                process.kill()
                await process.wait()


@router.get("/status")
async def status(request: Request):
    local_only(request)
    voice = request.app.state.voice
    voices = await voice.voices()
    return {"stt_ready": bool(shutil.which(voice.whisper) and shutil.which("ffmpeg") and voice.model.is_file()),
            "tts_ready": bool(voices and shutil.which("ffmpeg")), "voices": voices, "recording_limit_seconds": 30}


@router.post("/transcribe")
async def transcribe(request: Request, language: Literal["en", "sr"] = "en"):
    local_only(request)
    audio = bytearray()
    async for chunk in request.stream():
        audio.extend(chunk)
        if len(audio) > 8 * 1024 * 1024:
            raise HTTPException(413, "Audio exceeds the 8 MB limit.")
    if not audio:
        raise HTTPException(422, "Empty recording.")
    try:
        text = await request.app.state.voice.transcribe(bytes(audio), language, request.app.state.assistant)
        return {"text": text}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Local transcription failed. Check the audio tools and recording format.") from None


@router.post("/speak")
async def speak(payload: SpeechRequest, request: Request):
    local_only(request)
    try:
        data, matched = await request.app.state.voice.speak(payload.text, payload.language, request.app.state.assistant)
        return Response(data, media_type="audio/wav", headers={"Cache-Control": "no-store", "X-Voice-Language-Matched": str(matched).lower()})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, "Local speech synthesis failed. The reply remains available as text.") from None


@router.post("/cancel")
async def cancel(request: Request):
    local_only(request)
    await request.app.state.voice.cancel()
    return {"status": "cancelled"}
