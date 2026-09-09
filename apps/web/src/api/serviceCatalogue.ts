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

// --- Public/authenticated read — the one real function every
// service-selection UI in the app should call instead of a
// hardcoded array. ---

export interface ActiveService { id: string; name: string; category: string; description: string; applicableFunding: string[]; }

export function listActiveServices(role?: 'provider' | 'worker'): Promise<{ items: ActiveService[] }> {
  return get(`/services${role ? `?role=${role}` : ''}`);
}

// --- Admin CRUD ---

export interface AdminServiceRow extends ActiveService { active: boolean; applicableRoles: ('provider' | 'worker')[]; conditionTags: string[]; }

export function listServicesAdmin(filters: { category?: string; active?: boolean } = {}): Promise<{ items: AdminServiceRow[] }> {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.active !== undefined) params.set('active', String(filters.active));
  const qs = params.toString();
  return get(`/admin/services${qs ? `?${qs}` : ''}`);
}
export function createService(input: { name: string; category: string; description?: string; applicableFunding: string[]; applicableRoles: ('provider' | 'worker')[] }) {
  return post<{ id: string }>('/admin/services', input);
}
export function updateService(id: string, input: Partial<{ name: string; category: string; description: string; applicableFunding: string[]; applicableRoles: ('provider' | 'worker')[] }>) {
  return patch<{ id: string }>(`/admin/services/${id}`, input);
}
export function setServiceActive(id: string, active: boolean) {
  return patch<{ id: string; active: boolean }>(`/admin/services/${id}/active`, { active });
}
