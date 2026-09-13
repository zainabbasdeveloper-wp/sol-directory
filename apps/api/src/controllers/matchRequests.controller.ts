import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { scoreMatch } from '../services/matching.service.js';
import { EmailService } from '../services/email.service.js';

// Maps the wizard's NDIS-specific plan-management wording onto
// Lead.funding's existing enum, used by matching's scoreFunding
// against Provider.acceptedFunding — unchanged from before, just
// finally has a real writer now.
const PLAN_MANAGEMENT_TO_FUNDING: Record<string, 'Plan-managed' | 'Self-managed' | 'NDIA-managed'> = {
  'Plan managed': 'Plan-managed',
  'Self-managed': 'Self-managed',
  'NDIA managed': 'NDIA-managed',
};

// A match is only "genuine" enough to notify a provider about above
// this score — otherwise every provider would get every lead
// regardless of fit, which the spec explicitly says not to do.
const NOTIFY_THRESHOLD = 40;

/**
 * Real endpoint behind the "Get Matched, free" wizard (MatchingWizard.tsx).
 * Replaces its previous fake `setTimeout` success simulation.
 * Public/unauthenticated — this is a lead-generation form for
 * anonymous site visitors, same as the wizard itself requires no login.
 */
export async function submitMatchRequest(req: Request, res: Response) {
  const {
    location, careFor, timeframe, funding, planManagement, service,
    email, phone, name, additionalDetails,
  } = req.body ?? {};

  if (!location?.trim()) return res.status(400).json({ error: 'Location is required.' });
  if (!careFor?.trim()) return res.status(400).json({ error: 'Please tell us who this is for.' });
  if (!timeframe?.trim()) return res.status(400).json({ error: 'Please choose a timeframe.' });
  if (!funding?.trim()) return res.status(400).json({ error: 'Please choose a funding type.' });
  if (!service?.trim()) return res.status(400).json({ error: 'Please choose the service you need.' });
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });

  // Geocode once, at creation time — never repeatedly on every page
  // load, per the spec's own explicit instruction.
  const geo = await geocodeAddress(`${location}, Australia`);

  const lead = await Lead.create({
    need: service,
    fundingType: funding,
    funding: funding === 'NDIS' ? PLAN_MANAGEMENT_TO_FUNDING[planManagement] : undefined,
    planManagement: funding === 'NDIS' ? planManagement : undefined,
    careFor,
    timeframe,
    suburb: location,
    location: geo ? { type: 'Point', coordinates: [geo.lng, geo.lat] } : undefined,
    requesterEmail: email,
    requesterName: name,
    contactName: name,
    contactPhone: phone || '',
    note: additionalDetails || '',
    status: 'matched',
  });

  // Real matching, real threshold — not every active provider gets
  // notified, only ones scoreMatch judges as a genuine fit.
  const providers = await Provider.find({ accountStatus: 'active' }).lean();
  const matchedProviders = providers
    .map((p: any) => ({ provider: p, result: scoreMatch(lead as any, p as any) }))
    .filter(({ result }) => result.score >= NOTIFY_THRESHOLD);

  const requestNumber = String(lead._id).slice(-8).toUpperCase();

  // Fire-and-forget — a slow/failed email must never fail the
  // request itself, same reliability principle as every other
  // EmailService call in this codebase.
  for (const { provider } of matchedProviders) {
    if (provider.intakeEmail) {
      EmailService.sendProviderLeadNotification(provider.intakeEmail, lead.need, lead.suburb).catch(() => {});
    }
  }
  EmailService.sendLeadConfirmation(email, requestNumber, service).catch(() => {});

  res.status(201).json({
    id: String(lead._id),
    requestNumber,
    matchedProviderCount: matchedProviders.length,
  });
}
