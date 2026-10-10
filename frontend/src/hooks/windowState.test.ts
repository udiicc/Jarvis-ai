import { describe, expect, it } from "vitest";
import { clampRect, windowReducer, type WindowState } from "./windowState";
const initial: WindowState = {
  windows: [],
  layer: 0,
  bounds: { width: 1440, height: 740 },
};
describe("window management", () => {
  it("opens once, focuses, minimizes, and restores without losing placement", () => {
    let state = windowReducer(initial, { type: "open", id: "tasks" });
    const rect = state.windows[0].rect;
    state = windowReducer(state, { type: "open", id: "calendar" });
    state = windowReducer(state, { type: "minimize", id: "tasks" });
    expect(state.windows[0].minimized).toBe(true);
    state = windowReducer(state, { type: "open", id: "tasks" });
    expect(state.windows).toHaveLength(2);
    expect(state.windows[0]).toMatchObject({
      rect,
      minimized: false,
      closing: false,
    });
    expect(state.windows[0].layer).toBeGreaterThan(state.windows[1].layer);
    state = windowReducer(state, { type: "close", id: "tasks" });
    expect(state.windows[0].closing).toBe(true);
    state = windowReducer(state, { type: "remove", id: "tasks" });
    expect(state.windows.map((w) => w.id)).toEqual(["calendar"]);
  });
  it("clamps dragging, resizing and viewport changes inside the stage", () => {
    let state = windowReducer(initial, { type: "open", id: "settings" });
    state = windowReducer(state, {
      type: "rect",
      id: "settings",
      rect: { x: 9000, y: -500, width: 9999, height: 9999 },
    });
    const rect = state.windows[0].rect;
    expect(rect.x + rect.width).toBeLessThanOrEqual(initial.bounds.width);
    expect(rect.y).toBe(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(initial.bounds.height);
    expect(rect.width).toBeLessThan(initial.bounds.width / 2);
    state = windowReducer(state, {
      type: "bounds",
      bounds: { width: 390, height: 500 },
    });
    expect(
      state.windows[0].rect.x + state.windows[0].rect.width,
    ).toBeLessThanOrEqual(390);
    expect(
      clampRect(
        { x: -1, y: 20, width: 1, height: 1 },
        { width: 150, height: 100 },
      ),
    ).toEqual({ x: 0, y: 0, width: 150, height: 100 });
  });
});
