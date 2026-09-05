import { ApiError } from './client';

const ADMIN_API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

function adminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ADMIN_API_URL}${path}`, { headers: adminAuthHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ADMIN_API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

// --- Providers ---

export interface AdminProviderRow {
  id: string; legalEntityName: string; tradingName: string; abn: string; plan: string;
  intakeStatus: string; accountStatus: 'active' | 'suspended';
  ownerName: string | null; ownerEmail: string | null;
}
interface AdminProviderListResult { items: AdminProviderRow[]; page: number; limit: number; total: number; hasMore: boolean; }

export function listProvidersAdmin(status?: 'active' | 'suspended'): Promise<AdminProviderListResult> {
  return adminGet(`/admin/providers${status ? `?status=${status}` : ''}`);
}
export function getProviderAdmin(id: string): Promise<Record<string, any>> {
  return adminGet(`/admin/providers/${id}`);
}
export function setProviderAccountStatus(id: string, status: 'active' | 'suspended') {
  return adminPatch(`/admin/providers/${id}/status`, { status });
}

// --- Workers ---

export interface AdminWorkerRow {
  id: string; firstName: string; lastName: string; role: string; suburb: string;
  verificationStatus: string; accountStatus: 'active' | 'suspended'; published: boolean;
  ownerName: string | null; ownerEmail: string | null;
}
interface AdminWorkerListResult { items: AdminWorkerRow[]; page: number; limit: number; total: number; hasMore: boolean; }

export function listWorkersAdmin(status?: 'active' | 'suspended', verification?: string): Promise<AdminWorkerListResult> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (verification) params.set('verification', verification);
  const qs = params.toString();
  return adminGet(`/admin/workers${qs ? `?${qs}` : ''}`);
}
export function getWorkerAdmin(id: string): Promise<Record<string, any>> {
  return adminGet(`/admin/workers/${id}`);
}
export function setWorkerAccountStatus(id: string, status: 'active' | 'suspended') {
  return adminPatch(`/admin/workers/${id}/status`, { status });
}

// --- Coordinators & participants (share the same User-only model) ---

export interface AdminUserRow {
  id: string; name: string; email: string; mobile: string | null;
  role: 'coordinator' | 'participant'; accountStatus: 'active' | 'suspended'; createdAt: string;
}
interface AdminUserListResult { items: AdminUserRow[]; page: number; limit: number; total: number; hasMore: boolean; }

export function listUsersAdmin(role?: 'coordinator' | 'participant', status?: 'active' | 'suspended'): Promise<AdminUserListResult> {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const qs = params.toString();
  return adminGet(`/admin/users${qs ? `?${qs}` : ''}`);
}
export function getUserAdmin(id: string): Promise<AdminUserRow> {
  return adminGet(`/admin/users/${id}`);
}
export function setUserAccountStatus(id: string, status: 'active' | 'suspended') {
  return adminPatch(`/admin/users/${id}/status`, { status });
}
