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
function command(text: string, label = "Send message") {
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByLabelText(label));
}

describe("minimal holographic home", () => {
  it("shows only the core, clock, integration placeholders and connection until summoned", async () => {
    render(<App />);
    await screen.findByText("Online");
    expect(
      screen.getByRole("img", { name: /holographic core/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Local clock" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Recent messages" }),
    ).toHaveTextContent("Not connected");
    expect(
      screen.getByRole("region", { name: "Recent emails" }),
    ).toHaveTextContent("Not connected");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Command history" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Microphone — coming soon")).toBeDisabled();
  });
  it("routes English and Serbian window commands without API calls and closes all windows", async () => {
    render(<App />);
    await screen.findByText("Online");
    command("Jarvis, bring up my task list.");
    expect(
      screen.getByRole("dialog", { name: "Task manager" }),
    ).toBeInTheDocument();
    command("Jarvise, otvori kalendar.");
    expect(
      screen.getByRole("dialog", { name: "Calendar" }),
    ).toBeInTheDocument();
    command("Jarvise, zatvori sve prozore.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sendMessage).not.toHaveBeenCalled();
  });
  it("handles UI commands while offline without pretending chat is available", async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error("offline"));
    render(<App />);
    await screen.findByText("Offline");
    command("Hello");
    expect(screen.getByLabelText("Send message")).toBeDisabled();
    command("open settings");
    expect(
      screen.getByRole("dialog", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
    expect(sendMessage).not.toHaveBeenCalled();
  });
  it("sends unknown input to chat and retains conversation and command history", async () => {
    render(<App />);
    await screen.findByText("Online");
    command("Hello");
    await screen.findByText("Mock reply");
    expect(sendMessage).toHaveBeenCalledWith("Hello", "en", []);
    command("show conversations");
    const conversation = screen.getByRole("dialog", { name: "Conversations" });
    expect(within(conversation).getByText("Mock reply")).toBeInTheDocument();
    expect(
      within(conversation).getByRole("region", { name: "Command history" }),
    ).toHaveTextContent("Mock response");
    command("close conversations");
    command("open conversations");
    expect(screen.getByText("Mock reply")).toBeInTheDocument();
  });
  it("switches Serbian language for chat and local windows, never enabling microphone access", async () => {
    render(<App />);
    await screen.findByText("Online");
    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "sr" },
    });
    expect(screen.getByLabelText("Microphone — coming soon")).toBeDisabled();
    expect(
      screen.getByText(/Pristup mikrofonu nije zatražen/),
    ).toBeInTheDocument();
    command("Zdravo", "Pošalji poruku");
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith("Zdravo", "sr", []),
    );
    command("Jarvise, prikaži zadatke.", "Pošalji poruku");
    expect(screen.getByRole("dialog", { name: "Zadaci" })).toBeInTheDocument();
  });
  it("records failed requests without a fake success", async () => {
    vi.mocked(sendMessage).mockRejectedValue(new Error("failed"));
    render(<App />);
    await screen.findByText("Online");
    command("Hello");
    await screen.findByRole("alert");
    command("show conversations");
    expect(
      screen.getByRole("region", { name: "Command history" }),
    ).toHaveTextContent("Request failed");
    expect(
      screen.getByRole("img", { name: /holographic core/ }),
    ).toHaveAttribute("data-state", "error");
  });
  it("reacts to pending and completed requests without duplicate submissions", async () => {
    let resolve!: (value: { reply: string; mode: string }) => void;
    vi.mocked(sendMessage).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    render(<App />);
    await screen.findByText("Online");
    command("Analyze this");
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
  it("minimizes/restores, focuses windows and supports keyboard moving and resizing", async () => {
    render(<App />);
    await screen.findByText("Online");
    command("open calendar");
    const dialog = screen.getByRole("dialog", { name: "Calendar" });
    expect(dialog).toHaveFocus();
    const left = Number.parseFloat(dialog.style.left);
    fireEvent.keyDown(
      screen.getByLabelText("Move Calendar window (arrow keys)"),
      { key: "ArrowRight" },
    );
    expect(Number.parseFloat(dialog.style.left)).toBe(left + 20);
    const width = Number.parseFloat(dialog.style.width);
    fireEvent.keyDown(
      screen.getByLabelText("Resize Calendar window (arrow keys)"),
      { key: "ArrowRight" },
    );
    expect(Number.parseFloat(dialog.style.width)).toBe(width + 20);
    fireEvent.click(screen.getByLabelText("Minimize Calendar"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveFocus();
    fireEvent.click(screen.getByLabelText("Restore Calendar"));
    expect(screen.getByRole("dialog", { name: "Calendar" })).toHaveFocus();
    fireEvent.click(screen.getByLabelText("Close Calendar"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveFocus();
  });
  it("supports manual connection recovery and keyboard input focus", async () => {
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
  it("provides session motion and private-preview controls in summoned settings", async () => {
    const { container } = render(<App />);
    await screen.findByText("Online");
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(
      screen.getByLabelText(/Keep integration previews private/),
    ).toBeChecked();
    fireEvent.click(screen.getByLabelText("Interface motion"));
    expect(container.querySelector(".jarvis-shell")).toHaveAttribute(
      "data-motion",
      "paused",
    );
  });
});
describe("motion and background lifecycle", () => {
  it("honors reduced motion even with motion enabled", async () => {
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
    fireEvent.click(screen.getByLabelText("Open settings"));
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

it("keeps successful OpenAI context across messages and local commands", async () => {
  vi.mocked(getStatus).mockResolvedValue({
    ...status,
    mode: "openai",
    provider_state: "configured",
  });
  vi.mocked(sendMessage).mockResolvedValue({
    reply: "Hello Ana",
    mode: "openai",
  });
  render(<App />);
  await screen.findByText("OpenAI configured");
  command("My name is Ana");
  await screen.findByText("Hello Ana");
  await waitFor(() => expect(screen.getByLabelText("Message")).toBeEnabled());
  command("Jarvise, otvori kalendar.");
  expect(sendMessage).toHaveBeenCalledTimes(1);
  command("What is my name?");
  await waitFor(() =>
    expect(sendMessage).toHaveBeenLastCalledWith("What is my name?", "en", [
      { role: "user", content: "My name is Ana" },
      { role: "assistant", content: "Hello Ana" },
    ]),
  );
});

it("shows processing, verified and authentication states without changing the home layout", async () => {
  vi.mocked(getStatus).mockResolvedValue({
    ...status,
    mode: "openai",
    provider_state: "configured",
  });
  let resolve!: (value: { reply: string; mode: string }) => void;
  vi.mocked(sendMessage).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<App />);
  await screen.findByText("OpenAI configured");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  command("Hello");
  expect(
    within(screen.getByRole("region", { name: "System connection" })).getByText(
      "Processing",
    ),
  ).toBeInTheDocument();
  vi.mocked(getStatus).mockResolvedValue({
    ...status,
    mode: "openai",
    provider_state: "connected",
  });
  await act(async () => resolve({ reply: "Hi", mode: "openai" }));
  await screen.findByText("OpenAI verified");
  vi.mocked(getStatus).mockResolvedValue({
    ...status,
    mode: "openai",
    provider_state: "error",
    provider_error: "authentication",
  });
  vi.mocked(sendMessage).mockRejectedValue(
    new Error("OpenAI authentication failed. Check the backend API key."),
  );
  command("Second");
  await screen.findByText("Authentication error");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "OpenAI authentication failed",
  );
});
