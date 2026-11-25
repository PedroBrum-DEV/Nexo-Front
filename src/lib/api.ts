// Ligação com a API da IA. Sem EXPO_PUBLIC_API_URL o app roda em DEMONSTRAÇÃO (dados fictícios).
export const BASE: string = process.env.EXPO_PUBLIC_API_URL || '';
export const live = Boolean(BASE);

import { setOffline } from './net';
import type { Channel, RadarOverview } from './radar';

let sessionToken = '';
let onUnauthorized: () => void = () => {};
export const setSessionToken = (t?: string | null) => { sessionToken = t || ''; };
export const setOnUnauthorized = (fn: () => void) => { onUnauthorized = fn; };

const TIMEOUT_MS = 20_000;

async function call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    res = await fetch(BASE + path, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    setOffline(true);
    throw new Error(ctrl.signal.aborted ? 'O servidor demorou demais para responder. Tente de novo.' : 'Não consegui falar com o servidor. Confira a conexão e tente de novo.');
  } finally { clearTimeout(timer); }
  setOffline(false); // chegou resposta (mesmo de erro): o servidor está acessível
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && sessionToken) onUnauthorized(); // sessão expirada: volta ao login
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data as T;
}

/** Confere se o servidor responde (usado pelo botão "Tentar de novo" do aviso de sem conexão). */
export async function ping(): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try { const r = await fetch(BASE + '/health', { signal: ctrl.signal }); setOffline(false); return r.ok; }
  catch { setOffline(true); return false; }
  finally { clearTimeout(timer); }
}

export const remote = {
  register: (b: unknown) => call('POST', '/api/auth/register', b),
  login: (b: unknown) => call('POST', '/api/auth/login', b),
  changePassword: (b: unknown) => call('PUT', '/api/auth/password', b),
  sessions: () => call('GET', '/api/auth/sessions'),
  revokeSession: (id: string) => call('DELETE', `/api/auth/sessions/${id}`),
  revokeOthers: () => call('POST', '/api/auth/sessions/revoke-others'),
  revokeAll: () => call('POST', '/api/auth/sessions/revoke-all'),
  deleteAccount: (b: unknown) => call('DELETE', '/api/auth/account', b),
  exportData: () => call('GET', '/api/account/export'),
  forgot: (b: unknown) => call('POST', '/api/auth/forgot', b),
  verifyReset: (b: unknown) => call('POST', '/api/auth/forgot/verify', b),
  reset: (b: unknown) => call('POST', '/api/auth/reset', b),
  refresh: () => call<{ token: string; user: unknown }>('POST', '/api/auth/refresh'),
  requests: () => call<any[]>('GET', '/api/requests'),
  patchRequest: (id: string, status: 'open' | 'done') => call('PATCH', `/api/requests/${id}`, { status }),
  conversations: (agentId: string, query = '') => call<any[]>('GET', `/api/agents/${agentId}/conversations${query}`),
  conversation: (id: string) => call<any>('GET', `/api/conversations/${id}`),
  handoff: (id: string, on: boolean) => call('POST', `/api/conversations/${id}/handoff`, { on }),
  reply: (id: string, text: string) => call('POST', `/api/conversations/${id}/reply`, { text }),
  notifications: () => call<{ unread: number; items: any[] }>('GET', '/api/notifications'),
  readNotifications: (ids?: string[]) => call('POST', '/api/notifications/read', ids ? { ids } : {}),
  appointments: (query = '') => call<{ items: any[]; total: number; withoutLink: number }>('GET', `/api/appointments${query}`),
  registerPush: (token: string) => call('POST', '/api/me/push-token', { token }),
  usage: () => call<any>('GET', '/api/usage'),
  radar: () => call<RadarOverview>('GET', '/api/radar'),
  radarConfig: (b: unknown) => call('PUT', '/api/radar/config', b),
  radarSearch: (b: unknown) => call('POST', '/api/radar/search', b),
  radarContact: (id: string, channel: Channel) => call('POST', `/api/radar/companies/${id}/contact`, { channel }),
  radarPreview: (id: string) => call<{ url: string }>('POST', `/api/radar/companies/${id}/preview`),
  radarSkip: (id: string) => call('POST', `/api/radar/companies/${id}/skip`),
  list: () => call('GET', '/api/agents'),
  create: (b: unknown) => call('POST', '/api/agents', b),
  update: (id: string, b: unknown) => call('PUT', `/api/agents/${id}`, b),
  remove: (id: string) => call('DELETE', `/api/agents/${id}`),
  connect: (id: string) => call('POST', `/api/agents/${id}/connect`),
  connection: (id: string) => call('GET', `/api/agents/${id}/connection`),
  disconnect: (id: string) => call('POST', `/api/agents/${id}/disconnect`),
  setStatus: (id: string, status: string) => call('POST', `/api/agents/${id}/status`, { status }),
  chat: (tenantId: string, conversationId: string, message: string) => call('POST', '/api/chat', { tenantId, conversationId, message }),
};

// QR ilustrativo da demonstração (NÃO é lido pelo WhatsApp): módulos pseudoaleatórios com os três marcadores.
export const DEMO_QR_N = 29;
export function demoQr(seed: string): boolean[][] {
  const N = DEMO_QR_N;
  let x = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  const rnd = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  const corners: [number, number][] = [[0, 0], [0, N - 7], [N - 7, 0]];
  return Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => {
    const f = corners.find(([a, b]) => r >= a && r < a + 7 && c >= b && c < b + 7);
    if (!f) return rnd() > 0.5;
    const dr = r - f[0], dc = c - f[1];
    return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr > 1 && dr < 5 && dc > 1 && dc < 5);
  }));
}
