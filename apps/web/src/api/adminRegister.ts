import { apiFetch } from './client';

export interface AdminRegisterItem {
  id: string;
  type: 'ndis' | 'aged_care';
  slug: string;
  name: string;
  states: string[];
  areaCount: number;
  supportCategories: string[];
  hasWebsite: boolean;
  claimStatus: 'unclaimed' | 'requested' | 'claimed';
  providerId: string | null;
  importedAt: string;
  sourceUpdatedAt: string | null;
}

export interface AdminRegisterList {
  page: number;
  pageSize: number;
  total: number;
  counts: Partial<Record<'unclaimed' | 'requested' | 'claimed', number>>;
  totalsByType: Partial<Record<'ndis' | 'aged_care', number>>;
  items: AdminRegisterItem[];
}

export interface AdminRegisterSummary {
  total: number;
  byType: Partial<Record<'ndis' | 'aged_care', number>>;
  byClaimStatus: Partial<Record<'unclaimed' | 'requested' | 'claimed', number>>;
  openClaimRequests: number;
}

export function listRegisterAdmin(params: {
  type?: string; state?: string; category?: string; claimStatus?: string; q?: string; page?: number;
}): Promise<AdminRegisterList> {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.state) qs.set('state', params.state);
  if (params.category) qs.set('category', params.category);
  if (params.claimStatus) qs.set('claimStatus', params.claimStatus);
  if (params.q) qs.set('q', params.q);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  return apiFetch(`/admin/register?${qs.toString()}`);
}

export const getRegisterAdminSummary = (): Promise<AdminRegisterSummary> => apiFetch('/admin/register/summary');
