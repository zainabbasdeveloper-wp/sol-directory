import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import RegisterListing, { type RegisterListingDoc } from '../models/RegisterListing.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Provider from '../models/Provider.js';
import { VISIBLE_PROVIDER, publicLogoUrl } from './providersPublic.controller.js';
import { EmailService } from '../services/email.service.js';
import {
  MIN_SUBURB_LISTINGS, REGISTER_SUPPORT_CATEGORIES, REGISTER_TYPES, STATE_CODES,
  type RegisterType, type StateCode,
} from '../services/registerNormalise.js';

/**
 * Public read API for register listings. Everything here is safe to serve
 * to anyone: names, states, suburbs, services and a business's own public
 * website. There is no contact data to leak because none is stored.
 */

const MAX_LIMIT = 30;
const AREAS_IN_LIST = 6;
const AREAS_IN_DETAIL = 120;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function parseType(v: unknown): RegisterType | null {
  return REGISTER_TYPES.includes(v as RegisterType) ? (v as RegisterType) : null;
}
function parseState(v: unknown): StateCode | null {
  const s = str(v).toUpperCase();
  return STATE_CODES.includes(s as StateCode) ? (s as StateCode) : null;
}

function toListItem(d: Pick<RegisterListingDoc, 'type' | 'slug' | 'name' | 'states' | 'areaCount' | 'areas' | 'supportCategories' | 'website'>, logoUrl: string | null = null) {
  return {
    logoUrl,
    type: d.type,
    slug: d.slug,
    name: d.name,
    states: d.states,
    areaCount: d.areaCount,
    areas: d.areas.slice(0, AREAS_IN_LIST),
    supportCategories: d.supportCategories,
    hasWebsite: !!d.website,
  };
}

/**
 * The registers publish no logos. A listing a member provider has claimed can
 * show that provider's own uploaded logo, so list items for claimed listings get it.
 */
async function listItemsWithLogos(docs: any[]) {
  const ids = docs.filter((d) => d.providerId && d.claimStatus === 'claimed').map((d) => d.providerId);
  const logos = new Map<string, string>();
  if (ids.length) {
    const providers: any[] = await Provider.find({ _id: { $in: ids }, hasLogoUpload: true, ...VISIBLE_PROVIDER }).select('slug logoUrl hasLogoUpload updatedAt').lean();
    for (const p of providers) { const u = publicLogoUrl(p); if (u) logos.set(String(p._id), u); }
  }
  return docs.map((d) => toListItem(d as never, d.providerId ? logos.get(String(d.providerId)) ?? null : null));
}

// ---------------------------------------------------------------
// GET /api/register/search?type=&state=&suburb=&category=&q=&page=&limit=
// ---------------------------------------------------------------
export async function searchRegister(req: Request, res: Response) {
  const type = parseType(req.query.type);
  if (!type) return res.status(400).json({ error: 'type must be "ndis" or "aged_care".' });

  const filter: FilterQuery<RegisterListingDoc> = { type };
  const state = parseState(req.query.state);
  const suburb = str(req.query.suburb).toLowerCase();

  if (str(req.query.state) && !state) return res.status(400).json({ error: 'Unknown state.' });
  if (suburb) {
    // A suburb slug is only meaningful within a state ("Richmond" exists in several).
    if (!state) return res.status(400).json({ error: 'suburb requires state.' });
    if (!/^[a-z0-9-]{1,80}$/.test(suburb)) return res.status(400).json({ error: 'Invalid suburb.' });
    filter.areas = { $elemMatch: { state, suburbSlug: suburb } } as never;
  } else if (state) {
    filter.states = state;
  }

  // Category counts describe the AREA, so they're computed before the
  // category / name filters narrow it down.
  const areaFilter: FilterQuery<RegisterListingDoc> = { ...filter };

  const category = str(req.query.category);
  if (category) {
    if (!(REGISTER_SUPPORT_CATEGORIES as readonly string[]).includes(category)) return res.status(400).json({ error: 'Unknown category.' });
    filter.supportCategories = category;
  }

  const q = str(req.query.q).toLowerCase().slice(0, 80);
  if (q) filter.nameLower = new RegExp(escapeRegex(q));

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 12));

  const wantFacets = req.query.facets === '1';
  const [docs, total, facets] = await Promise.all([
    RegisterListing.find(filter)
      .select('type slug name states areaCount areas supportCategories website providerId claimStatus')
      .sort({ nameLower: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RegisterListing.countDocuments(filter),
    wantFacets
      ? RegisterListing.aggregate([
          { $match: areaFilter },
          { $unwind: '$supportCategories' },
          { $group: { _id: '$supportCategories', n: { $sum: 1 } } },
          { $sort: { n: -1, _id: 1 } },
        ])
      : Promise.resolve(null),
  ]);

  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    items: await listItemsWithLogos(docs),
    page,
    limit,
    total,
    minIndexable: MIN_SUBURB_LISTINGS,
    ...(facets ? { categories: (facets as { _id: string; n: number }[]).map((f) => ({ category: f._id, count: f.n })) } : {}),
  });
}

