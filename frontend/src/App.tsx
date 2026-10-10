import { useEffect, useState } from "react";
import type { Language } from "./api";
import { copy } from "./copy";
import { useJarvis } from "./hooks/useJarvis";
import { useNavigation } from "./hooks/useNavigation";
import { useVisibility } from "./hooks/useVisibility";
import JarvisShell from "./components/JarvisShell";
import CommandCenter from "./components/CommandCenter";
import CommandConsole from "./components/CommandConsole";
import { ComingSoon, SettingsView } from "./components/ModuleView";

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [draft, setDraft] = useState("");
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [motion, setMotion] = useState(true);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const visible = useVisibility();
  const session = useJarvis(language, visible);
  const { module, navigate } = useNavigation();
  const text = copy[language];
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
  const submit = () => {
    if (!draft.trim() || session.sending || session.connection !== "online")
      return;
    const message = draft;
    setDraft("");
    void session.submit(message);
  };
  return (
    <JarvisShell
      module={module}
      navigate={navigate}
      session={session}
      text={text}
      language={language}
      setLanguage={setLanguage}
      paused={!visible || !motion || systemReducedMotion}
      console={
        <>
          <div className="console-notices">
            {session.connection === "offline" && (
              <div className="system-notice error" role="alert">
                <span>CONNECTION /</span>
                {text.offline}
              </div>
            )}
            {session.error && session.connection !== "offline" && (
              <div className="system-notice error" role="alert">
                <span>REQUEST /</span>
                {text.chatError}
              </div>
            )}
            {voiceNotice && (
              <div id="voice-notice" className="system-notice" role="status">
                <span>VOICE /</span>
                {text.voice}
                <button
                  onClick={() => setVoiceNotice(false)}
                  aria-label="Dismiss voice notice"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <CommandConsole
            draft={draft}
            setDraft={setDraft}
            submit={submit}
            sending={session.sending}
            connection={session.connection}
            state={session.coreState}
            text={text}
            voiceNotice={voiceNotice}
            toggleVoice={() => setVoiceNotice(!voiceNotice)}
          />
        </>
      }
    >
      {module === "command" ||
      module === "core" ||
      module === "conversations" ? (
        <CommandCenter
          session={session}
          text={text}
          language={language}
          module={module}
          navigate={navigate}
          reducedMotion={!motion || systemReducedMotion}
        />
      ) : module === "settings" ? (
        <SettingsView
          text={text}
          motion={motion}
          setMotion={setMotion}
          session={session}
          navigate={navigate}
        />
      ) : (
        <ComingSoon module={module} text={text} navigate={navigate} />
      )}
    </JarvisShell>
  );
}
