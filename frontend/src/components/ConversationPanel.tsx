import { useEffect, useRef } from "react";
import { ArrowUpRight, MessageSquare, Sparkles } from "lucide-react";
import type { Language } from "../api";
import { timeLabel, type Copy } from "../copy";
import type { Message } from "../types";

// Render code as text, never as HTML; assistant content cannot execute scripts.
export function MessageContent({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="message-content">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const inside = part.slice(3, -3);
          const newline = inside.indexOf("\n");
          const hasLanguage =
            newline >= 0 && /^[\w+-]*$/.test(inside.slice(0, newline));
          return (
            <pre key={index}>
              <code>{hasLanguage ? inside.slice(newline + 1) : inside}</code>
            </pre>
          );
        }
        return part ? <p key={index}>{part}</p> : null;
      })}
    </div>
  );
}
export default function ConversationPanel({
  messages,
  sending,
  text,
  language,
  expanded = false,
  onExpand,
  reducedMotion,
}: {
  messages: Message[];
  sending: boolean;
  text: Copy;
  language: Language;
  expanded?: boolean;
  onExpand: () => void;
  reducedMotion: boolean;
}) {
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = log.current;
    node?.scrollTo?.({
      top: node.scrollHeight,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }, [messages, sending, reducedMotion]);
  return (
    <section
      className={`conversation-panel hud-panel ${expanded ? "expanded" : ""}`}
      aria-label={text.chat}
    >
      <header className="hud-heading">
        <div>
          <MessageSquare size={14} />
          <h2>{text.chat}</h2>
        </div>
        <div className="conversation-heading-actions">
          <span className="channel-tag">TEXT / LOCAL</span>
          {!expanded && (
            <button
              title="Open conversations"
              aria-label="Open conversations"
              onClick={onExpand}
            >
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </header>
      <div
        className="conversation-log"
        ref={log}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Conversation messages"
      >
        <article className="conversation-message assistant greeting">
          <div className="message-symbol">
            <Sparkles size={13} />
          </div>
          <div className="message-body">
            <header>
              <strong>JARVIS</strong>
              <span>LOCAL ASSISTANT</span>
            </header>
            <MessageContent text={text.greeting} />
          </div>
        </article>
        {messages.map((message) => (
          <article
            key={message.id}
            className={`conversation-message ${message.role}`}
          >
            <div className="message-symbol">
              {message.role === "assistant" ? <Sparkles size={13} /> : "U"}
            </div>
            <div className="message-body">
              <header>
                <strong>
                  {message.role === "assistant" ? "JARVIS" : text.you}
                </strong>
                <time dateTime={message.timestamp}>
                  {timeLabel(message.timestamp, language)}
                </time>
              </header>
              <MessageContent text={message.text} />
            </div>
          </article>
        ))}
        {sending && (
          <div className="processing-message" role="status">
            <span className="typing-dots">
              <i />
              <i />
              <i />
            </span>
            {text.processing}
          </div>
        )}
      </div>
      <div className="conversation-footnote">
        <span className="status-dot neutral" />
        {text.sessionOnly}
        <span>UTF-8 / EN · SR</span>
      </div>
    </section>
  );
}
