import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import Provider from '../models/Provider.js';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import { buildTrackedRequest, verifyTrackToken, trackUrl } from '../services/requestTracking.js';

async function loadTracked(leadId: string) {
  const lead = await Lead.findOne({ _id: leadId, status: { $ne: 'draft' } }).lean();
  if (!lead) return null;
  const matches = await LeadMatch.find({ leadId: lead._id }).select('providerId status notifiedAt viewedAt respondedAt').lean();
  const providers = matches.length
    ? await Provider.find({ _id: { $in: matches.map((m) => m.providerId) } }).select('tradingName legalEntityName').lean()
    : [];
  const names = new Map(providers.map((p: any) => [String(p._id), p.tradingName || p.legalEntityName || 'A matched provider']));
  return buildTrackedRequest(lead, matches as any, names);
}

/** GET /api/requests/:id?t=<signed token> — the link in the person's emails. No account needed. */
export async function getTrackedRequest(req: Request, res: Response) {
  const id = req.params.id;
  const token = String(req.query.t ?? '');
  if (!mongoose.isValidObjectId(id) || !verifyTrackToken(id, token)) return res.status(404).json({ error: 'We could not find that request. Please use the link from your email.' });
  const tracked = await loadTracked(id);
  if (!tracked) return res.status(404).json({ error: 'We could not find that request.' });
  res.set('Cache-Control', 'no-store');
  res.json(tracked);
}

/** POST /api/requests/:id/attach { t } — a signed-in person adds a request they opened by link to their own account. */
export async function attachRequest(req: AuthedRequest, res: Response) {
  const id = req.params.id;
  const token = String((req.body as { t?: unknown })?.t ?? '');
  if (!mongoose.isValidObjectId(id) || !verifyTrackToken(id, token)) return res.status(404).json({ error: 'We could not find that request.' });
  const lead = await Lead.findOneAndUpdate(
    { _id: id, status: { $ne: 'draft' }, $or: [{ requesterUserId: { $exists: false } }, { requesterUserId: null }, { requesterUserId: req.user!.id }] },
    { $set: { requesterUserId: req.user!.id } },
    { new: true },
  ).select('_id');
  if (!lead) return res.status(409).json({ error: 'This request is already saved to another account.' });
  res.json({ attached: true });
}

/** GET /api/requests/mine — the requests saved to the signed-in account, newest first. */
export async function listMyRequests(req: AuthedRequest, res: Response) {
  const leads = await Lead.find({ requesterUserId: req.user!.id, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).limit(50).lean();
  const ids = leads.map((l) => l._id);
  const matches = ids.length ? await LeadMatch.find({ leadId: { $in: ids } }).select('leadId providerId status notifiedAt viewedAt respondedAt').lean() : [];
  const providers = matches.length ? await Provider.find({ _id: { $in: matches.map((m) => m.providerId) } }).select('tradingName legalEntityName').lean() : [];
  const names = new Map(providers.map((p: any) => [String(p._id), p.tradingName || p.legalEntityName || 'A matched provider']));
  res.set('Cache-Control', 'no-store');
  res.json({
    items: leads.map((lead) => ({
      ...buildTrackedRequest(lead, matches.filter((m: any) => String(m.leadId) === String(lead._id)) as any, names),
      trackingUrl: trackUrl(String(lead._id)),
    })),
  });
}
