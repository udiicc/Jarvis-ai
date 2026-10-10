import { describe, expect, it } from "vitest";
import { parseUICommand } from "./commands";
describe("safe bilingual UI command routing", () => {
  it.each([
    ["Jarvis, bring up my task list.", { action: "open", window: "tasks" }],
    ["Jarvis, show my calendar.", { action: "open", window: "calendar" }],
    ["Jarvis, display my emails.", { action: "open", window: "emails" }],
    [
      "Jarvis, show my conversations.",
      { action: "open", window: "conversations" },
    ],
    ["Jarvis, open settings.", { action: "open", window: "settings" }],
    ["Jarvis, close the task list.", { action: "close", window: "tasks" }],
    ["Jarvis, close all windows.", { action: "close-all" }],
    ["Jarvis, close everything.", { action: "close-all" }],
    ["Jarvise, prikaži zadatke.", { action: "open", window: "tasks" }],
    ["Jarvise, otvori kalendar.", { action: "open", window: "calendar" }],
    ["Jarvise, zatvori sve prozore.", { action: "close-all" }],
    ["Џарвисе, прикажи задатке.", { action: "open", window: "tasks" }],
    ["Minimize calendar", { action: "minimize", window: "calendar" }],
    ["Restore calendar", { action: "open", window: "calendar" }],
  ])("routes %s", (text, expected) =>
    expect(parseUICommand(text)).toEqual(expected),
  );
  it.each([
    "What do you think about calendar apps?",
    "open calendar and run rm -rf /",
    "show emails; alert(1)",
    "execute javascript",
    "hello",
    "open my secrets",
    "",
  ])("leaves unknown or compound input to chat: %s", (text) =>
    expect(parseUICommand(text)).toBeNull(),
  );
});
