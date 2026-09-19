import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import { logActivity } from '../models/AdminActivity.js';
import { syncProviderToWordPress } from '../services/wordpressSync.service.js';

const MAX_LIMIT = 50;

// Route-level requireRole('admin') already guarantees only admin
// reaches these — no additional role check needed inside the
// handlers themselves.

export async function listProvidersAdmin(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  const filter: Record<string, unknown> = {};
  if (req.query.status === 'active' || req.query.status === 'suspended') {
    filter.accountStatus = req.query.status;
  } else if (req.query.status === 'paused') {
    // Providers dropped from search/matching for not confirming their
    // weekly capacity (distinct from an admin suspension).
    filter.accountStatus = 'active';
    filter.listingPaused = true;
  }

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .populate('userId', 'name email')
      .select('legalEntityName tradingName abn plan intakeStatus accountStatus listingPaused lastCapacityConfirmedAt createdAt userId')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Provider.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      legalEntityName: p.legalEntityName,
      tradingName: p.tradingName,
      abn: p.abn,
      plan: p.plan,
      intakeStatus: p.intakeStatus,
      accountStatus: p.accountStatus,
      listingPaused: !!p.listingPaused,
      lastCapacityConfirmedAt: p.lastCapacityConfirmedAt ?? null,
      createdAt: p.createdAt,
      ownerName: p.userId?.name ?? null,
      ownerEmail: p.userId?.email ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function getProviderAdmin(req: AuthedRequest, res: Response) {
  const provider = await Provider.findById(req.params.id).populate('userId', 'name email mobile').lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  res.json(provider);
}

export async function setProviderAccountStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body as { status: string };
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'status must be "active" or "suspended"' });
  }

  const provider = await Provider.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true }).lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  await logActivity('provider_status_changed', `${name} was ${status === 'suspended' ? 'suspended' : 'reactivated'}`);

  // Suspending/reactivating flips the WP mirror post between
  // draft/publish (see wordpressSync.service.ts) — fire-and-forget,
  // same as every other sync trigger.
  syncProviderToWordPress(String(provider._id)).catch(() => {});

  res.json({ id: String(provider._id), accountStatus: provider.accountStatus });
}

/**
 * Admin override for the weekly-capacity pause (scripts/
 * weeklyCapacityCheck.ts). Unpausing does NOT fabricate a confirmation
 * (lastCapacityConfirmedAt is left alone) — it clears the outstanding
 * confirmation window instead, so the next weekly run sends a fresh
 * prompt rather than immediately re-pausing over the old, expired one.
 */
export async function setProviderListingPaused(req: AuthedRequest, res: Response) {
  const { paused } = req.body as { paused: unknown };
  if (typeof paused !== 'boolean') return res.status(400).json({ error: 'paused must be true or false' });

  const update = paused
    ? { $set: { listingPaused: true } }
    : { $set: { listingPaused: false }, $unset: { capacityConfirmTokenHash: 1, capacityConfirmExpiresAt: 1 } };

  const provider = await Provider.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  await logActivity('provider_status_changed', `${name}'s listing was ${paused ? 'paused' : 'resumed'} by an admin`);

  res.json({ id: String(provider._id), listingPaused: !!provider.listingPaused });
}
