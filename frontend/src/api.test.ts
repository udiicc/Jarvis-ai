import { afterEach, expect, it, vi } from "vitest";
import { sendMessage } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("sends context to the backend only with no credentials", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({
      ok: true,
      json: async () => ({ reply: "Hi", mode: "openai" }),
    });
  vi.stubGlobal("fetch", fetchMock);
  const history = [{ role: "user" as const, content: "Hello" }];
  await sendMessage("Continue", "sr", history);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/chat");
  expect(options.headers).toEqual({ "Content-Type": "application/json" });
  expect(JSON.parse(options.body)).toEqual({
    message: "Continue",
    language: "sr",
    history,
  });
});
it("renders allowlisted backend errors instead of raw unexpected error bodies", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          code: "authentication",
          detail: "Check the backend API key.",
        }),
      }),
  );
  await expect(sendMessage("Hello", "en")).rejects.toThrow(
    "Check the backend API key.",
  );
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ detail: "private internal provider data" }),
      }),
  );
  await expect(sendMessage("Hello", "en")).rejects.toThrow(
    "Backend request failed (500)",
  );
});
