import type { Request, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import ProviderView from '../models/ProviderView.js';
import ContactRequest from '../models/ContactRequest.js';
import { logActivity } from '../models/AdminActivity.js';
import { EmailService } from '../services/email.service.js';
import { publicLogoUrl } from './providersPublic.controller.js';

const MAX_LIMIT = 50;

// Fields safe to expose to authenticated searchers — excludes
// billing/subscription internals (stripe ids, lead quota usage),
// onboarding progress, and account-status (an admin concern, not a
// search-result concern).
const PUBLIC_PROJECTION = 'legalEntityName tradingName slug abn registrationGroups serviceSuburbs travelRadiusKm weeklyCapacityHours intakeStatus location logoUrl';

// User input must never be compiled into a RegExp raw: a crafted `q` like
// "(a+)+$" is a ReDoS, and "." / "*" silently change what matches.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Shared search filter for the authenticated and public provider lists.
 * Only ever matches providers who'd actually appear in search: active and
 * not paused for an unconfirmed weekly capacity check.
 */
export function buildProviderFilter(query: Request['query']): Record<string, unknown> {
  const filter: Record<string, unknown> = { accountStatus: 'active', listingPaused: { $ne: true } };
  const and: Record<string, unknown>[] = [];

  const suburb = typeof query.suburb === 'string' ? query.suburb.trim() : '';
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radiusKm = Number(query.radiusKm);
  const hasRadius = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;
  const withinRadius = { location: { $geoWithin: { $centerSphere: [[lng, lat], Math.min(radiusKm, 200) / 6378.1] } } };

  if (suburb) {
    // Case-insensitive: "bankstown" must find "Bankstown". When the caller
    // also supplies coordinates, a provider who lists a nearby suburb (or
    // is based within range) counts too — not only an exact suburb name.
    // \s* on both sides: a stored "Parramatta " must match, the same way the area counts (which trim) treat it.
    const bySuburb = { serviceSuburbs: new RegExp(`^\\s*${escapeRegex(suburb)}\\s*$`, 'i') };
    and.push(hasRadius ? { $or: [bySuburb, withinRadius] } : bySuburb);
  } else if (hasRadius) {
    and.push(withinRadius);
  }

  if (typeof query.service === 'string' && query.service.trim()) {
    filter.registrationGroups = new RegExp(`^${escapeRegex(query.service.trim())}$`, 'i');
  }
  // "Experience supporting..." - powers the /directory/for/:condition pages.
  if (typeof query.condition === 'string' && query.condition.trim()) {
    filter.conditionExperience = new RegExp(`^\\s*${escapeRegex(query.condition.trim())}\\s*$`, 'i');
  }
  if (typeof query.q === 'string' && query.q.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim()), 'i');
    and.push({ $or: [{ legalEntityName: rx }, { tradingName: rx }] });
  }
  if (and.length) filter.$and = and;
  return filter;
}

export async function listProviders(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  // Suspended providers never appear in search results — this is
  // the same accountStatus gate the admin suspend/reactivate action
  // relies on actually meaning something. listingPaused is the
  // weekly-capacity-confirmation gate (scripts/weeklyCapacityCheck.ts)
  // — an unconfirmed provider drops from results the same way, per
  // the developer brief's "checked, not scraped" requirement.
  // Suburb / service / name / radius filtering is shared with the public
  // list — see buildProviderFilter above.
  const filter = buildProviderFilter(req.query);

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .select(PUBLIC_PROJECTION)
      .sort({ tradingName: 1, legalEntityName: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Provider.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      slug: p.slug ?? null,
      legalEntityName: p.legalEntityName,
      tradingName: p.tradingName,
      abn: p.abn,
      registrationGroups: p.registrationGroups ?? [],
      serviceSuburbs: p.serviceSuburbs ?? [],
      travelRadiusKm: p.travelRadiusKm,
      weeklyCapacityHours: p.weeklyCapacityHours,
      intakeStatus: p.intakeStatus,
      location: p.location?.coordinates ? { lat: p.location.coordinates[1], lng: p.location.coordinates[0] } : null,
      logoUrl: p.logoUrl ?? null,
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

  // Fire-and-forget — a failed view log must never break the actual
  // profile response.
  ProviderView.create({ providerId: provider._id, viewerId: req.user!.id }).catch(() => {});

  res.json({
    id: String(provider._id),
    slug: provider.slug ?? null,
    legalEntityName: provider.legalEntityName,
    tradingName: provider.tradingName,
    abn: provider.abn,
    registrationGroups: provider.registrationGroups ?? [],
    serviceSuburbs: provider.serviceSuburbs ?? [],
    travelRadiusKm: provider.travelRadiusKm,
    weeklyCapacityHours: provider.weeklyCapacityHours,
    intakeStatus: provider.intakeStatus,
    logoUrl: provider.logoUrl ?? null,
  });
}

// Mirrors workers.controller.ts's requestContact exactly — same
// "not yet a real notification system, but a real pending record"
// state. Was previously a fake button (onClick={onClose}) that did
// nothing at all.
export async function requestProviderContact(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ _id: req.params.id, accountStatus: 'active' })
    .select('_id tradingName legalEntityName userId')
    .populate('userId', 'name email')
    .lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  await ContactRequest.create({ requesterId: req.user!.id, targetType: 'Provider', targetId: provider._id });
  await logActivity('callback_requested', `${req.user!.email} requested a callback from ${provider.tradingName || provider.legalEntityName || 'a provider'}`);

  // Actually send the notification the response message below
  // promises — this used to just say "will be notified" with
  // nothing behind it. Fire-and-forget: a failed email must never
  // fail this request.
  const ownerEmail = (provider as any).userId?.email;
  if (ownerEmail) {
    EmailService.sendContactRequestNotification(ownerEmail, req.user!.email).catch(() => {});
  }

  res.status(202).json({ status: 'pending', message: 'Request sent. The provider will be notified.' });
}

