import { apiFetch } from './client';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface AdminReview {
  id: string;
  workerId: string;
  workerName: string;
  workerPlace: string;
  reviewerName: string;
  rating: number;
  text: string;
  status: ReviewStatus;
  moderationNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReviewList {
  items: AdminReview[];
  page: number;
  pageSize: number;
  total: number;
  counts: Partial<Record<ReviewStatus, number>>;
}

export const listWorkerReviews = (status: ReviewStatus | 'all', page: number): Promise<AdminReviewList> =>
  apiFetch(`/admin/worker-reviews?status=${status}&page=${page}`);

export const moderateWorkerReview = (id: string, status: ReviewStatus, note?: string) =>
  apiFetch<{ id: string; status: ReviewStatus }>(`/admin/worker-reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
