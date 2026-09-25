/**
 * Geocodes every unique suburb the directory actually needs a map point
 * for — the suburbs named in RegisterListing.areas and in Worker
 * suburb/state — into the SuburbGeo cache, once each.
 *
 * A register listing and a worker profile only ever have a suburb, never
 * a street address, so a marker for either of them can only honestly
 * mean "somewhere in this suburb" — that's why this geocodes suburbs
 * once and shares the result, rather than pretending to geocode 26,000+
 * individual businesses we have no address for.
 *
 * Usage:
 *   npx tsx src/scripts/geocodeSuburbs.ts --dry-run          # report only
 *   npx tsx src/scripts/geocodeSuburbs.ts                    # geocode everything not cached yet
 *   npx tsx src/scripts/geocodeSuburbs.ts --limit 200         # geocode at most 200 new suburbs
 *
 * Safe to re-run: already-cached suburbs (success OR a confirmed "no
 * result") are skipped, so interrupting and re-running only continues.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import Worker from '../models/Worker.js';
import SuburbGeo from '../models/SuburbGeo.js';
import { geocodeAddress } from '../services/geocoding.service.js';
import { STATE_NAMES, type StateCode } from '../services/registerNormalise.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  return {
    dryRun: args.includes('--dry-run'),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined,
  };
}

// Simple slugifier matching the one areas are already stored with
// (lowercase, spaces/apostrophes to hyphens) — only used for worker
// suburbs, which are stored as free text with no slug of their own.
function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function collectTargets(): Promise<Map<string, { state: string; suburbSlug: string; suburb: string }>> {
  const targets = new Map<string, { state: string; suburbSlug: string; suburb: string }>();

  const fromRegister = await RegisterListing.aggregate([
    { $unwind: '$areas' },
    { $group: { _id: { state: '$areas.state', suburbSlug: '$areas.suburbSlug' }, suburb: { $first: '$areas.suburb' } } },
  ]);
  for (const r of fromRegister) {
    const key = `${r._id.state}|${r._id.suburbSlug}`;
    targets.set(key, { state: r._id.state, suburbSlug: r._id.suburbSlug, suburb: r.suburb });
  }

  const fromWorkers = await Worker.aggregate([
    { $match: { suburb: { $exists: true, $nin: [null, ''] }, state: { $exists: true, $nin: [null, ''] } } },
    { $group: { _id: { state: '$state', suburb: '$suburb' } } },
  ]);
  for (const w of fromWorkers) {
    const suburb = String(w._id.suburb).trim();
    const state = String(w._id.state).trim();
    if (!suburb || !state) continue;
    const key = `${state}|${slugify(suburb)}`;
    if (!targets.has(key)) targets.set(key, { state, suburbSlug: slugify(suburb), suburb });
  }

  return targets;
}

async function main() {
  const { dryRun, limit } = parseArgs();
  await connectDB();

  const targets = await collectTargets();
  console.log(`[geocode-suburbs] ${targets.size} unique suburb/state combinations found across register listings and workers.`);

  const already = await SuburbGeo.find({}, { state: 1, suburbSlug: 1 }).lean();
  const cached = new Set(already.map((a) => `${a.state}|${a.suburbSlug}`));
  const todo = [...targets.values()].filter((t) => !cached.has(`${t.state}|${t.suburbSlug}`));
  console.log(`[geocode-suburbs] ${cached.size} already cached, ${todo.length} to geocode.`);

  if (dryRun) {
    console.log('[geocode-suburbs] --dry-run: not writing anything.');
    process.exit(0);
  }

  const list = typeof limit === 'number' ? todo.slice(0, limit) : todo;
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    const stateName = STATE_NAMES[t.state as StateCode] ?? t.state;
    const result = await geocodeAddress(`${t.suburb}, ${stateName}, Australia`);
    if (result) {
      await SuburbGeo.updateOne(
        { state: t.state, suburbSlug: t.suburbSlug },
        { $set: { suburb: t.suburb, location: { type: 'Point', coordinates: [result.lng, result.lat] }, geocodedAt: new Date(), failed: false } },
        { upsert: true }
      );
      ok++;
    } else {
      await SuburbGeo.updateOne(
        { state: t.state, suburbSlug: t.suburbSlug },
        { $set: { suburb: t.suburb, geocodedAt: new Date(), failed: true }, $unset: { location: '' } },
        { upsert: true }
      );
      failed++;
    }
    if ((i + 1) % 200 === 0) console.log(`[geocode-suburbs] ${i + 1}/${list.length} (${ok} ok, ${failed} failed)...`);
  }

  console.log(`\n[geocode-suburbs] Done. ${ok} geocoded, ${failed} had no result, ${todo.length - list.length} left for next run.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[geocode-suburbs] Fatal error:', err);
  process.exit(1);
});
