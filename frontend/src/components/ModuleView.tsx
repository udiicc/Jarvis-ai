import {
  ArrowLeft,
  ArrowUpRight,
  BrainCircuit,
  Boxes,
  GitBranch,
  Layers3,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { Copy } from "../copy";
import type { ModuleId } from "../types";
import type { JarvisSession } from "../hooks/useJarvis";

const futureModules = {
  tasks: {
    icon: Layers3,
    description: "A dedicated space for planning and reviewing tasks.",
    detail: "Task execution is not available in this milestone.",
  },
  agents: {
    icon: Boxes,
    description: "Specialized assistants, coordinated under your control.",
    detail: "No background agents are running.",
  },
  memory: {
    icon: BrainCircuit,
    description: "Continuity across conversations, with deliberate controls.",
    detail:
      "Persistent storage is not connected. Current history exists only in this browser session.",
  },
  tools: {
    icon: SlidersHorizontal,
    description: "Carefully scoped capabilities for your personal assistant.",
    detail: "No file access, shell execution, or computer tools are connected.",
  },
  workflows: {
    icon: GitBranch,
    description: "Repeatable sequences, reviewed and approved by you.",
    detail: "No automated workflows are enabled.",
  },
};
export function ComingSoon({
  module,
  text,
  navigate,
}: {
  module: keyof typeof futureModules;
  text: Copy;
  navigate: (module: ModuleId) => void;
}) {
  const { icon: Icon, description, detail } = futureModules[module];
  return (
    <section className="module-view hud-panel">
      <div className="module-view-code">
        MODULE / {module.toUpperCase()} <span>NOT CONNECTED</span>
      </div>
      <div className="module-blueprint">
        <Icon size={60} strokeWidth={0.8} />
        <span />
        <span />
      </div>
      <span className="eyebrow">{text.comingSoon}</span>
      <h1>{text[module]}</h1>
      <p className="module-description">{description}</p>
      <p>{detail}</p>
      <div className="module-approval">
        <ShieldCheck size={14} />
        Future computer actions will require explicit approval.
      </div>
      <button className="technical-button" onClick={() => navigate("command")}>
        <ArrowLeft size={14} />
        {text.back}
      </button>
    </section>
  );
}
export function SettingsView({
  text,
  motion,
  setMotion,
  session,
  navigate,
}: {
  text: Copy;
  motion: boolean;
  setMotion: (value: boolean) => void;
  session: JarvisSession;
  navigate: (module: ModuleId) => void;
}) {
  return (
    <section className="settings-view hud-panel">
      <header className="hud-heading">
        <div>
          <Settings2 size={14} />
          <h2>{text.settings}</h2>
        </div>
        <span className="telemetry-code">LOCAL</span>
      </header>
      <h1>Make the interface yours.</h1>
      <p className="settings-intro">
        Preferences apply to this session. No configuration files are changed.
      </p>
      <div className="setting-row">
        <div>
          <h3>Interface motion</h3>
          <p>
            Orbital movement and reactive visualization. System reduced-motion
            preferences always take priority.
          </p>
        </div>
        <button
          className={`motion-toggle ${motion ? "enabled" : ""}`}
          aria-label="Interface motion"
          aria-pressed={motion}
          onClick={() => setMotion(!motion)}
        >
          <span />
          {motion ? "On" : "Off"}
        </button>
      </div>
      <div className="setting-row">
        <div>
          <h3>Backend connection</h3>
          <p>Health checks run every 10 seconds while this tab is visible.</p>
        </div>
        <button
          className="technical-button"
          disabled={session.checking}
          onClick={() => void session.refresh()}
        >
          Check connection
        </button>
      </div>
      <div className="setting-row">
        <div>
          <h3>Interface language</h3>
          <p>
            Choose English or Serbian using the selector in the top bar. Chat
            requests use the selected language.
          </p>
        </div>
        <span className="language-options">EN / SR</span>
      </div>
      <div className="settings-boundary">
        <ShieldCheck size={18} />
        <div>
          <h3>Local by design</h3>
          <p>
            Mock responses only. No API keys, microphone access, persistent
            memory, or computer automation.
          </p>
        </div>
      </div>
      <button className="technical-button" onClick={() => navigate("command")}>
        {text.back}
        <ArrowUpRight size={14} />
      </button>
    </section>
  );
}
