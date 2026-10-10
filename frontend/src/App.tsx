import { useVoice } from "./hooks/useVoice";
import { useEffect, useState } from "react";
import { ArrowUpRight, Layers3, Settings2, X } from "lucide-react";
import type { Language } from "./api";
import { copy } from "./copy";
import {
  parseUICommand,
  windowTitles,
  windowTitlesSr,
  type WindowId,
} from "./commands";
import { useJarvis } from "./hooks/useJarvis";
import { useVisibility } from "./hooks/useVisibility";
import { useStageBounds } from "./hooks/useStageBounds";
import { useWindows } from "./hooks/useWindows";
import JarvisCore from "./components/JarvisCore";
import HomeHud from "./components/HomeHud";
import CommandConsole from "./components/CommandConsole";
import HolographicWindow from "./components/HolographicWindow";
import WindowContents from "./components/WindowContents";

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [draft, setDraft] = useState("");
  const [motion, setMotion] = useState(true);
  const [privacy, setPrivacy] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [menu, setMenu] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [replyId, setReplyId] = useState<number | null>(null);
  const visible = useVisibility();
  const session = useJarvis(language, visible);
  const { ref, bounds } = useStageBounds();
  const reducedMotion = !motion || systemReducedMotion;
  const manager = useWindows(bounds, reducedMotion);
  const text = copy[language],
    titles = language === "sr" ? windowTitlesSr : windowTitles;
  const compact = bounds.width < 900;
  const liveWindows = manager.windows.filter((item) => !item.minimized);
  const focusedLayer = Math.max(
    0,
    ...liveWindows.filter((item) => !item.closing).map((item) => item.layer),
  );
  const reply = session.messages.find((message) => message.id === replyId);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setSystemReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const last = session.messages.at(-1);
    if (last?.role !== "assistant") return;
    setReplyId(last.id);
    const timer = setTimeout(() => setReplyId(null), 15000);
    return () => clearTimeout(timer);
  }, [session.messages]);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(""), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  const open = (id: WindowId) => {
    manager.open(id);
    setMenu(false);
    setReplyId(null);
  };
  const execute = async (raw: string, signal?: AbortSignal) => {
    const command = raw.trim();
    if (!command || session.sending) return null;
    const intent = parseUICommand(command);
    if (intent) {
      manager.run(intent);
      setDraft("");
      setReplyId(null);
      setFeedback(
        intent.action === "close-all"
          ? language === "sr"
            ? "Svi prozori su zatvoreni."
            : "All windows closed."
          : `${titles[intent.window]} · ${intent.action}`,
      );
      return null;
    }
    if (signal && session.status?.mode !== "ollama")
      throw new Error(
        "Voice conversations require Ollama. No paid provider was called.",
      );
    if (session.connection !== "online") throw new Error("Backend is offline.");
    setDraft("");
    setFeedback("");
    const answer = await session.submit(command, signal);
    if (!answer && signal)
      throw new Error(
        "Voice conversation failed. See the assistant error message.",
      );
    return typeof answer === "string" ? answer : null;
  };
  const voice = useVoice(language, execute);
  const voiceActive = !["idle", "error"].includes(voice.state);
  const coreState =
    voice.state === "error"
      ? "error"
      : voice.state === "listening"
        ? "listening"
        : voice.state === "transcribing"
          ? "transcribing"
          : voice.state === "thinking"
            ? "processing"
            : voice.state === "speaking"
              ? "speaking"
              : session.coreState;
  const submit = () => {
    void execute(draft).catch(() => {});
  };
  const canSend = !!parseUICommand(draft) || session.connection === "online";
  return (
    <div
      className="minimal-shell jarvis-shell"
      data-motion={!visible || reducedMotion ? "paused" : "active"}
      data-reduced-motion={reducedMotion}
    >
      <header className="minimal-topbar">
        <span className="minimal-brand">
          J<span> / </span>PERSONAL INTELLIGENCE
        </span>
        <div className="minimal-top-controls">
          <select
            aria-label="Language"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            <option value="en">English</option>
            <option value="sr">Srpski</option>
          </select>
          <button
            className="subtle-control"
            aria-label="Open settings"
            title="Settings"
            onClick={() => open("settings")}
          >
            <Settings2 size={16} />
          </button>
          <div className="summon-menu-anchor">
            <button
              className="subtle-control"
              aria-label="Summon a window"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Layers3 size={16} />
            </button>
            {menu && (
              <div className="summon-menu" aria-label="Available windows">
                {(Object.keys(windowTitles) as WindowId[]).map((id) => (
                  <button key={id} onClick={() => open(id)}>
                    {titles[id]}
                  </button>
                ))}
                <button
                  onClick={() => {
                    manager.closeAll();
                    setMenu(false);
                  }}
                >
                  {language === "sr"
                    ? "Zatvori sve prozore"
                    : "Close all windows"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main
        className={`home-stage ${liveWindows.length ? "has-windows" : ""} ${compact ? "compact-stage" : ""}`}
        ref={ref}
        aria-label="Holographic home"
      >
        <div className="home-core-stage">
          <JarvisCore state={coreState} mode={session.status?.mode} />
        </div>
        <HomeHud
          session={{ ...session, coreState }}
          language={language}
          visible={visible}
          privacy={privacy}
          open={open}
        />
        <div className="window-layer">
          {liveWindows.map((item) => (
            <HolographicWindow
              key={item.id}
              window={item}
              title={titles[item.id]}
              manager={manager}
              active={item.layer === focusedLayer}
              compact={compact}
            >
              <WindowContents
                id={item.id}
                session={session}
                language={language}
                motion={motion}
                setMotion={setMotion}
                privacy={privacy}
                setPrivacy={setPrivacy}
                reducedMotion={reducedMotion}
              />
            </HolographicWindow>
          ))}
        </div>
      </main>
      <div className="home-command-area">
        {manager.windows.some((item) => item.minimized) && (
          <div className="window-dock" aria-label="Minimized windows">
            {manager.windows
              .filter((item) => item.minimized && !item.closing)
              .map((item) => (
                <button
                  key={item.id}
                  aria-label={`Restore ${titles[item.id]}`}
                  onClick={() => manager.open(item.id)}
                >
                  {titles[item.id]}
                  <ArrowUpRight size={11} />
                </button>
              ))}
          </div>
        )}
        <div className="command-feedback" aria-live="polite">
          {feedback}
        </div>
        {reply &&
          !manager.windows.some(
            (item) =>
              item.id === "conversations" && !item.minimized && !item.closing,
          ) && (
            <div className="assistant-reply" role="status">
              <strong>JARVIS</strong>
              <p>{reply.text}</p>
              <button
                onClick={() => open("conversations")}
                aria-label="Show conversation"
              >
                <ArrowUpRight size={13} />
              </button>
              <button
                onClick={() => setReplyId(null)}
                aria-label="Dismiss reply"
              >
                <X size={12} />
              </button>
            </div>
          )}
        {session.connection === "offline" && (
          <div className="minimal-error" role="alert">
            {text.offline}{" "}
            {language === "sr"
              ? "Lokalne UI komande i dalje rade."
              : "Local window commands still work."}
          </div>
        )}
        {session.error && session.connection !== "offline" && (
          <div className="minimal-error" role="alert">
            {session.errorMessage || text.chatError}
          </div>
        )}
        {(voice.transcript || voice.error || voice.notice) && (
          <div className="voice-feedback" aria-live="polite">
            {voice.transcript && (
              <p>
                {" "}
                {language === "sr" ? "Prepoznato" : "Transcription"}:{" "}
                {voice.transcript}
              </p>
            )}
            {voice.error && <p role="alert">{voice.error}</p>}
            {voice.playbackReady && (
              <button
                type="button"
                className="subtle-control"
                onClick={() => void voice.resume()}
              >
                Play reply
              </button>
            )}
            {voice.notice && <p>{voice.notice}</p>}
          </div>
        )}
        <CommandConsole
          draft={draft}
          setDraft={setDraft}
          submit={submit}
          sending={session.sending || voiceActive}
          connection={session.connection}
          state={coreState}
          text={text}
          voiceState={voice.state}
          onVoice={() =>
            voice.state === "listening" ? voice.stop() : voice.start()
          }
          cancelVoice={voice.cancel}
          canSend={canSend}
        />
      </div>
    </div>
  );
}
