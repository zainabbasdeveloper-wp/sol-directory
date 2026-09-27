import { ApiError } from './client';
import type { RegisterType } from '../lib/registerMeta';

/**
 * Public-register listings (api register.controller.ts). No login, no
 * auth header: the data is public-register facts only.
 */
const API_URL = ((import.meta as any).env?.VITE_API_URL ?? '/api').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/register${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error ?? 'Request failed', res.status);
  return body as T;
}

export interface RegisterArea { suburb: string; suburbSlug: string; state: string }

export interface RegisterListItem {
  type: RegisterType;
  slug: string;
  name: string;
  states: string[];
  areaCount: number;
  areas: RegisterArea[];
  supportCategories: string[];
  hasWebsite: boolean;
  /** Only for a listing a member provider has claimed and uploaded a logo for; the registers publish none. */
  logoUrl?: string | null;
  /** The suburb centroid of the listing's first service area — a register listing has no street address, so this is never more precise than "somewhere in this suburb". Null until that suburb has been geocoded. */
  location: { lat: number; lng: number } | null;
}

export interface RegisterSearchResult {
  items: RegisterListItem[]; page: number; limit: number; total: number;
  /** Present when facets were requested: how many listings in this area offer each category. */
  categories?: { category: string; count: number }[];
}

export function searchRegister(params: {
  type: RegisterType; state?: string; suburb?: string; category?: string; q?: string; page?: number; limit?: number; facets?: boolean;
}): Promise<RegisterSearchResult> {
  const qs = new URLSearchParams({ type: params.type });
  if (params.state) qs.set('state', params.state);
  if (params.suburb) qs.set('suburb', params.suburb);
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.facets) qs.set('facets', '1');
  return request(`/search?${qs.toString()}`);
}

export interface RegisterHub {
  total: number;
  states: Record<string, number>;
  categories: { category: string; count: number }[];
  suburbs: { state: string; slug: string; suburb: string; count: number }[];
}
export const getRegisterHub = (type: RegisterType): Promise<RegisterHub> => request(`/hub?type=${type}`);

export interface CategoryOverview {
  total: number;
  states: Record<string, number>;
  topSuburbs: { state: string; slug: string; suburb: string; count: number }[];
  widest: { slug: string; name: string; states: string[]; areaCount: number }[];
}
/** Counts, top suburbs and widest-coverage listings for one support category on the register. */
export const getCategoryOverview = (type: RegisterType, category: string): Promise<CategoryOverview> =>
  request(`/category-overview?type=${type}&category=${encodeURIComponent(category)}`);

export interface CategoryCounts { total: number; states: Record<string, number> }
/** How many register listings list a support category, per state. */
export const getCategoryCounts = (type: RegisterType, category: string): Promise<CategoryCounts> =>
  request(`/category-counts?type=${type}&category=${encodeURIComponent(category)}`);

export interface RegisterListing {
  type: RegisterType;
  slug: string;
  name: string;
  states: string[];
  areaCount: number;
  areas: RegisterArea[];
  website: string | null;
  services: string[];
  supportCategories: string[];
  claimStatus: 'unclaimed' | 'requested' | 'claimed';
  /** A claimed listing's own uploaded logo, else one found on the business's own website, else null (initials shown). */
  logoUrl: string | null;
  location: { lat: number; lng: number } | null;
  related: RegisterListItem[];
}
export const getRegisterListing = (type: RegisterType, slug: string): Promise<RegisterListing> =>
  request(`/${type}/${encodeURIComponent(slug)}`);

export function submitClaimRequest(type: RegisterType, slug: string, input: {
  name: string; email: string; phone?: string; role: string; message?: string; website_url?: string;
}): Promise<{ ok: true }> {
  return request(`/${type}/${encodeURIComponent(slug)}/claim-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
