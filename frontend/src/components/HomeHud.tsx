import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MessageSquare,
  Radio,
  RefreshCw,
} from "lucide-react";
import type { CoreState } from "../types";
import type { Language } from "../api";
import type { JarvisSession } from "../hooks/useJarvis";
import type { WindowId } from "../commands";

function LocalClock({
  language,
  visible,
}: {
  language: Language;
  visible: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!visible) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [visible]);
  const locale = language === "sr" ? "sr-Latn-RS" : "en-GB";
  return (
    <section className="floating-hud clock-hud" aria-label="Local clock">
      <header>
        <Clock3 size={12} />
        <span>{language === "sr" ? "Lokalno vreme" : "Local time"}</span>
      </header>
      <time dateTime={now.toISOString()} className="live-clock">
        {now.toLocaleTimeString(locale, {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })}
        <span>{now.toLocaleTimeString(locale, { second: "2-digit" })}</span>
      </time>
      <p className="local-date">
        {now.toLocaleDateString(locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
      <small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small>
    </section>
  );
}
export default function HomeHud({
  session,
  language,
  visible,
  privacy,
  open,
}: {
  session: Omit<JarvisSession, "coreState"> & { coreState: CoreState };
  language: Language;
  visible: boolean;
  privacy: boolean;
  open: (id: WindowId) => void;
}) {
  const sr = language === "sr";
  const provider = session.status?.mode === "ollama" ? "Ollama" : "OpenAI";
  const providerErrors: Record<string, string> = {
    authentication: "Authentication error",
    rate_limit: "Rate / quota limit",
    timeout: "Request timeout",
    network: "Connection error",
    missing_key: "Key missing",
    ollama_offline: "Ollama offline",
    ollama_model: "Model missing",
    ollama_timeout: "Local timeout",
    ollama_network: "Connection error",
    ollama_remote: "Cloud model blocked",
    ollama_thinking: "Final answer missing",
  };
  const providerLabel =
    session.status?.mode === "mock"
      ? "Mock / local"
      : !session.status
        ? sr
          ? "Nije povezan"
          : "Not connected"
        : session.sending || session.status.provider_state === "processing"
          ? sr
            ? "Obrada"
            : "Processing"
          : session.status.provider_state === "connected"
            ? `${provider} verified`
            : session.status.provider_state === "ready"
              ? `${provider} ready`
              : session.status.provider_state === "configured"
                ? `${provider} configured`
                : session.status.provider_state === "error"
                  ? providerErrors[session.status.provider_error || ""] ||
                    "Provider error"
                  : "Not connected";
  return (
    <>
      <div className="hud-left">
        <LocalClock language={language} visible={visible} />
        <section
          className="floating-hud integration-hud"
          aria-label="Recent messages"
        >
          <header>
            <MessageSquare size={12} />
            <span>{sr ? "Poruke" : "Recent messages"}</span>
            <button
              aria-label="Expand messages"
              onClick={() => open("messages")}
            >
              <ArrowUpRight size={12} />
            </button>
          </header>
          <strong className="integration-disconnected">
            {sr ? "Nije povezano" : "Not connected"}
          </strong>
          <p>
            {sr
              ? "Integracija poruka nije dostupna."
              : "No messaging integration."}
          </p>
          <small>
            {privacy
              ? sr
                ? "Pregledi skriveni"
                : "Previews private"
              : sr
                ? "Nema dostupnih podataka"
                : "No data available"}
          </small>
        </section>
      </div>
      <div className="hud-right">
        <section
          className="floating-hud integration-hud"
          aria-label="Recent emails"
        >
          <header>
            <Mail size={12} />
            <span>{sr ? "Mejlovi" : "Recent emails"}</span>
            <button aria-label="Expand emails" onClick={() => open("emails")}>
              <ArrowUpRight size={12} />
            </button>
          </header>
          <strong className="integration-disconnected">
            {sr ? "Nije povezano" : "Not connected"}
          </strong>
          <p>
            {sr ? "Email integracija nije dostupna." : "No email integration."}
          </p>
          <small>
            {privacy
              ? sr
                ? "Pregledi skriveni"
                : "Previews private"
              : sr
                ? "Nema dostupnih podataka"
                : "No data available"}
          </small>
        </section>
        <section
          className="floating-hud connection-hud"
          aria-label="System connection"
        >
          <header>
            <Radio size={12} />
            <span>{sr ? "Sistem" : "System connection"}</span>
            <button
              aria-label="Refresh backend status"
              disabled={session.checking}
              onClick={() => void session.refresh()}
            >
              <RefreshCw size={11} />
            </button>
          </header>
          <div className="hud-connection-state">
            <i className={`status-dot ${session.connection}`} />
            <strong>
              {session.connection === "online"
                ? "Online"
                : session.connection === "offline"
                  ? "Offline"
                  : "Connecting"}
            </strong>
          </div>
          <dl>
            <div>
              <dt>Provider</dt>
              <dd>{providerLabel}</dd>
            </div>
            <div>
              <dt>{sr ? "Režim" : "Engine"}</dt>
              <dd title={session.status?.model || undefined}>
                {session.status?.mode === "mock"
                  ? "Mock / local"
                  : session.status?.model || "Unavailable"}
              </dd>
            </div>
            <div>
              <dt>{sr ? "Asistent" : "Assistant"}</dt>
              <dd className={session.coreState === "error" ? "error-text" : ""}>
                {session.coreState}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
