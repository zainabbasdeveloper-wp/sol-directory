import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Worker, { MASKED_PROJECTION, UNLOCKED_PROJECTION, toMaskedShape, toUnlockedShape } from '../models/Worker.js';
import type { PaginatedResult, WorkerMasked, WorkerSearchQuery } from '@soldirectory/shared-types';

const MAX_LIMIT = 50;

export async function listWorkers(req: AuthedRequest, res: Response) {
  const q = req.query as unknown as WorkerSearchQuery;
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(q.limit) || 20);

  const filter: Record<string, unknown> = { published: true };
  if (q.service) filter.services = q.service;
  if (q.suburb) filter.suburb = q.suburb;
  if (q.language) filter.languages = q.language;
  if (q.gender) filter.gender = q.gender;
  if (q.condition) filter.conditionExperience = q.condition;
  if (q.minRate || q.maxRate) {
    filter.hourlyRate = {
      ...(q.minRate ? { $gte: Number(q.minRate) } : {}),
      ...(q.maxRate ? { $lte: Number(q.maxRate) } : {}),
    };
  }
  if (q.minRating) filter.rating = { $gte: Number(q.minRating) };
  if (q.q) {
    filter.$or = [{ firstName: new RegExp(String(q.q), 'i') }, { services: new RegExp(String(q.q), 'i') }];
  }

  // Radius search uses the 2dsphere index via $geoWithin/$centerSphere
  // rather than pulling every row and computing distance in JS.
  if (q.lat && q.lng && q.radiusKm) {
    const radiusRadians = Number(q.radiusKm) / 6378.1; // km -> radians (Earth radius)
    filter.location = {
      $geoWithin: { $centerSphere: [[Number(q.lng), Number(q.lat)], radiusRadians] },
    };
  }

  // Never fetch a full unbounded set — always paginated, and the
  // masked projection means lastName/email/phone never leave Mongo
  // for this query at all.
  const [docs, total] = await Promise.all([
    Worker.find(filter)
      .select(MASKED_PROJECTION)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Worker.countDocuments(filter),
  ]);

  const result: PaginatedResult<WorkerMasked> = {
    items: docs.map(toMaskedShape),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };

  res.json(result);
}

export async function getWorkerProfile(req: AuthedRequest, res: Response) {
  // TODO: replace with a real lookup — does req.user have an
  // accepted ContactRequest for this worker? Defaulting to the
  // masked projection is the safe choice; never default to unlocked.
  const unlocked = false;
  const projection = unlocked ? UNLOCKED_PROJECTION : MASKED_PROJECTION;

  const worker = await Worker.findOne({ _id: req.params.id, published: true }).select(projection).lean();
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  res.json(unlocked ? toUnlockedShape(worker) : toMaskedShape(worker));
}

export async function requestContact(req: AuthedRequest, res: Response) {
  const worker = await Worker.findById(req.params.id).select('_id').lean();
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  // TODO: create a ContactRequest document (requesterId, workerId,
  // status: 'pending', idempotencyKey) and notify the worker. Contact
  // data unlocks only via the worker's own acceptance action.
  res.status(202).json({ status: 'pending', message: 'Request sent. You will be notified if they accept.' });
}
