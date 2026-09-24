import type { Request, Response } from 'express';
import Worker from '../models/Worker.js';
import WorkerPhoto, { photoBytes } from '../models/WorkerPhoto.js';
import { STATE_CODES } from '../services/registerNormalise.js';

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

function toPublic(w: any) {
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
    // Only real reviews — a worker with none shows no rating at all.
    rating: w.reviewCount > 0 ? w.rating : null,
    reviewCount: w.reviewCount > 0 ? w.reviewCount : 0,
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
  res.json({ items: docs.map(toPublic), page, limit, total, hasMore: page * limit < total });
}

// GET /api/workers/public/:slug
export async function getPublicWorker(req: Request, res: Response) {
  const slug = str(req.params.slug).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return res.status(404).json({ error: 'Not found.' });
  const w = await Worker.findOne({ ...visible(), publicSlug: slug }).select(PROJECTION).lean();
  if (!w) return res.status(404).json({ error: 'Not found.' });
  res.set('Cache-Control', 'public, max-age=60');
  res.json(toPublic(w));
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
