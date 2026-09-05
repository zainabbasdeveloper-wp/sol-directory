import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';
import Lead from '../models/Lead.js';
import Shortlist from '../models/Shortlist.js';
import AdminActivity from '../models/AdminActivity.js';

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
