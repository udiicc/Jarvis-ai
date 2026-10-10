import { useEffect, useReducer, useRef } from "react";
import type { UIIntent, WindowId } from "../commands";
import { windowReducer, type Bounds, type Rect } from "./windowState";
export function useWindows(bounds: Bounds, reducedMotion: boolean) {
  const [state, dispatch] = useReducer(windowReducer, {
    windows: [],
    layer: 0,
    bounds,
  });
  const timers = useRef(new Map<WindowId, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    dispatch({ type: "bounds", bounds });
  }, [bounds.width, bounds.height]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  const open = (id: WindowId) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    dispatch({ type: "open", id });
  };
  const close = (id: WindowId) => {
    if (timers.current.has(id)) return;
    dispatch({ type: "close", id });
    timers.current.set(
      id,
      setTimeout(
        () => {
          dispatch({ type: "remove", id });
          timers.current.delete(id);
        },
        reducedMotion ? 0 : 320,
      ),
    );
  };
  const closeAll = () => state.windows.forEach((item) => close(item.id));
  const run = (intent: UIIntent) => {
    if (intent.action === "close-all") closeAll();
    else if (intent.action === "open") open(intent.window);
    else if (intent.action === "close") close(intent.window);
    else dispatch({ type: "minimize", id: intent.window });
  };
  return {
    windows: state.windows,
    open,
    close,
    closeAll,
    run,
    focus: (id: WindowId) => dispatch({ type: "focus", id }),
    minimize: (id: WindowId) => dispatch({ type: "minimize", id }),
    setRect: (id: WindowId, rect: Rect) => dispatch({ type: "rect", id, rect }),
  };
}
export type WindowManager = ReturnType<typeof useWindows>;
