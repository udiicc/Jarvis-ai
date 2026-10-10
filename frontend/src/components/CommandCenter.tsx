import { ArrowUpRight, CircleDot, Radio, ShieldCheck } from "lucide-react";
import type { Language } from "../api";
import type { Copy } from "../copy";
import type { JarvisSession } from "../hooks/useJarvis";
import type { ModuleId } from "../types";
import JarvisCore from "./JarvisCore";
import ConversationPanel from "./ConversationPanel";
import CommandHistory from "./CommandHistory";

export default function CommandCenter({
  session,
  text,
  language,
  module,
  navigate,
  reducedMotion,
}: {
  session: JarvisSession;
  text: Copy;
  language: Language;
  module: "command" | "core" | "conversations";
  navigate: (module: ModuleId) => void;
  reducedMotion: boolean;
}) {
  if (module === "conversations")
    return (
      <div className="conversation-workspace">
        <div className="workspace-section-title">
          <span className="eyebrow">CONVERSATION ARCHIVE / SESSION</span>
          <h1>{text.conversations}</h1>
          <p>One local channel. Your messages stay in this session.</p>
        </div>
        <div className="expanded-conversation-grid">
          <ConversationPanel
            messages={session.messages}
            sending={session.sending}
            text={text}
            language={language}
            expanded
            onExpand={() => {}}
            reducedMotion={reducedMotion}
          />
          <CommandHistory
            history={session.history}
            text={text}
            language={language}
          />
        </div>
      </div>
    );
  return (
    <div
      className={`command-center ${module === "core" ? "core-inspection" : ""}`}
    >
      <section className="ai-stage" aria-label="AI core stage">
        <div className="stage-topline">
          <div>
            <span className="eyebrow">
              {module === "core"
                ? "COGNITIVE INTERFACE"
                : "INTELLIGENCE COMMAND CENTER"}
            </span>
            <h1>{text.title}</h1>
          </div>
          <div className="stage-session-badge">
            <span className={`status-dot ${session.connection}`} />
            {text.localMode}
          </div>
        </div>
        <div className="core-stage-grid">
          <div className="stage-axis axis-horizontal" />
          <div className="stage-axis axis-vertical" />
          <div className="stage-crosshair crosshair-tl" />
          <div className="stage-crosshair crosshair-br" />
          <div className="stage-float-label label-top-left">
            <span>01 / INPUT</span>
            <strong>Text channel</strong>
            <div className="mini-signal">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="stage-float-label label-top-right">
            <span>ENGINE / LOCAL</span>
            <strong>
              {session.status?.mode === "mock"
                ? "Mock assistant"
                : "Unavailable"}
            </strong>
            <small>No model connected</small>
          </div>
          <JarvisCore state={session.coreState} focused={module === "core"} />
          <div className="stage-float-label label-bottom-left">
            <ShieldCheck size={13} />
            <span>USER CONTROLLED</span>
            <small>Automation unavailable</small>
          </div>
          <div className="stage-float-label label-bottom-right">
            <Radio size={13} />
            <span>CHANNEL / EN · SR</span>
            <small>Voice not connected</small>
          </div>
        </div>
        <div className="stage-bottomline">
          <span>
            <CircleDot size={11} /> {text.subtitle}
          </span>
          <button
            onClick={() => navigate(module === "core" ? "command" : "core")}
          >
            {module === "core" ? text.command : "Inspect AI core"}
            <ArrowUpRight size={12} />
          </button>
        </div>
      </section>
      {module === "command" ? (
        <div className="stage-lower-grid">
          <ConversationPanel
            messages={session.messages}
            sending={session.sending}
            text={text}
            language={language}
            onExpand={() => navigate("conversations")}
            reducedMotion={reducedMotion}
          />
          <CommandHistory
            history={session.history}
            text={text}
            language={language}
          />
        </div>
      ) : (
        <div className="core-inspection-details hud-panel">
          <span>VISUALIZATION / SVG + CSS</span>
          <p>
            Orbital activity follows the real request state. The neural field is
            a procedural visual, not live model telemetry.
          </p>
          <span>STATE / {session.coreState.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
