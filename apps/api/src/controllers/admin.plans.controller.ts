import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import { logActivity } from '../models/AdminActivity.js';

const MAX_LIMIT = 50;
const EXPIRING_SOON_DAYS = 30;

export async function listMemberPlans(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  const filter: Record<string, unknown> = {};
  if (req.query.status && ['active', 'trial', 'expired', 'cancelled', 'suspended'].includes(String(req.query.status))) {
    filter.planStatus = req.query.status;
  }
  if (req.query.plan && ['starter', 'growth', 'pro'].includes(String(req.query.plan))) {
    filter.plan = req.query.plan;
  }

  const expiringThreshold = new Date(Date.now() + EXPIRING_SOON_DAYS * 86400000);

  const [docs, total, statusCounts, expiringSoonCount] = await Promise.all([
    Provider.find(filter)
      .populate('userId', 'name email')
      .select('legalEntityName tradingName plan planStatus planStartedAt planExpiresAt userId')
      .sort({ planStartedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Provider.countDocuments(filter),
    Provider.aggregate([{ $group: { _id: '$planStatus', count: { $sum: 1 } } }]),
    Provider.countDocuments({ planStatus: 'active', planExpiresAt: { $lte: expiringThreshold, $gte: new Date() } }),
  ]);

  const counts: Record<string, number> = { active: 0, trial: 0, expired: 0, cancelled: 0, suspended: 0 };
  for (const c of statusCounts as { _id: string; count: number }[]) {
    if (c._id in counts) counts[c._id] = c.count;
  }
  const totalMembers = await Provider.countDocuments();

  res.json({
    totalMembers,
    counts,
    expiringSoon: expiringSoonCount,
    items: docs.map((p: any) => ({
      id: String(p._id),
      name: p.tradingName || p.legalEntityName || 'Unnamed provider',
      ownerName: p.userId?.name ?? null,
      ownerEmail: p.userId?.email ?? null,
      plan: p.plan,
      planStatus: p.planStatus,
      planStartedAt: p.planStartedAt,
      planExpiresAt: p.planExpiresAt ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function setPlanStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body as { status: string };
  const VALID = ['active', 'trial', 'expired', 'cancelled', 'suspended'];
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
  }

  const provider = await Provider.findById(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  provider.planStatus = status as any;
  provider.planHistory.push({ plan: provider.plan, planStatus: status, changedAt: new Date(), changedBy: 'admin' });
  await provider.save();

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  await logActivity('plan_status_changed', `${name}'s plan was set to ${status}`);

  res.json({ id: String(provider._id), planStatus: provider.planStatus });
}

export async function changePlanTier(req: AuthedRequest, res: Response) {
  const { plan } = req.body as { plan: string };
  const VALID = ['starter', 'growth', 'pro'];
  if (!VALID.includes(plan)) {
    return res.status(400).json({ error: `plan must be one of: ${VALID.join(', ')}` });
  }

  const provider = await Provider.findById(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const previousPlan = provider.plan;
  provider.plan = plan as any;
  provider.planHistory.push({ plan, planStatus: provider.planStatus, changedAt: new Date(), changedBy: 'admin' });
  await provider.save();

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  await logActivity('plan_changed', `${name}'s plan was changed from ${previousPlan} to ${plan}`);

  res.json({ id: String(provider._id), plan: provider.plan });
}

export async function getPlanHistory(req: AuthedRequest, res: Response) {
  const provider = await Provider.findById(req.params.id).select('planHistory tradingName legalEntityName').lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  res.json({
    name: provider.tradingName || provider.legalEntityName || 'Unnamed provider',
    history: (provider.planHistory ?? []).slice().reverse(),
  });
}
