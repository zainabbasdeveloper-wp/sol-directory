import { ApiError } from './client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export interface DashboardOverview {
  period: string;
  totalUsers: number;
  newUsersRecently: number;
  roleDistribution: Record<string, number>;
  providers: { total: number; active: number; suspended: number; acceptingClients: number; atCapacity: number; incompleteOnboarding: number };
  workers: { total: number; approved: number; awaitingReview: number; rejected: number; published: number };
  leads: { total: number; matched: number; unlocked: number; closed: number };
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
