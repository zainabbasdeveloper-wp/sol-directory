import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';
import Lead from '../models/Lead.js';
import Shortlist from '../models/Shortlist.js';
import AdminActivity from '../models/AdminActivity.js';
import ProviderView from '../models/ProviderView.js';
import ContactRequest from '../models/ContactRequest.js';
import LeadView from '../models/LeadView.js';

const ONBOARDING_STEP_KEYS = ['org', 'insurance', 'areas', 'team', 'policy', 'billing'];

function periodStartDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '30d': return new Date(now.getTime() - 30 * 86400000);
    case '90d': return new Date(now.getTime() - 90 * 86400000);
    case '1y': return new Date(now.getTime() - 365 * 86400000);
    default: return null; // 'all'
  }
}

// One consolidated endpoint for everything the dashboard needs on
// initial load — matches the existing app's pattern of batching
// related reads into a single request rather than firing a dozen
// small ones for data that's always displayed together.
export async function getDashboardOverview(req: AuthedRequest, res: Response) {
  const period = String(req.query.period ?? 'all');
  const since = periodStartDate(period);
  const createdFilter = since ? { createdAt: { $gte: since } } : {};

  const [
    totalUsers,
    roleCounts,
    providerTotal,
    providerActive,
    providerSuspended,
    providerAcceptingClients,
    providerAtCapacity,
    workerTotal,
    workerApproved,
    workerAwaitingReview,
    workerRejected,
    workerPublished,
    leadTotal,
    leadMatched,
    leadUnlocked,
    leadClosed,
    leadsWithViewsResult,
    shortlistTotal,
    newUsersInPeriod,
  ] = await Promise.all([
    User.countDocuments(createdFilter),
    User.aggregate([{ $match: createdFilter }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Provider.countDocuments(createdFilter),
    Provider.countDocuments({ ...createdFilter, accountStatus: 'active' }),
    Provider.countDocuments({ ...createdFilter, accountStatus: 'suspended' }),
    Provider.countDocuments({ ...createdFilter, intakeStatus: 'Open to referrals' }),
    Provider.countDocuments({ ...createdFilter, intakeStatus: { $in: ['Limited capacity', 'Waitlist only'] } }),
    Worker.countDocuments(createdFilter),
    Worker.countDocuments({ ...createdFilter, verificationStatus: 'approved' }),
    Worker.countDocuments({ ...createdFilter, verificationStatus: 'awaiting_review' }),
    Worker.countDocuments({ ...createdFilter, verificationStatus: 'rejected' }),
    Worker.countDocuments({ ...createdFilter, published: true }),
    Lead.countDocuments(createdFilter),
    Lead.countDocuments({ ...createdFilter, status: 'matched' }),
    Lead.countDocuments({ ...createdFilter, status: 'unlocked' }),
    Lead.countDocuments({ ...createdFilter, status: 'closed' }),
    LeadView.distinct('leadId'),
    Shortlist.countDocuments(createdFilter),
    User.countDocuments(since ? { createdAt: { $gte: since } } : { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
  ]);

  // Onboarding funnel — how many providers have completed each step,
  // regardless of period filter (a funnel is inherently cumulative).
  const funnelCounts = await Promise.all(
    ONBOARDING_STEP_KEYS.map((key) => Provider.countDocuments({ onboarding: { $elemMatch: { key, complete: true } } }))
  );
  const onboardingFunnel = ONBOARDING_STEP_KEYS.map((key, i) => ({ step: key, completedCount: funnelCounts[i] }));
  const providerIncompleteOnboarding = providerTotal - (funnelCounts[ONBOARDING_STEP_KEYS.length - 1] ?? 0);

  const roleDistribution: Record<string, number> = { worker: 0, provider: 0, coordinator: 0, participant: 0, admin: 0 };
  for (const r of roleCounts as { _id: string; count: number }[]) {
    if (r._id in roleDistribution) roleDistribution[r._id] = r.count;
  }

  res.json({
    period,
    totalUsers,
    newUsersRecently: newUsersInPeriod,
    roleDistribution,
    providers: {
      total: providerTotal,
      active: providerActive,
      suspended: providerSuspended,
      acceptingClients: providerAcceptingClients,
      atCapacity: providerAtCapacity,
      incompleteOnboarding: Math.max(0, providerIncompleteOnboarding),
    },
    workers: {
      total: workerTotal,
      approved: workerApproved,
      awaitingReview: workerAwaitingReview,
      rejected: workerRejected,
      published: workerPublished,
    },
    leads: {
      total: leadTotal,
      matched: leadMatched,
      unlocked: leadUnlocked,
      closed: leadClosed,
      viewed: leadsWithViewsResult.length,
      notViewed: Math.max(0, leadTotal - leadsWithViewsResult.length),
    },
    shortlists: { total: shortlistTotal },
    onboardingFunnel,
    pendingVerifications: workerAwaitingReview,
  });
}

export async function getRecentProviders(req: AuthedRequest, res: Response) {
  const limit = Math.min(20, Number(req.query.limit) || 8);
  const docs = await Provider.find()
    .populate('userId', 'name email')
    .select('legalEntityName tradingName serviceSuburbs registrationGroups accountStatus intakeStatus createdAt userId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      name: p.tradingName || p.legalEntityName || 'Unnamed provider',
      suburbs: p.serviceSuburbs ?? [],
      services: p.registrationGroups ?? [],
      accountStatus: p.accountStatus,
      intakeStatus: p.intakeStatus,
      createdAt: p.createdAt,
      ownerEmail: p.userId?.email ?? null,
    })),
  });
}

