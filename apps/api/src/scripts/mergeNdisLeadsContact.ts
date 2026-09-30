/**
 * Cross-verified contact enrichment for EXISTING register listings, from a
 * third-party directory export (columns like list-providers-title,
 * no-ellipse, no-icon — a Webflow CMS collection, i.e. this was scraped
 * from a rendered directory page, not the official NDIS Commission
 * register directly). See the doc comment on RegisterListing.ts's
 * contactVerified field for what "verified" means and why it gates public
 * display.
 *
 * Deliberately narrow, on purpose:
 *  - Never creates a new RegisterListing. Only enriches a listing that
 *    already exists from the official register import — this file's own
 *    business names are unreliable (see below) and its status/services
 *    fields aren't touched.
 *  - Matches by suburb + state (from the "info" column) and a
 *    truncation-tolerant name match — the source's list view hard-cuts
 *    titles at 40 characters mid-word ("Myintegra Plan Management And
 *    Support Co", missing "...Company"), so an exact-string match would
 *    silently miss thousands of real matches.
 *  - contactVerified is set true only when the row's own email domain
 *    matches the row's own website domain — the one independent signal
 *    available in this file. Unverified phone/email are still stored
 *    (useful for admin outreach) but the public API never returns them.
 *  - A claimed listing is never touched — it belongs to a real business
 *    now, same rule as importRegisterListings.ts.
 *
 * Usage:
 *   npx tsx src/scripts/mergeNdisLeadsContact.ts path/to/file.csv --dry-run
 *   npx tsx src/scripts/mergeNdisLeadsContact.ts path/to/file.csv
 *   npx tsx src/scripts/mergeNdisLeadsContact.ts path/to/file.csv --limit 2000
 */
import 'dotenv/config';
import fs from 'fs';
import readline from 'readline';
import { normaliseName, normalisePhone, normaliseWebsite, STATE_CODES, type StateCode } from '../services/registerNormalise.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const limitIdx = args.indexOf('--limit');
  return { file, dryRun: args.includes('--dry-run'), limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined };
}

// --- minimal RFC4180 CSV line reader (handles quoted fields with embedded
// commas/newlines/escaped quotes) — no dependency needed for a one-off script. ---
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const slugify = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normaliseForMatch = (s: string) => s.toLowerCase().replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const wordsOf = (s: string) => normaliseForMatch(s).split(' ').filter(Boolean);
/** true when every word of `shorter` matches `longer` at the same leading positions — a real name match tolerant of the CSV's mid-word truncation and of a DB name carrying an extra " - Suburb"/"- Australia Wide" suffix, without the false positives a raw character-prefix check invites on short strings. */
function isWordPrefixMatch(a: string[], b: string[]): boolean {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < 2 || shorter.length > longer.length) return false;
  return shorter.every((w, i) => w === longer[i]);
}

interface CsvRow {
  title: string;
  suburb: string;
  suburbSlug: string;
  state: StateCode;
  phone?: string;
  email?: string;
  website?: string;
  abn?: string;
}

function parseInfoLocation(info: string): { suburb: string; suburbSlug: string; state: StateCode } | null {
  // "Diamond Valley, QLD, 4553" — suburb, state, postcode.
  const parts = info.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const state = parts[1].toUpperCase();
  if (!STATE_CODES.includes(state as StateCode)) return null;
  const suburb = parts[0];
  if (!suburb) return null;
  return { suburb, suburbSlug: slugify(suburb), state: state as StateCode };
}

