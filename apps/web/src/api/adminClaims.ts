import { apiFetch } from './client';

export type ClaimStatus = 'new' | 'verified' | 'rejected';

export interface AdminClaim {
  id: string;
  type: 'ndis' | 'aged_care';
  slug: string;
  listingName: string;
  website: string | null;
  states: string[];
  listingClaimStatus: 'unclaimed' | 'requested' | 'claimed' | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  message: string | null;
  status: ClaimStatus;
  createdAt: string;
}

export interface AdminClaimList {
  items: AdminClaim[];
  page: number;
  pageSize: number;
  total: number;
  counts: Partial<Record<ClaimStatus, number>>;
}

export function listClaims(status: ClaimStatus | 'all', page: number): Promise<AdminClaimList> {
  return apiFetch(`/admin/claims?status=${status}&page=${page}`);
}

export function setClaimStatus(id: string, status: ClaimStatus): Promise<{ id: string; status: ClaimStatus }> {
  return apiFetch(`/admin/claims/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