// ---------------------------------------------------------------
// GET /api/register/category-counts?type=&category=
// How many register listings list this support category, per state. Feeds the
// "listed on the public register" block on the WordPress service pages.
// ---------------------------------------------------------------
export async function categoryCounts(req: Request, res: Response) {
  const type = parseType(req.query.type);
  if (!type) return res.status(400).json({ error: 'type must be "ndis" or "aged_care".' });
  const category = str(req.query.category);
  if (!(REGISTER_SUPPORT_CATEGORIES as readonly string[]).includes(category)) return res.status(400).json({ error: 'Unknown category.' });

  const [byState, total] = await Promise.all([
    RegisterListing.aggregate([{ $match: { type, supportCategories: category } }, { $unwind: '$states' }, { $group: { _id: '$states', n: { $sum: 1 } } }]),
    RegisterListing.countDocuments({ type, supportCategories: category }),
  ]);
  res.set('Cache-Control', 'public, max-age=600');
  res.json({ total, states: Object.fromEntries((byState as { _id: string; n: number }[]).map((s) => [s._id, s.n])) });
}

// ---------------------------------------------------------------
// GET /api/register/category-overview?type=&category=
// Everything a service page needs about one support category on the register:
// the total, listings per state, the suburbs with the most listings, and the
// listings with the widest service area. Facts only - counts and names from the
// register data, no ranking of quality. Cached: it aggregates over every area.
// ---------------------------------------------------------------
const overviewCache = new Map<string, { at: number; value: unknown }>();

export async function computeCategoryOverview(type: RegisterType, category: string) {
  const [byState, total, suburbs, widest] = await Promise.all([
    RegisterListing.aggregate([{ $match: { type, supportCategories: category } }, { $unwind: '$states' }, { $group: { _id: '$states', n: { $sum: 1 } } }]),
    RegisterListing.countDocuments({ type, supportCategories: category }),
    RegisterListing.aggregate([
      { $match: { type, supportCategories: category } },
      { $unwind: '$areas' },
      { $group: { _id: { state: '$areas.state', slug: '$areas.suburbSlug', suburb: '$areas.suburb' }, n: { $sum: 1 } } },
      { $sort: { n: -1, '_id.suburb': 1 } },
      { $limit: 24 },
    ]),
    RegisterListing.find({ type, supportCategories: category })
      .select('slug name states areaCount')
      .sort({ areaCount: -1, nameLower: 1 })
      .limit(10)
      .lean(),
  ]);
  return {
    total,
    states: Object.fromEntries((byState as { _id: string; n: number }[]).map((s) => [s._id, s.n])),
    topSuburbs: (suburbs as { _id: { state: string; slug: string; suburb: string }; n: number }[]).map((s) => ({ state: s._id.state, slug: s._id.slug, suburb: s._id.suburb, count: s.n })),
    widest: widest.map((w) => ({ slug: w.slug, name: w.name, states: w.states, areaCount: w.areaCount })),
  };
}

