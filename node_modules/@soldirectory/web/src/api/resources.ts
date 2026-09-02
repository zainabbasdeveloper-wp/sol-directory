import { api, setToken } from './client';
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

export function unlockLead(id: string): Promise<Lead> {
  // A fresh idempotency key per user action — a retry of the SAME
  // click should reuse it, but that's a UI-level concern (disable
  // the button while in flight) rather than something to fake here.
  const idempotencyKey = crypto.randomUUID();
  return api.post<Lead>(`/leads/${id}/unlock`, undefined, { idempotencyKey });
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
