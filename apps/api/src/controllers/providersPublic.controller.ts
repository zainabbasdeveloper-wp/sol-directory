import type { Request, Response } from 'express';
import Provider from '../models/Provider.js';

/**
 * GET /api/providers/public/:slug — one provider's PUBLIC profile, no login.
 *
 * Same visibility rule as the public directory list (active account, not
 * paused for an unconfirmed weekly capacity check) and the same privacy
 * rule: what the business offers and where it works, never contact
 * details, ABN or account/billing fields. The business location is
 * suburb + state only — no street address, no coordinates.
 */
const PROJECTION =
  'legalEntityName tradingName slug registrationGroups acceptedFunding conditionExperience languages ageGroups serviceSuburbs businessAddress.suburb businessAddress.state intakeStatus travelRadiusKm logoUrl createdAt';

export async function getPublicProvider(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return res.status(404).json({ error: 'Not found.' });

  const p: any = await Provider.findOne({ slug, accountStatus: 'active', listingPaused: { $ne: true } }).select(PROJECTION).lean();
  if (!p) return res.status(404).json({ error: 'Not found.' });

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    slug: p.slug,
    name: p.tradingName || p.legalEntityName,
    legalEntityName: p.legalEntityName,
    logoUrl: p.logoUrl ?? null,
    registrationGroups: p.registrationGroups ?? [],
    acceptedFunding: p.acceptedFunding ?? [],
    conditionExperience: p.conditionExperience ?? [],
    languages: p.languages ?? [],
    ageGroups: p.ageGroups ?? [],
    serviceSuburbs: p.serviceSuburbs ?? [],
    baseSuburb: p.businessAddress?.suburb ?? null,
    baseState: p.businessAddress?.state ?? null,
    intakeStatus: p.intakeStatus,
    travelRadiusKm: p.travelRadiusKm ?? null,
    memberSince: p.createdAt,
  });
}