// Full field list, everything that actually exists on Provider — per
// the spec's explicit "only display fields that actually exist, do
// not invent provider information." No website, team/qualifications,
// or reviews here, because none of those fields exist on this model.
// Adding fake ones to satisfy a UI mockup would be exactly the
// fabrication the spec forbids. logoUrl/languages/ageGroups DO exist
// (logoUrl synced from WordPress, languages/ageGroups settable via
// onboarding or the scraper import — see wordpressSync.service.ts).
const FULL_PROFILE_PROJECTION =
  'legalEntityName tradingName slug abn registrationGroups serviceSuburbs travelRadiusKm ' +
  'weeklyCapacityHours intakeStatus accountStatus rosterSize afterHoursCover ' +
  'acceptedFunding conditionExperience languages ageGroups intakeEmail location businessAddress ' +
  'logoUrl plan planStatus createdAt';

export async function getProviderBySlug(req: AuthedRequest, res: Response) {
  const provider = await Provider.findOne({ slug: req.params.slug, accountStatus: 'active' })
    .select(FULL_PROFILE_PROJECTION)
    .lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  ProviderView.create({ providerId: provider._id, viewerId: req.user?.id }).catch(() => {});

  // Real related providers — same primary registration group, not
  // the provider itself, active accounts only. Not fabricated.
  const related = provider.registrationGroups?.length
    ? await Provider.find({
        _id: { $ne: provider._id },
        accountStatus: 'active',
        slug: { $exists: true },
        registrationGroups: provider.registrationGroups[0],
      })
        .select('slug tradingName legalEntityName serviceSuburbs')
        .limit(4)
        .lean()
    : [];

  res.json({
    id: String(provider._id),
    slug: provider.slug,
    name: provider.tradingName || provider.legalEntityName,
    legalEntityName: provider.legalEntityName,
    abn: provider.abn,
    registrationGroups: provider.registrationGroups ?? [],
    serviceSuburbs: provider.serviceSuburbs ?? [],
    travelRadiusKm: provider.travelRadiusKm ?? null,
    weeklyCapacityHours: provider.weeklyCapacityHours ?? null,
    intakeStatus: provider.intakeStatus,
    rosterSize: provider.rosterSize ?? null,
    afterHoursCover: provider.afterHoursCover ?? null,
    acceptedFunding: provider.acceptedFunding ?? [],
    conditionExperience: provider.conditionExperience ?? [],
    languages: provider.languages ?? [],
    ageGroups: provider.ageGroups ?? [],
    contactEmail: provider.intakeEmail ?? null,
    location: provider.location?.coordinates ? { lat: provider.location.coordinates[1], lng: provider.location.coordinates[0] } : null,
    businessAddress: provider.businessAddress ?? null,
    logoUrl: provider.logoUrl ?? null,
    plan: provider.plan,
    memberSince: provider.createdAt,
    relatedProviders: related.map((p: any) => ({
      slug: p.slug,
      name: p.tradingName || p.legalEntityName,
      suburbs: p.serviceSuburbs ?? [],
    })),
  });
}

// ---------------------------------------------------------------
// PUBLIC directory search — no login. Powers the public /directory page
// and the provider lists on the public service / location pages, which
// previously called the login-gated endpoint above and so showed nothing
// (or fell back to hardcoded fake providers) for every anonymous visitor.
//
// Deliberately minimal: a business name, what it offers, where it works
// and whether it's taking referrals. NEVER contact details, ABN, account
// or billing fields. Contact happens through the matching flow, where a
// provider's details are protected by the same lead/unlock rules as
// everything else. Map positions are rounded to ~1 km so a sole trader
// working from home isn't pinpointed.
// ---------------------------------------------------------------
const PUBLIC_LIST_PROJECTION = 'legalEntityName tradingName slug registrationGroups serviceSuburbs intakeStatus location logoUrl hasLogoUpload updatedAt';
const PUBLIC_MAX_LIMIT = 30;
const MAX_SUBURBS_SHOWN = 6;

const roundCoord = (n: number) => Math.round(n * 100) / 100;

export async function listPublicProviders(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(PUBLIC_MAX_LIMIT, Math.max(1, Number(req.query.limit) || 12));
  const filter = buildProviderFilter(req.query);

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .select(PUBLIC_LIST_PROJECTION)
      .sort({ tradingName: 1, legalEntityName: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Provider.countDocuments(filter),
  ]);

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      slug: p.slug ?? null,
      legalEntityName: p.legalEntityName,
      tradingName: p.tradingName,
      registrationGroups: p.registrationGroups ?? [],
      serviceSuburbs: (p.serviceSuburbs ?? []).slice(0, MAX_SUBURBS_SHOWN),
      serviceSuburbCount: (p.serviceSuburbs ?? []).length,
      intakeStatus: p.intakeStatus,
      location: p.location?.coordinates
        ? { lat: roundCoord(p.location.coordinates[1]), lng: roundCoord(p.location.coordinates[0]) }
        : null,
      logoUrl: publicLogoUrl(p),
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}
