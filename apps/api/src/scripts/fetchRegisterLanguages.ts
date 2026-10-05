/**
 * Reads each register listing's OWN website for languages the business says it supports ("we speak Arabic",
 * "Vietnamese speaking support workers") and stores them on the listing, so the /language pages can show
 * public-register providers that mention that language. Nothing is guessed, and nothing is taken from any
 * site except the business's own — see services/languageDiscovery.ts for exactly what counts.
 *
 * Usage:
 *   npx tsx src/scripts/fetchRegisterLanguages.ts --sample 40     # try 40 listings and PRINT what it finds, write nothing
 *   npx tsx src/scripts/fetchRegisterLanguages.ts --dry-run       # just count how many listings would be checked
 *   npx tsx src/scripts/fetchRegisterLanguages.ts                 # check every listing that has a website and was never checked
 *   npx tsx src/scripts/fetchRegisterLanguages.ts --limit 500     # check at most 500
 *   npx tsx src/scripts/fetchRegisterLanguages.ts --recheck-days 180   # also re-check listings last checked over N days ago
 *
 * Safe to re-run and to interrupt: a listing already checked is skipped, so a re-run continues where the last
 * one stopped. Run --sample first and read the output before the full run.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import { discoverLanguages } from '../services/languageDiscovery.js';

const CONCURRENCY = 12;

function parseArgs() {
  const args = process.argv.slice(2);
  const num = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? Number(args[i + 1]) || undefined : undefined;
  };
  return { dryRun: args.includes('--dry-run'), sample: num('--sample'), limit: num('--limit'), recheckDays: num('--recheck-days') };
}

async function main() {
  const { dryRun, sample, limit, recheckDays } = parseArgs();
  await connectDB();

  const staleCutoff = recheckDays ? new Date(Date.now() - recheckDays * 24 * 60 * 60 * 1000) : null;
  const filter = {
    website: { $exists: true, $ne: null },
    ...(staleCutoff
      ? { $or: [{ languagesCheckedAt: { $exists: false } }, { languagesCheckedAt: { $lt: staleCutoff } }] }
      : { languagesCheckedAt: { $exists: false } }),
  };

  const total = await RegisterListing.countDocuments(filter);
  console.log(`[fetch-languages] ${total} listing(s) with a website not yet checked for languages.`);
  if (dryRun) { console.log('[fetch-languages] --dry-run: not checking anything.'); process.exit(0); }

  const take = sample ?? limit ?? total;
  // A sample takes listings spread across the collection rather than the first N alphabetically.
  const docs = sample
    ? await RegisterListing.aggregate([{ $match: filter }, { $sample: { size: take } }, { $project: { website: 1, name: 1 } }])
    : await RegisterListing.find(filter).select('_id website name').limit(take).lean();

  let checked = 0;
  let withLanguages = 0;
  const perLanguage = new Map<string, number>();

  let next = 0;
  async function worker() {
    while (next < docs.length) {
      const doc = docs[next++];
      const languages = await discoverLanguages(doc.website as string);

      if (!sample) {
        await RegisterListing.updateOne({ _id: doc._id }, { $set: { languagesCheckedAt: new Date(), languages } });
      } else if (languages.length > 0) {
        console.log(`  ${String(doc.name).slice(0, 48).padEnd(48)} ${doc.website}\n    -> ${languages.join(', ')}`);
      }

      checked++;
      if (languages.length > 0) {
        withLanguages++;
        languages.forEach((l) => perLanguage.set(l, (perLanguage.get(l) ?? 0) + 1));
      }
      if (!sample && checked % 100 === 0) {
        console.log(`[fetch-languages] ${checked}/${docs.length} checked — ${withLanguages} listing(s) state at least one language so far...`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  const top = [...perLanguage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([l, n]) => `${l} ${n}`).join(', ');
  console.log(`\n[fetch-languages] ${sample ? 'Sample done (nothing written)' : 'Done'}. ${checked} checked — ${withLanguages} state at least one language.${top ? ` Most common: ${top}.` : ''}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[fetch-languages] Fatal error:', err);
  process.exit(1);
});
