import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import WorkerReview from '../models/WorkerReview.js';
import Worker from '../models/Worker.js';
import { logActivity } from '../models/AdminActivity.js';
import { recomputeWorkerRating } from './workersReviews.controller.js';

const STATUSES = ['pending', 'approved', 'rejected'] as const;
const PAGE_SIZE = 25;

// GET /api/admin/worker-reviews?status=pending|approved|rejected|all&page=
export async function listReviewsAdmin(req: AuthedRequest, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
  const filter = (STATUSES as readonly string[]).includes(status) ? { status } : {};
  const page = Math.max(1, Number(req.query.page) || 1);

  const [rows, total, counts] = await Promise.all([
    WorkerReview.find(filter).sort({ createdAt: status === 'pending' ? 1 : -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    WorkerReview.countDocuments(filter),
    WorkerReview.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const workers = await Worker.find({ _id: { $in: rows.map((r) => r.workerId) } }).select('firstName lastName suburb state').lean();
  const byId = new Map(workers.map((w: any) => [String(w._id), w]));

  res.json({
    page, pageSize: PAGE_SIZE, total,
    counts: Object.fromEntries((counts as { _id: string; n: number }[]).map((c) => [c._id, c.n])),
    items: rows.map((r) => {
      const w: any = byId.get(String(r.workerId));
      return {
        id: String(r._id),
        workerId: String(r.workerId),
        workerName: w ? `${w.firstName} ${w.lastName}` : 'Unknown worker',
        workerPlace: w ? [w.suburb, w.state].filter(Boolean).join(', ') : '',
        reviewerName: r.reviewerName,
        rating: r.rating,
        text: r.text,
        status: r.status,
        moderationNote: r.moderationNote ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }),
  });
}

// PATCH /api/admin/worker-reviews/:id  { status: 'approved' | 'rejected' | 'pending', note? }
export async function moderateReview(req: AuthedRequest, res: Response) {
  const body = (req.body ?? {}) as { status?: unknown; note?: unknown };
  if (typeof body.status !== 'string' || !(STATUSES as readonly string[]).includes(body.status)) {
    return res.status(400).json({ error: 'status must be pending, approved or rejected.' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Review not found.' });
  const review = await WorkerReview.findById(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found.' });

  review.status = body.status as (typeof STATUSES)[number];
  review.moderationNote = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : undefined;
  await review.save();
  const result = await recomputeWorkerRating(review.workerId);

  await logActivity('worker_review_moderated', `Review of a worker by ${review.reviewerName} marked ${body.status}`);
  res.json({ id: String(review._id), status: review.status, workerRating: result.rating, workerReviewCount: result.count });
}
