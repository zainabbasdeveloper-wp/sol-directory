import type { Request, Response } from 'express';
import Worker from '../models/Worker.js';
import WorkerPhoto, { photoBytes } from '../models/WorkerPhoto.js';
import { STATE_CODES } from '../services/registerNormalise.js';
import { ratingsFor } from './workersReviews.controller.js';
import { workerServiceCandidates } from '../services/workerServiceMatch.js';

/**
 * PUBLIC independent-worker listings — no login.
 *
 * Only workers who (1) switched on "public profile" themselves and (2) were
 * approved by an admin appear. What's shown: first name + last initial,
 * job title, suburb and state, supports, languages, experience, availability
 * days, an indicative rate and their own bio and photo. NEVER a surname,
 * email, phone, exact address, coordinates or clearance details. Contact
 * stays behind the existing organisation-only contact-request flow.
 */

const PUBLIC_MAX_LIMIT = 30;
const PROJECTION =
  'firstName lastName role yearsExperience suburb state hasCar hourlyRate rating reviewCount services languages conditionExperience availableDays availabilityNote bio hasPhoto publicSlug updatedAt';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const visible = () => ({
  publicProfile: true,
  published: true,
  accountStatus: 'active',
  publicSlug: { $exists: true, $ne: null },
});

function toPublic(w: any, rating?: { rating: number; count: number }) {
  return {
    slug: w.publicSlug as string,
    firstName: w.firstName as string,
    lastInitial: w.lastName ? String(w.lastName).charAt(0).toUpperCase() : '',
    role: w.role ?? '',
    suburb: w.suburb ?? '',
    state: w.state ?? '',
    yearsExperience: w.yearsExperience ?? '',
    hasCar: !!w.hasCar,
    hourlyRate: typeof w.hourlyRate === 'number' && w.hourlyRate > 0 ? w.hourlyRate : null,
    services: w.services ?? [],
    languages: w.languages ?? [],
    conditionExperience: w.conditionExperience ?? [],
    availableDays: w.availableDays ?? [],
    availabilityNote: w.availabilityNote ?? '',
    bio: w.bio ?? '',
    hasPhoto: !!w.hasPhoto,
    photoVersion: w.updatedAt ? new Date(w.updatedAt).getTime() : 0,
    // Computed from admin-approved reviews only (never the stored fields, which
    // demo seed data may have filled with made-up numbers). None -> no rating shown.
    rating: rating && rating.count > 0 ? rating.rating : null,
    reviewCount: rating?.count ?? 0,
  };
}

// GET /api/workers/public?service=&suburb=&state=&q=&page=&limit=
export async function listPublicWorkers(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(PUBLIC_MAX_LIMIT, Math.max(1, Number(req.query.limit) || 12));

  const filter: Record<string, unknown> = visible();
  const service = str(req.query.service).slice(0, 80);
  if (service) filter.services = service;
  const suburb = str(req.query.suburb).slice(0, 60);
  if (suburb) filter.suburb = new RegExp(`^${escapeRegex(suburb)}$`, 'i');
  const state = str(req.query.state).toUpperCase();
  if (state) {
    if (!STATE_CODES.includes(state as never)) return res.status(400).json({ error: 'Unknown state.' });
    filter.state = state;
  }
  const q = str(req.query.q).slice(0, 60);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: rx }, { role: rx }, { services: rx }];
  }

  const [docs, total] = await Promise.all([
    Worker.find(filter).select(PROJECTION).sort({ firstName: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Worker.countDocuments(filter),
  ]);

  res.set('Cache-Control', 'public, max-age=60');
  const ratings = await ratingsFor(docs.map((d: any) => d._id));
  res.json({ items: docs.map((d: any) => toPublic(d, ratings.get(String(d._id)))), page, limit, total, hasMore: page * limit < total });
}

/**
 * Public workers for a service page. Tries the page's own service first and
 * falls back to its wider category when nobody lists it (see workerServiceMatch).
 * Also returns per-state counts so the page can offer a state filter.
 */
export async function workersForService(title: string, category: string | undefined, opts: { state?: string; page?: number; limit?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(PUBLIC_MAX_LIMIT, Math.max(1, opts.limit ?? 6));
  const state = opts.state && STATE_CODES.includes(opts.state as never) ? opts.state : '';

  for (const cand of workerServiceCandidates(title, category)) {
    const base = { ...visible(), services: { $in: cand.patterns } };
    const total = await Worker.countDocuments(base);
    if (total === 0) continue;
    const filter = state ? { ...base, state } : base;
    const [docs, filtered, byState, present] = await Promise.all([
      Worker.find(filter).select(PROJECTION).sort({ firstName: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      state ? Worker.countDocuments(filter) : Promise.resolve(total),
      Worker.aggregate([{ $match: base }, { $group: { _id: '$state', n: { $sum: 1 } } }]),
      // Which catalogue names those workers really listed (most common first), so links filter by a real value.
      Worker.aggregate([
        { $match: base }, { $unwind: '$services' }, { $match: { services: { $in: cand.patterns } } },
        { $group: { _id: '$services', n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } },
      ]),
    ]);
    const ratings = await ratingsFor(docs.map((d: any) => d._id));
    return {
      level: cand.level,
      matchedNames: (present as { _id: string }[]).map((p) => p._id),
      items: docs.map((d: any) => toPublic(d, ratings.get(String(d._id)))),
      total: filtered,
      allTotal: total,
      states: Object.fromEntries((byState as { _id: string | null; n: number }[]).filter((s) => s._id).map((s) => [s._id, s.n])),
      page, limit, hasMore: page * limit < filtered,
    };
  }
  return { level: null, matchedNames: [] as string[], items: [], total: 0, allTotal: 0, states: {} as Record<string, number>, page, limit, hasMore: false };
}

// GET /api/workers/public/for-service?title=&category=&state=&page=&limit=
export async function listWorkersForService(req: Request, res: Response) {
  const title = str(req.query.title).slice(0, 120);
  if (!title) return res.status(400).json({ error: 'title is required.' });
  const state = str(req.query.state).toUpperCase();
  if (state && !STATE_CODES.includes(state as never)) return res.status(400).json({ error: 'Unknown state.' });
  const result = await workersForService(title, str(req.query.category).slice(0, 60) || undefined, {
    state, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 6,
  });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(result);
}

// GET /api/workers/public/:slug
export async function getPublicWorker(req: Request, res: Response) {
  const slug = str(req.params.slug).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return res.status(404).json({ error: 'Not found.' });
  const w = await Worker.findOne({ ...visible(), publicSlug: slug }).select(PROJECTION).lean();
  if (!w) return res.status(404).json({ error: 'Not found.' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(toPublic(w, (await ratingsFor([(w as any)._id])).get(String((w as any)._id))));
}

// GET /api/workers/public/:slug/photo
export async function getPublicWorkerPhoto(req: Request, res: Response) {
  const slug = str(req.params.slug).toLowerCase();
  const w = await Worker.findOne({ ...visible(), publicSlug: slug, hasPhoto: true }).select('_id').lean();
  const photo = w ? await WorkerPhoto.findOne({ workerId: w._id }).lean() : null;
  if (!photo) return res.status(404).end();
  // res.setHeader (not res.set) so Express doesn't tack a text charset onto an image type.
  res.setHeader('Content-Type', 'image/jpeg');
  res.set({
    'X-Content-Type-Options': 'nosniff',
    // Short cache: a worker who opts out shouldn't stay visible for long. The page adds ?v=<photoVersion>, so a new photo gets a new URL.
    'Cache-Control': 'public, max-age=600',
  });
  res.send(photoBytes(photo.data));
}
