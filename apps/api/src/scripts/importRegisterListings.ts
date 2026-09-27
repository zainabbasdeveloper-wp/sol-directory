/**
 * Imports public-register provider data into the RegisterListing
 * collection (see models/RegisterListing.ts for what that is — and isn't).
 *
 * Usage:
 *   npx tsx src/scripts/importRegisterListings.ts path/to/providers.jsonl --dry-run
 *   npx tsx src/scripts/importRegisterListings.ts path/to/providers.jsonl
 *   npx tsx src/scripts/importRegisterListings.ts path/to/providers.jsonl --limit 2000
 *
 * Input: JSON Lines, one row per provider x service-area suburb. The
 * file is streamed, so a 1 GB export is fine. Rows for the same provider
 * are merged into ONE listing whose `areas` is the union of every
 * suburb it appears in.
 *
 * Only register FACTS are read: name, register type, state, suburbs, a
 * clean website, and allowlisted service names. Everything else in the
 * rows — the source site's titles, descriptions, "about" text, FAQ text,
 * badges, similar-provider blocks, raw page text, phone numbers — is
 * ignored on purpose. Re-running is safe: listings are upserted by
 * (type, slug), and a listing that's been claimed keeps its claim state.
 *
 * --dry-run reads and normalises everything and prints a report without
 * touching the database, so the output can be checked first.
 */
import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import {
  REGISTER_TYPES, normaliseName, normaliseServices, normaliseWebsite, rowToArea, safeProviderSlug,
  type RegisterArea, type RegisterType, type SupportCategory,
} from '../services/registerNormalise.js';

interface Acc {
  type: RegisterType;
  slug: string;
  name: string;
  website?: string;
  areas: Map<string, RegisterArea>;
  labels: Set<string>;
  categories: Set<SupportCategory>;
  lastSeen?: Date;
}

const BATCH = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const limitIdx = args.indexOf('--limit');
  return {
    file,
    dryRun: args.includes('--dry-run'),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined,
  };
}

async function readListings(file: string, limit?: number) {
  const byKey = new Map<string, Acc>();
  const stats = { rows: 0, badRows: 0, skippedRows: 0, droppedValues: 0, keptValues: 0 };

  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (limit && stats.rows >= limit) break;
    stats.rows++;

    let row: Record<string, unknown>;
    try { row = JSON.parse(line); } catch { stats.badRows++; continue; }

    const type = row.provider_type as RegisterType;
    const name = normaliseName(row.name);
    const slug = typeof row.slug === 'string' ? row.slug.trim().toLowerCase() : '';
    if (!REGISTER_TYPES.includes(type) || !name || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { stats.skippedRows++; continue; }

    const key = `${type}|${slug}`;
    let acc = byKey.get(key);
    if (!acc) {
      acc = { type, slug: safeProviderSlug(slug), name, areas: new Map(), labels: new Set(), categories: new Set() };
      byKey.set(key, acc);
    }

    const website = normaliseWebsite(row.website);
    if (website && !acc.website) acc.website = website;

    const area = rowToArea(row as never);
    if (area) acc.areas.set(`${area.state}|${area.suburbSlug}`, area);

    const svc = normaliseServices(row.services_offered);
    stats.keptValues += svc.labels.length;
    stats.droppedValues += svc.droppedCount;
    svc.labels.forEach((l) => acc!.labels.add(l));
    svc.categories.forEach((c) => acc!.categories.add(c));

    const seen = typeof row.scraped_at === 'string' ? new Date(row.scraped_at) : undefined;
    if (seen && !Number.isNaN(seen.getTime()) && (!acc.lastSeen || seen > acc.lastSeen)) acc.lastSeen = seen;
  }
  return { byKey, stats };
}

function toDoc(a: Acc) {
  const areas = [...a.areas.values()].sort((x, y) => x.state.localeCompare(y.state) || x.suburb.localeCompare(y.suburb));
  return {
    type: a.type,
    slug: a.slug,
    name: a.name,
    // Lowercased with leading punctuation stripped, so "(Clcs) Carelink" sorts under C, not before A.
    nameLower: a.name.toLowerCase().replace(/^[^a-z0-9]+/, '') || a.name.toLowerCase(),
    states: [...new Set(areas.map((x) => x.state))].sort(),
    areas,
    areaCount: areas.length,
    website: a.website,
    services: [...a.labels],
    supportCategories: [...a.categories],
    sourceUpdatedAt: a.lastSeen,
  };
}

