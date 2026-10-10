import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStatus,
  sendMessage,
  type AssistantStatus,
  type Language,
} from "../api";
import type {
  CommandEntry,
  Connection,
  CoreState,
  Message,
  SessionEvent,
} from "../types";

export function useJarvis(language: Language, visible: boolean) {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const context = useRef<import("../api").ContextMessage[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date().toISOString());
  const id = useRef(0);
  const mounted = useRef(true);
  const refreshGeneration = useRef(0);
  const checkInFlight = useRef(false);
  const requestInFlight = useRef(false);
  const connectionRef = useRef<Connection>("connecting");
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addEvent = useCallback((kind: SessionEvent["kind"], text: string) => {
    setEvents((current) =>
      [
        { id: ++id.current, kind, text, timestamp: new Date().toISOString() },
        ...current,
      ].slice(0, 30),
    );
  }, []);
  const refresh = useCallback(async () => {
    if (checkInFlight.current) return;
    checkInFlight.current = true;
    const generation = ++refreshGeneration.current;
    setChecking(true);
    try {
      const current = await getStatus();
      if (!mounted.current || generation !== refreshGeneration.current) return;
      setStatus(current);
      setConnection("online");
      if (connectionRef.current !== "online")
        addEvent("connection", "Backend connected · health check passed");
      connectionRef.current = "online";
    } catch {
      if (!mounted.current || generation !== refreshGeneration.current) return;
      setStatus(null);
      setConnection("offline");
      if (connectionRef.current !== "offline")
        addEvent("error", "Backend connection lost");
      connectionRef.current = "offline";
    } finally {
      if (mounted.current && generation === refreshGeneration.current) {
        checkInFlight.current = false;
        setChecking(false);
        setLastChecked(new Date().toISOString());
      }
    }
  }, [addEvent]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      refreshGeneration.current += 1;
      checkInFlight.current = false;
      if (responseTimer.current) clearTimeout(responseTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [visible, refresh]);

  const submit = async (raw: string) => {
    const message = raw.trim();
    if (
      !message ||
      message.length > 2000 ||
      requestInFlight.current ||
      connectionRef.current !== "online"
    )
      return false;
    requestInFlight.current = true;
    if (responseTimer.current) clearTimeout(responseTimer.current);
    setSending(true);
    setError(false);
    setErrorMessage(null);
    setResponding(false);
    const messageId = ++id.current;
    const timestamp = new Date().toISOString();
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", text: message, timestamp },
    ]);
    setHistory((current) =>
      [
        { id: messageId, text: message, result: "pending" as const, timestamp },
        ...current,
      ].slice(0, 20),
    );
    addEvent("request", "Text command submitted");
    try {
      const response = await sendMessage(message, language, context.current);
      context.current = [
        ...context.current,
        { role: "user", content: message },
        { role: "assistant", content: response.reply.slice(0, 8000) },
      ].slice(-12) as import("../api").ContextMessage[];
      if (!mounted.current) return true;
      setMessages((current) => [
        ...current,
        {
          id: ++id.current,
          role: "assistant",
          text: response.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
      setHistory((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, result: "complete" } : item,
        ),
      );
      addEvent(
        "response",
        response.mode === "openai"
          ? "OpenAI response received"
          : response.mode === "ollama"
            ? "Ollama response received"
            : "Mock response received",
      );
      void refresh();
      setResponding(true);
      responseTimer.current = setTimeout(() => {
        if (mounted.current) setResponding(false);
      }, 2200);
    } catch (failure) {
      if (!mounted.current) return true;
      setErrorMessage(failure instanceof Error ? failure.message : null);
      void refresh();
      setError(true);
      setHistory((current) =>
        current.map((item) =>
          item.id === messageId ? { ...item, result: "failed" } : item,
        ),
      );
      addEvent("error", "Request failed · message kept in session");
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setSending(false);
    }
    return true;
  };
  const coreState: CoreState =
    connection === "offline"
      ? "offline"
      : connection === "connecting"
        ? "connecting"
        : error
          ? "error"
          : sending
            ? "processing"
            : responding
              ? "responding"
              : "idle";
  return {
    status,
    connection,
    messages,
    history,
    events,
    sending,
    error,
    errorMessage,
    checking,
    lastChecked,
    startedAt,
    coreState,
    refresh,
    submit,
  };
}
export type JarvisSession = ReturnType<typeof useJarvis>;
