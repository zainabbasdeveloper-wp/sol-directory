import { ApiError } from './client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function hasToken(): boolean {
  return !!localStorage.getItem('sd_token');
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}
async function post<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}
async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export interface ProviderRow {
  id: string; legalEntityName: string; tradingName: string; abn: string;
  registrationGroups: string[]; serviceSuburbs: string[]; travelRadiusKm: number;
  weeklyCapacityHours: number; intakeStatus: string;
}
interface ProviderListResult { items: ProviderRow[]; page: number; limit: number; total: number; hasMore: boolean; }

export function isLoggedIn(): boolean { return hasToken(); }

export function listProviders(params: { q?: string; suburb?: string; service?: string; page?: number } = {}): Promise<ProviderListResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.suburb) qs.set('suburb', params.suburb);
  if (params.service) qs.set('service', params.service);
  qs.set('page', String(params.page ?? 1));
  return get(`/providers?${qs.toString()}`);
}

export function getProviderProfile(id: string): Promise<ProviderRow> {
  return get(`/providers/${id}`);
}

export function requestProviderContact(id: string): Promise<{ status: string; message: string }> {
  return post(`/providers/${id}/contact-request`);
}

// --- Shortlist ---

export interface ShortlistItem { shortlistId: string; provider: { id: string; legalEntityName: string; tradingName: string; intakeStatus: string; serviceSuburbs: string[] }; savedAt: string; }

export function getShortlistStatus(providerId: string): Promise<{ shortlisted: boolean }> {
  return get(`/shortlists/providers/${providerId}/status`);
}
export function addToShortlist(providerId: string): Promise<{ success: boolean; shortlisted: boolean }> {
  return post(`/shortlists/providers/${providerId}`);
}
export function removeFromShortlist(providerId: string): Promise<{ success: boolean; shortlisted: boolean }> {
  return del(`/shortlists/providers/${providerId}`);
}
export function listMyShortlist(): Promise<{ items: ShortlistItem[] }> {
  return get('/shortlists/providers');
}
