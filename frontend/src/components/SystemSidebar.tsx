import { useEffect, useRef } from "react";
import {
  X,
  Activity,
  BrainCircuit,
  Boxes,
  CircleDot,
  GitBranch,
  Layers3,
  MessageSquare,
  Orbit,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { Copy } from "../copy";
import type { Connection, ModuleId } from "../types";

export function JarvisSymbol() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 2 36 11v18l-16 9L4 29V11z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="m20 7 12 7v12l-12 7-12-7V14z"
        stroke="currentColor"
        opacity=".4"
      />
      <path
        d="M13 14h6v11l-4 3m12-14h-4v14"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="20" cy="3" r="2" fill="currentColor" />
    </svg>
  );
}
const navigation = [
  { id: "command", icon: Activity, number: "01" },
  { id: "core", icon: Orbit, number: "02" },
  { id: "conversations", icon: MessageSquare, number: "03" },
  { id: "tasks", icon: Layers3, number: "04" },
  { id: "agents", icon: Boxes, number: "05" },
  { id: "memory", icon: BrainCircuit, number: "06" },
  { id: "tools", icon: SlidersHorizontal, number: "07" },
  { id: "workflows", icon: GitBranch, number: "08" },
  { id: "settings", icon: Settings2, number: "09" },
] as const;
export default function SystemSidebar({
  module,
  navigate,
  connection,
  text,
  open,
  close,
}: {
  module: ModuleId;
  navigate: (module: ModuleId) => void;
  connection: Connection;
  text: Copy;
  open: boolean;
  close: () => void;
}) {
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation overlay"
          onClick={close}
        />
      )}
      <aside
        ref={sidebar}
        onKeyDown={(event) => {
          if (!open || event.key !== "Tab") return;
          const items = Array.from(
            sidebar.current?.querySelectorAll<HTMLElement>("a, button") ?? [],
          ).filter((item) => item.getClientRects().length > 0);
          const first = items[0],
            last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        className={`system-sidebar ${open ? "is-open" : ""}`}
        aria-label="System navigation"
      >
        <a
          className="system-brand"
          href="#command"
          onClick={(event) => {
            event.preventDefault();
            navigate("command");
            close();
          }}
        >
          <JarvisSymbol />
          <div>
            <strong>J.A.R.V.I.S.</strong>
            <span>PERSONAL AI SYSTEM</span>
          </div>
        </a>
        <button
          className="sidebar-close"
          aria-label="Close navigation"
          onClick={close}
        >
          <X size={17} />
        </button>
        <div className="sidebar-system-tag">
          <span className={`status-dot ${connection}`} />
          <span>
            {connection === "online"
              ? "Backend connected"
              : connection === "offline"
                ? "Backend offline"
                : "Establishing connection"}
          </span>
        </div>
        <div className="nav-section-label">
          SYSTEM MODULES <span>09</span>
        </div>
        <nav>
          {navigation.map(({ id, icon: Icon, number }) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={module === id ? "page" : undefined}
              className={`system-nav-item ${module === id ? "selected" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(id);
                close();
              }}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span>{text[id]}</span>
              <small>{number}</small>
              {!["command", "core", "conversations", "settings"].includes(
                id,
              ) && <span className="future-dot" title="Coming soon" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-privacy">
            <ShieldCheck size={18} />
            <span>Built around your control.</span>
          </div>
          <p>
            No autonomous actions.
            <br />
            No external model connected.
          </p>
          <div className="sidebar-footer-row">
            <span>BACKEND</span>
            <b className={connection}>
              {connection === "online" ? "CONNECTED" : connection.toUpperCase()}
            </b>
          </div>
          <div className="sidebar-footer-row">
            <span>PROVIDER</span>
            <b>NOT CONNECTED</b>
          </div>
          <div className="sidebar-version">
            <CircleDot size={11} />
            <span>
              JARVIS OS <b>v0.1.0</b>
            </span>
            <span>macOS</span>
          </div>
        </div>
      </aside>
    </>
  );
}
