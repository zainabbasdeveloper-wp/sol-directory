import type { Request, Response } from 'express';
import Provider from '../models/Provider.js';
import ProviderLogo from '../models/ProviderLogo.js';
import Condition from '../models/Condition.js';
import { photoBytes } from '../models/WorkerPhoto.js';
import { slugify } from '../utils/slugify.js';

/**
 * PUBLIC provider endpoints — no login.
 *
 * Same visibility rule as the public directory list (active account, not
 * paused for an unconfirmed weekly capacity check) and the same privacy
 * rule: what the business offers and where it works, never contact
 * details, ABN or account/billing fields. The business location is
 * suburb + state only — no street address, no coordinates.
 */

export const VISIBLE_PROVIDER = { accountStatus: 'active', listingPaused: { $ne: true } } as const;

/** A WordPress-managed logo wins; otherwise the provider's own upload; otherwise null (initials are shown). */
export function publicLogoUrl(p: { slug?: string | null; logoUrl?: string | null; hasLogoUpload?: boolean; updatedAt?: Date }): string | null {
  if (p.logoUrl) return p.logoUrl;
  if (p.hasLogoUpload && p.slug) return `/api/providers/public/${encodeURIComponent(p.slug)}/logo?v=${p.updatedAt ? new Date(p.updatedAt).getTime() : 0}`;
  return null;
}

const PROJECTION =
  'legalEntityName tradingName slug registrationGroups acceptedFunding conditionExperience languages ageGroups serviceSuburbs businessAddress.suburb businessAddress.state intakeStatus travelRadiusKm logoUrl hasLogoUpload createdAt updatedAt';

// GET /api/providers/public/:slug
export async function getPublicProvider(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return res.status(404).json({ error: 'Not found.' });

  const p: any = await Provider.findOne({ slug, ...VISIBLE_PROVIDER }).select(PROJECTION).lean();
  if (!p) return res.status(404).json({ error: 'Not found.' });

  res.set('Cache-Control', 'public, max-age=60');
  res.json({
    slug: p.slug,
    name: p.tradingName || p.legalEntityName,
    legalEntityName: p.legalEntityName,
    logoUrl: publicLogoUrl(p),
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

// GET /api/providers/public/:slug/logo
export async function getPublicLogo(req: Request, res: Response) {
  const slug = typeof req.params.slug === 'string' ? req.params.slug.trim().toLowerCase() : '';
  const p = await Provider.findOne({ slug, hasLogoUpload: true, ...VISIBLE_PROVIDER }).select('_id').lean();
  const logo = p ? await ProviderLogo.findOne({ providerId: p._id }).lean() : null;
  if (!logo) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg'); // setHeader: Express's res.set would add a text charset
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=600' });
  res.send(photoBytes(logo.data));
}

// ---------------------------------------------------------------
// Areas and conditions — the data behind the location pages
// (/directory/in/:suburb) and the "experience supporting…" pages
// (/directory/for/:condition). Counted from real, visible providers only.
// ---------------------------------------------------------------
/** Below this many providers a listing page is noindex and left out of the sitemap. Mirrored as MIN_INDEXABLE_PROVIDERS in the web app. */
export const MIN_INDEXABLE_PROVIDERS = 3;

export interface CountRow { name: string; slug: string; count: number }
const TTL_MS = 30 * 60 * 1000;
let areaCache: { at: number; rows: CountRow[] } | null = null;
let conditionCache: { at: number; rows: CountRow[] } | null = null;

async function countBy(field: 'serviceSuburbs' | 'conditionExperience'): Promise<CountRow[]> {
  const raw = await Provider.aggregate([
    { $match: { ...VISIBLE_PROVIDER, slug: { $exists: true, $ne: null } } },
    { $unwind: `$${field}` },
    { $group: { _id: { $toLower: { $trim: { input: `$${field}` } } }, name: { $first: { $trim: { input: `$${field}` } } }, providers: { $addToSet: '$_id' } } },
    { $project: { name: 1, count: { $size: '$providers' } } },
    { $sort: { count: -1, name: 1 } },
    { $limit: 2000 },
  ]);
  const seen = new Set<string>();
  const rows: CountRow[] = [];
  for (const r of raw as { name: string; count: number }[]) {
    const slug = slugify(r.name);
    if (!slug || seen.has(slug)) continue; // two spellings that slugify the same collapse into the first
    seen.add(slug);
    rows.push({ name: r.name, slug, count: r.count });
  }
  return rows;
}

export async function areaRows(): Promise<CountRow[]> {
  if (areaCache && Date.now() - areaCache.at < TTL_MS) return areaCache.rows;
  areaCache = { at: Date.now(), rows: await countBy('serviceSuburbs') };
  return areaCache.rows;
}

/** Only conditions in the admin catalogue, so free-text entries never become public pages. */
export async function conditionRows(): Promise<CountRow[]> {
  if (conditionCache && Date.now() - conditionCache.at < TTL_MS) return conditionCache.rows;
  const [rows, catalogue] = await Promise.all([countBy('conditionExperience'), Condition.find({ active: true }).select('name').lean()]);
  const allowed = new Set(catalogue.map((c: any) => String(c.name).toLowerCase()));
  conditionCache = { at: Date.now(), rows: rows.filter((r) => allowed.has(r.name.toLowerCase())) };
  return conditionCache.rows;
}

// GET /api/providers/public/areas  and  GET /api/providers/public/conditions
export async function getPublicAreas(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ items: await areaRows(), minIndexable: MIN_INDEXABLE_PROVIDERS });
}
export async function getPublicConditions(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ items: await conditionRows(), minIndexable: MIN_INDEXABLE_PROVIDERS });
}
