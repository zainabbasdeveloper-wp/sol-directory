import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import ProviderView from '../models/ProviderView.js';
import ContactRequest from '../models/ContactRequest.js';
import { logActivity } from '../models/AdminActivity.js';
import { EmailService } from '../services/email.service.js';

const MAX_LIMIT = 50;

// Fields safe to expose to authenticated searchers — excludes
// billing/subscription internals (stripe ids, lead quota usage),
// onboarding progress, and account-status (an admin concern, not a
// search-result concern).
const PUBLIC_PROJECTION = 'legalEntityName tradingName slug abn registrationGroups serviceSuburbs travelRadiusKm weeklyCapacityHours intakeStatus location';

export async function listProviders(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  // Suspended providers never appear in search results — this is
  // the same accountStatus gate the admin suspend/reactivate action
  // relies on actually meaning something.
  const filter: Record<string, unknown> = { accountStatus: 'active' };
  if (req.query.suburb) filter.serviceSuburbs = req.query.suburb;
  if (req.query.service) filter.registrationGroups = req.query.service;
  if (req.query.q) {
    filter.$or = [
      { legalEntityName: new RegExp(String(req.query.q), 'i') },
      { tradingName: new RegExp(String(req.query.q), 'i') },
    ];
  }
  // Radius search — same $geoWithin/$centerSphere pattern already
  // used in workers.controller.ts, now possible for providers since
  // they have real coordinates.
  if (req.query.lat && req.query.lng && req.query.radiusKm) {
    const radiusRadians = Number(req.query.radiusKm) / 6378.1;
    filter.location = {
      $geoWithin: { $centerSphere: [[Number(req.query.lng), Number(req.query.lat)], radiusRadians] },
    };
  }

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .select(PUBLIC_PROJECTION)
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

// Full field list, everything that actually exists on Provider —
// per the spec's explicit "only display fields that actually exist,
// do not invent provider information." No logo, languages, website,
// opening hours, team/qualifications, or reviews here, because none
// of those fields exist on this model. Adding fake ones to satisfy a
// UI mockup would be exactly the fabrication the spec forbids.
const FULL_PROFILE_PROJECTION =
  'legalEntityName tradingName slug abn registrationGroups serviceSuburbs travelRadiusKm ' +
  'weeklyCapacityHours intakeStatus accountStatus rosterSize afterHoursCover ' +
  'acceptedFunding conditionExperience intakeEmail location plan planStatus createdAt';

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
    contactEmail: provider.intakeEmail ?? null,
    location: provider.location?.coordinates ? { lat: provider.location.coordinates[1], lng: provider.location.coordinates[0] } : null,
    plan: provider.plan,
    memberSince: provider.createdAt,
    relatedProviders: related.map((p: any) => ({
      slug: p.slug,
      name: p.tradingName || p.legalEntityName,
      suburbs: p.serviceSuburbs ?? [],
    })),
  });
}
