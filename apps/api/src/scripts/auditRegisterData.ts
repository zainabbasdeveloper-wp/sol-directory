/**
 * Read-only report on what is actually in the database: how many register listings there are and how many have a website,
 * phone, email, ABN, logo, languages and so on, plus (with --csv) a cross-check of your lead CSV against what was imported.
 * It changes nothing.
 *
 * Usage:
 *   npm run audit:register -w apps/api
 *   npm run audit:register -w apps/api -- --csv /path/to/merged_deduped_removed_duplicates.csv
 */
import 'dotenv/config';
import fs from 'node:fs';
import { connectDB } from '../config/db.js';
import RegisterListing from '../models/RegisterListing.js';
import Provider from '../models/Provider.js';
import SuburbGeo from '../models/SuburbGeo.js';
import Lead from '../models/Lead.js';
import LeadMatch from '../models/LeadMatch.js';
import RegisterLeadNotice from '../models/RegisterLeadNotice.js';
import { normalisePhone } from '../services/registerNormalise.js';

const pct = (n: number, total: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : 'n/a');
const line = (label: string, n: number, total: number) => console.log(`  ${label.padEnd(44)} ${String(n).padStart(7)}   ${pct(n, total)}`);

// Minimal RFC 4180 reader (quoted fields, embedded commas/newlines) so this script needs no extra package.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf('--csv');
  const csvPath = csvIdx >= 0 ? args[csvIdx + 1] : undefined;
  const exportIdx = args.indexOf('--export-unmatched');
  const exportPath = exportIdx >= 0 ? args[exportIdx + 1] : undefined;
  await connectDB();

  const total = await RegisterListing.countDocuments();
  console.log(`\nRegister listings: ${total}`);
  for (const type of ['ndis', 'aged_care']) console.log(`  ${type.padEnd(44)} ${String(await RegisterListing.countDocuments({ type })).padStart(7)}`);

  const has = (field: string) => RegisterListing.countDocuments({ [field]: { $exists: true, $nin: [null, ''] } });
  console.log('\nContact details on listings');
  line('with a website', await has('website'), total);
  line('with a phone', await has('phone'), total);
  line('with an email', await has('email'), total);
  line('email verified against own website', await RegisterListing.countDocuments({ contactVerified: true }), total);
  line('with an ABN', await has('abn'), total);
  line('with a logo', await has('logoUrl'), total);
  line('checked for languages', await has('languagesCheckedAt'), total);
  line('state at least one language', await RegisterListing.countDocuments({ 'languages.0': { $exists: true } }), total);
  line('tagged Interpreting & translation', await RegisterListing.countDocuments({ supportCategories: 'Interpreting & translation' }), total);

  const withWebsite = await has('website');
  console.log('\nWebsite look-ups (how far the fetch scripts got)');
  line('logo looked up', await has('logoCheckedAt'), withWebsite);
  line('email looked up', await has('emailCheckedAt'), withWebsite);
  line('phone looked up (only for those without one)', await has('phoneCheckedAt'), withWebsite);

  console.log('\nWho can be emailed about a new enquiry (needs a verified email, not claimed, not opted out)');
  const reachable = await RegisterListing.countDocuments({ claimStatus: 'unclaimed', contactVerified: true, email: { $exists: true, $ne: '' }, emailOptOut: { $ne: true } });
  line('register listings that can be notified', reachable, total);
  line('opted out', await RegisterListing.countDocuments({ emailOptOut: true }), total);
  console.log(`  ${'notices sent so far'.padEnd(44)} ${String(await RegisterLeadNotice.countDocuments({ delivered: true })).padStart(7)}`);
  console.log(`  ${'REGISTER_LEAD_EMAILS switched on'.padEnd(44)} ${String(process.env.REGISTER_LEAD_EMAILS === '1' ? 'yes' : 'no').padStart(7)}   (set REGISTER_LEAD_EMAILS=1 to turn on)`);

  console.log('\nMember providers and enquiries');
  const providers = await Provider.countDocuments();
  console.log(`  ${'providers'.padEnd(44)} ${String(providers).padStart(7)}`);
  line('imported, not yet joined (claimed = false)', await Provider.countDocuments({ claimed: false }), providers);
  line('with an intake email', await Provider.countDocuments({ intakeEmail: { $exists: true, $ne: '' } }), providers);
  const leads = await Lead.countDocuments({ status: { $ne: 'draft' } });
  console.log(`  ${'submitted enquiries'.padEnd(44)} ${String(leads).padStart(7)}`);
  line('enquiries that know the service page', await Lead.countDocuments({ status: { $ne: 'draft' }, serviceContext: { $exists: true, $ne: '' } }), leads);
  line('provider matches that were opened', await LeadMatch.countDocuments({ status: { $in: ['viewed', 'contacted'] } }), await LeadMatch.countDocuments());
  const geos = await SuburbGeo.countDocuments({ failed: { $ne: true } });
  console.log(`  ${'geocoded suburbs (for "near the enquiry")'.padEnd(44)} ${String(geos).padStart(7)}`);

  if (csvPath) {
    console.log(`\nCross-check against ${csvPath}`);
    const table = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    const header = table[0];
    const col = (name: string) => header.indexOf(name);
    const c = { title: col('list-providers-title'), phone: col('info (2)'), email: col('info (3)'), website: col('info href (3)'), abn: col('info (5)') };
    const rows = table.slice(1);
    const abns = new Set<string>(), phones = new Set<string>(), emails = new Set<string>();
    const firstRowByAbn = new Map<string, string[]>();
    for (const r of rows) {
      const abn = (r[c.abn] ?? '').replace(/\D/g, '');
      if (abn.length === 11) { abns.add(abn); if (!firstRowByAbn.has(abn)) firstRowByAbn.set(abn, r); }
      const phone = normalisePhone(r[c.phone]);
      if (phone) phones.add(phone);
      const email = (r[c.email] ?? '').trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
    }
    console.log(`  CSV rows ${rows.length}; distinct ABNs ${abns.size}, phones ${phones.size}, emails ${emails.size}`);

    const stored = async (field: 'abn' | 'phone' | 'email', set: Set<string>) => {
      const values = [...set];
      const found = new Set<string>();
      for (let i = 0; i < values.length; i += 2000) {
        const batch = values.slice(i, i + 2000);
        (await RegisterListing.distinct(field, { [field]: { $in: batch } })).forEach((v) => found.add(String(v)));
      }
      return found;
    };
    const [abnFound, phoneFound, emailFound] = await Promise.all([stored('abn', abns), stored('phone', phones), stored('email', emails)]);
    line('CSV ABNs that are on a listing', abnFound.size, abns.size);
    line('CSV phones that are on a listing', phoneFound.size, phones.size);
    line('CSV emails that are on a listing', emailFound.size, emails.size);

    if (exportPath) {
      const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const out = ['abn,name,phone,email,website'];
      for (const [abn, r] of firstRowByAbn) {
        if (abnFound.has(abn)) continue;
        out.push([abn, r[c.title] ?? '', r[c.phone] ?? '', r[c.email] ?? '', r[c.website] ?? ''].map((v) => quote(String(v).trim())).join(','));
      }
      fs.writeFileSync(exportPath, `${out.join('\n')}\n`);
      console.log(`  Wrote ${out.length - 1} business(es) that are in the CSV but on no listing to ${exportPath}`);
    }
    console.log('  (A CSV business that is not on the official register has no listing to attach to, so 100% is not expected.)');
  }

  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('[audit-register] Fatal error:', err);
  process.exit(1);
});
