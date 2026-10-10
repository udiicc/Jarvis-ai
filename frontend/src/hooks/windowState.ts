import type { WindowId } from "../commands";
export interface Bounds {
  width: number;
  height: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface HoloWindow {
  id: WindowId;
  minimized: boolean;
  closing: boolean;
  layer: number;
  rect: Rect;
}
export interface WindowState {
  windows: HoloWindow[];
  layer: number;
  bounds: Bounds;
}
export type WindowAction =
  | { type: "open" | "close" | "remove" | "minimize" | "focus"; id: WindowId }
  | { type: "rect"; id: WindowId; rect: Rect }
  | { type: "bounds"; bounds: Bounds };
export function clampRect(rect: Rect, bounds: Bounds): Rect {
  const width = Math.min(
    Math.max(260, rect.width),
    Math.max(1, bounds.width >= 900 ? bounds.width * 0.48 : bounds.width),
  );
  const height = Math.min(
    Math.max(220, rect.height),
    Math.max(1, bounds.height),
  );
  return {
    width,
    height,
    x: Math.max(0, Math.min(rect.x, bounds.width - width)),
    y: Math.max(0, Math.min(rect.y, bounds.height - height)),
  };
}
export function windowReducer(
  state: WindowState,
  action: WindowAction,
): WindowState {
  if (action.type === "bounds")
    return {
      ...state,
      bounds: action.bounds,
      windows: state.windows.map((item) => ({
        ...item,
        rect: clampRect(item.rect, action.bounds),
      })),
    };
  if (action.type === "remove")
    return {
      ...state,
      windows: state.windows.filter((item) => item.id !== action.id),
    };
  if (action.type === "open") {
    const layer = state.layer + 1;
    const found = state.windows.find((item) => item.id === action.id);
    if (found)
      return {
        ...state,
        layer,
        windows: state.windows.map((item) =>
          item.id === action.id
            ? { ...item, minimized: false, closing: false, layer }
            : item,
        ),
      };
    const index = state.windows.length,
      width = action.id === "conversations" ? 410 : 350,
      height = action.id === "conversations" ? 450 : 380;
    const rect = clampRect(
      {
        x: index % 2 === 0 ? 24 : state.bounds.width - width - 24,
        y: 90 + (Math.floor(index / 2) % 3) * 35,
        width,
        height,
      },
      state.bounds,
    );
    return {
      ...state,
      layer,
      windows: [
        ...state.windows,
        { id: action.id, minimized: false, closing: false, layer, rect },
      ],
    };
  }
  if (action.type === "rect")
    return {
      ...state,
      windows: state.windows.map((item) =>
        item.id === action.id
          ? { ...item, rect: clampRect(action.rect, state.bounds) }
          : item,
      ),
    };
  if (action.type === "focus")
    return {
      ...state,
      layer: state.layer + 1,
      windows: state.windows.map((item) =>
        item.id === action.id ? { ...item, layer: state.layer + 1 } : item,
      ),
    };
  return {
    ...state,
    windows: state.windows.map((item) =>
      item.id === action.id
        ? { ...item, [action.type === "close" ? "closing" : "minimized"]: true }
        : item,
    ),
  };
}
