export type Language = 'en' | 'sr'
export interface AssistantStatus {
  status: string; mode: string; platform_target: string; languages: string[]
  capabilities: { chat: boolean; voice: boolean; memory: boolean; automation: boolean }
}
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`Backend request failed (${response.status})`)
  return response.json() as Promise<T>
}
export async function getStatus(): Promise<AssistantStatus> {
  const [health, status] = await Promise.all([
    request<{status: string}>('/api/health'), request<AssistantStatus>('/api/assistant/status'),
  ])
  if (health.status !== 'ok') throw new Error('Backend is unhealthy')
  return status
}
export const sendMessage = (message: string, language: Language) =>
  request<{reply: string; mode: string}>('/api/chat', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ message, language }),
  })
