import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import Provider from '../models/Provider.js';
import AdminActivity from '../models/AdminActivity.js';
import { notifyProviderOfLead } from '../services/leadNotify.js';
import { trackUrl } from '../services/requestTracking.js';
import { scoreMatch, MATCH_WEIGHTS } from '../services/matching.service.js';

const DAY = 86400000;
export const SHARED_BY_ADMIN = 'Shared by SolDirectory';

/** Who an enquiry was actually delivered to and how far it got. */
export async function getLeadDeliveries(req: AuthedRequest, res: Response) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
  const matches = await LeadMatch.find({ leadId: req.params.id }).sort({ score: -1 }).lean();
  const providers = await Provider.find({ _id: { $in: matches.map((m) => m.providerId) } }).select('tradingName legalEntityName').lean();
  const names = new Map(providers.map((p: any) => [String(p._id), p.tradingName || p.legalEntityName]));
  res.json({
    items: matches.map((m) => ({
      id: String(m._id), providerId: String(m.providerId), providerName: names.get(String(m.providerId)) ?? 'Unknown provider',
      score: m.score, reason: m.matchReason, status: m.status, notifiedAt: m.notifiedAt, viewedAt: m.viewedAt, respondedAt: m.respondedAt,
    })),
  });
}

/** GET /api/admin/leads?filter=all|unmatched|named|waiting|answered&q=&page= — every real enquiry, with who has it. */
export async function listAdminLeads(req: AuthedRequest, res: Response) {
  const filter = String(req.query.filter ?? 'all');
  const q = String(req.query.q ?? '').trim().slice(0, 80);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;

  const where: Record<string, unknown> = { status: { $ne: 'draft' } };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    where.$or = [{ need: rx }, { suburb: rx }, { requesterName: rx }, { requesterEmail: rx }, { 'preferredListing.name': rx }, { serviceContext: rx }];
  }
  if (filter === 'named') where.preferredListing = { $exists: true, $ne: null };
  if (filter === 'waiting') where.createdAt = { $lte: new Date(Date.now() - DAY) };

  // "unmatched" / "waiting" / "answered" depend on LeadMatch rows, so they are worked out on the set below.
  const [docs, total] = await Promise.all([
    Lead.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Lead.countDocuments(where),
  ]);
  const ids = docs.map((d) => d._id);
  const matches = ids.length ? await LeadMatch.find({ leadId: { $in: ids } }).select('leadId providerId status notifiedAt viewedAt respondedAt matchReason').lean() : [];
  const providers = matches.length ? await Provider.find({ _id: { $in: matches.map((m) => m.providerId) } }).select('tradingName legalEntityName').lean() : [];
  const names = new Map(providers.map((p: any) => [String(p._id), p.tradingName || p.legalEntityName]));

  let items = docs.map((l: any) => {
    const ms = matches.filter((m: any) => String(m.leadId) === String(l._id));
    return {
      id: String(l._id),
      ref: String(l._id).slice(-8).toUpperCase(),
      createdAt: l.createdAt,
      need: l.need && !/^not sure yet$/i.test(l.need) ? l.need : l.serviceContext || 'Not specified',
      suburb: l.suburb, state: l.state, careFor: l.careFor, timeframe: l.timeframe, funding: l.fundingType,
      requesterName: l.requesterName, requesterEmail: l.requesterEmail, requesterPhone: l.contactPhone,
      requestedProvider: l.preferredListing?.name ?? null,
      hasAccount: !!l.requesterUserId,
      trackingUrl: trackUrl(String(l._id)),
      matches: ms.map((m: any) => ({
        providerId: String(m.providerId), name: names.get(String(m.providerId)) ?? 'Provider', status: m.status,
        viewedAt: m.viewedAt, respondedAt: m.respondedAt, reason: m.matchReason,
      })),
    };
  });
  if (filter === 'unmatched') items = items.filter((i) => i.matches.length === 0);
  if (filter === 'waiting') items = items.filter((i) => i.matches.length > 0 && !i.matches.some((m) => m.status === 'viewed' || m.status === 'contacted'));
  if (filter === 'answered') items = items.filter((i) => i.matches.some((m) => m.status === 'contacted'));

  res.json({ items, page, limit, total, hasMore: page * limit < total });
}

/** POST /api/admin/leads/:id/share { providerId } — an administrator hands an enquiry to a member provider. */
export async function shareLeadWithProvider(req: AuthedRequest, res: Response) {
  const { providerId } = (req.body ?? {}) as { providerId?: string };
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Enquiry not found.' });
  if (!providerId || !mongoose.isValidObjectId(providerId)) return res.status(400).json({ error: 'Choose a provider.' });
  const [lead, provider] = await Promise.all([
    Lead.findOne({ _id: req.params.id, status: { $ne: 'draft' } }),
    Provider.findOne({ _id: providerId, accountStatus: 'active' }),
  ]);
  if (!lead) return res.status(404).json({ error: 'Enquiry not found.' });
  if (!provider) return res.status(404).json({ error: 'That provider is not active.' });

  try {
    await LeadMatch.create({ leadId: lead._id, providerId: provider._id, score: 0, matchReason: SHARED_BY_ADMIN });
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ error: 'This enquiry has already been shared with that provider.' });
    throw err;
  }
  if (lead.status !== 'matched' && lead.status !== 'unlocked') { /* keep whatever the lead's state already is */ }
  await notifyProviderOfLead(lead, provider);
  await AdminActivity.create({
    type: 'lead_shared',
    summary: `Enquiry ${String(lead._id).slice(-8).toUpperCase()} shared with ${provider.tradingName || provider.legalEntityName}`,
  }).catch(() => {});
  res.json({ shared: true, providerName: provider.tradingName || provider.legalEntityName });
}

/** GET /api/admin/leads/providers?q= — member providers an enquiry can be shared with. */
export async function searchSharableProviders(req: AuthedRequest, res: Response) {
  const q = String(req.query.q ?? '').trim().slice(0, 60);
  const filter: Record<string, unknown> = { accountStatus: 'active' };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ tradingName: rx }, { legalEntityName: rx }];
  }
  const docs = await Provider.find(filter).select('tradingName legalEntityName serviceSuburbs plan').sort({ tradingName: 1 }).limit(15).lean();
  res.json({ items: docs.map((p: any) => ({ id: String(p._id), name: p.tradingName || p.legalEntityName, suburbs: (p.serviceSuburbs ?? []).slice(0, 3), plan: p.plan })) });
}

// Admin-scoped rather than participant-scoped: Lead has no field
// tying it to the participant who submitted it in this schema, so
// there's no established ownership check to build a participant-
// facing version of this yet. This is real functionality either
// way — it just answers "who's the best match for lead X" from the
// admin/oversight side rather than the requester side for now.
export async function getLeadMatches(req: AuthedRequest, res: Response) {
  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const providers = await Provider.find({ accountStatus: 'active' }).lean();

  const ranked = providers
    .map((p: any) => ({
      ...scoreMatch(lead as any, p as any),
      providerName: p.tradingName || p.legalEntityName || 'Unnamed provider',
    }))
    .sort((a, b) => b.score - a.score);

  res.json({
    weights: MATCH_WEIGHTS,
    lead: { id: String(lead._id), need: lead.need, conditions: lead.conditions ?? [], suburb: lead.suburb, funding: lead.funding },
    matches: ranked,
  });
}
