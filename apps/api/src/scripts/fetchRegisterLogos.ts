/**
 * Looks up a logo/icon for every register listing that has a website and
 * hasn't been checked yet — from the business's OWN site only (see
 * services/logoDiscovery.ts). Never touches a competitor's site, never
 * downloads or stores an image, just records a URL that still points at
 * the business's own domain.
 *
 * Usage:
 *   npx tsx src/scripts/fetchRegisterLogos.ts --dry-run           # report only
 *   npx tsx src/scripts/fetchRegisterLogos.ts                     # look up everything not checked yet
 *   npx tsx src/scripts/fetchRegisterLogos.ts --limit 500          # look up at most 500
 *   npx tsx src/scripts/fetchRegisterLogos.ts --recheck-days 180   # also re-check listings last checked over N days ago
 *
 * Safe to re-run and to interrupt: only listings with website set and no
 * logoCheckedAt (or a stale one, with --recheck-days) are picked up, so a
 * re-run only continues where the last one stopped. A claimed listing's
 * real Provider-uploaded logo is never affected by this — see
 * register.controller.ts, which always prefers that over this.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import { discoverLogo } from '../services/logoDiscovery.js';

const CONCURRENCY = 12;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const recheckIdx = args.indexOf('--recheck-days');
  return {
    dryRun: args.includes('--dry-run'),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined,
    recheckDays: recheckIdx >= 0 ? Number(args[recheckIdx + 1]) || undefined : undefined,
  };
}

async function main() {
  const { dryRun, limit, recheckDays } = parseArgs();
  await connectDB();

  const filter: Record<string, unknown> = { website: { $exists: true, $ne: null } };
  if (recheckDays) {
    const cutoff = new Date(Date.now() - recheckDays * 24 * 60 * 60 * 1000);
    filter.$or = [{ logoCheckedAt: { $exists: false } }, { logoCheckedAt: { $lt: cutoff } }];
  } else {
    filter.logoCheckedAt = { $exists: false };
  }

  const total = await RegisterListing.countDocuments(filter);
  console.log(`[fetch-logos] ${total} listing(s) with a website ${recheckDays ? `not checked in the last ${recheckDays} days` : 'never checked'}.`);
  if (dryRun) { console.log('[fetch-logos] --dry-run: not writing anything.'); process.exit(0); }

  const docs = await RegisterListing.find(filter).select('_id website').limit(limit ?? total).lean();
  let found = 0;
  let checked = 0;

  // Bounded concurrency: thousands of DIFFERENT external hosts, so this is
  // nothing like hammering one server — a small worker pool just keeps
  // overall wall-clock time reasonable without opening unlimited sockets.
  let next = 0;
  async function worker() {
    while (next < docs.length) {
      const doc = docs[next++];
      const logoUrl = await discoverLogo(doc.website as string);
      await RegisterListing.updateOne({ _id: doc._id }, { $set: { logoCheckedAt: new Date(), ...(logoUrl ? { logoUrl } : {}) } });
      checked++;
      if (logoUrl) found++;
      if (checked % 100 === 0) console.log(`[fetch-logos] ${checked}/${docs.length} checked, ${found} found so far...`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  console.log(`\n[fetch-logos] Done. ${checked} checked, ${found} logo(s) found (${docs.length - found} had none usable).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[fetch-logos] Fatal error:', err);
  process.exit(1);
});
