/**
 * Mirrors every RegisterListing into wp-admin as its own 'register_listing'
 * post (see services/registerWordpressSync.service.ts) — separate from the
 * 'provider' CPT, so imported/unclaimed register facts never get mixed
 * into wp-admin's list of real, matching-eligible providers.
 *
 * Usage:
 *   npx tsx src/scripts/syncRegisterListingsToWordPress.ts --dry-run   # report only
 *   npx tsx src/scripts/syncRegisterListingsToWordPress.ts             # sync everything not yet synced
 *   npx tsx src/scripts/syncRegisterListingsToWordPress.ts --limit 500 # sync at most 500
 *   npx tsx src/scripts/syncRegisterListingsToWordPress.ts --resync    # also re-push listings already synced (e.g. after a claim/logo update)
 *
 * Safe to re-run and to interrupt: without --resync, only listings with no
 * wpPostId yet are picked up, so a re-run only continues where the last
 * one stopped. Requires WORDPRESS_URL/WORDPRESS_APP_USER/
 * WORDPRESS_APP_PASSWORD to be set (same as the 'provider' sync) — with
 * none set, this reports 0 and exits without writing anything.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import { syncRegisterListingToWordPress, isConfigured } from '../services/registerWordpressSync.service.js';

const CONCURRENCY = 6;

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  return {
    dryRun: args.includes('--dry-run'),
    resync: args.includes('--resync'),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined,
  };
}

async function main() {
  const { dryRun, resync, limit } = parseArgs();
  await connectDB();

  if (!isConfigured()) {
    console.log('[sync-register-wp] WordPress is not configured (WORDPRESS_URL/WORDPRESS_APP_USER/WORDPRESS_APP_PASSWORD) — nothing to do.');
    process.exit(0);
  }

  const filter: Record<string, unknown> = resync ? {} : { wpPostId: { $exists: false } };
  const total = await RegisterListing.countDocuments(filter);
  console.log(`[sync-register-wp] ${total} listing(s) ${resync ? 'to (re)sync' : 'not yet mirrored to WordPress'}.`);
  if (dryRun) { console.log('[sync-register-wp] --dry-run: not writing anything.'); process.exit(0); }

  const docs = await RegisterListing.find(filter).limit(limit ?? total);
  let done = 0;

  // Bounded concurrency against our OWN WordPress install (unlike
  // fetchRegisterLogos.ts, which hits thousands of different external
  // hosts) — kept modest so a backfill of tens of thousands of listings
  // doesn't hammer one server with a huge burst of concurrent writes.
  let next = 0;
  async function worker() {
    while (next < docs.length) {
      const doc = docs[next++];
      await syncRegisterListingToWordPress(doc);
      done++;
      if (done % 200 === 0) console.log(`[sync-register-wp] ${done}/${docs.length} synced...`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  console.log(`\n[sync-register-wp] Done. ${done} listing(s) synced.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-register-wp] Fatal error:', err);
  process.exit(1);
});
