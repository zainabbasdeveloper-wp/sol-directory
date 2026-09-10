import { ApiError } from './client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}
async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export interface ActiveCondition { id: string; name: string; category: string; }
export function listActiveConditions(): Promise<{ items: ActiveCondition[] }> {
  return get('/conditions');
}

export interface AdminConditionRow extends ActiveCondition { active: boolean; }
export function listConditionsAdmin(filters: { category?: string; active?: boolean } = {}): Promise<{ items: AdminConditionRow[] }> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.active !== undefined) params.set('active', String(filters.active));
  const qs = params.toString();
  return get(`/admin/conditions${qs ? `?${qs}` : ''}`);
}
export function createCondition(input: { name: string; category: string }) {
  return post<{ id: string }>('/admin/conditions', input);
}
export function setConditionActive(id: string, active: boolean) {
  return patch<{ id: string; active: boolean }>(`/admin/conditions/${id}/active`, { active });
}

// --- Match ranking ---
export interface MatchResult {
  providerId: string; providerName: string; score: number;
  breakdown: {
    funding: { score: number; matched: boolean };
    service: { score: number; matched: boolean };
    condition: { score: number; matchedCount: number; requiredCount: number; matchedConditions: string[] };
    location: { score: number; matched: boolean };
    availability: { score: number; status: string };
  };
}
export function getLeadMatches(leadId: string): Promise<{ weights: Record<string, number>; lead: any; matches: MatchResult[] }> {
  return get(`/admin/leads/${leadId}/matches`);
}
