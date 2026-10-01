/**
 * Looks up logo, email AND phone for every register listing that has a
 * website and is missing at least one of the three — in a single pass
 * per business, reusing the SAME downloaded homepage (and, if needed,
 * the same contact-page fetch) for all three lookups instead of hitting
 * each of up to 26,505 external sites three separate times.
 *
 * Everything found still comes only from the business's OWN site — see
 * services/logoDiscovery.ts, emailDiscovery.ts, phoneDiscovery.ts. This
 * script is the recommended way to run all three together (e.g. for
 * listings that have never been checked at all); fetch:register-logos
 * and fetch:register-emails remain available for a logo-only or
 * email-only re-check pass.
 *
 * Usage:
 *   npx tsx src/scripts/fetchRegisterContactInfo.ts --dry-run            # report only
 *   npx tsx src/scripts/fetchRegisterContactInfo.ts                      # look up everything missing something
 *   npx tsx src/scripts/fetchRegisterContactInfo.ts --limit 500           # look up at most 500
 *   npx tsx src/scripts/fetchRegisterContactInfo.ts --recheck-days 180    # also re-check listings last checked over N days ago
 *
 * Safe to re-run and to interrupt: a listing already fully checked (logo,
 * email AND phone all have a checked timestamp, or phone already came
 * from the original import) is skipped, so a re-run only continues where
 * the last one stopped.
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import { fetchText, extractLogoCandidates, isRealImage } from '../services/logoDiscovery.js';
import { extractEmailFromHtml, CONTACT_PATHS } from '../services/emailDiscovery.js';
import { extractPhoneFromHtml } from '../services/phoneDiscovery.js';

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

interface Found { logoUrl: string | null; email: string | null; phone: string | null }

/** One homepage fetch, all three extractors run against it; a contact-page fetch only happens if email or phone is still missing (logos are essentially never on a contact page). */
async function discoverAll(website: string, needLogo: boolean, needEmail: boolean, needPhone: boolean): Promise<Found> {
  const result: Found = { logoUrl: null, email: null, phone: null };
  let homepage: string;
  let siteDomain: string;
  try {
    const u = new URL(website);
    homepage = u.toString();
    siteDomain = u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return result;
  }

  const homeHtml = await fetchText(homepage);

  if (needLogo) {
    const candidates = homeHtml
      ? extractLogoCandidates(homeHtml, homepage)
      : [new URL('/favicon.ico', homepage).toString()];
    for (const url of candidates) {
      if (await isRealImage(url)) { result.logoUrl = url; break; }
    }
  }
  if (needEmail && homeHtml) result.email = extractEmailFromHtml(homeHtml, siteDomain);
  if (needPhone && homeHtml) result.phone = extractPhoneFromHtml(homeHtml);

  // Only fetch a contact page if something's still missing and worth one more try — logo candidates already covered favicon fallback above.
  if ((needEmail && !result.email) || (needPhone && !result.phone)) {
    for (const path of CONTACT_PATHS) {
      const html = await fetchText(new URL(path, homepage).toString());
      if (!html) continue;
      if (needEmail && !result.email) result.email = extractEmailFromHtml(html, siteDomain);
      if (needPhone && !result.phone) result.phone = extractPhoneFromHtml(html);
      break; // only the first contact path that actually responds is worth trying
    }
  }

  return result;
}

async function main() {
  const { dryRun, limit, recheckDays } = parseArgs();
  await connectDB();

  const staleCutoff = recheckDays ? new Date(Date.now() - recheckDays * 24 * 60 * 60 * 1000) : null;
  const notCheckedOrStale = (field: string) =>
    staleCutoff ? { $or: [{ [field]: { $exists: false } }, { [field]: { $lt: staleCutoff } }] } : { [field]: { $exists: false } };

  const filter = {
    website: { $exists: true, $ne: null },
    $or: [
      notCheckedOrStale('logoCheckedAt'),
      notCheckedOrStale('emailCheckedAt'),
      { $and: [{ phone: { $exists: false } }, notCheckedOrStale('phoneCheckedAt')] },
    ],
  };

  const total = await RegisterListing.countDocuments(filter);
  console.log(`[fetch-contact-info] ${total} listing(s) with a website missing logo, email, and/or phone.`);
  if (dryRun) { console.log('[fetch-contact-info] --dry-run: not writing anything.'); process.exit(0); }

  const docs = await RegisterListing.find(filter)
    .select('_id website phone logoCheckedAt emailCheckedAt phoneCheckedAt')
    .limit(limit ?? total)
    .lean();

  // A listing can land in `docs` needing only ONE of the three (e.g. a
  // separate earlier run already checked its logo/email) — report that
  // breakdown up front so "0 found" for a field doesn't read as broken
  // when it's really just "nothing in this batch still needs it".
  const needLogoCount = docs.filter((d) => !d.logoCheckedAt || (staleCutoff ? d.logoCheckedAt < staleCutoff : false)).length;
  const needEmailCount = docs.filter((d) => !d.emailCheckedAt || (staleCutoff ? d.emailCheckedAt < staleCutoff : false)).length;
  const needPhoneCount = docs.filter((d) => !d.phone && (!d.phoneCheckedAt || (staleCutoff ? d.phoneCheckedAt < staleCutoff : false))).length;
  console.log(`[fetch-contact-info] Of these: ${needLogoCount} still need a logo lookup, ${needEmailCount} still need an email lookup, ${needPhoneCount} still need a phone lookup.`);

  let checked = 0;
  let logosFound = 0;
  let emailsFound = 0;
  let phonesFound = 0;

  let next = 0;
  async function worker() {
    while (next < docs.length) {
      const doc = docs[next++];
      const needLogo = !doc.logoCheckedAt || (staleCutoff ? doc.logoCheckedAt < staleCutoff : false);
      const needEmail = !doc.emailCheckedAt || (staleCutoff ? doc.emailCheckedAt < staleCutoff : false);
      const needPhone = !doc.phone && (!doc.phoneCheckedAt || (staleCutoff ? doc.phoneCheckedAt < staleCutoff : false));

      const found = await discoverAll(doc.website as string, needLogo, needEmail, needPhone);

      const now = new Date();
      const update: Record<string, unknown> = {};
      if (needLogo) { update.logoCheckedAt = now; if (found.logoUrl) update.logoUrl = found.logoUrl; }
      if (needEmail) { update.emailCheckedAt = now; if (found.email) update.email = found.email; }
      if (needPhone) { update.phoneCheckedAt = now; if (found.phone) update.phone = found.phone; }
      await RegisterListing.updateOne({ _id: doc._id }, { $set: update });

      checked++;
      if (found.logoUrl) logosFound++;
      if (found.email) emailsFound++;
      if (found.phone) phonesFound++;
      if (checked % 100 === 0) {
        console.log(`[fetch-contact-info] ${checked}/${docs.length} checked — ${logosFound} logo(s), ${emailsFound} email(s), ${phonesFound} phone(s) found so far...`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, docs.length) }, worker));

  console.log(`\n[fetch-contact-info] Done. ${checked} checked — ${logosFound} logo(s), ${emailsFound} email(s), ${phonesFound} phone(s) found.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[fetch-contact-info] Fatal error:', err);
  process.exit(1);
});
