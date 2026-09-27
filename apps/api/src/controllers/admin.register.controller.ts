import type { Response } from 'express';
import type { FilterQuery } from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import RegisterListing, { type RegisterListingDoc } from '../models/RegisterListing.js';
import ClaimRequest from '../models/ClaimRequest.js';
import {
  REGISTER_SUPPORT_CATEGORIES, REGISTER_TYPES, STATE_CODES,
  type RegisterType, type StateCode,
} from '../services/registerNormalise.js';

/**
 * Admin view of the imported directory inventory (RegisterListing) — the
 * ~26,000 facts-only listings pulled from the public NDIS/My Aged Care
 * registers. Separate from /api/admin/providers (real, signed-up accounts):
 * this is the "unclaimed imported inventory" layer, browsable and
 * filterable so an admin can see what's actually in the directory without
 * going through the database directly.
 */

const PAGE_SIZE = 30;
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// GET /api/admin/register?type=&state=&category=&claimStatus=&q=&page=
export async function listRegisterAdmin(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const filter: FilterQuery<RegisterListingDoc> = {};

  const type = str(req.query.type);
  if (type) {
    if (!(REGISTER_TYPES as readonly string[]).includes(type)) return res.status(400).json({ error: 'Unknown type.' });
    filter.type = type as RegisterType;
  }
  const state = str(req.query.state).toUpperCase();
  if (state) {
    if (!STATE_CODES.includes(state as StateCode)) return res.status(400).json({ error: 'Unknown state.' });
    filter.states = state;
  }
  const category = str(req.query.category);
  if (category) {
    if (!(REGISTER_SUPPORT_CATEGORIES as readonly string[]).includes(category)) return res.status(400).json({ error: 'Unknown category.' });
    filter.supportCategories = category;
  }
  const claimStatus = str(req.query.claimStatus);
  if (claimStatus) {
    if (!['unclaimed', 'requested', 'claimed'].includes(claimStatus)) return res.status(400).json({ error: 'Unknown claimStatus.' });
    filter.claimStatus = claimStatus as RegisterListingDoc['claimStatus'];
  }
  const q = str(req.query.q).slice(0, 80);
  if (q) filter.nameLower = new RegExp(q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  const [items, total, counts, byType] = await Promise.all([
    RegisterListing.find(filter)
      .select('type slug name states areaCount supportCategories website claimStatus providerId importedAt sourceUpdatedAt')
      .sort({ importedAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    RegisterListing.countDocuments(filter),
    RegisterListing.aggregate([{ $match: filter }, { $group: { _id: '$claimStatus', n: { $sum: 1 } } }]),
    RegisterListing.aggregate([{ $group: { _id: '$type', n: { $sum: 1 } } }]),
  ]);

  res.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    counts: Object.fromEntries((counts as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    totalsByType: Object.fromEntries((byType as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    items: items.map((d) => ({
      id: String(d._id),
      type: d.type,
      slug: d.slug,
      name: d.name,
      states: d.states,
      areaCount: d.areaCount,
      supportCategories: d.supportCategories,
      hasWebsite: !!d.website,
      claimStatus: d.claimStatus,
      providerId: d.providerId ? String(d.providerId) : null,
      importedAt: d.importedAt,
      sourceUpdatedAt: d.sourceUpdatedAt ?? null,
    })),
  });
}

// GET /api/admin/register/summary — top-line counts for the admin dashboard/nav.
export async function getRegisterAdminSummary(_req: AuthedRequest, res: Response) {
  const [total, byType, byClaim, requestsOpen] = await Promise.all([
    RegisterListing.countDocuments({}),
    RegisterListing.aggregate([{ $group: { _id: '$type', n: { $sum: 1 } } }]),
    RegisterListing.aggregate([{ $group: { _id: '$claimStatus', n: { $sum: 1 } } }]),
    ClaimRequest.countDocuments({ status: 'new' }),
  ]);
  res.json({
    total,
    byType: Object.fromEntries((byType as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    byClaimStatus: Object.fromEntries((byClaim as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    openClaimRequests: requestsOpen,
  });
}

// GET /api/admin/register/:type/:slug — full detail for one listing.
export async function getRegisterAdminDetail(req: AuthedRequest, res: Response) {
  const type = str(req.params.type);
  if (!(REGISTER_TYPES as readonly string[]).includes(type)) return res.status(404).json({ error: 'Not found.' });
  const slug = str(req.params.slug).toLowerCase();
  const doc = await RegisterListing.findOne({ type, slug }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found.' });

  const claims = await ClaimRequest.find({ listingId: doc._id }).sort({ createdAt: -1 }).lean();

  res.json({
    id: String(doc._id),
    type: doc.type,
    slug: doc.slug,
    name: doc.name,
    states: doc.states,
    areas: doc.areas,
    areaCount: doc.areaCount,
    website: doc.website ?? null,
    services: doc.services,
    supportCategories: doc.supportCategories,
    claimStatus: doc.claimStatus,
    providerId: doc.providerId ? String(doc.providerId) : null,
    importedAt: doc.importedAt,
    sourceUpdatedAt: doc.sourceUpdatedAt ?? null,
    claimRequests: claims.map((c) => ({
      id: String(c._id), name: c.name, email: c.email, phone: c.phone ?? null,
      role: c.role, message: c.message ?? null, status: c.status, createdAt: c.createdAt,
    })),
  });
}