async function main() {
  const { file, dryRun, limit } = parseArgs();
  if (!file) {
    console.error('Usage: npx tsx src/scripts/importRegisterListings.ts <providers.jsonl> [--dry-run] [--limit N]');
    process.exit(1);
  }

  console.log(`[register-import] Reading ${file}${limit ? ` (first ${limit} rows)` : ''}…`);
  const { byKey, stats } = await readListings(file, limit);
  const docs = [...byKey.values()].map(toDoc);

  const byType: Record<string, number> = {};
  const catCount: Record<string, number> = {};
  let withSite = 0, noServices = 0, noAreas = 0, multiState = 0;
  for (const d of docs) {
    byType[d.type] = (byType[d.type] ?? 0) + 1;
    d.supportCategories.forEach((c) => (catCount[c] = (catCount[c] ?? 0) + 1));
    if (d.website) withSite++;
    if (!d.services.length) noServices++;
    if (!d.areaCount) noAreas++;
    if (d.states.length > 1) multiState++;
  }

  console.log(`\n[register-import] ${stats.rows} rows read (${stats.badRows} unparseable, ${stats.skippedRows} skipped as incomplete).`);
  console.log(`[register-import] ${docs.length} unique providers:`, byType);
  console.log(`[register-import] service values: ${stats.keptValues} kept, ${stats.droppedValues} dropped as not-a-service (page copy, headings, conditions, languages).`);
  console.log(`[register-import] ${withSite} with a website, ${noServices} with no recognised services, ${noAreas} with no area, ${multiState} in more than one state.`);
  console.log('[register-import] providers per category:', catCount);
  console.log('[register-import] sample:', JSON.stringify({ ...docs[0], areas: docs[0]?.areas.slice(0, 3) }, null, 2));

  if (dryRun) {
    console.log('\n[register-import] --dry-run: nothing written.');
    return;
  }

  const { connectDB } = await import('../config/db.js');
  const { default: RegisterListing } = await import('../models/RegisterListing.js');
  await connectDB();

  let written = 0;
  let protectedCount = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);

    // A claimed listing belongs to a real business now — a fresh scrape
    // must never silently overwrite its name, services, areas or website
    // out from under it. Find which of this batch are already claimed
    // before deciding what to write for each.
    const claimedDocs = await RegisterListing.find({ $or: batch.map((d) => ({ type: d.type, slug: d.slug })), claimStatus: 'claimed' })
      .select('type slug').lean();
    const claimed = new Set(claimedDocs.map((r) => `${r.type}|${r.slug}`));

    const ops = batch.map((d) => {
      const { website, sourceUpdatedAt, ...rest } = d;
      const isClaimed = claimed.has(`${d.type}|${d.slug}`);
      if (isClaimed) protectedCount++;
      return {
        updateOne: {
          filter: { type: d.type, slug: d.slug },
          update: {
            // Claimed: only note that the source still lists this business — never touch its facts.
            // Not claimed (or new): the full re-import, same as before.
            $set: isClaimed
              ? (sourceUpdatedAt ? { sourceUpdatedAt } : {})
              : { ...rest, ...(website ? { website } : {}), ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}) },
            ...(!isClaimed && !website ? { $unset: { website: '' } } : {}),
            // Only on first insert: a re-import must never reset a listing that's been claimed.
            $setOnInsert: { claimStatus: 'unclaimed', importedAt: new Date() },
          },
          upsert: true,
        },
      };
    });
    const res = await RegisterListing.bulkWrite(ops as never, { ordered: false });
    written += (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
    process.stdout.write(`\r[register-import] ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }
  console.log(`\n[register-import] Done. ${written} listing(s) created or updated. ${protectedCount} already-claimed listing(s) left untouched (only their "still on the register" date was refreshed).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('[register-import] Fatal error:', err); process.exit(1); });
