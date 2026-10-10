import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getStatus, sendMessage } from "./api";
vi.mock("./api", () => ({ getStatus: vi.fn(), sendMessage: vi.fn() }));
const status = {
  status: "ready",
  mode: "mock",
  platform_target: "macOS",
  languages: ["en", "sr"],
  capabilities: { chat: true, voice: false, memory: false, automation: false },
};
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.mocked(getStatus).mockResolvedValue(status);
  vi.mocked(sendMessage).mockResolvedValue({
    reply: "Mock reply",
    mode: "mock",
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (document as unknown as { hidden?: boolean }).hidden;
});
describe("dashboard", () => {
  it("shows real status and sends a chat request", async () => {
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));
    await screen.findByText("Mock reply");
    expect(sendMessage).toHaveBeenCalledWith("Hello", "en");
    expect(
      screen.getByText("Mock response ·", { exact: false }),
    ).toBeInTheDocument();
  });
  it("switches Serbian language and keeps microphone a placeholder", async () => {
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "sr" },
    });
    expect(screen.getByText("Na vašoj usluzi.")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Microphone — coming soon"));
    expect(
      screen.getByText(/Pristup mikrofonu nije zatražen/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Zdravo" },
    });
    fireEvent.click(screen.getByLabelText("Pošalji poruku"));
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith("Zdravo", "sr"),
    );
  });
  it("shows an offline error and disables sending", async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error("offline"));
    render(<App />);
    await screen.findByText("Offline");
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });
  it("records failed requests without a fake success", async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error("failed"));
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));
    await within(
      screen.getByRole("region", { name: "Command history" }),
    ).findByText(/Request failed/);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("cinematic command center", () => {
  it("keeps messages across navigation and explains future modules", async () => {
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Keep this conversation" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));
    await screen.findByText("Mock reply");
    fireEvent.click(screen.getByRole("link", { name: /Memory/ }));
    expect(
      screen.getByText(/Persistent storage is not connected/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /Conversations/ }));
    expect(screen.getByText("Mock reply")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Conversations/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
  it("reacts to pending and completed requests without accepting duplicate submissions", async () => {
    let resolve!: (value: { reply: string; mode: string }) => void;
    vi.mocked(sendMessage).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Analyze this" },
    });
    fireEvent.click(screen.getByLabelText("Send message"));
    expect(
      screen.getByRole("img", { name: /holographic core/ }),
    ).toHaveAttribute("data-state", "processing");
    expect(screen.getByLabelText("Message")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Send message"));
    expect(sendMessage).toHaveBeenCalledTimes(1);
    resolve({ reply: "Analysis complete", mode: "mock" });
    await screen.findByText("Analysis complete");
    expect(
      screen.getByRole("img", { name: /holographic core/ }),
    ).toHaveAttribute("data-state", "responding");
  });
  it("supports manual connection recovery and a working keyboard shortcut", async () => {
    vi.mocked(getStatus)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(status);
    render(<App />);
    await screen.findByText("Offline");
    fireEvent.click(screen.getByLabelText("Refresh backend status"));
    await screen.findByText("Online");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });
  it("lets the user pause motion in settings", async () => {
    const { container } = render(<App />);
    await screen.findByText("Online");
    fireEvent.click(screen.getByRole("link", { name: /System settings/ }));
    fireEvent.click(screen.getByLabelText("Interface motion"));
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    expect(screen.getByLabelText("Interface motion")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("motion and background lifecycle", () => {
  it("honors reduced motion even when the session motion toggle is enabled", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    const { container } = render(<App />);
    await screen.findByText("Online");
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    fireEvent.click(screen.getByRole("link", { name: /System settings/ }));
    fireEvent.click(screen.getByLabelText("Interface motion"));
    fireEvent.click(screen.getByLabelText("Interface motion"));
    expect(screen.getByLabelText("Interface motion")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "paused",
    );
  });

  it("pauses health polling in hidden tabs and refreshes on return", async () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    await act(async () => {});
    expect(getStatus).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "paused",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    fireEvent(document, new Event("visibilitychange"));
    await act(async () => {});
    expect(getStatus).toHaveBeenCalledTimes(2);
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "active",
    );
  });
});
