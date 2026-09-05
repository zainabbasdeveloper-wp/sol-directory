import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Shortlist from '../models/Shortlist.js';
import Provider from '../models/Provider.js';
import { logActivity } from '../models/AdminActivity.js';

// Every handler below derives the user from req.user!.id (set by
// requireAuth after verifying the JWT) — never from a param, query
// string, or request body. There is no code path here that accepts
// a client-supplied user identifier for any operation.

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function listMyShortlist(req: AuthedRequest, res: Response) {
  const rows = await Shortlist.find({ userId: req.user!.id })
    .populate('providerId', 'legalEntityName tradingName plan intakeStatus serviceSuburbs')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    items: rows
      .filter((r) => r.providerId) // provider may have been deleted since shortlisting
      .map((r: any) => ({
        shortlistId: String(r._id),
        provider: {
          id: String(r.providerId._id),
          legalEntityName: r.providerId.legalEntityName,
          tradingName: r.providerId.tradingName,
          intakeStatus: r.providerId.intakeStatus,
          serviceSuburbs: r.providerId.serviceSuburbs ?? [],
        },
        savedAt: r.createdAt,
      })),
  });
}

export async function getShortlistStatus(req: AuthedRequest, res: Response) {
  const { providerId } = req.params;
  if (!isValidObjectId(providerId)) return res.status(400).json({ error: 'Invalid provider id' });

  const exists = await Shortlist.exists({ userId: req.user!.id, providerId });
  res.json({ shortlisted: !!exists });
}

export async function addToShortlist(req: AuthedRequest, res: Response) {
  const { providerId } = req.params;
  if (!isValidObjectId(providerId)) return res.status(400).json({ error: 'Invalid provider id' });

  const provider = await Provider.findById(providerId).select('_id tradingName legalEntityName').lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  try {
    await Shortlist.create({ userId: req.user!.id, providerId });
    await logActivity('shortlist_added', `${req.user!.email} shortlisted ${provider.tradingName || provider.legalEntityName || 'a provider'}`);
  } catch (err: any) {
    // Duplicate key (E11000) from the unique index means it was
    // already shortlisted — treat as success rather than an error,
    // since the end state the caller wants (shortlisted = true) is
    // already true. This is also what makes double-clicks safe.
    if (err?.code !== 11000) throw err;
  }

  res.json({ success: true, shortlisted: true });
}

export async function removeFromShortlist(req: AuthedRequest, res: Response) {
  const { providerId } = req.params;
  if (!isValidObjectId(providerId)) return res.status(400).json({ error: 'Invalid provider id' });

  await Shortlist.deleteOne({ userId: req.user!.id, providerId });
  // Idempotent: whether it existed or not, the end state the caller
  // wants (shortlisted = false) is now true. No error either way.
  res.json({ success: true, shortlisted: false });
}
