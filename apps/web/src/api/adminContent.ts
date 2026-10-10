import { ApiError } from './client';

const API_URL = ((import.meta as any).env?.VITE_API_URL ?? '/api').replace(/\/$/, '');
const headers = (): Record<string, string> => {
  const token = localStorage.getItem('sd_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export class ContentError extends ApiError {
  issues: string[];
  constructor(message: string, status: number, issues: string[] = []) {
    super(message, status);
    this.issues = issues;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/admin/content${path}`, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ContentError(body?.error ?? `Request failed (${res.status})`, res.status, Array.isArray(body?.issues) ? body.issues : []);
  return body as T;
}

export type ContentStatus = 'new' | 'brief' | 'scheduled' | 'published' | 'dismissed';

export interface ContentUpdate {
  id: string;
  source: string;
  url: string;
  title: string;
  categories: string[];
  teaser: string | null;
  publishedAt: string | null;
  headings: string[];
  wordCount: number;
  topics: string[];
  priority: number;
  firstSeenAt: string;
  lastChangedAt: string | null;
  changeCount: number;
  needsRecheck: boolean;
  status: ContentStatus;
  wpPostId: number | null;
  wpPostUrl: string | null;
  editUrl: string | null;
  scheduledFor: string | null;
  publishedOnAt: string | null;
  dismissedReason: string | null;
  related?: { label: string; path: string }[];
}

export interface ContentOverview {
  wordpressConnected: boolean;
  counts: Record<ContentStatus, number>;
  needsRecheck: number;
  lastRun: { at: string; status: string; summary: string } | null;
  nextSlot: string | null;
  settings: { publishHour: number; maxPerDay: number; timezone: string };
}

export const getOverview = () => call<ContentOverview>('/overview');
export const listUpdates = (status: string, page: number) =>
  call<{ items: ContentUpdate[]; page: number; total: number; hasMore: boolean }>(`/updates?status=${encodeURIComponent(status)}&page=${page}`);
export const scanNow = () => call<{ discovered: number; added: number; changed: number; rechecked: number; enriched: number; blocked: boolean; problems: string[] }>('/scan', { method: 'POST' });
export const createBrief = (id: string) => call<ContentUpdate & { created: boolean; adopted: boolean }>(`/updates/${id}/brief`, { method: 'POST' });
export const checkReady = (id: string) => call<{ ready: boolean; issues: string[] }>(`/updates/${id}/check`);
export const publish = (id: string, mode: 'now' | 'schedule', at?: string) =>
  call<ContentUpdate & { outcome: 'published' | 'scheduled' }>(`/updates/${id}/publish`, { method: 'POST', body: JSON.stringify({ mode, at }) });
export const dismiss = (id: string, reason?: string) => call<ContentUpdate>(`/updates/${id}/dismiss`, { method: 'POST', body: JSON.stringify({ reason }) });
export const restore = (id: string) => call<ContentUpdate>(`/updates/${id}/restore`, { method: 'POST' });
export const markRechecked = (id: string) => call<ContentUpdate>(`/updates/${id}/rechecked`, { method: 'POST' });
