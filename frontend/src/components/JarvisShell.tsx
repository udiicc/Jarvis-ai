import { useEffect, useState } from "react";
import { ChevronRight, Globe2, Menu, ShieldCheck } from "lucide-react";
import type { Language } from "../api";
import type { Copy } from "../copy";
import type { JarvisSession } from "../hooks/useJarvis";
import type { ModuleId } from "../types";
import SystemSidebar from "./SystemSidebar";
import SystemTelemetry from "./SystemTelemetry";

export default function JarvisShell({
  children,
  console: commandConsole,
  module,
  navigate,
  session,
  text,
  language,
  setLanguage,
  paused,
}: {
  children: React.ReactNode;
  console: React.ReactNode;
  module: ModuleId;
  navigate: (module: ModuleId) => void;
  session: JarvisSession;
  text: Copy;
  language: Language;
  setLanguage: (language: Language) => void;
  paused: boolean;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavigationOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <div className="jarvis-shell" data-motion={paused ? "paused" : "active"}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to command center
      </a>
      <SystemSidebar
        module={module}
        navigate={navigate}
        connection={session.connection}
        text={text}
        open={navigationOpen}
        close={() => setNavigationOpen(false)}
      />
      <div className="shell-workspace">
        <header className="shell-topbar">
          <div className="topbar-location">
            <button
              className="mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={navigationOpen}
              onClick={() => setNavigationOpen(!navigationOpen)}
            >
              <Menu size={18} />
            </button>
            <span className="location-prefix">JARVIS OS</span>
            <ChevronRight size={12} />
            <strong>{text[module]}</strong>
          </div>
          <div className="topbar-controls">
            <span className="session-security">
              <ShieldCheck size={12} />
              LOCAL SESSION
            </span>
            <label className="language-selector">
              <Globe2 size={13} />
              <select
                aria-label="Language"
                value={language}
                onChange={(event) =>
                  setLanguage(event.target.value as Language)
                }
              >
                <option value="en">English</option>
                <option value="sr">Srpski</option>
              </select>
            </label>
            <div className="user-token" aria-label="Personal workspace">
              U<span />
            </div>
          </div>
        </header>
        <div className="workspace-body">
          <main id="main-content" className="main-content" tabIndex={-1}>
            {children}
          </main>
          <SystemTelemetry session={session} language={language} />
        </div>
        {commandConsole}
        <footer className="shell-footer">
          <span>
            <i className={`status-dot ${session.connection}`} />
            JARVIS / PERSONAL INTELLIGENCE SYSTEM
          </span>
          <span>
            FOUNDATION 01 <i /> BUILT FOR macOS
          </span>
        </footer>
      </div>
    </div>
  );
}
