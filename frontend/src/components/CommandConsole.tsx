import { useEffect, useRef } from "react";
import {
  AudioLines,
  CornerDownLeft,
  Mic,
  Send,
  ShieldCheck,
} from "lucide-react";
import type { Copy } from "../copy";
import type { Connection, CoreState } from "../types";

export default function CommandConsole({
  draft,
  setDraft,
  submit,
  sending,
  connection,
  state,
  text,
  voiceNotice,
  toggleVoice,
}: {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  sending: boolean;
  connection: Connection;
  state: CoreState;
  text: Copy;
  voiceNotice: boolean;
  toggleVoice: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <div className="command-console">
      <div className="console-topline">
        <span>
          <i className={`status-dot ${connection}`} />
          {sending
            ? text.processing
            : connection === "online"
              ? text.waiting
              : text.unavailable}
        </span>
        <span>
          <ShieldCheck size={10} />
          {text.noActions}
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="command-form"
      >
        <button
          className={`talk-control ${voiceNotice ? "show-notice" : ""}`}
          type="button"
          aria-label="Microphone — coming soon"
          aria-expanded={voiceNotice}
          aria-controls="voice-notice"
          onClick={toggleVoice}
        >
          <span className="talk-icon">
            <Mic size={20} strokeWidth={1.5} />
          </span>
          <span>
            <strong>{text.talk}</strong>
            <small>{text.voiceSoon}</small>
          </span>
        </button>
        <div className="command-input-group">
          <span className="command-prompt">›</span>
          <input
            ref={input}
            aria-label="Message"
            placeholder={text.placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            disabled={sending}
          />
          <kbd className="shortcut-key">⌘ K</kbd>
          <button
            className="command-send"
            type="submit"
            aria-label={text.send}
            disabled={!draft.trim() || sending || connection !== "online"}
          >
            <Send size={16} />
            <span>{sending ? "…" : <CornerDownLeft size={12} />}</span>
          </button>
        </div>
        <div className={`console-waveform ${state}`} aria-hidden="true">
          <AudioLines size={30} strokeWidth={1} />
          <span>
            TEXT
            <br />
            CHANNEL
          </span>
        </div>
      </form>
    </div>
  );
}
