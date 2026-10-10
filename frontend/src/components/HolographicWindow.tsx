import { useEffect, useRef, type CSSProperties } from "react";
import { Grip, GripHorizontal, Minus, X } from "lucide-react";
import type { HoloWindow, Rect } from "../hooks/windowState";
import type { WindowManager } from "../hooks/useWindows";

export default function HolographicWindow({
  window: item,
  title,
  manager,
  active,
  compact,
  children,
}: {
  window: HoloWindow;
  title: string;
  manager: WindowManager;
  active: boolean;
  compact: boolean;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLElement>(null);
  const gesture = useRef<{
    mode: "move" | "resize";
    x: number;
    y: number;
    rect: Rect;
  } | null>(null);
  useEffect(() => {
    if (active && !item.closing && !root.current?.contains(document.activeElement)) {
      root.current?.focus({ preventScroll: true });
      if (compact) root.current?.scrollIntoView({block: "nearest", behavior: "instant"});
    }
  }, [active, item.closing, compact]);
  const focusInput = () =>
    document.getElementById("command-input")?.focus({ preventScroll: true });
  const change = (
    mode: "move" | "resize",
    dx: number,
    dy: number,
    rect = item.rect,
  ) =>
    manager.setRect(
      item.id,
      mode === "move"
        ? { ...rect, x: rect.x + dx, y: rect.y + dy }
        : { ...rect, width: rect.width + dx, height: rect.height + dy },
    );
  const pointerProps = (mode: "move" | "resize") => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (compact || event.button !== 0) return;
      event.preventDefault();
      manager.focus(item.id);
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = {
        mode,
        x: event.clientX,
        y: event.clientY,
        rect: item.rect,
      };
    },
    onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
      const start = gesture.current;
      if (!start) return;
      change(
        start.mode,
        event.clientX - start.x,
        event.clientY - start.y,
        start.rect,
      );
    },
    onPointerUp: () => {
      gesture.current = null;
    },
    onPointerCancel: () => {
      gesture.current = null;
    },
    onLostPointerCapture: () => {
      gesture.current = null;
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        compact ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const step = event.shiftKey ? 40 : 20;
      change(
        mode,
        event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0,
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
      );
    },
  });
  const style: CSSProperties = compact
    ? { zIndex: item.layer }
    : {
        left: item.rect.x,
        top: item.rect.y,
        width: item.rect.width,
        height: item.rect.height,
        zIndex: item.layer,
      };
  return (
    <section
      ref={root}
      className={`holographic-window ${item.closing ? "closing" : ""} ${active ? "focused" : ""}`}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`window-${item.id}-title`}
      aria-hidden={item.closing || undefined}
      inert={item.closing || undefined}
      tabIndex={-1}
      data-window={item.id}
      onFocusCapture={() => { if (!item.closing && !active) manager.focus(item.id); }}
      onPointerDown={() => {
        if (!item.closing && !active) manager.focus(item.id);
      }}
    >
      <div className="window-light-sweep" aria-hidden="true" />
      <header className="holo-window-header">
        <button
          className="window-drag-handle"
          aria-label={`Move ${title} window (arrow keys)`}
          disabled={compact}
          {...pointerProps("move")}
        >
          <GripHorizontal size={13} />
          <span id={`window-${item.id}-title`}>{title}</span>
        </button>
        <div className="window-controls">
          <button
            aria-label={`Minimize ${title}`}
            title="Minimize"
            onClick={() => {
              manager.minimize(item.id);
              focusInput();
            }}
          >
            <Minus size={13} />
          </button>
          <button
            aria-label={`Close ${title}`}
            title="Close"
            onClick={() => {
              manager.close(item.id);
              focusInput();
            }}
          >
            <X size={14} />
          </button>
        </div>
      </header>
      <div className="holo-window-content">{children}</div>
      {!compact && (
        <button
          className="window-resize-handle"
          aria-label={`Resize ${title} window (arrow keys)`}
          title="Drag to resize; arrow keys also work"
          {...pointerProps("resize")}
        >
          <Grip size={13} />
        </button>
      )}
    </section>
  );
}
