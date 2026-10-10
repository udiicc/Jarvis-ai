export type Connection = "connecting" | "online" | "offline";
export type CoreState =
  | "idle"
  | "processing"
  | "responding"
  | "offline"
  | "error"
  | "listening"
  | "connecting";
export type ModuleId =
  | "command"
  | "core"
  | "conversations"
  | "tasks"
  | "agents"
  | "memory"
  | "tools"
  | "workflows"
  | "settings";
export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}
export interface CommandEntry {
  id: number;
  text: string;
  result: "pending" | "complete" | "failed";
  timestamp: string;
}
export interface SessionEvent {
  id: number;
  kind: "connection" | "request" | "response" | "error";
  timestamp: string;
  text: string;
}