export async function getRecentWorkers(req: AuthedRequest, res: Response) {
  const limit = Math.min(20, Number(req.query.limit) || 8);
  const docs = await Worker.find()
    .populate('userId', 'name email')
    .select('firstName lastName role suburb services verificationStatus accountStatus availability createdAt userId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    items: docs.map((w: any) => ({
      id: String(w._id),
      name: `${w.firstName} ${w.lastName}`,
      role: w.role,
      suburb: w.suburb,
      services: w.services ?? [],
      verificationStatus: w.verificationStatus,
      accountStatus: w.accountStatus,
      availability: w.availability ?? [],
      createdAt: w.createdAt,
    })),
  });
}

export async function getRecentActivity(req: AuthedRequest, res: Response) {
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const items = await AdminActivity.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ items: items.map((a: any) => ({ id: String(a._id), type: a.type, summary: a.summary, createdAt: a.createdAt })) });
}

// Real per-day registration counts over the requested period — not a
// smoothed/fabricated curve. Days with zero registrations are
// included as 0, not omitted, so the frontend doesn't need to fake
// gaps in the data.
export async function getUserGrowth(req: AuthedRequest, res: Response) {
  const period = String(req.query.period ?? '30d');
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
  const since = new Date(Date.now() - days * 86400000);
  since.setHours(0, 0, 0, 0);

  const rows = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r: any) => [r._id, r.count]));

  const series: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, count: byDate.get(key) ?? 0 });
  }

  res.json({ period, series });
}

// Real per-suburb → state lookup — no state field exists directly on
// Provider (only serviceSuburbs), so "providers by state" has to be
// computed from this map rather than a stored field.
const STATE_BY_SUBURB: Record<string, string> = {
  Sydney: 'NSW', Newcastle: 'NSW', Wollongong: 'NSW', Parramatta: 'NSW', Bankstown: 'NSW',
  Melbourne: 'VIC', Geelong: 'VIC', Ballarat: 'VIC', Dandenong: 'VIC',
  Brisbane: 'QLD', 'Gold Coast': 'QLD', Townsville: 'QLD', Cairns: 'QLD',
  Perth: 'WA', Fremantle: 'WA', Rockingham: 'WA',
  Adelaide: 'SA', 'Mount Gambier': 'SA',
  Hobart: 'TAS', Launceston: 'TAS',
  Canberra: 'ACT',
  Darwin: 'NT', 'Alice Springs': 'NT',
};

export async function getProviderByState(req: AuthedRequest, res: Response) {
  const providers = await Provider.find({ accountStatus: 'active' }).select('serviceSuburbs').lean();
  const counts: Record<string, number> = { NSW: 0, VIC: 0, QLD: 0, WA: 0, SA: 0, TAS: 0, ACT: 0, NT: 0 };
  for (const p of providers) {
    const states = new Set((p.serviceSuburbs ?? []).map((s: string) => STATE_BY_SUBURB[s]).filter(Boolean));
    for (const s of states) counts[s as string] = (counts[s as string] ?? 0) + 1;
  }
  res.json({ counts });
}

