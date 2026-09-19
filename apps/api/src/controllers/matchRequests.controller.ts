import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { scoreMatch } from '../services/matching.service.js';
import { EmailService } from '../services/email.service.js';
import { SmsService } from '../services/sms.service.js';
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

// Cap on providers notified per enquiry (developer brief, Phase 2:
// "cap on providers per enquiry (default 5, configurable)"). Providers
// who scored above NOTIFY_THRESHOLD but missed the cap aren't left
// with nothing — they can still find and claim the lead themselves via
// the "browse nearby requests" endpoint (listNearbyLeads), which uses
// the same scoreMatch/NOTIFY_THRESHOLD logic without the cap.
const MAX_NOTIFIED_PER_LEAD = Number(process.env.MAX_PROVIDERS_PER_LEAD) || 5;

// Shared field mapping between the draft-save and final-submit
// endpoints — the wizard sends the same raw shape to both, just at
// different points in the flow. Draft saves skip geocoding entirely
// (it costs a real API call, and a half-typed suburb on step 1 isn't
// worth spending it on every autosave — only the final submit, and
// the browse/matching paths, ever need real coordinates).
function mapFormToLeadFields(body: Record<string, unknown>) {
  const { location, careFor, timeframe, funding, planManagement, service, email, phone, name, additionalDetails } = body as Record<string, string | undefined>;
  return {
    need: service,
    fundingType: funding,
    funding: funding === 'NDIS' ? PLAN_MANAGEMENT_TO_FUNDING[planManagement ?? ''] : undefined,
    planManagement: funding === 'NDIS' ? planManagement : undefined,
    careFor,
    timeframe,
    suburb: location,
    requesterEmail: email,
    requesterName: name,
    contactName: name,
    contactPhone: phone || '',
    note: additionalDetails || '',
  };
}

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Autosave for the "Get Matched, free" wizard (developer brief: "Save
 * at every step, not only on submit"). Public/unauthenticated, same
 * as the wizard itself. No field validation — a draft can legitimately
 * be partial. Returns a draftId the frontend persists (state +
 * localStorage) and sends back on every subsequent save and on final
 * submit, so a step-by-step wizard produces ONE Lead document, not a
 * new one per step.
 */
export async function saveMatchRequestDraft(req: Request, res: Response) {
  const { draftId, ...form } = req.body ?? {};
  const fields = mapFormToLeadFields(form);

  if (draftId) {
    const updated = await Lead.findOneAndUpdate(
      { _id: draftId, status: 'draft' },
      { $set: { ...fields, draftExpiresAt: new Date(Date.now() + DRAFT_TTL_MS) } },
      { new: true }
    );
    if (updated) return res.json({ draftId: String(updated._id) });
    // Fell through — the id was stale/invalid/already submitted.
    // Fall back to creating a fresh draft rather than erroring, so a
    // stale localStorage value never blocks the wizard from saving.
  }

  const created = await Lead.create({ ...fields, status: 'draft', draftExpiresAt: new Date(Date.now() + DRAFT_TTL_MS) });
  res.json({ draftId: String(created._id) });
}

/**
 * Real endpoint behind the "Get Matched, free" wizard (MatchingWizard.tsx).
 * Replaces its previous fake `setTimeout` success simulation.
 * Public/unauthenticated — this is a lead-generation form for
 * anonymous site visitors, same as the wizard itself requires no login.
 */
export async function submitMatchRequest(req: Request, res: Response) {
  const { draftId, ...form } = req.body ?? {};
  const { location, careFor, timeframe, funding, service, email, name } = form as Record<string, string | undefined>;

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
  const fields = {
    ...mapFormToLeadFields(form),
    location: geo ? { type: 'Point' as const, coordinates: [geo.lng, geo.lat] as [number, number] } : undefined,
    status: 'matched' as const,
    draftExpiresAt: undefined, // no longer a draft — stop it from ever being TTL-deleted
  };

  // Finalize the SAME document the wizard's been autosaving to, if
  // one exists — never create a second Lead for one real enquiry.
  const lead = draftId
    ? (await Lead.findOneAndUpdate({ _id: draftId, status: 'draft' }, { $set: fields }, { new: true })) ?? (await Lead.create(fields))
    : await Lead.create(fields);

  // Real matching, real threshold — not every active provider gets
  // notified, only ones scoreMatch judges as a genuine fit. Sorted
  // best-first and capped so a popular suburb/service doesn't spam
  // every eligible provider on every enquiry.
  const providers = await Provider.find({ accountStatus: 'active', listingPaused: { $ne: true } }).lean();
  const matchedProviders = providers
    .map((p: any) => ({ provider: p, result: scoreMatch(lead as any, p as any) }))
    .filter(({ result }) => result.score >= NOTIFY_THRESHOLD)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, MAX_NOTIFIED_PER_LEAD);

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
    // Opt-in text alert (no-op unless Twilio is configured AND the
    // provider switched SMS on). Same fire-and-forget contract as email.
    SmsService.sendToProvider(
      provider as any,
      `SolDirectory: new ${lead.need} enquiry in ${lead.suburb}. View and respond: ${frontendOrigin}/leads/${lead._id}`
    ).catch(() => {});
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
