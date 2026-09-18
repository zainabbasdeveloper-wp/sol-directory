import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Lead, { MASKED_PROJECTION, toMaskedShape, toUnlockedShape } from '../models/Lead.js';
import Provider from '../models/Provider.js';
import UnlockLedger from '../models/UnlockLedger.js';
import PlanConfig from '../models/PlanConfig.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { scoreMatch } from '../services/matching.service.js';
import LeadView from '../models/LeadView.js';
import LeadMatch from '../models/LeadMatch.js';
import { getActiveProviderForUser } from '../utils/getActiveProvider.js';

// Same threshold matchRequests.controller.ts uses to decide a match is
// genuine — kept in sync so "notified" and "browsable" mean the same
// thing, just with the notify-side cap removed here.
const NEARBY_THRESHOLD = 40;

// getActiveProviderForUser is now imported from ../utils/getActiveProvider.js
// — see that file for why this was extracted during a security audit.

export async function listLeads(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  const unlockedIds = new Set(
    (await UnlockLedger.find({ providerId: provider._id }).select('leadId').lean()).map((u) => String(u.leadId))
  );

  // Fetch the masked projection for everyone, then re-fetch full
  // fields only for the specific leads this provider has actually
  // unlocked — never trust an in-memory flag to decide what to
  // serialize for a lead the query didn't already scope to.
  // status != draft — a wizard-in-progress enquiry (see the draft
  // endpoints in matchRequests.controller.ts) is private, incomplete
  // user data, never a real lead for providers to see.
  const leads = await Lead.find({ status: { $ne: 'draft' } }).select(MASKED_PROJECTION).lean();
  const unlockedFull = unlockedIds.size
    ? await Lead.find({ _id: { $in: [...unlockedIds] } }).lean()
    : [];
  const unlockedById = new Map(unlockedFull.map((l) => [String(l._id), l]));

  // Viewed status is per-(lead, provider) — merged in after shaping,
  // since it's not an inherent property of the lead itself.
  const viewedIds = new Set(
    (await LeadView.find({ providerId: provider._id }).select('leadId').lean()).map((v) => String(v.leadId))
  );

  res.json(
    leads.map((l) => {
      const full = unlockedById.get(String(l._id));
      const shaped = full ? toUnlockedShape(full) : toMaskedShape(l);
      return { ...shaped, viewed: viewedIds.has(String(l._id)) };
    })
  );
}

// "Browse nearby requests" (developer brief / architecture doc's
// Referral Marketplace "Browse Requests" screen, Nearby tab) — a paid-
// only feature distinct from listLeads above. listLeads only ever
// shows leads this provider was actually auto-notified about (capped
// at MAX_NOTIFIED_PER_LEAD in matchRequests.controller.ts); this
// surfaces every OTHER open lead the provider would still score as a
// genuine match for, so a good-fit lead that missed the notify cap
// isn't invisible to a paying provider willing to look for it
// themselves. Free ('starter') providers get nothing here — matches
// the plan comparison table's "Browse nearby open requests: No/Yes".
export async function listNearbyLeads(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });

  if (provider.plan === 'starter') {
    return res.status(402).json({ error: 'Browsing nearby requests requires a paid plan', code: 'PLAN_REQUIRED' });
  }
  // A paused (unconfirmed capacity) provider shouldn't be discovering
  // and claiming new work either — they can still see/manage leads
  // already matched or unlocked (listLeads above), just not browse for
  // more until they confirm again.
  if (provider.listingPaused) {
    return res.status(403).json({ error: 'Confirm your capacity to browse new requests.', code: 'CAPACITY_UNCONFIRMED' });
  }

  // Only open leads (matched, not yet closed) — dead/closed enquiries
  // shouldn't show up as something new to browse.
  const openLeads = await Lead.find({ status: 'matched' }).lean();

  const nearby = openLeads
    .map((l) => ({ lead: l, result: scoreMatch(l as any, provider as any) }))
    .filter(({ result }) => result.score >= NEARBY_THRESHOLD)
    .sort((a, b) => b.result.score - a.result.score)
    .map(({ lead }) => toMaskedShape(lead));

  res.json(nearby);
}

// Records a meaningful view — the frontend calls this when a
// provider actually opens a lead's details, not on every list
// render. The unique index on (leadId, providerId) means this is
// naturally idempotent: opening the same lead five times updates
// lastViewedAt, never creates five rows.
export async function markLeadViewed(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  const lead = await Lead.findById(req.params.id).select('_id').lean();
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  await LeadView.findOneAndUpdate(
    { leadId: lead._id, providerId: provider._id },
    { $set: { lastViewedAt: new Date() }, $setOnInsert: { firstViewedAt: new Date() } },
    { upsert: true }
  );

  res.json({ viewed: true });
}

export async function unlockLead(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
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

  // Geocode once, lazily, on first real unlock — there's no lead
  // creation endpoint in this codebase to do this at submission
  // time, and it's wasted work to geocode leads no provider ever
  // unlocks. Failure here never blocks the unlock response itself.
  if (!lead.location?.coordinates?.length && lead.suburb) {
    const geo = await geocodeAddress(`${lead.suburb}, Australia`);
    if (geo) {
      lead.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
      await lead.save();
    }
  }

  res.json(toUnlockedShape(lead));
}

// Full detail for a lead — powers the lead detail page. SECURITY:
// contact-level detail (name/phone/budget/note/location) must only
// ever be returned for a lead THIS provider has actually unlocked via
// UnlockLedger — the comment above this function used to claim that
// check already happened here, but it never did, meaning any
// authenticated provider could read any other provider's unlocked
// lead's full contact details just by guessing/enumerating an ID,
// completely bypassing the paid-unlock quota system. Mirrors the same
// UnlockLedger lookup unlockLead/listLeads already use.
export async function getLeadDetail(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const unlocked = await UnlockLedger.exists({ providerId: provider._id, leadId: lead._id });
  res.json(unlocked ? toUnlockedShape(lead) : toMaskedShape(lead));
}

// A real, previously-missing capability: a provider can explicitly
// decline a lead that was matched to them. Ownership check via
// LeadMatch — a provider can only decline a lead that was actually
// matched to them, not an arbitrary ID.
export async function declineLead(req: AuthedRequest, res: Response) {
  const provider = await getActiveProviderForUser(req.user!.id);
  if (!provider) return res.status(403).json({ error: 'No active provider profile for this account' });
  const match = await LeadMatch.findOneAndUpdate(
    { leadId: req.params.id, providerId: provider._id },
    { status: 'declined', respondedAt: new Date() },
    { new: true }
  );
  if (!match) return res.status(404).json({ error: 'This lead was not matched to your account.' });
  res.json({ id: String(match._id), status: match.status });
}
