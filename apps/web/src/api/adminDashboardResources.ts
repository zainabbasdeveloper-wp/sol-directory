import { ApiError } from './client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function get<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  } catch {
    throw new ApiError(`Could not reach the API at ${API_URL}`, 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export interface DashboardOverview {
  period: string;
  totalUsers: number;
  newInPeriod: { users: number; providers: number; workers: number } | null;
  roleDistribution: Record<string, number>;
  providers: { total: number; active: number; suspended: number; acceptingClients: number; atCapacity: number; incompleteOnboarding: number };
  workers: { total: number; approved: number; awaitingReview: number; rejected: number; published: number };
  leads: { total: number; matched: number; unlocked: number; closed: number; viewed: number; notViewed: number; open: number };
  shortlists: { total: number };
  onboardingFunnel: { step: string; completedCount: number }[];
  pendingVerifications: number;
}
export interface RecentProvider {
  id: string; name: string; suburbs: string[]; services: string[];
  accountStatus: string; intakeStatus: string; createdAt: string; ownerEmail: string | null;
}
export interface RecentWorker {
  id: string; name: string; role: string; suburb: string; services: string[];
  verificationStatus: string; accountStatus: string; availability: string[]; createdAt: string;
}
export interface ActivityItem { id: string; type: string; summary: string; createdAt: string; }
export interface GrowthPoint { date: string; count: number; }

export function getDashboardOverview(period: string): Promise<DashboardOverview> {
  return get(`/admin/dashboard/overview?period=${period}`);
}
export function getRecentProviders(): Promise<{ items: RecentProvider[] }> {
  return get('/admin/dashboard/recent-providers');
}
export function getRecentWorkers(): Promise<{ items: RecentWorker[] }> {
  return get('/admin/dashboard/recent-workers');
}
export function getRecentActivity(): Promise<{ items: ActivityItem[] }> {
  return get('/admin/dashboard/activity');
}
export function getUserGrowth(period: string): Promise<{ period: string; series: GrowthPoint[] }> {
  return get(`/admin/dashboard/user-growth?period=${period}`);
}

export function getProviderByState(): Promise<{ counts: Record<string, number> }> {
  return get('/admin/dashboard/providers-by-state');
}
export function getWorkerBreakdowns(): Promise<{ byService: { label: string; count: number }[]; bySuburb: { label: string; count: number }[] }> {
  return get('/admin/dashboard/worker-breakdowns');
}
export function getProviderActivityTable(): Promise<{ items: { id: string; name: string; views: number; shortlists: number; callbackRequests: number }[] }> {
  return get('/admin/dashboard/provider-activity');
}
export interface SearchResults { users: { id: string; label: string; sublabel: string; linkTo: string }[]; providers: { id: string; label: string; sublabel: string; linkTo: string }[]; workers: { id: string; label: string; sublabel: string; linkTo: string }[]; }
export function searchAdmin(q: string): Promise<SearchResults> {
  return get(`/admin/dashboard/search?q=${encodeURIComponent(q)}`);
}

export interface NotificationItem { id: string; type: string; summary: string; createdAt: string; unread: boolean; }
export function getNotifications(): Promise<{ unreadCount: number; items: NotificationItem[] }> {
  return get('/admin/dashboard/notifications');
}
export async function markNotificationsRead(): Promise<{ success: boolean }> {
  const token = localStorage.getItem('sd_token');
  const res = await fetch(`${API_URL}/admin/dashboard/notifications/mark-read`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export type JobHealth = 'ok' | 'running' | 'failed' | 'overdue' | 'never_run';
export interface OperationsData {
  generatedAt: string;
  alerts: { severity: 'critical' | 'warning' | 'info'; message: string; link?: string; linkLabel?: string }[];
  system: {
    database: boolean; email: boolean; adminAlerts: boolean; senderIdentity: boolean; sms: boolean; payments: boolean; maps: boolean;
    registerLeadEmails: boolean; uptimeSeconds: number; nodeVersion: string;
  };
  jobs: {
    name: string; label: string; description: string; schedule: string; cron: string; command: string; everyHours: number;
    health: JobHealth; lastRunAt: string | null; lastSummary: string | null; lastError: string | null; lastDurationMs: number | null;
    history: { at: string; status: 'running' | 'ok' | 'failed' }[];
  }[];
  enquiries: {
    pipeline: { submitted: number; matched: number; unmatched: number; viewed: number; responded: number };
    daily: { date: string; count: number }[];
    recent: { id: string; ref: string; need: string; location: string; matched: number; viewed: boolean; responded: boolean; createdAt: string }[];
  };
  email: {
    last24h: { sent: number; failed: number; skipped: number };
    last7d: { sent: number; failed: number; skipped: number };
    daily: { date: string; sent: number; failed: number }[];
    recentFailures: { to: string; subject: string; error: string | null; at: string }[];
  };
  automation: {
    last7d: { searcherViewed: number; searcherResponded: number; weeklyMatches: number; providerReminders: number; registerNotices: number };
    registerNoticesTotal: number;
    registerLeadEmailsOn: boolean;
  };
  directory: {
    total: number; ndis: number; agedCare: number; withEmail: number; withPhone: number; withWebsite: number;
    verifiedEmails: number; notifiable: number; optedOut: number; withLanguages: number;
    claims: { unclaimed: number; requested: number; claimed: number }; pendingClaims: number;
  };
}
export function getOperations(): Promise<OperationsData> {
  return get('/admin/dashboard/operations');
}
export async function sendTestAdminEmail(): Promise<{ sent: boolean; to: string }> {
  const res = await fetch(`${API_URL}/admin/dashboard/test-email`, { method: 'POST', headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}