/** First listings (A-Z) for one support category, in the list-card shape; used by the crawler HTML of service pages. */
export async function categoryListings(type: RegisterType, category: string, limit = 12) {
  const docs = await RegisterListing.find({ type, supportCategories: category })
    .select('type slug name states areaCount areas supportCategories website providerId claimStatus')
    .sort({ nameLower: 1, _id: 1 })
    .limit(limit)
    .lean();
  return listItemsWithLogos(docs);
}

export async function getCategoryOverview(req: Request, res: Response) {
  const type = parseType(req.query.type);
  if (!type) return res.status(400).json({ error: 'type must be "ndis" or "aged_care".' });
  const category = str(req.query.category);
  if (!(REGISTER_SUPPORT_CATEGORIES as readonly string[]).includes(category)) return res.status(400).json({ error: 'Unknown category.' });

  const key = `${type}|${category}`;
  const hit = overviewCache.get(key);
  if (hit && Date.now() - hit.at < HUB_TTL_MS) { res.set('Cache-Control', 'public, max-age=600'); return res.json(hit.value); }
  const value = await computeCategoryOverview(type, category);
  overviewCache.set(key, { at: Date.now(), value });
  res.set('Cache-Control', 'public, max-age=600');
  res.json(value);
}

// ---------------------------------------------------------------
// GET /api/register/hub?type=
// State counts, category counts and the suburbs that have enough real
// listings to deserve their own page. Computed from the collection and
// cached — it's aggregated over every listing's areas.
// ---------------------------------------------------------------
const HUB_TTL_MS = 30 * 60 * 1000;
const hubCache = new Map<RegisterType, { at: number; value: unknown }>();

