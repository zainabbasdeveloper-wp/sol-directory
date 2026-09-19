import { ApiError, api, setToken } from './client';
import type {
  WorkerMasked,
  WorkerProfile,
  Lead,
  PlanConfig,
  PaginatedResult,
  WorkerSearchQuery,
  Role,
} from '@soldirectory/shared-types';

// --- Auth ---

interface AuthResponse {
  token: string;
  user: { id: string; name: string; role: Role };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  setToken(res.token);
  return res;
}

export async function signup(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: Role;
  referralCode?: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/signup', input);
  setToken(res.token);
  return res;
}

export function logout() {
  setToken(null);
}

// --- Workers ---

export function searchWorkers(query: WorkerSearchQuery): Promise<PaginatedResult<WorkerMasked>> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  });
  return api.get<PaginatedResult<WorkerMasked>>(`/workers?${params.toString()}`);
}

export function getWorkerProfile(id: string): Promise<WorkerProfile> {
  return api.get<WorkerProfile>(`/workers/${id}`);
}

export function requestContact(id: string): Promise<{ status: string; message: string }> {
  return api.post(`/workers/${id}/contact-request`);
}

// --- Leads ---

export function listLeads(): Promise<Lead[]> {
  return api.get<Lead[]>('/leads');
}

// Paid-plan-only — "browse nearby requests" (leads that score as a
// genuine match but missed the per-enquiry notify cap). Throws
// ApiError with code PLAN_REQUIRED on a starter plan; callers already
// handle that same code from unlockLead.
export function listNearbyLeads(): Promise<Lead[]> {
  return api.get<Lead[]>('/leads/browse/nearby');
}

export function unlockLead(id: string): Promise<Lead> {
  // A fresh idempotency key per user action — a retry of the SAME
  // click should reuse it, but that's a UI-level concern (disable
  // the button while in flight) rather than something to fake here.
  const idempotencyKey = crypto.randomUUID();
  return api.post<Lead>(`/leads/${id}/unlock`, undefined, { idempotencyKey });
}

// --- Capacity confirmation ---

export function confirmCapacityByToken(token: string): Promise<{ confirmed: boolean; providerName?: string }> {
  return api.post('/capacity/confirm', { token });
}

export function confirmCapacityNow(): Promise<{ confirmed: boolean; lastCapacityConfirmedAt: string; listingPaused: boolean }> {
  return api.post('/capacity/confirm-now');
}

// --- Plans ---

export function getPlans(): Promise<PlanConfig[]> {
  return api.get<PlanConfig[]>('/plans');
}

// --- Onboarding ---

export function getOnboarding() {
  return api.get('/onboarding');
}

export function saveOnboardingStep(stepKey: string, data: Record<string, unknown>) {
  return api.post(`/onboarding/${stepKey}`, { data });
}

export function getUploadUrl(kind: string, contentType: string, filename: string) {
  return api.post<{ uploadUrl: string; key: string }>('/onboarding/upload-url', { kind, contentType, filename });
}

// --- Verification (admin) ---

export function listVerificationQueue(status?: string) {
  return api.get(`/verification${status ? `?status=${status}` : ''}`);
}

export function getVerificationDetail(id: string) {
  return api.get(`/verification/${id}`);
}

export function markDocument(workerId: string, docIndex: number, mark: 'verified' | 'flagged') {
  return api.post(`/verification/${workerId}/documents/mark`, { docIndex, mark });
}

export function approveWorker(workerId: string) {
  return api.post(`/verification/${workerId}/approve`);
}

export function rejectWorker(workerId: string, reason: string, note?: string) {
  return api.post(`/verification/${workerId}/reject`, { reason, note });
}

interface AdminProviderRow {
  id: string; legalEntityName: string; tradingName: string; abn: string; plan: string;
  intakeStatus: string; accountStatus: 'active' | 'suspended';
  ownerName: string | null; ownerEmail: string | null;
}
interface AdminProviderListResult { items: AdminProviderRow[]; page: number; limit: number; total: number; hasMore: boolean; }

const ADMIN_API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function adminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listProvidersAdmin(status?: 'active' | 'suspended'): Promise<AdminProviderListResult> {
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${ADMIN_API_URL}/admin/providers${qs}`, { headers: adminAuthHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export async function getProviderAdmin(id: string) {
  const res = await fetch(`${ADMIN_API_URL}/admin/providers/${id}`, { headers: adminAuthHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export async function setProviderAccountStatus(id: string, status: 'active' | 'suspended') {
  const res = await fetch(`${ADMIN_API_URL}/admin/providers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

// --- Public site stats (real aggregates; see api stats.controller.ts) ---

export interface PublicStats {
  providersListed: number;
  suburbsCovered: number;
  enquiriesLast30Days: number;
  /** null until enough real replies exist to publish an honest median */
  medianFirstReplyMinutes: number | null;
  providersByState: Record<string, number>;
  providersByService: Record<string, number>;
  generatedAt: string;
}

export function getPublicStats(): Promise<PublicStats> {
  return api.get<PublicStats>('/stats/public');
}

// --- Password recovery (api auth.controller.ts forgotPassword / resetPassword) ---

export function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/forgot-password', { email });
}

export function resetPassword(input: { email: string; token: string; newPassword: string }): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/reset-password', input);
}
