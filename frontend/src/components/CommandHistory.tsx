import { ArrowUpRight, Check, Clock3, X } from "lucide-react";
import type { Language } from "../api";
import { timeLabel, type Copy } from "../copy";
import type { CommandEntry } from "../types";

export default function CommandHistory({
  history,
  text,
  language,
}: {
  history: CommandEntry[];
  text: Copy;
  language: Language;
}) {
  return (
    <section className="command-history hud-panel" aria-label={text.history}>
      <header className="hud-heading">
        <div>
          <Clock3 size={13} />
          <h2>{text.history}</h2>
        </div>
        <span className="telemetry-code">
          {String(history.length).padStart(2, "0")}
        </span>
      </header>
      {history.length === 0 ? (
        <div className="history-empty">
          <ArrowUpRight size={15} />
          <p>{text.empty}</p>
          <span>READY FOR INPUT</span>
        </div>
      ) : (
        <ol>
          {history.map((item) => (
            <li key={item.id} className={item.result}>
              <span className="history-state-icon">
                {item.result === "complete" ? (
                  <Check size={12} />
                ) : item.result === "failed" ? (
                  <X size={12} />
                ) : (
                  <Clock3 size={12} />
                )}
              </span>
              <div>
                <p>{item.text}</p>
                <span>
                  {item.result === "complete"
                    ? "Mock response"
                    : item.result === "failed"
                      ? "Request failed"
                      : "Pending"}{" "}
                  ·{" "}
                  <time dateTime={item.timestamp}>
                    {timeLabel(item.timestamp, language)}
                  </time>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
