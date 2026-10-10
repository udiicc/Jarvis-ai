import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Cpu,
  Radio,
  RefreshCw,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import type { Language } from "../api";
import { timeLabel } from "../copy";
import type { JarvisSession } from "../hooks/useJarvis";
import type { SessionEvent } from "../types";

function TelemetryHeading({
  icon,
  title,
  code,
}: {
  icon: React.ReactNode;
  title: string;
  code: string;
}) {
  return (
    <header className="hud-heading">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      <span className="telemetry-code">{code}</span>
    </header>
  );
}
export function ActivityFeed({
  events,
  language,
}: {
  events: SessionEvent[];
  language: Language;
}) {
  return (
    <section className="telemetry-section activity-feed">
      <TelemetryHeading
        icon={<Activity size={13} />}
        title="Activity feed"
        code="LIVE"
      />
      <ol>
        {events.length === 0 ? (
          <li className="event-placeholder">Waiting for system events.</li>
        ) : (
          events.slice(0, 5).map((event) => (
            <li className={`activity-event ${event.kind}`} key={event.id}>
              <span className="event-glyph">
                {event.kind === "request" ? (
                  <ArrowUpRight size={12} />
                ) : event.kind === "response" ? (
                  <ArrowDownLeft size={12} />
                ) : event.kind === "error" ? (
                  <X size={12} />
                ) : (
                  <Check size={12} />
                )}
              </span>
              <div>
                <p>{event.text}</p>
                <time dateTime={event.timestamp}>
                  {timeLabel(event.timestamp, language)}
                </time>
              </div>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
export function ModuleStatus({ session }: { session: JarvisSession }) {
  const capabilities = session.status?.capabilities;
  const rows = [
    { name: "Voice interface", enabled: capabilities?.voice },
    { name: "Persistent memory", enabled: capabilities?.memory },
    { name: "Computer automation", enabled: capabilities?.automation },
    { name: "Background agents", enabled: false },
    { name: "Tools & skills", enabled: false },
  ];
  return (
    <section className="telemetry-section module-status">
      <TelemetryHeading
        icon={<ShieldCheck size={13} />}
        title="Module status"
        code="05"
      />
      <div className="module-status-list">
        {rows.map((row) => (
          <div key={row.name}>
            <span>
              <i
                className={`status-dot ${row.enabled ? "online" : "neutral"}`}
              />
              {row.name}
            </span>
            <small>{row.enabled ? "Connected" : "Coming soon"}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
export default function SystemTelemetry({
  session,
  language,
}: {
  session: JarvisSession;
  language: Language;
}) {
  const {
    connection,
    status,
    checking,
    lastChecked,
    coreState,
    history,
    startedAt,
    messages,
  } = session;
  return (
    <aside className="system-telemetry" aria-label="System intelligence">
      <div className="telemetry-column-label">
        <Radio size={11} />
        <span>SYSTEM INTELLIGENCE</span>
        <span className="live-line" />
      </div>
      <section className="telemetry-section system-status">
        <TelemetryStatusHeading session={session} />
        <div className="system-connection">
          <span className={`status-dot ${connection}`} />
          <strong>
            {connection === "online"
              ? "Online"
              : connection === "offline"
                ? "Offline"
                : "Connecting"}
          </strong>
          <span className="connection-path">BACKEND</span>
        </div>
        <dl className="telemetry-rows">
          <div>
            <dt>Assistant mode</dt>
            <dd>{status?.mode === "mock" ? "Mock / local" : "Unavailable"}</dd>
          </div>
          <div>
            <dt>Target platform</dt>
            <dd>{status?.platform_target ?? "macOS"}</dd>
          </div>
          <div>
            <dt>Last check</dt>
            <dd>
              {lastChecked ? timeLabel(lastChecked, language) : "Pending"}
            </dd>
          </div>
        </dl>
        <div className="status-check-line">
          <span className={connection === "online" ? "healthy" : ""}>
            {connection === "online"
              ? "Health check passed"
              : "Awaiting backend"}
          </span>
          <span>10s refresh</span>
        </div>
      </section>
      <ActivityFeed events={session.events} language={language} />
      <section className="telemetry-section engine-status">
        <TelemetryHeading
          icon={<Cpu size={13} />}
          title="AI engine"
          code="MOCK"
        />
        <dl className="telemetry-rows">
          <div>
            <dt>Provider</dt>
            <dd className="muted">Not connected</dd>
          </div>
          <div>
            <dt>Request state</dt>
            <dd
              className={
                coreState === "error" || coreState === "offline"
                  ? "error-text"
                  : "cyan-text"
              }
            >
              {coreState}
            </dd>
          </div>
          <div>
            <dt>External AI calls</dt>
            <dd>None</dd>
          </div>
        </dl>
        <div className="engine-track" aria-hidden="true">
          <span className={coreState} />
        </div>
        {session.error && (
          <p className="engine-error">Last chat request failed.</p>
        )}
      </section>
      <ModuleStatus session={session} />
      <section className="telemetry-section session-info">
        <TelemetryHeading
          icon={<Terminal size={13} />}
          title="Session information"
          code="LOCAL"
        />
        <dl className="telemetry-rows">
          <div>
            <dt>Started</dt>
            <dd>{timeLabel(startedAt, language)}</dd>
          </div>
          <div>
            <dt>Messages</dt>
            <dd>{String(messages.length).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>Recent commands</dt>
            <dd>{history.length} / 20</dd>
          </div>
          <div>
            <dt>Persistence</dt>
            <dd className="muted">Session only</dd>
          </div>
        </dl>
      </section>
      <div className="telemetry-end">
        <span />
        END OF TELEMETRY
        <span />
      </div>
      <span className="sr-only">{checking ? "Checking backend" : ""}</span>
    </aside>
  );
}
function TelemetryStatusHeading({ session }: { session: JarvisSession }) {
  return (
    <header className="hud-heading">
      <div>
        <Activity size={13} />
        <h2>System status</h2>
      </div>
      <button
        className={
          session.checking ? "refresh-control checking" : "refresh-control"
        }
        aria-label="Refresh backend status"
        title="Refresh backend status"
        disabled={session.checking}
        onClick={() => void session.refresh()}
      >
        <RefreshCw size={12} />
      </button>
    </header>
  );
}
