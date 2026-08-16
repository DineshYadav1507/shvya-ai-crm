const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
export type User = { id: string; name: string; email: string; role: string; organizationId: string };
export type Lead = { id: string; name: string; phone?: string; email?: string; company?: string; source: string; stage: string; status: string; score: number; createdAt: string; updatedAt: string };
export type Activity = { id: string; type: string; direction?: string; body?: string; metadata?: Record<string, unknown>; occurredAt: string; userName?: string };
export type WhatsAppConversation = { id: string; externalUserId: string; status: string; waitingRoom: boolean; lastMessageAt?: string; leadId?: string; leadName?: string; leadPhone?: string; stage?: string; score?: number };
let token = localStorage.getItem('shvya_token');
export const authToken = () => token;
export const setAuthToken = (value: string | null) => { token = value; if (value) localStorage.setItem('shvya_token', value); else localStorage.removeItem('shvya_token'); };
async function request<T>(path: string, options: RequestInit = {}): Promise<T> { const headers = new Headers(options.headers); headers.set('Content-Type', 'application/json'); if (token) headers.set('Authorization', `Bearer ${token}`); const response = await fetch(`${API_URL}${path}`, { ...options, headers }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? 'Request failed'); return body as T; }
export const api = {
  register: async (data: { organizationName: string; name: string; email: string; password: string }) => request<{ user: User; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: async (email: string, password: string) => request<{ user: User; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/api/me'), leads: (q = '') => request<Lead[]>(`/api/leads${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createLead: (data: Partial<Lead> & { name: string }) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) => request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  timeline: (id: string) => request<Activity[]>(`/api/leads/${id}/timeline`),
  addActivity: (id: string, data: { type: string; direction?: string; body?: string; metadata?: Record<string, unknown> }) => request<Activity>(`/api/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(data) }),
  whatsappConversations: (status = 'open') => request<WhatsAppConversation[]>(`/api/whatsapp/inbox/conversations?status=${encodeURIComponent(status)}`),
  updateConversation: (id: string, data: { status?: string; waitingRoom?: boolean; assignedUserId?: string }) => request<WhatsAppConversation>(`/api/whatsapp/inbox/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};
export function connectRealtime(onEvent: (message: { event: string; data: unknown }) => void) { if (!token) return () => {}; const wsBase = API_URL.replace(/^http/, 'ws'); const socket = new WebSocket(`${wsBase}/realtime?token=${encodeURIComponent(token)}`); socket.onmessage = (event) => { try { onEvent(JSON.parse(event.data)); } catch {} }; return () => socket.close(); }
