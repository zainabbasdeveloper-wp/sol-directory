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
async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export type PlanStatus = 'active' | 'trial' | 'expired' | 'cancelled' | 'suspended';
export type PlanTier = 'starter' | 'growth' | 'pro';

export interface MemberPlanRow {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  plan: PlanTier;
  planStatus: PlanStatus;
  planStartedAt: string;
  planExpiresAt: string | null;
}
export interface MemberPlansResult {
  totalMembers: number;
  counts: Record<PlanStatus, number>;
  expiringSoon: number;
  items: MemberPlanRow[];
  page: number; limit: number; total: number; hasMore: boolean;
}

export function listMemberPlans(status?: PlanStatus, plan?: PlanTier): Promise<MemberPlansResult> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (plan) params.set('plan', plan);
  const qs = params.toString();
  return get(`/admin/plans${qs ? `?${qs}` : ''}`);
}
export function setPlanStatus(id: string, status: PlanStatus) {
  return patch<{ id: string; planStatus: PlanStatus }>(`/admin/plans/${id}/status`, { status });
}
export function changePlanTier(id: string, plan: PlanTier) {
  return patch<{ id: string; plan: PlanTier }>(`/admin/plans/${id}/plan`, { plan });
}
export interface PlanHistoryEntry { plan: string; planStatus: string; changedAt: string; changedBy: string; }
export function getPlanHistory(id: string): Promise<{ name: string; history: PlanHistoryEntry[] }> {
  return get(`/admin/plans/${id}/history`);
}
