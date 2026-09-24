import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Worker from '../models/Worker.js';
import Provider from '../models/Provider.js';
import ContactRequest from '../models/ContactRequest.js';
import WorkerReview from '../models/WorkerReview.js';
import { EmailService } from '../services/email.service.js';

/**
 * Worker reviews.
 *
 * WHO can review: a provider organisation (logged in, active) that has sent
 * this worker a contact request through SolDirectory. That proves the
 * organisation used the platform to reach the worker — it does not prove
 * they later worked together, so the form asks them to say so and the public
 * label says "provider organisation", not "verified engagement".
 * WHAT is shown: only admin-approved reviews. The rating is always computed
 * from those; nothing is ever seeded or estimated.
 */

const MIN_TEXT = 20;
const MAX_TEXT = 600;
const PAGE = 10;

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';

/** Average and count of APPROVED reviews for the given workers. */
export async function ratingsFor(workerIds: mongoose.Types.ObjectId[]): Promise<Map<string, { rating: number; count: number }>> {
  if (workerIds.length === 0) return new Map();
  const rows = await WorkerReview.aggregate([
    { $match: { workerId: { $in: workerIds }, status: 'approved' } },
    { $group: { _id: '$workerId', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  return new Map((rows as { _id: mongoose.Types.ObjectId; avg: number; n: number }[]).map((r) => [String(r._id), { rating: Math.round(r.avg * 10) / 10, count: r.n }]));
}

/** Writes the stored rating/reviewCount (used by the gated directory) from approved reviews only. */
export async function recomputeWorkerRating(workerId: mongoose.Types.ObjectId | string): Promise<{ rating: number; count: number }> {
  const id = new mongoose.Types.ObjectId(String(workerId));
  const got = (await ratingsFor([id])).get(String(id)) ?? { rating: 0, count: 0 };
  await Worker.updateOne({ _id: id }, { $set: { rating: got.rating, reviewCount: got.count } });
  return got;
}

const publicShape = (r: any) => ({
  rating: r.rating as number,
  text: r.text as string,
  by: r.reviewerName as string,
  at: r.createdAt as Date,
});

async function listApproved(workerId: mongoose.Types.ObjectId, page: number) {
  const [items, agg] = await Promise.all([
    WorkerReview.find({ workerId, status: 'approved' }).sort({ createdAt: -1 }).skip((page - 1) * PAGE).limit(PAGE).lean(),
    ratingsFor([workerId]),
  ]);
  const a = agg.get(String(workerId));
  return { items: items.map(publicShape), page, pageSize: PAGE, total: a?.count ?? 0, average: a?.rating ?? null };
}

// GET /api/workers/public/:slug/reviews — approved reviews of an opted-in, approved worker
export async function getPublicWorkerReviews(req: Request, res: Response) {
  const slug = str(req.params.slug, 120).toLowerCase();
  const w = await Worker.findOne({ publicProfile: true, published: true, accountStatus: 'active', publicSlug: slug }).select('_id').lean();
  if (!w) return res.status(404).json({ error: 'Not found.' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(await listApproved(w._id as mongoose.Types.ObjectId, Math.max(1, Number(req.query.page) || 1)));
}

async function myProviderFor(req: AuthedRequest) {
  if (req.user?.role !== 'provider') return null;
  return Provider.findOne({ userId: req.user.id, accountStatus: 'active' }).select('tradingName legalEntityName').lean();
}

// GET /api/workers/:id/reviews — for the signed-in organisation viewing a worker
export async function getWorkerReviewsForOrg(req: AuthedRequest, res: Response) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Worker not found' });
  const workerId = new mongoose.Types.ObjectId(req.params.id);
  if (!(await Worker.exists({ _id: workerId, published: true }))) return res.status(404).json({ error: 'Worker not found' });

  const base = await listApproved(workerId, Math.max(1, Number(req.query.page) || 1));
  let eligible = false;
  let mine: { rating: number; text: string; status: string } | null = null;
  if (req.user?.role === 'provider') {
    eligible = !!(await ContactRequest.exists({ requesterId: req.user.id, targetType: 'Worker', targetId: workerId }));
    const m = await WorkerReview.findOne({ workerId, reviewerUserId: req.user.id }).lean();
    if (m) mine = { rating: m.rating, text: m.text, status: m.status };
  }
  res.json({ ...base, eligible, mine });
}

// POST /api/workers/:id/reviews  { rating, text, workedWith }
export async function submitWorkerReview(req: AuthedRequest, res: Response) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Worker not found' });
  const workerId = new mongoose.Types.ObjectId(req.params.id);
  const worker = await Worker.findOne({ _id: workerId, published: true }).select('firstName lastName').lean();
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const provider = await myProviderFor(req);
  if (!provider) return res.status(403).json({ error: 'Only provider organisations can review workers.' });
  const contacted = await ContactRequest.exists({ requesterId: req.user!.id, targetType: 'Worker', targetId: workerId });
  if (!contacted) return res.status(403).json({ error: 'You can review a worker after you have contacted them through SolDirectory.' });

  const b = (req.body ?? {}) as Record<string, unknown>;
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Please choose a rating from 1 to 5.' });
  const text = str(b.text, MAX_TEXT);
  if (text.length < MIN_TEXT) return res.status(400).json({ error: `Please write at least ${MIN_TEXT} characters about your experience.` });
  if (b.workedWith !== true) return res.status(400).json({ error: 'Please confirm that you have worked with this person.' });

  const reviewerName = (provider as any).tradingName || (provider as any).legalEntityName || 'A provider organisation';
  // Editing your own review puts it back in front of a moderator.
  const existing = await WorkerReview.findOne({ workerId, reviewerUserId: req.user!.id });
  const wasApproved = existing?.status === 'approved';
  const doc = await WorkerReview.findOneAndUpdate(
    { workerId, reviewerUserId: req.user!.id },
    { $set: { rating, text, reviewerName, status: 'pending' }, $unset: { moderationNote: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (wasApproved) await recomputeWorkerRating(workerId); // an edited review stops counting until re-approved

  const notify = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  if (notify) {
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    EmailService.sendAdminNotification(notify, 'Worker review awaiting moderation', `${esc(reviewerName)} reviewed ${esc(String((worker as any).firstName))} (${rating}/5). Approve or reject it in the admin area under Worker reviews.`).catch(() => {});
  }
  res.status(201).json({ status: doc!.status });
}

// GET /api/workers/me/reviews — a worker reading approved reviews of themselves
export async function getMyReviews(req: AuthedRequest, res: Response) {
  if (req.user?.role !== 'worker') return res.status(404).json({ error: 'Worker profile not found.' });
  const w = await Worker.findOne({ userId: req.user.id }).select('_id').lean();
  if (!w) return res.status(404).json({ error: 'Worker profile not found.' });
  res.json(await listApproved(w._id as mongoose.Types.ObjectId, Math.max(1, Number(req.query.page) || 1)));
}