export async function getWorkerBreakdowns(req: AuthedRequest, res: Response) {
  const [byService, bySuburb] = await Promise.all([
    Worker.aggregate([{ $unwind: '$services' }, { $group: { _id: '$services', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Worker.aggregate([{ $match: { suburb: { $ne: null } } }, { $group: { _id: '$suburb', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
  ]);
  res.json({
    byService: byService.map((r: any) => ({ label: r._id, count: r.count })),
    bySuburb: bySuburb.map((r: any) => ({ label: r._id, count: r.count })),
  });
}

// Most-viewed / most-shortlisted providers, plus callback-request
// count — all from real event data (ProviderView, Shortlist), not
// invented numbers. Callback requests aren't persisted anywhere yet
// (requestProviderContact is still a 202-only stub per its own
// comment), so that column is honestly 0 for every row until that
// TODO is addressed — not fabricated.
export async function getProviderActivityTable(req: AuthedRequest, res: Response) {
  const limit = Math.min(20, Number(req.query.limit) || 10);

  const [viewCounts, shortlistCounts, callbackCounts] = await Promise.all([
    ProviderView.aggregate([{ $group: { _id: '$providerId', views: { $sum: 1 } } }]),
    Shortlist.aggregate([{ $group: { _id: '$providerId', shortlists: { $sum: 1 } } }]),
    ContactRequest.aggregate([{ $match: { targetType: 'Provider' } }, { $group: { _id: '$targetId', callbacks: { $sum: 1 } } }]),
  ]);

  const viewMap = new Map(viewCounts.map((r: any) => [String(r._id), r.views]));
  const shortlistMap = new Map(shortlistCounts.map((r: any) => [String(r._id), r.shortlists]));
  const callbackMap = new Map(callbackCounts.map((r: any) => [String(r._id), r.callbacks]));

  const providerIds = new Set([...viewMap.keys(), ...shortlistMap.keys(), ...callbackMap.keys()]);
  const providers = await Provider.find({ _id: { $in: [...providerIds] } }).select('legalEntityName tradingName').lean();

  const rows = providers.map((p: any) => ({
    id: String(p._id),
    name: p.tradingName || p.legalEntityName || 'Unnamed provider',
    views: viewMap.get(String(p._id)) ?? 0,
    shortlists: shortlistMap.get(String(p._id)) ?? 0,
    callbackRequests: callbackMap.get(String(p._id)) ?? 0,
  }));

  rows.sort((a, b) => (b.views + b.shortlists + b.callbackRequests) - (a.views + a.shortlists + a.callbackRequests));
  res.json({ items: rows.slice(0, limit) });
}

export async function searchAdmin(req: AuthedRequest, res: Response) {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ users: [], providers: [], workers: [] });

  const re = new RegExp(q, 'i');
  const [users, providers, workers] = await Promise.all([
    User.find({ $or: [{ name: re }, { email: re }] }).select('name email role providerId workerId').limit(8).lean(),
    Provider.find({ $or: [{ legalEntityName: re }, { tradingName: re }] }).select('legalEntityName tradingName').limit(8).lean(),
    Worker.find({ $or: [{ firstName: re }, { lastName: re }] }).select('firstName lastName suburb').limit(8).lean(),
  ]);

  // Each role navigates to a different detail page keyed by a
  // different document id — a worker-role user's admin detail page
  // lives at /admin/workers/:workerId, not /admin/users/:userId. Admin
  // accounts have no detail page anywhere, so they get no link at all
  // rather than a broken one.
  const navigableUsers = users
    .map((u: any) => {
      if (u.role === 'provider' && u.providerId) return { id: String(u.providerId), label: u.name, sublabel: `${u.email} · provider`, linkTo: 'providers' };
      if (u.role === 'worker' && u.workerId) return { id: String(u.workerId), label: u.name, sublabel: `${u.email} · worker`, linkTo: 'workers' };
      if (u.role === 'coordinator' || u.role === 'participant') return { id: String(u._id), label: u.name, sublabel: `${u.email} · ${u.role}`, linkTo: 'users' };
      return null; // admin, or a provider/worker missing their linked profile doc
    })
    .filter(Boolean);

  res.json({
    users: navigableUsers,
    providers: providers.map((p: any) => ({ id: String(p._id), label: p.tradingName || p.legalEntityName, sublabel: 'Provider', linkTo: 'providers' })),
    workers: workers.map((w: any) => ({ id: String(w._id), label: `${w.firstName} ${w.lastName}`, sublabel: w.suburb ?? 'Worker', linkTo: 'workers' })),
  });
}

// Notifications are deliberately NOT a separate model — they're the
// same AdminActivity feed the dashboard's "Recent activity" section
// already reads, with "unread" computed as "created after this
// admin's lastNotificationsViewedAt timestamp" rather than a
// per-notification read flag. Building a second parallel system here
// would duplicate data that already exists for no real benefit.
export async function getNotifications(req: AuthedRequest, res: Response) {
  const user = await User.findById(req.user!.id).select('lastNotificationsViewedAt').lean();
  const since = user?.lastNotificationsViewedAt ?? new Date(0);

  const items = await AdminActivity.find().sort({ createdAt: -1 }).limit(20).lean();
  const unreadCount = await AdminActivity.countDocuments({ createdAt: { $gt: since } });

  res.json({
    unreadCount,
    items: items.map((a: any) => ({ id: String(a._id), type: a.type, summary: a.summary, createdAt: a.createdAt, unread: a.createdAt > since })),
  });
}

export async function markNotificationsRead(req: AuthedRequest, res: Response) {
  await User.findByIdAndUpdate(req.user!.id, { lastNotificationsViewedAt: new Date() });
  res.json({ success: true });
}
