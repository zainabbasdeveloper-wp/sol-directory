import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Lead, { MASKED_PROJECTION, toMaskedShape, toUnlockedShape } from '../models/Lead.js';
import Provider from '../models/Provider.js';
import UnlockLedger from '../models/UnlockLedger.js';
import PlanConfig from '../models/PlanConfig.js';

async function getProviderForUser(userId: string) {
  const provider = await Provider.findOne({ userId });
  if (!provider) {
    const err = new Error('No provider profile for this account') as Error & { status: number };
    err.status = 403;
    throw err;
  }
  return provider;
}

export async function listLeads(req: AuthedRequest, res: Response) {
  const provider = await getProviderForUser(req.user!.id);
  const unlockedIds = new Set(
    (await UnlockLedger.find({ providerId: provider._id }).select('leadId').lean()).map((u) => String(u.leadId))
  );

  // Fetch the masked projection for everyone, then re-fetch full
  // fields only for the specific leads this provider has actually
  // unlocked — never trust an in-memory flag to decide what to
  // serialize for a lead the query didn't already scope to.
  const leads = await Lead.find({}).select(MASKED_PROJECTION).lean();
  const unlockedFull = unlockedIds.size
    ? await Lead.find({ _id: { $in: [...unlockedIds] } }).lean()
    : [];
  const unlockedById = new Map(unlockedFull.map((l) => [String(l._id), l]));

  res.json(
    leads.map((l) => {
      const full = unlockedById.get(String(l._id));
      return full ? toUnlockedShape(full) : toMaskedShape(l);
    })
  );
}

export async function unlockLead(req: AuthedRequest, res: Response) {
  const provider = await getProviderForUser(req.user!.id);
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required for this action' });
  }

  const existing = await UnlockLedger.findOne({ providerId: provider._id, leadId: lead._id });
  if (existing) {
    return res.json(toUnlockedShape(lead));
  }

  const planDoc = await PlanConfig.findOne({ key: provider.plan }).lean();
  const quota = planDoc?.quota ?? 0; // null in DB means unlimited — see below

  if (quota === 0 && planDoc?.quota !== null) {
    return res.status(402).json({ error: 'Choose a plan to unlock this lead', code: 'PLAN_REQUIRED' });
  }
  const isUnlimited = planDoc?.quota === null;
  if (!isUnlimited && provider.leadUnlocksUsedThisPeriod >= quota) {
    return res.status(402).json({ error: `You have used all ${quota} unlocks this month`, code: 'QUOTA_EXHAUSTED' });
  }

  try {
    await UnlockLedger.create({ providerId: provider._id, leadId: lead._id, idempotencyKey });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.json(toUnlockedShape(lead)); // race: already unlocked under a different key
    }
    throw err;
  }

  provider.leadUnlocksUsedThisPeriod += 1;
  await provider.save();

  res.json(toUnlockedShape(lead));
}
