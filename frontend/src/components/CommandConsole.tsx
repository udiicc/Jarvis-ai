import type { VoiceState } from "../hooks/useVoice";
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
  canSend,
  voiceState,
  onVoice,
  cancelVoice,
}: {
  draft: string;
  setDraft: (value: string) => void;
  submit: () => void;
  sending: boolean;
  connection: Connection;
  state: CoreState;
  text: Copy;
  canSend: boolean;
  voiceState: VoiceState;
  onVoice: () => void;
  cancelVoice: () => void;
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
      <span id="voice-unavailable" className="sr-only">
        Click to record; click again to stop and transcribe. Audio remains
        local.
      </span>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="command-form"
      >
        <button
          className="talk-control"
          type="button"
          aria-label={
            voiceState === "listening" ? "Stop recording" : "Start recording"
          }
          disabled={sending && voiceState !== "listening"}
          onClick={onVoice}
          aria-pressed={voiceState === "listening"}
          title="Local push-to-talk: click to start, click to stop"
          aria-describedby="voice-unavailable"
        >
          <span className="talk-icon">
            <Mic size={20} strokeWidth={1.5} />
          </span>
          <span>
            <strong>{text.talk}</strong>
            <small aria-live="polite">
              {voiceState === "idle" ? "Local push-to-talk" : voiceState}
            </small>
          </span>
        </button>
        {!["idle", "error"].includes(voiceState) && (
          <button
            type="button"
            className="subtle-control"
            onClick={cancelVoice}
            aria-label="Cancel voice"
          >
            Cancel
          </button>
        )}
        <div className="command-input-group">
          <span className="command-prompt">›</span>
          <input
            id="command-input"
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
            disabled={!draft.trim() || sending || !canSend}
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
