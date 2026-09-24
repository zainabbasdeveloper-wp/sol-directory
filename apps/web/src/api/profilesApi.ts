import { ApiError, apiFetch } from './client';

const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '/api';

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? 'Request failed', res.status);
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

// ---------------------------------------------------------------
// Public provider profile
// ---------------------------------------------------------------
export interface PublicProviderProfile {
  slug: string;
  name: string;
  legalEntityName: string;
  logoUrl: string | null;
  registrationGroups: string[];
  acceptedFunding: string[];
  conditionExperience: string[];
  languages: string[];
  ageGroups: string[];
  serviceSuburbs: string[];
  baseSuburb: string | null;
  baseState: string | null;
  intakeStatus: string;
  travelRadiusKm: number | null;
  memberSince: string;
}

export const getPublicProvider = (slug: string) => publicGet<PublicProviderProfile>(`/providers/public/${encodeURIComponent(slug)}`);

// ---------------------------------------------------------------
// Public independent-worker listings (opt-in only)
// ---------------------------------------------------------------
export interface PublicWorker {
  slug: string;
  firstName: string;
  lastInitial: string;
  role: string;
  suburb: string;
  state: string;
  yearsExperience: string;
  hasCar: boolean;
  hourlyRate: number | null;
  services: string[];
  languages: string[];
  conditionExperience: string[];
  availableDays: string[];
  availabilityNote: string;
  bio: string;
  hasPhoto: boolean;
  photoVersion: number;
  rating: number | null;
  reviewCount: number;
}
export interface PublicWorkerList { items: PublicWorker[]; page: number; limit: number; total: number; hasMore: boolean }

export const listPublicWorkers = (p: { service?: string; suburb?: string; state?: string; q?: string; page?: number; limit?: number }) =>
  publicGet<PublicWorkerList>(`/workers/public${qs(p)}`);
export const getPublicWorker = (slug: string) => publicGet<PublicWorker>(`/workers/public/${encodeURIComponent(slug)}`);
export const workerPhotoUrl = (w: Pick<PublicWorker, 'slug' | 'hasPhoto' | 'photoVersion'>) =>
  w.hasPhoto ? `${API_URL}/workers/public/${encodeURIComponent(w.slug)}/photo?v=${w.photoVersion}` : null;

// ---------------------------------------------------------------
// A worker's own profile
// ---------------------------------------------------------------
export interface MyWorkerProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  yearsExperience: string;
  suburb: string;
  state: string;
  hasCar: boolean;
  hourlyRate: number | null;
  services: string[];
  languages: string[];
  conditionExperience: string[];
  availableDays: string[];
  availabilityNote: string;
  bio: string;
  publicProfile: boolean;
  publicSlug: string | null;
  hasPhoto: boolean;
  approved: boolean;
  verificationStatus: string;
  photoVersion: number;
}

export const getMyWorker = () => apiFetch<MyWorkerProfile>('/workers/me');
export const saveMyWorker = (body: Partial<MyWorkerProfile>) => apiFetch<MyWorkerProfile>('/workers/me', { method: 'PUT', body: JSON.stringify(body) });
export const deleteMyPhoto = () => apiFetch<MyWorkerProfile>('/workers/me/photo', { method: 'DELETE' });

/** The signed-in worker's own photo as a temporary object URL (null if none). Revoke it when done. */
export async function fetchMyPhotoUrl(): Promise<string | null> {
  const token = localStorage.getItem('sd_token');
  const res = await fetch(`${API_URL}/workers/me/photo`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return res.ok ? URL.createObjectURL(await res.blob()) : null;
}

export async function uploadMyPhoto(jpeg: Blob): Promise<MyWorkerProfile> {
  const token = localStorage.getItem('sd_token');
  const res = await fetch(`${API_URL}/workers/me/photo`, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: jpeg,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? 'Could not upload that photo.', res.status);
  return body as MyWorkerProfile;
}
