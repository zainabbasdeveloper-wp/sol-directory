import { ApiError } from './client';

const API_URL = ((import.meta as any).env?.VITE_API_URL ?? '/api').replace(/\/$/, '');
const headers = (): Record<string, string> => {
  const token = localStorage.getItem('sd_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/admin/leads${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

export type LeadFilter = 'all' | 'unmatched' | 'named' | 'waiting' | 'answered';

export interface AdminLead {
  id: string;
  ref: string;
  createdAt: string;
  need: string;
  suburb?: string; state?: string; careFor?: string; timeframe?: string; funding?: string;
  requesterName?: string; requesterEmail?: string; requesterPhone?: string;
  requestedProvider: string | null;
  hasAccount: boolean;
  trackingUrl: string;
  matches: { providerId: string; name: string; status: 'notified' | 'viewed' | 'contacted' | 'declined'; viewedAt?: string; respondedAt?: string; reason?: string }[];
}

export const listAdminLeads = (params: { filter: LeadFilter; q: string; page: number }) =>
  call<{ items: AdminLead[]; page: number; total: number; hasMore: boolean }>(`?filter=${params.filter}&q=${encodeURIComponent(params.q)}&page=${params.page}`);

export const searchSharableProviders = (q: string) =>
  call<{ items: { id: string; name: string; suburbs: string[]; plan: string }[] }>(`/providers?q=${encodeURIComponent(q)}`);

export const shareLead = (leadId: string, providerId: string) =>
  call<{ shared: boolean; providerName: string }>(`/${leadId}/share`, { method: 'POST', body: JSON.stringify({ providerId }) });
