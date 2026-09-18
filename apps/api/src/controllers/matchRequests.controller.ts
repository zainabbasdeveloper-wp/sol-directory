import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { scoreMatch } from '../services/matching.service.js';
import { EmailService } from '../services/email.service.js';
import Notification from '../models/Notification.js';
import LeadMatch from '../models/LeadMatch.js';

function describeMatchReason(result: ReturnType<typeof scoreMatch>): string {
  const reasons: string[] = [];
  if (result.breakdown.service.matched) reasons.push('offers this service');
  if (result.breakdown.location.matched) reasons.push('serves this area');
  if (result.breakdown.condition.matchedCount > 0) {
    reasons.push(`experience with ${result.breakdown.condition.matchedCount}/${result.breakdown.condition.requiredCount} listed conditions`);
  }
  if (result.breakdown.funding.matched) reasons.push('accepts this funding type');
  return reasons.length > 0 ? reasons.join(', ') : 'partial match on availability/location only';
}

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
  // EmailService call in this codebase. Every matched provider gets
  // this email regardless of plan — a paying (non-'starter') provider
  // ALSO sees the lead live on their dashboard (Dashboard.tsx's
  // existing 30s poll already does this for every provider, since
  // listLeads was never plan-gated to begin with), but that's
  // additive, not a replacement for the email.
  const frontendOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  for (const { provider, result } of matchedProviders) {
    if (provider.intakeEmail) {
      const dashboardUrl = `${frontendOrigin}/leads/${lead._id}`;
      EmailService.sendProviderLeadNotification(provider.intakeEmail, lead.need, lead.suburb, dashboardUrl).catch(() => {});
    }
    Notification.create({
      userId: provider.userId,
      type: 'new_lead',
      message: `New ${lead.need} request in ${lead.suburb}`,
      link: `/leads/${lead._id}`,
    }).catch(() => {});
    LeadMatch.create({
      leadId: lead._id,
      providerId: provider._id,
      score: result.score,
      matchReason: describeMatchReason(result),
    }).catch(() => {});
  }
  EmailService.sendLeadConfirmation(email, requestNumber, service).catch(() => {});

  res.status(201).json({
    id: String(lead._id),
    requestNumber,
    matchedProviderCount: matchedProviders.length,
  });
}
