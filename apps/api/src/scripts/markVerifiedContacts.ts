/**
 * Marks a register listing's email as verified when its domain is the same as the listing's own website (or a subdomain of it),
 * e.g. info@acmecare.com.au on https://www.acmecare.com.au. That is the one independent signal available: the business published
 * that address on its own site.
 *
 * Why this script exists: the merge script (mergeNdisLeadsContact.ts) sets this flag for emails it takes from the CSV, but the
 * fetch scripts (fetch:register-emails / fetch:register-contact-info) store emails they find on the business's own website
 * without setting it, so thousands of emails found that way were never counted. Addresses on someone else's domain (gmail.com,
 * a different company) are NOT marked, and nothing is ever un-marked.
 *
 * What the flag does: it is the gate for "who may be told about a new enquiry" (leadFollowUp.service.ts). It does not publish
 * anything: the public API never returns phone or email.
 *
 * Usage:
 *   npm run mark:verified-contacts -w apps/api -- --dry-run     # count only
 *   npm run mark:verified-contacts -w apps/api                  # write
 */
import 'dotenv/config';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';

const hostOf = (url: string): string | null => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
};
const emailDomain = (email: string): string => email.split('@')[1]?.toLowerCase() ?? '';
const sameSite = (email: string, website: string): boolean => {
  const site = hostOf(website);
  const domain = emailDomain(email);
  return !!site && !!domain && (domain === site || domain.endsWith(`.${site}`));
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  const cursor = RegisterListing.find({
    contactVerified: { $ne: true },
    email: { $exists: true, $nin: [null, ''] },
    website: { $exists: true, $nin: [null, ''] },
  }).select('_id email website').lean().cursor();

  let looked = 0;
  const toMark: unknown[] = [];
  for await (const doc of cursor) {
    looked++;
    if (sameSite(doc.email as string, doc.website as string)) toMark.push(doc._id);
  }
  const alreadyVerified = await RegisterListing.countDocuments({ contactVerified: true });
  console.log(`[verified-contacts] ${looked} listing(s) have an email and a website but are not marked verified.`);
  console.log(`[verified-contacts] ${toMark.length} of them use an email on their own website's domain; ${alreadyVerified} are already verified.`);
  if (dryRun) { console.log('[verified-contacts] --dry-run: nothing written.'); process.exit(0); }

  let written = 0;
  for (let i = 0; i < toMark.length; i += 1000) {
    const res = await RegisterListing.updateMany({ _id: { $in: toMark.slice(i, i + 1000) } }, { $set: { contactVerified: true } });
    written += res.modifiedCount ?? 0;
  }
  console.log(`[verified-contacts] Done. ${written} listing(s) marked verified (${alreadyVerified + written} in total).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[verified-contacts] Fatal error:', err);
  process.exit(1);
});
