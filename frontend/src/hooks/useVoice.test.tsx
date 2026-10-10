import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useVoice } from "./useVoice";
class Recorder {
  static isTypeSupported = () => true;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable?: (e: { data: Blob }) => void;
  onstop?: () => void;
  static last: Recorder;
  constructor() {
    Recorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"]) });
    this.onstop?.();
  }
}
const stop = vi.fn(),
  media = vi.fn();
beforeEach(() => {
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: media },
  });
  media.mockResolvedValue({ getTracks: () => [{ stop }] });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "Jarvise, otvori zadatke." }),
      headers: { get: () => "true" },
      blob: async () => new Blob(["wav"]),
    }),
  );
  URL.createObjectURL = vi.fn(() => "blob:local");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("requires explicit action, records then transcribes and routes text", async () => {
  const recognized = vi.fn().mockResolvedValue(null);
  const { result } = renderHook(() => useVoice("sr", recognized));
  expect(media).not.toHaveBeenCalled();
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.state).toBe("listening");
  await act(async () => {
    result.current.stop();
  });
  await waitFor(() =>
    expect(recognized).toHaveBeenCalledWith(
      "Jarvise, otvori zadatke.",
      expect.any(AbortSignal),
    ),
  );
  expect(result.current.transcript).toBe("Jarvise, otvori zadatke.");
  expect(result.current.state).toBe("idle");
  expect(stop).toHaveBeenCalled();
});
it("reports permission denial and never uploads", async () => {
  media.mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"));
  const { result } = renderHook(() => useVoice("en", vi.fn()));
  await act(async () => {
    await result.current.start();
  });
  expect(result.current.error).toMatch(/permission denied/);
  expect(fetch).not.toHaveBeenCalled();
});
it("cancels recording without transcription or assistant calls", async () => {
  const recognized = vi.fn();
  const { result } = renderHook(() => useVoice("en", recognized));
  await act(async () => {
    await result.current.start();
  });
  act(() => result.current.cancel());
  expect(result.current.state).toBe("idle");
  expect(recognized).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalled();
});
it("handles transcription errors without inference", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ detail: "Model missing" }),
  } as Response);
  const recognized = vi.fn();
  const { result } = renderHook(() => useVoice("en", recognized));
  await act(async () => {
    await result.current.start();
    result.current.stop();
  });
  await waitFor(() => expect(result.current.error).toBe("Model missing"));
  expect(recognized).not.toHaveBeenCalled();
});
it("speaks only the final answer and cancels playback", async () => {
  const pause = vi.fn();
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn().mockResolvedValue(undefined);
      pause = pause;
    },
  );
  const { result } = renderHook(() =>
    useVoice("en", vi.fn().mockResolvedValue("Final answer")),
  );
  await act(async () => {
    await result.current.start();
    result.current.stop();
  });
  await waitFor(() => expect(result.current.state).toBe("speaking"));
  const calls = vi.mocked(fetch).mock.calls;
  expect(JSON.parse(calls[1][1]?.body as string).text).toBe("Final answer");
  act(() => result.current.cancel());
  expect(pause).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
it("stops a late permission grant after cancellation", async () => {
  let resolve!: (value: unknown) => void;
  media.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() => useVoice("en", vi.fn()));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.start();
  });
  act(() => result.current.cancel());
  await act(async () => {
    resolve({ getTracks: () => [{ stop }] });
    await pending;
  });
  expect(result.current.state).toBe("idle");
  expect(stop).toHaveBeenCalled();
});

it("offers explicit playback after the browser blocks autoplay", async () => {
  const play = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"))
    .mockResolvedValue(undefined);
  vi.stubGlobal(
    "Audio",
    class {
      play = play;
      pause = vi.fn();
    },
  );
  const { result } = renderHook(() =>
    useVoice("en", vi.fn().mockResolvedValue("Final answer")),
  );
  await act(async () => {
    await result.current.start();
    result.current.stop();
  });
  await waitFor(() => expect(result.current.playbackReady).toBe(true));
  await act(async () => {
    await result.current.resume();
  });
  expect(result.current.state).toBe("speaking");
  expect(result.current.error).toBeNull();
});
