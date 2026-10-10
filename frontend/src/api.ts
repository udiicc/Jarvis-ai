export type Language = "en" | "sr";
export interface AssistantStatus {
  status: string;
  mode: string;
  platform_target: string;
  languages: string[];
  provider_state?:
    | "mock"
    | "configured"
    | "ready"
    | "processing"
    | "connected"
    | "error";
  model?: string | null;
  provider_error?: string | null;
  capabilities: {
    chat: boolean;
    voice: boolean;
    memory: boolean;
    automation: boolean;
  };
}
export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}
const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
async function request<T>(
  path: string,
  options?: RequestInit,
  timeout = 8000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new Error(
      "Backend request unavailable or timed out. / Backend nije dostupan ili je zahtev istekao.",
    );
  }
  if (!response.ok) {
    // Only render the backend's allowlisted error text; never raw provider responses.
    const body = await response.json().catch(() => null);
    const codes = [
      "missing_key",
      "ollama_offline",
      "ollama_model",
      "ollama_timeout",
      "ollama_network",
      "ollama_provider",
      "ollama_thinking",
      "ollama_remote",
      "authentication",
      "timeout",
      "rate_limit",
      "network",
      "provider",
      "usage_limit",
      "busy",
    ];
    if (codes.includes(body?.code) && typeof body?.detail === "string")
      throw new Error(body.detail);
    throw new Error(`Backend request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export async function getStatus(): Promise<AssistantStatus> {
  const [health, status] = await Promise.all([
    request<{ status: string }>("/api/health"),
    request<AssistantStatus>("/api/assistant/status"),
  ]);
  if (health.status !== "ok") throw new Error("Backend is unhealthy");
  return status;
}
export const sendMessage = (
  message: string,
  language: Language,
  history: ContextMessage[] = [],
) =>
  request<{ reply: string; mode: string }>(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language, history }),
    },
    310000,
  );