function domainOf(url: string | undefined): string | null {
  if (!url) return null;
  const m = /^(?:https?:\/\/)?(?:www\.)?([^/]+)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

function domainOfEmail(email: string | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  return email.slice(at + 1).trim().toLowerCase().replace(/^www\./, '');
}

async function main() {
  const { file, dryRun, limit } = parseArgs();
  if (!file) {
    console.error('Usage: npx tsx src/scripts/mergeNdisLeadsContact.ts <file.csv> [--dry-run] [--limit N]');
    process.exit(1);
  }

  console.log(`[merge-contact] Reading ${file}…`);
  const text = fs.readFileSync(file, 'utf8');
  const table = parseCsv(text);
  const header = table[0];
  const idx = (name: string) => header.indexOf(name);
  const col = { title: idx('list-providers-title'), info: idx('info'), phone: idx('info (2)'), email: idx('info (3)'), website: idx('info href (3)'), abn: idx('info (5)') };
  if (Object.values(col).some((i) => i < 0)) {
    console.error('[merge-contact] Unexpected column layout — expected list-providers-title, info, info (2), info (3), info href (3), info (5).');
    console.error('[merge-contact] Found columns:', header);
    process.exit(1);
  }

  const rows: CsvRow[] = [];
  const stats = { total: 0, badLocation: 0, kept: 0 };
  for (let i = 1; i < table.length; i++) {
    if (limit && stats.total >= limit) break;
    const r = table[i];
    if (!r || r.length < 2) continue;
    stats.total++;
    const title = normaliseName(r[col.title]);
    const loc = parseInfoLocation(r[col.info] ?? '');
    if (!title || !loc) { stats.badLocation++; continue; }
    const abnRaw = (r[col.abn] ?? '').replace(/^ABN:?\s*/i, '').replace(/\D/g, '');
    rows.push({
      title, ...loc,
      phone: normalisePhone(r[col.phone]),
      email: (() => { const e = (r[col.email] ?? '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined; })(),
      website: normaliseWebsite(r[col.website]),
      abn: abnRaw.length === 11 ? abnRaw : undefined,
    });
    stats.kept++;
  }
  console.log(`[merge-contact] ${stats.total} data rows, ${stats.badLocation} skipped (couldn't parse suburb/state), ${stats.kept} kept.`);

  const { connectDB } = await import('../config/db.js');
  const { default: RegisterListing } = await import('../models/RegisterListing.js');
  await connectDB();

  // Matched by NAME + STATE, not suburb: the official register's own
  // "areas" for a listing come from ABS-style statistical regions ("Act
  // Remainder - Kowen") rather than the common suburb names this CSV
  // uses ("Ocean Grove"), so requiring an exact suburb match would miss
  // most real matches even for a provider genuinely operating there.
  // State is reliable on both sides, so the whole collection (fits
  // easily in memory) is grouped by state once up front.
  console.log('[merge-contact] Loading existing register listings…');
  const all = await RegisterListing.find({}).select('_id name states claimStatus').lean();
  const byState = new Map<string, typeof all>();
  for (const d of all) for (const s of (d.states as string[])) (byState.get(s) ?? byState.set(s, []).get(s)!).push(d);
  console.log(`[merge-contact] ${all.length} existing listings loaded.`);

  type Merge = { phone?: string; email?: string; abn?: string; verified: boolean };
  const updates = new Map<string, Merge>(); // by listing _id string
  let matched = 0, unmatched = 0, ambiguous = 0, skippedClaimed = 0;
  const unmatchedSample: string[] = [];

  let done = 0;
  for (const r of rows) {
    done++;
    if (done % 5000 === 0) process.stdout.write(`\r[merge-contact] matched ${done}/${rows.length} rows...`);

    const candidates = byState.get(r.state) ?? [];
    const targetWords = wordsOf(r.title);
    if (targetWords.length === 0) { unmatched++; continue; }
    const hits = candidates.filter((c) => {
      const cnWords = wordsOf(c.name as string);
      return cnWords.join(' ') === targetWords.join(' ') || isWordPrefixMatch(targetWords, cnWords);
    });
    if (hits.length === 0) { unmatched++; if (unmatchedSample.length < 15) unmatchedSample.push(`${r.title} (${r.suburb}, ${r.state})`); continue; }
    // More than one plausible match in this state: only safe to proceed
    // if they're all actually the same underlying listing (can happen
    // when a name appears twice in the in-memory candidate list because
    // it's registered in several states) — otherwise skip rather than
    // guess wrong.
    const uniqueIds = new Set(hits.map((h) => String((h as any)._id)));
    if (uniqueIds.size > 1) { ambiguous++; continue; }
    const hit = hits[0];
    if ((hit as any).claimStatus === 'claimed') { skippedClaimed++; continue; }
    matched++;

    const emailDomain = domainOfEmail(r.email);
    const siteDomain = domainOf(r.website);
    const verified = !!(emailDomain && siteDomain && emailDomain === siteDomain);

    const id = String((hit as any)._id);
    const existing = updates.get(id) ?? { verified: false };
    updates.set(id, {
      phone: existing.phone ?? r.phone,
      email: existing.email ?? r.email,
      abn: existing.abn ?? r.abn,
      verified: existing.verified || verified,
    });
  }
  console.log(`\n[merge-contact] ${matched} row(s) matched an existing listing, ${unmatched} matched none, ${ambiguous} matched more than one different listing (skipped), ${skippedClaimed} matched a claimed listing (skipped).`);
  if (unmatchedSample.length) console.log('[merge-contact] sample unmatched:', unmatchedSample);

  const withPhone = [...updates.values()].filter((u) => u.phone).length;
  const withEmail = [...updates.values()].filter((u) => u.email).length;
  const withAbn = [...updates.values()].filter((u) => u.abn).length;
  const verifiedCount = [...updates.values()].filter((u) => u.verified).length;
  console.log(`[merge-contact] ${updates.size} listing(s) to update: ${withPhone} with a phone, ${withEmail} with an email, ${withAbn} with an ABN, ${verifiedCount} cross-verified (email domain matches website domain — these are the only ones whose phone/email become publicly visible).`);

  if (dryRun) { console.log('\n[merge-contact] --dry-run: nothing written.'); process.exit(0); }

  const ops = [...updates.entries()].map(([id, u]) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { ...(u.phone ? { phone: u.phone } : {}), ...(u.email ? { email: u.email } : {}), ...(u.abn ? { abn: u.abn } : {}), contactVerified: u.verified } },
    },
  }));
  let written = 0;
  for (let i = 0; i < ops.length; i += 500) {
    const res = await RegisterListing.bulkWrite(ops.slice(i, i + 500) as never, { ordered: false });
    written += res.modifiedCount ?? 0;
    process.stdout.write(`\r[merge-contact] writing ${Math.min(i + 500, ops.length)}/${ops.length}`);
  }
  console.log(`\n[merge-contact] Done. ${written} listing(s) updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error('[merge-contact] Fatal error:', err); process.exit(1); });
