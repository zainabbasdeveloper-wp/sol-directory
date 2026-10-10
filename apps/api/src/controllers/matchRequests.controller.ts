import type { Request, Response } from 'express';
import Lead from '../models/Lead.js';
import Provider from '../models/Provider.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { describeMatchReason, scoreMatch, isGenuineMatch } from '../services/matching.service.js';
import { EmailService } from '../services/email.service.js';
import { SmsService } from '../services/sms.service.js';
import Notification from '../models/Notification.js';
import LeadMatch from '../models/LeadMatch.js';
import { notifyRegisterListings, notifyPreferredListing } from '../services/leadFollowUp.service.js';
import RegisterListing from '../models/RegisterListing.js';
import { siteOrigin } from '../services/emailTokens.js';
import jwt from 'jsonwebtoken';
import { trackUrl } from '../services/requestTracking.js';

const escapeHtml = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A short email to the site owner for every new enquiry, laid out as a simple details table. */
async function notifyAdminOfEnquiry(lead: any, requestNumber: string, matchedCount: number, requested?: { name: string; note: string }) {
  const rows: [string, unknown][] = [
    ['Reference', requestNumber],
    ['Requested provider', requested?.name],
    ['Provider contact', requested?.note],
    ['Name', lead.requesterName],
    ['Email', lead.requesterEmail],
    ['Phone', lead.contactPhone],
    ['Where', [lead.suburb, lead.state, lead.postcode].filter(Boolean).join(', ')],
    ['Service page', lead.serviceContext],
    ['Who it is for', lead.careFor],
    ['When', lead.timeframe],
    ['Funding', [lead.fundingType, lead.planManagement].filter(Boolean).join(' · ')],
    ['Details', lead.note],
    ['Providers notified', matchedCount === 0 ? 'None yet' : String(matchedCount)],
  ];
  const message = '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">'
    + rows.filter(([, v]) => v).map(([label, value]) => `<tr><td style="padding:7px 14px 7px 0;color:#5A6B84;font-size:13px;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:7px 0;font-size:14.5px;font-weight:600;color:#0B2D5C">${escapeHtml(value)}</td></tr>`).join('')
    + '</table>';
  await EmailService.notifyAdmin('New enquiry received', message, `${siteOrigin()}/dashboard`).catch(() => false);
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
  const { location, suburb, state, postcode, careFor, timeframe, funding, planManagement, service, serviceContext, email, phone, name, additionalDetails } = body as Record<string, string | undefined>;
  return {
    need: service?.trim() || SERVICE_NOT_SURE,
    // The service page the visitor opened the form from, if any. Only used to decide who hears about the enquiry; matching ignores it.
    serviceContext: serviceContext?.trim().slice(0, 80) || undefined,
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

/**
 * The register business a person asked for by name ("Request support from this provider"). The browser only sends the
 * type and slug; the name shown in emails always comes from our own record, never from the request.
 */
function optionalUserId(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as { id?: string };
    return payload.id;
  } catch {
    return undefined;
  }
}

async function resolvePreferredListing(raw: unknown) {
  const { type, slug } = (raw && typeof raw === 'object' ? raw : {}) as { type?: unknown; slug?: unknown };
  if ((type !== 'ndis' && type !== 'aged_care') || typeof slug !== 'string' || !/^[a-z0-9-]{1,160}$/.test(slug)) return null;
  return RegisterListing.findOne({ type, slug }).select('type slug name providerId claimStatus').lean();
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
  const preferred = await resolvePreferredListing((form as Record<string, unknown>).preferredProvider);
  const fields = { ...mapFormToLeadFields(form), preferredListing: preferred ? { type: preferred.type, slug: preferred.slug, name: preferred.name } : null };

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
  const preferred = await resolvePreferredListing((form as Record<string, unknown>).preferredProvider);
  const fields = {
    ...mapFormToLeadFields(form),
    preferredListing: preferred ? { type: preferred.type, slug: preferred.slug, name: preferred.name } : null,
    ...(optionalUserId(req) ? { requesterUserId: optionalUserId(req) } : {}),
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
  // A request for one named provider goes to that provider only: if it is a member, it is matched (whatever its score);
  // if not, nobody else is told, and the register business is sent a privacy-safe notice below where it can be reached.
  let matchedProviders: { provider: any; result: ReturnType<typeof scoreMatch> }[];
  if (preferred) {
    const member = preferred.providerId && preferred.claimStatus === 'claimed'
      ? await Provider.findOne({ _id: preferred.providerId, accountStatus: 'active', listingPaused: { $ne: true } }).lean()
      : null;
    matchedProviders = member ? [{ provider: member, result: scoreMatch(lead as any, member as any) }] : [];
  } else {
    const providers = await Provider.find({ accountStatus: 'active', listingPaused: { $ne: true } }).lean();
    matchedProviders = providers
      .map((p: any) => ({ provider: p, result: scoreMatch(lead as any, p as any) }))
      .filter(({ result }) => isGenuineMatch(result))
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, MAX_NOTIFIED_PER_LEAD);
  }

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
      matchReason: preferred ? `Asked for you by name. ${describeMatchReason(result)}` : describeMatchReason(result),
    }).catch(() => {});
  }
  const siteUrl = frontendOrigin.replace(/\/$/, '');
  EmailService.sendLeadConfirmation(email, requestNumber, lead.need, trackUrl(String(lead._id)), {
    details: {
      service: lead.serviceContext,
      suburb: lead.suburb,
      state: lead.state,
      careFor: lead.careFor,
      timeframe: lead.timeframe,
      funding: [lead.fundingType, lead.planManagement].filter(Boolean).join(' · ') || undefined,
      provider: preferred?.name,
    },
    browseUrl: `${siteUrl}/find-a-provider${lead.suburb ? `?suburb=${encodeURIComponent(lead.suburb)}` : ''}`,
  }).catch(() => {});
  // Tell whoever runs the site about every new enquiry, and loudly when nobody could be matched.
  if (preferred) {
    // Tell the named business (when we can reach it) and let the site owner know what happened.
    const sent = matchedProviders.length > 0 ? { sent: true, reason: 'member' } : await notifyPreferredListing(lead, preferred._id);
    const note = matchedProviders.length > 0
      ? 'Member: notified through SolDirectory'
      : sent.sent ? 'Notice emailed (no requester details shared)'
        : `Not emailed (${sent.reason ?? 'no contact'}) — follow up by phone or the website if you wish`;
    void notifyAdminOfEnquiry(lead, requestNumber, matchedProviders.length, { name: preferred.name, note });
  } else {
    void notifyAdminOfEnquiry(lead, requestNumber, matchedProviders.length);
    // Businesses on the public register near the enquiry (off unless REGISTER_LEAD_EMAILS=1). Fire-and-forget like the rest.
    notifyRegisterListings(lead).catch(() => {});
  }

  res.status(201).json({
    id: String(lead._id),
    requestNumber,
    matchedProviderCount: matchedProviders.length,
    requestedProvider: preferred?.name,
    trackingUrl: trackUrl(String(lead._id)),
  });
}
