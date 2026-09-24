import crypto from 'node:crypto';
import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Worker from '../models/Worker.js';
import WorkerPhoto, { photoBytes } from '../models/WorkerPhoto.js';
import Service from '../models/Service.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { STATE_CODES } from '../services/registerNormalise.js';
import { slugify } from '../utils/slugify.js';

/**
 * A worker editing their OWN profile. Until now a signed-up worker was an
 * empty shell (name, email, phone) with no way to add services, location,
 * a bio or a photo, so there was nothing to list. Public visibility is the
 * worker's own choice (`publicProfile`) and additionally needs admin
 * approval (`published`) — see Worker.ts.
 */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_PHOTO_BYTES = 300 * 1024;

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max) : '';

function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const item of v) {
    const s = clean(item, maxLen);
    if (s) out.add(s);
    if (out.size >= maxItems) break;
  }
  return [...out];
}

function shape(w: any) {
  return {
    firstName: w.firstName,
    lastName: w.lastName,
    email: w.email,
    role: w.role ?? '',
    yearsExperience: w.yearsExperience ?? '',
    suburb: w.suburb ?? '',
    state: w.state ?? '',
    hasCar: !!w.hasCar,
    hourlyRate: typeof w.hourlyRate === 'number' ? w.hourlyRate : null,
    services: w.services ?? [],
    languages: w.languages ?? [],
    conditionExperience: w.conditionExperience ?? [],
    availableDays: w.availableDays ?? [],
    availabilityNote: w.availabilityNote ?? '',
    bio: w.bio ?? '',
    publicProfile: !!w.publicProfile,
    publicSlug: w.publicSlug ?? null,
    hasPhoto: !!w.hasPhoto,
    // Whether admin has approved this worker for listing — the public
    // page appears only when this AND publicProfile are true.
    approved: !!w.published,
    verificationStatus: w.verificationStatus,
    photoVersion: w.updatedAt ? new Date(w.updatedAt).getTime() : 0,
  };
}

async function myWorker(req: AuthedRequest) {
  if (req.user?.role !== 'worker') return null;
  return Worker.findOne({ userId: req.user.id });
}

export async function getMyWorker(req: AuthedRequest, res: Response) {
  const w = await myWorker(req);
  if (!w) return res.status(404).json({ error: 'Worker profile not found.' });
  res.json(shape(w));
}

async function uniqueSlug(firstName: string, lastName: string, suburb: string): Promise<string> {
  const base = [slugify(firstName), slugify(lastName).charAt(0), slugify(suburb)].filter(Boolean).join('-') || 'worker';
  // A short random suffix keeps slugs unpredictable and avoids collisions
  // between people with the same first name, initial and suburb.
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    if (!(await Worker.exists({ publicSlug: candidate }))) return candidate;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}

export async function updateMyWorker(req: AuthedRequest, res: Response) {
  const w = await myWorker(req);
  if (!w) return res.status(404).json({ error: 'Worker profile not found.' });
  const b = (req.body ?? {}) as Record<string, unknown>;

  const firstName = clean(b.firstName, 40);
  const lastName = clean(b.lastName, 40);
  if (firstName.length < 1 || lastName.length < 1) return res.status(400).json({ error: 'Please enter your first and last name.' });

  const state = clean(b.state, 3).toUpperCase();
  if (state && !STATE_CODES.includes(state as never)) return res.status(400).json({ error: 'Please choose a valid state.' });

  let hourlyRate: number | undefined;
  if (b.hourlyRate !== null && b.hourlyRate !== '' && b.hourlyRate !== undefined) {
    hourlyRate = Number(b.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0 || hourlyRate > 500) return res.status(400).json({ error: 'Hourly rate must be between 0 and 500.' });
  }

  // Services must come from the real catalogue — free text here would
  // become junk categories on public pages.
  const requested = cleanList(b.services, 20, 80);
  const catalogue = new Set((await Service.find({ active: true }).select('name').lean()).map((s: any) => s.name));
  const unknown = requested.filter((s) => !catalogue.has(s));
  if (unknown.length) return res.status(400).json({ error: `Unknown service: ${unknown[0]}` });

  const suburb = clean(b.suburb, 60);
  const locationChanged = suburb !== (w.suburb ?? '') || state !== (w.state ?? '');

  w.firstName = firstName;
  w.lastName = lastName;
  w.role = clean(b.role, 60);
  w.yearsExperience = clean(b.yearsExperience, 30);
  w.suburb = suburb;
  w.state = state || undefined;
  w.hasCar = b.hasCar === true;
  w.hourlyRate = hourlyRate as number;
  w.services = requested;
  w.languages = cleanList(b.languages, 10, 30);
  w.conditionExperience = cleanList(b.conditionExperience, 15, 60);
  w.availableDays = cleanList(b.availableDays, 7, 3).filter((d) => DAYS.includes(d));
  w.availabilityNote = clean(b.availabilityNote, 300);
  w.bio = clean(b.bio, 800);

  const wantsPublic = b.publicProfile === true;
  if (wantsPublic) {
    if (!suburb || !state) return res.status(400).json({ error: 'Add your suburb and state before turning on your public profile.' });
    if (!requested.length) return res.status(400).json({ error: 'Choose at least one support you offer before turning on your public profile.' });
    if (!w.publicSlug) w.publicSlug = await uniqueSlug(firstName, lastName, suburb);
  }
  w.publicProfile = wantsPublic;

  // Coordinates power distance search; best effort (needs a Mapbox token).
  if (locationChanged && suburb && state) {
    const geo = await geocodeAddress(`${suburb} ${state} Australia`);
    if (geo) w.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
  }

  await w.save();
  res.json(shape(w));
}

// PUT /api/workers/me/photo — body is the raw JPEG (Content-Type: image/jpeg)
export async function putMyPhoto(req: AuthedRequest, res: Response) {
  const w = await myWorker(req);
  if (!w) return res.status(404).json({ error: 'Worker profile not found.' });

  const data = req.body as Buffer;
  if (!Buffer.isBuffer(data) || data.length < 200) return res.status(400).json({ error: 'Please choose a photo.' });
  if (data.length > MAX_PHOTO_BYTES) return res.status(413).json({ error: 'That photo is too large.' });
  // JPEG magic bytes — the browser converts every upload to JPEG.
  if (!(data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)) return res.status(415).json({ error: 'Photo must be a JPEG image.' });

  await WorkerPhoto.findOneAndUpdate({ workerId: w._id }, { $set: { data, contentType: 'image/jpeg' } }, { upsert: true });
  w.hasPhoto = true;
  await w.save();
  res.json(shape(w));
}

export async function deleteMyPhoto(req: AuthedRequest, res: Response) {
  const w = await myWorker(req);
  if (!w) return res.status(404).json({ error: 'Worker profile not found.' });
  await WorkerPhoto.deleteOne({ workerId: w._id });
  w.hasPhoto = false;
  await w.save();
  res.json(shape(w));
}

// GET /api/workers/me/photo — the owner's own photo, so they can preview it
// before their public profile is approved (the public endpoint won't serve it yet).
export async function getMyPhoto(req: AuthedRequest, res: Response) {
  const w = await myWorker(req);
  const photo = w ? await WorkerPhoto.findOne({ workerId: w._id }).lean() : null;
  if (!photo) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
  res.send(photoBytes(photo.data));
}
