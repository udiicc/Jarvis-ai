import { useEffect, useRef, useState } from "react";
import type { Language } from "../api";
export type VoiceState =
  | "idle"
  | "requesting"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error";
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
async function localRequest(path: string, options: RequestInit) {
  const response = await fetch(`${base}/api/voice/${path}`, options);
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.detail === "string"
        ? error.detail
        : "Local voice processing failed.",
    );
  }
  return response;
}
export function useVoice(
  language: Language,
  recognized: (text: string, signal: AbortSignal) => Promise<string | null>,
) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [playbackReady, setPlaybackReady] = useState(false);
  const [notice, setNotice] = useState("");
  const generation = useRef(0),
    recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  const abort = useRef<AbortController | null>(null),
    player = useRef<HTMLAudioElement | null>(null),
    url = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useRef(recognized);
  callback.current = recognized;
  const release = () => {
    setPlaybackReady(false);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    player.current?.pause();
    player.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  };
  const cancel = () => {
    generation.current++;
    abort.current?.abort();
    abort.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    release();
    setState("idle");
    void fetch(`${base}/api/voice/cancel`, { method: "POST" }).catch(() => {});
  };
  useEffect(
    () => () => {
      generation.current++;
      if (abort.current)
        void fetch(`${base}/api/voice/cancel`, { method: "POST" }).catch(
          () => {},
        );
      abort.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    },
    [],
  );
  const start = async () => {
    release();
    const run = ++generation.current;
    setError(null);
    setNotice("");
    setTranscript("");
    setState("requesting");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const destination = new URL(
        base || window.location.origin,
        window.location.origin,
      );
      if (!["localhost", "127.0.0.1", "[::1]"].includes(destination.hostname))
        throw new Error(
          "Voice processing requires a local backend on this Mac.",
        );
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Microphone recording requires a supported browser on localhost or HTTPS.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (run !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recording = new MediaRecorder(
        media,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = recording;
      const chunks: Blob[] = [];
      recording.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recording.onerror = () => {
        if (run === generation.current) {
          release();
          generation.current++;
          if (recording.state === "recording") recording.stop();
          setError("Microphone recording failed.");
          setState("error");
        }
      };
      recording.onstop = async () => {
        if (recorder.current === recording) recorder.current = null;
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        if (run !== generation.current) return;
        const deadline = setTimeout(() => controller.abort(), 120000);
        try {
          setState("transcribing");
          const audio = new Blob(chunks, { type: recording.mimeType });
          chunks.length = 0;
          if (!audio.size || audio.size > 8 * 1024 * 1024)
            throw new Error("Recording is empty or too large.");
          const response = await localRequest(
            `transcribe?language=${language}`,
            { method: "POST", body: audio, signal: controller.signal },
          );
          const result = await response.json();
          clearTimeout(deadline);
          if (run !== generation.current) return;
          setTranscript(result.text);
          setState("thinking");
          const answer = await callback.current(result.text, controller.signal);
          if (run !== generation.current) return;
          if (!answer) {
            setState("idle");
            return;
          }
          const speechDeadline = setTimeout(() => controller.abort(), 110000);
          let speech: Response;
          try {
            speech = await localRequest("speak", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: answer, language }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(speechDeadline);
          }
          if (run !== generation.current) return;
          if (speech.headers.get("X-Voice-Language-Matched") === "false")
            setNotice(
              "The selected local voice is not native to this language.",
            );
          const speechBlob = await speech.blob();
          if (run !== generation.current) return;
          url.current = URL.createObjectURL(speechBlob);
          const audioPlayer = new Audio(url.current);
          player.current = audioPlayer;
          setState("speaking");
          audioPlayer.onended = () => {
            if (run === generation.current) {
              release();
              setState("idle");
            }
          };
          audioPlayer.onerror = () => {
            if (run === generation.current) {
              release();
              setError("Local voice playback failed.");
              setState("error");
            }
          };
          try {
            await audioPlayer.play();
          } catch {
            if (run !== generation.current) return;
            setPlaybackReady(true);
            setError("Browser blocked playback. Click Play reply.");
            setState("error");
          }
        } catch (failure) {
          if (run === generation.current) {
            release();
            setError(
              failure instanceof Error
                ? failure.message
                : "Local voice failed.",
            );
            setState("error");
          }
        } finally {
          clearTimeout(deadline);
        }
      };
      recording.start();
      setState("listening");
      timer.current = setTimeout(() => {
        if (recording.state === "recording") recording.stop();
      }, 30000);
    } catch (failure) {
      if (run !== generation.current) return;
      release();
      setError(
        failure instanceof DOMException && failure.name === "NotAllowedError"
          ? "Microphone permission denied. Allow microphone access in your browser and macOS settings."
          : failure instanceof Error
            ? failure.message
            : "Microphone unavailable.",
      );
      setState("error");
    }
  };
  const resume = async () => {
    if (!player.current) return;
    try {
      await player.current.play();
      setPlaybackReady(false);
      setError(null);
      setState("speaking");
    } catch {
      setError("Playback is blocked. Check the browser sound permission.");
    }
  };
  return {
    playbackReady,
    resume,
    state,
    error,
    transcript,
    notice,
    start,
    cancel,
    stop: () =>
      recorder.current?.state === "recording" && recorder.current.stop(),
  };
}
