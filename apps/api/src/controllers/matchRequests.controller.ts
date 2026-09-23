import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { scoreMatch, isGenuineMatch } from '../services/matching.service.js';
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

// "Genuine" (score threshold + must be able to reach the family) is
// defined once in matching.service.ts's isGenuineMatch — otherwise every
// provider would get every lead regardless of fit, which the spec
// explicitly says not to do.

// Cap on providers notified per enquiry (developer brief, Phase 2:
// "cap on providers per enquiry (default 5, configurable)"). Providers
// who were genuine matches but missed the cap aren't left
// with nothing — they can still find and claim the lead themselves via
// the "browse nearby requests" endpoint (listNearbyLeads), which uses
// the same isGenuineMatch rule without the cap.
const MAX_NOTIFIED_PER_LEAD = Number(process.env.MAX_PROVIDERS_PER_LEAD) || 5;
const SERVICE_NOT_SURE = 'Not sure yet';

// Shared field mapping between the draft-save and final-submit
// endpoints — the wizard sends the same raw shape to both, just at
// different points in the flow. Draft saves skip geocoding entirely
// (it costs a real API call, and a half-typed suburb on step 1 isn't
// worth spending it on every autosave — only the final submit, and
// the browse/matching paths, ever need real coordinates).
function mapFormToLeadFields(body: Record<string, unknown>) {
  const { location, suburb, state, postcode, careFor, timeframe, funding, planManagement, service, email, phone, name, additionalDetails } = body as Record<string, string | undefined>;
  return {
    need: service?.trim() || SERVICE_NOT_SURE,
    fundingType: funding,
    funding: funding === 'NDIS' ? PLAN_MANAGEMENT_TO_FUNDING[planManagement ?? ''] : undefined,
    planManagement: funding === 'NDIS' ? planManagement : undefined,
    careFor,
    timeframe,
    // The bare suburb name (picked from the wizard's suburb search) is
    // what matching compares against Provider.serviceSuburbs; a
    // free-typed location falls back to the raw text as before.
    suburb: suburb?.trim() || location,
    state: state?.trim() || undefined,
    postcode: postcode?.trim() || undefined,
    requesterEmail: email,
    requesterName: name,
    contactName: name,
    contactPhone: phone || '',
    note: additionalDetails || '',
  };
}

// Mainland + Tasmania bounding box — rejects nonsense/garbage coordinates
// from the client instead of storing them.
function parseAuCoordinates(lat: unknown, lng: unknown): [number, number] | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -44.5 || la > -9 || ln < 112 || ln > 154.5) return null;
  return [ln, la];
}

// Best geocodable text for a free-typed location.
function suburbText(form: Record<string, unknown>): string {
  const s = form as Record<string, string | undefined>;
  return [s.suburb, s.state, s.postcode].filter(Boolean).join(' ').trim();
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
  const { location, careFor, timeframe, funding, email, name } = form as Record<string, string | undefined>;

  if (!location?.trim()) return res.status(400).json({ error: 'Location is required.' });
  if (!careFor?.trim()) return res.status(400).json({ error: 'Please tell us who this is for.' });
  if (!timeframe?.trim()) return res.status(400).json({ error: 'Please choose a timeframe.' });
  if (!funding?.trim()) return res.status(400).json({ error: 'Please choose a funding type.' });
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'A valid email address is required.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });

  // Geocode once, at creation time — never repeatedly on every page
  // load, per the spec's own explicit instruction.
  // The wizard already resolved the suburb to coordinates when the family
  // picked it from the suggestions, so use those (no extra API call);
  // otherwise geocode the free-typed text once.
  const clientCoords = parseAuCoordinates((form as Record<string, unknown>).lat, (form as Record<string, unknown>).lng);
  const geo = clientCoords ? null : await geocodeAddress(`${[suburbText(form), location].find(Boolean)}, Australia`);
  const point = clientCoords ?? (geo ? ([geo.lng, geo.lat] as [number, number]) : null);
  const fields = {
    ...mapFormToLeadFields(form),
    location: point ? { type: 'Point' as const, coordinates: point } : undefined,
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
    .filter(({ result }) => isGenuineMatch(result))
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, MAX_NOTIFIED_PER_LEAD);

  const requestNumber = String(lead._id).slice(-8).toUpperCase();

  // Fire-and-forget — email failure must never fail lead submission.
  // Starter providers receive only a privacy-safe teaser. Active paid
  // providers receive the full contact brief because their subscription
  // includes lead access.
  const frontendOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  for (const { provider, result } of matchedProviders) {
    if (provider.intakeEmail) {
      const dashboardUrl = `${frontendOrigin}/leads/${lead._id}`;
      const hasPaidAccess = ['growth', 'pro'].includes(provider.plan)
        && provider.planStatus === 'active'
        && (!provider.planExpiresAt || new Date(provider.planExpiresAt) > new Date());

      if (hasPaidAccess) {
        EmailService.sendProviderLeadFull(provider.intakeEmail, {
          need: lead.need,
          suburb: lead.suburb,
          requesterName: lead.requesterName,
          requesterEmail: lead.requesterEmail,
          requesterPhone: lead.contactPhone,
          careFor: lead.careFor,
          timeframe: lead.timeframe,
          fundingType: lead.fundingType,
          planManagement: lead.planManagement,
          additionalDetails: lead.note,
          dashboardUrl,
        }).catch(() => {});
      } else {
        // An unclaimed (imported) listing also gets a claim link: it opens the
        // forgot-password page pre-filled with this address, which emails a
        // secure reset link — nothing here grants access by itself.
        const claimUrl = provider.claimed === false
          ? `${frontendOrigin}/forgot-password?claim=1&email=${encodeURIComponent(provider.intakeEmail)}`
          : undefined;
        EmailService.sendProviderLeadTeaser(provider.intakeEmail, lead.need, lead.suburb, dashboardUrl, claimUrl).catch(() => {});
      }
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
  EmailService.sendLeadConfirmation(email, requestNumber, lead.need).catch(() => {});

  res.status(201).json({
    id: String(lead._id),
    requestNumber,
    matchedProviderCount: matchedProviders.length,
  });
}
