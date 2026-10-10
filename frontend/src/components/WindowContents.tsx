import { ShieldCheck } from "lucide-react";
import type { WindowId } from "../commands";
import type { Language } from "../api";
import type { JarvisSession } from "../hooks/useJarvis";
import { copy } from "../copy";
import ConversationPanel from "./ConversationPanel";
import CommandHistory from "./CommandHistory";

const futureDescriptions: Partial<Record<WindowId, string>> = {
  tasks:
    "Task storage and execution are not implemented. No tasks have been created or run.",
  calendar:
    "No calendar integration is connected. There are no authenticated events to display.",
  emails:
    "No email integration is connected. No inbox, unread count, senders, or subjects are available.",
  messages:
    "No messaging integration is connected. No unread count, senders, or previews are available.",
  agents:
    "No background agents are running. This module belongs to a later milestone.",
  memory:
    "Persistent storage is not connected. Current history exists only in this browser session.",
  tools: "No file access, shell execution, or computer tools are connected.",
  workflows:
    "No automated workflows are enabled. Future actions will require explicit approval.",
};
export default function WindowContents({
  id,
  session,
  language,
  motion,
  setMotion,
  privacy,
  setPrivacy,
  reducedMotion,
}: {
  id: WindowId;
  session: JarvisSession;
  language: Language;
  motion: boolean;
  setMotion: (value: boolean) => void;
  privacy: boolean;
  setPrivacy: (value: boolean) => void;
  reducedMotion: boolean;
}) {
  const text = copy[language];
  if (id === "conversations")
    return (
      <div className="window-conversations">
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
    );
  if (id === "settings")
    return (
      <div className="compact-settings">
        <h3>
          {language === "sr" ? "Podešavanja sesije" : "Session preferences"}
        </h3>
        <div className="compact-setting">
          <div>
            <strong>Interface motion</strong>
            <p>System reduced-motion preferences always take priority.</p>
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
        <label className="privacy-setting">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(event) => setPrivacy(event.target.checked)}
          />
          <span>
            Keep integration previews private
            <small>
              Private by default. No integrations are connected yet.
            </small>
          </span>
        </label>
        <div className="compact-setting">
          <div>
            <strong>Backend connection</strong>
            <p>Health checks pause when this tab is hidden.</p>
          </div>
          <button
            className="technical-button"
            disabled={session.checking}
            onClick={() => void session.refresh()}
          >
            Check connection
          </button>
        </div>
        <p className="window-footnote">
          <ShieldCheck size={13} />
          Backend-only credentials. No computer actions.
        </p>
      </div>
    );
  if (id === "help")
    return (
      <div className="command-guide">
        <p>
          Known commands control these windows locally. Other text goes to the
          assistant.
        </p>
        <dl>
          <dt>Open a window</dt>
          <dd>Jarvis, bring up my task list.</dd>
          <dd>Jarvis, show my conversations.</dd>
          <dd>Jarvise, otvori kalendar.</dd>
          <dd>Jarvise, prikaži zadatke.</dd>
          <dt>Manage windows</dt>
          <dd>Minimize calendar.</dd>
          <dd>Close the task list.</dd>
          <dd>Jarvise, zatvori sve prozore.</dd>
        </dl>
        <p className="window-footnote">
          Command-K focuses the input. Window move/resize handles support arrow
          keys; Shift moves faster.
        </p>
      </div>
    );
  return (
    <div className="integration-empty">
      <span className="empty-orbit" aria-hidden="true" />
      <h3>{language === "sr" ? "Nije povezano" : "Not connected"}</h3>
      <p>{futureDescriptions[id]}</p>
      <span className="integration-honesty">
        No sample data · No actions executed
      </span>
    </div>
  );
}