export async function computeHub(type: RegisterType) {
  const [states, categories, suburbs, total] = await Promise.all([
    RegisterListing.aggregate([{ $match: { type } }, { $unwind: '$states' }, { $group: { _id: '$states', n: { $sum: 1 } } }]),
    RegisterListing.aggregate([{ $match: { type } }, { $unwind: '$supportCategories' }, { $group: { _id: '$supportCategories', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    RegisterListing.aggregate([
      { $match: { type } },
      { $unwind: '$areas' },
      { $group: { _id: { state: '$areas.state', slug: '$areas.suburbSlug', suburb: '$areas.suburb' }, n: { $sum: 1 } } },
      { $match: { n: { $gte: MIN_SUBURB_LISTINGS } } },
      { $sort: { n: -1 } },
    ]),
    RegisterListing.countDocuments({ type }),
  ]);

  return {
    total,
    states: Object.fromEntries((states as { _id: string; n: number }[]).map((s) => [s._id, s.n])),
    categories: (categories as { _id: string; n: number }[]).map((c) => ({ category: c._id, count: c.n })),
    suburbs: (suburbs as { _id: { state: string; slug: string; suburb: string }; n: number }[]).map((s) => ({
      state: s._id.state, slug: s._id.slug, suburb: s._id.suburb, count: s.n,
    })),
  };
}

export async function getRegisterHub(req: Request, res: Response) {
  const type = parseType(req.query.type);
  if (!type) return res.status(400).json({ error: 'type must be "ndis" or "aged_care".' });

  const cached = hubCache.get(type);
  if (cached && Date.now() - cached.at < HUB_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=600');
    return res.json(cached.value);
  }
  const value = await computeHub(type);
  hubCache.set(type, { at: Date.now(), value });
  res.set('Cache-Control', 'public, max-age=600');
  res.json(value);
}

// ---------------------------------------------------------------
// GET /api/register/:type/:slug
// ---------------------------------------------------------------
export async function getRegisterListing(req: Request, res: Response) {
  const type = parseType(req.params.type);
  const slug = str(req.params.slug).toLowerCase();
  if (!type || !/^[a-z0-9][a-z0-9-]{0,200}$/.test(slug)) return res.status(404).json({ error: 'Not found.' });

  const doc = await RegisterListing.findOne({ type, slug }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found.' });

  // Genuinely related listings for internal linking: other providers on
  // the register in this provider's first area.
  const first = doc.areas[0];
  const related = first
    ? await RegisterListing.find({ type, areas: { $elemMatch: { state: first.state, suburbSlug: first.suburbSlug } }, _id: { $ne: doc._id } })
        .select('type slug name states areaCount areas supportCategories website')
        .sort({ nameLower: 1 })
        .limit(6)
        .lean()
    : [];

  res.set('Cache-Control', 'public, max-age=300');
  res.json({
    type: doc.type,
    slug: doc.slug,
    name: doc.name,
    states: doc.states,
    areaCount: doc.areaCount,
    areas: doc.areas.slice(0, AREAS_IN_DETAIL),
    website: doc.website ?? null,
    services: doc.services,
    supportCategories: doc.supportCategories,
    claimStatus: doc.claimStatus,
    related: related.map((d) => toListItem(d as never)),
  });
}

// ---------------------------------------------------------------
// POST /api/register/:type/:slug/claim-request
// ---------------------------------------------------------------
const CLAIM_ROLES = ['owner', 'director', 'manager', 'staff', 'other'];
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 8; // claim requests per IP per hour
const RATE_WINDOW_MS = 60 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.resetAt < now) { rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS }); return false; }
  b.count++;
  return b.count > RATE_LIMIT;
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export async function submitClaimRequest(req: Request, res: Response) {
  const type = parseType(req.params.type);
  const slug = str(req.params.slug).toLowerCase();
  if (!type || !slug) return res.status(404).json({ error: 'Not found.' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  // Honeypot: a real person never sees or fills this field.
  if (str(body.website_url)) return res.json({ ok: true });

  if (rateLimited(req.ip ?? 'unknown')) return res.status(429).json({ error: 'Too many requests. Please try again later.' });

  const name = str(body.name).slice(0, 100);
  const email = str(body.email).toLowerCase().slice(0, 160);
  const phone = str(body.phone).slice(0, 30);
  const role = str(body.role).toLowerCase();
  const message = str(body.message).slice(0, 1000);

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!CLAIM_ROLES.includes(role)) return res.status(400).json({ error: 'Please choose your role at this business.' });

  const listing = await RegisterListing.findOne({ type, slug }).select('_id name type slug claimStatus').lean();
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.claimStatus === 'claimed') return res.status(409).json({ error: 'This listing has already been claimed.' });

  // The same person asking twice about the same listing is one request.
  const duplicate = await ClaimRequest.findOne({ listingId: listing._id, email, status: 'new' }).select('_id').lean();
  if (!duplicate) {
    await ClaimRequest.create({ listingId: listing._id, type, slug, listingName: listing.name, name, email, phone: phone || undefined, role, message: message || undefined });
    await RegisterListing.updateOne({ _id: listing._id, claimStatus: 'unclaimed' }, { $set: { claimStatus: 'requested' } });

    const notify = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
    if (notify) {
      EmailService.sendAdminNotification(
        notify,
        `Claim request: ${listing.name}`,
        `${escapeHtml(name)} (${escapeHtml(role)}) asked to claim the ${type === 'ndis' ? 'NDIS' : 'aged care'} register listing for <strong>${escapeHtml(listing.name)}</strong>.<br>` +
          `Email: ${escapeHtml(email)}${phone ? `<br>Phone: ${escapeHtml(phone)}` : ''}${message ? `<br>Message: ${escapeHtml(message)}` : ''}<br>` +
          'Verify against the business’s own website or ABN before linking it to an account.'
      ).catch(() => {});
    }
  }

  res.status(201).json({ ok: true });
}
