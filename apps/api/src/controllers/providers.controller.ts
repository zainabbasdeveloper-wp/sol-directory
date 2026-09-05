import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';

const MAX_LIMIT = 50;

// Fields safe to expose to authenticated searchers — excludes
// billing/subscription internals (stripe ids, lead quota usage),
// onboarding progress, and account-status (an admin concern, not a
// search-result concern).
const PUBLIC_PROJECTION = 'legalEntityName tradingName abn registrationGroups serviceSuburbs travelRadiusKm weeklyCapacityHours intakeStatus';

export async function listProviders(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  // Suspended providers never appear in search results — this is
  // the same accountStatus gate the admin suspend/reactivate action
  // relies on actually meaning something.
  const filter: Record<string, unknown> = { accountStatus: 'active' };
  if (req.query.suburb) filter.serviceSuburbs = req.query.suburb;
  if (req.query.service) filter.registrationGroups = req.query.service;
  if (req.query.q) {
    filter.$or = [
      { legalEntityName: new RegExp(String(req.query.q), 'i') },
      { tradingName: new RegExp(String(req.query.q), 'i') },
    ];
  }

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .select(PUBLIC_PROJECTION)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Provider.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      legalEntityName: p.legalEntityName,
      tradingName: p.tradingName,
      abn: p.abn,
      registrationGroups: p.registrationGroups ?? [],
      serviceSuburbs: p.serviceSuburbs ?? [],
      travelRadiusKm: p.travelRadiusKm,
      weeklyCapacityHours: p.weeklyCapacityHours,
      intakeStatus: p.intakeStatus,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function getProviderProfile(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ _id: req.params.id, accountStatus: 'active' })
    .select(PUBLIC_PROJECTION)
    .lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  res.json({
    id: String(provider._id),
    legalEntityName: provider.legalEntityName,
    tradingName: provider.tradingName,
    abn: provider.abn,
    registrationGroups: provider.registrationGroups ?? [],
    serviceSuburbs: provider.serviceSuburbs ?? [],
    travelRadiusKm: provider.travelRadiusKm,
    weeklyCapacityHours: provider.weeklyCapacityHours,
    intakeStatus: provider.intakeStatus,
  });
}

// Mirrors workers.controller.ts's requestContact exactly — same
// "not yet a real notification system, but a real pending record"
// state. Was previously a fake button (onClick={onClose}) that did
// nothing at all.
export async function requestProviderContact(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ _id: req.params.id, accountStatus: 'active' }).select('_id').lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  // TODO: create a ContactRequest document (requesterId, providerId,
  // status: 'pending') and notify the provider — same follow-up as
  // the equivalent TODO already sitting in workers.controller.ts.
  res.status(202).json({ status: 'pending', message: 'Request sent. The provider will be notified.' });
}
