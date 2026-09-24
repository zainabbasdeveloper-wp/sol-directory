import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import ClaimRequest from '../models/ClaimRequest.js';
import RegisterListing from '../models/RegisterListing.js';
import { logActivity } from '../models/AdminActivity.js';

const STATUSES = ['new', 'verified', 'rejected'] as const;
const PAGE_SIZE = 25;

// GET /api/admin/claims?status=new|verified|rejected|all&page=
export async function listClaimsAdmin(req: AuthedRequest, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : 'new';
  const filter = (STATUSES as readonly string[]).includes(status) ? { status } : {};
  const page = Math.max(1, Number(req.query.page) || 1);

  const [rows, total, counts] = await Promise.all([
    ClaimRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    ClaimRequest.countDocuments(filter),
    ClaimRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);

  // Show each requester the listing's public details, so the reviewer can
  // compare the person's claim with the business's own website.
  const listings = await RegisterListing.find({ _id: { $in: rows.map((r) => r.listingId) } })
    .select('website states claimStatus').lean();
  const byId = new Map(listings.map((l) => [String(l._id), l]));

  res.json({
    page, pageSize: PAGE_SIZE, total,
    counts: Object.fromEntries((counts as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    items: rows.map((r) => {
      const l = byId.get(String(r.listingId));
      return {
        id: String(r._id),
        type: r.type,
        slug: r.slug,
        listingName: r.listingName,
        website: l?.website ?? null,
        states: l?.states ?? [],
        listingClaimStatus: l?.claimStatus ?? null,
        name: r.name,
        email: r.email,
        phone: r.phone ?? null,
        role: r.role,
        message: r.message ?? null,
        status: r.status,
        createdAt: r.createdAt,
      };
    }),
  });
}

/**
 * PATCH /api/admin/claims/:id  { status: 'verified' | 'rejected' | 'new' }
 *
 * The listing's public claimStatus is derived from ALL its requests, not
 * just this one: any verified → claimed; else any open → requested;
 * else unclaimed. So rejecting one of two open requests leaves the other
 * standing, and undoing a decision puts everything back consistently.
 * Verifying does not create a Provider account — the business still
 * signs up normally; this only records that a person confirmed the claim.
 */
export async function updateClaimStatus(req: AuthedRequest, res: Response) {
  const status = (req.body as { status?: unknown })?.status;
  if (typeof status !== 'string' || !(STATUSES as readonly string[]).includes(status)) {
    return res.status(400).json({ error: 'status must be new, verified or rejected.' });
  }

  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Claim request not found.' });
  const claim = await ClaimRequest.findById(req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim request not found.' });
  if (claim.status === status) return res.json({ id: String(claim._id), status });

  claim.status = status as (typeof STATUSES)[number];
  await claim.save();

  const [verified, open] = await Promise.all([
    ClaimRequest.exists({ listingId: claim.listingId, status: 'verified' }),
    ClaimRequest.exists({ listingId: claim.listingId, status: 'new' }),
  ]);
  const claimStatus = verified ? 'claimed' : open ? 'requested' : 'unclaimed';
  await RegisterListing.updateOne({ _id: claim.listingId }, { $set: { claimStatus } });

  await logActivity('claim_request_updated', `Claim request for ${claim.listingName} marked ${status}`);
  res.json({ id: String(claim._id), status, listingClaimStatus: claimStatus });
}
