/**
 * Looks up a contact email for every register listing that has a website
 * and hasn't been checked yet — from the business's OWN site only (see
 * services/emailDiscovery.ts). Never touches a competitor's site.
 *
 * Expect a MUCH lower hit rate than fetch:register-logos: a great many
 * business sites expose no plain email at all, often on purpose (a
 * contact form instead, specifically to avoid being scraped). A modest
 * hit rate here is the expected, honest result — not a bug.
 *
 * Usage:
 *   npx tsx src/scripts/fetchRegisterEmails.ts --dry-run           # report only
 *   npx tsx src/scripts/fetchRegisterEmails.ts                     # look up everything not checked yet
 *   npx tsx src/scripts/fetchRegisterEmails.ts --limit 500          # look up at most 500
 *   npx tsx src/scripts/fetchRegisterEmails.ts --recheck-days 180   # also re-check listings last checked over N days ago
 *
 * Safe to re-run and to interrupt: only listings with website set and no
 * emailCheckedAt (or a stale one, with --recheck-days) are picked up.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import { discoverEmail } from '../services/emailDiscovery.js';

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
    filter.$or = [{ emailCheckedAt: { $exists: false } }, { emailCheckedAt: { $lt: cutoff } }];
  } else {
    filter.emailCheckedAt = { $exists: false };
  }

  const total = await RegisterListing.countDocuments(filter);
  console.log(`[fetch-emails] ${total} listing(s) with a website ${recheckDays ? `not checked in the last ${recheckDays} days` : 'never checked'}.`);
  if (dryRun) { console.log('[fetch-emails] --dry-run: not writing anything.'); process.exit(0); }

  const docs = await RegisterListing.find(filter).select('_id website').limit(limit ?? total).lean();
  let found = 0;
  let checked = 0;

  let next = 0;
  async function worker() {
    while (next < docs.length) {
      const doc = docs[next++];
      const email = await discoverEmail(doc.website as string);
      await RegisterListing.updateOne({ _id: doc._id }, { $set: { emailCheckedAt: new Date(), ...(email ? { email } : {}) } });
      checked++;
      if (email) found++;
      if (checked % 100 === 0) console.log(`[fetch-emails] ${checked}/${docs.length} checked, ${found} found so far...`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  console.log(`\n[fetch-emails] Done. ${checked} checked, ${found} email(s) found (${docs.length - found} had none usable).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[fetch-emails] Fatal error:', err);
  process.exit(1);
});
