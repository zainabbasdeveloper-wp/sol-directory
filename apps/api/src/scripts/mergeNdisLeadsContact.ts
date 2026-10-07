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
 *    fields aren't touched. The one exception is the single support
 *    "Interpreting and translation": a matched listing whose row lists it
 *    gets that label and the "Interpreting & translation" category added
 *    (never removed), because no other source tells the Language pages which
 *    providers offer interpreting.
 *  - Matches a row to an existing listing by trying, in order: (1) suburb
 *    + state (from the "info" column, tolerant of a street-address prefix
 *    or extra reordered parts — see parseInfoLocation) with a
 *    truncation-tolerant name match (the source's list view hard-cuts
 *    titles at 40 characters mid-word, so an exact-string match would
 *    silently miss thousands of real matches); (2) if that finds nothing
 *    (or the row has no usable location at all — ~30% of rows have a
 *    blank/garbled "info" field upstream), the same name match against
 *    every existing listing that shares the row's own website domain,
 *    regardless of state; (3) if even that finds nothing but the row's
 *    website domain belongs to EXACTLY ONE existing listing in the whole
 *    collection, that's still a safe match on its own — a domain is a
 *    much harder identifier to coincide on than a truncated name. Any
 *    step that matches more than one DIFFERENT listing is skipped rather
 *    than guessed at, same as before.
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
  /** Absent when the "info" column was blank/unparseable upstream — the row can still be matched by website domain (see discoverMatch). */
  loc?: { suburb: string; suburbSlug: string; state: StateCode };
  phone?: string;
  email?: string;
  website?: string;
  abn?: string;
  /** The row lists the "Interpreting and translation" support — the one service tag this script carries over (see the header). */
  interpreting?: boolean;
}

function parseInfoLocation(info: string): { suburb: string; suburbSlug: string; state: StateCode } | null {
  // Usually "Diamond Valley, QLD, 4553" — suburb, state, postcode — but a
  // meaningful minority carry a street-address prefix ("30 North Street,
  // Ardeer, VIC, 3022") or an extra part ("Loganholme, Queensland,
  // Australia, QLD, 4129", a duplicated/garbled part), which pushes the
  // state code to a different position. Scanning for the first part that's
  // actually a state code, rather than assuming it's parts[1], recovers
  // all of these: the suburb is whatever's immediately before it.
  const parts = info.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const stateIdx = parts.findIndex((p) => STATE_CODES.includes(p.toUpperCase() as StateCode));
  if (stateIdx < 1) return null; // no state code found, or it's parts[0] (no suburb before it)
  const suburb = parts[stateIdx - 1];
  if (!suburb) return null;
  return { suburb, suburbSlug: slugify(suburb), state: parts[stateIdx].toUpperCase() as StateCode };
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
  // Optional: older exports may not have the services column, in which case no interpreting tag is carried over.
  const servicesCol = idx('no-ellipse');
  if (Object.values(col).some((i) => i < 0)) {
    console.error('[merge-contact] Unexpected column layout — expected list-providers-title, info, info (2), info (3), info href (3), info (5).');
    console.error('[merge-contact] Found columns:', header);
    process.exit(1);
  }

  const rows: CsvRow[] = [];
  const stats = { total: 0, unusable: 0, kept: 0 };
  for (let i = 1; i < table.length; i++) {
    if (limit && stats.total >= limit) break;
    const r = table[i];
    if (!r || r.length < 2) continue;
    stats.total++;
    const title = normaliseName(r[col.title]);
    const loc = parseInfoLocation(r[col.info] ?? '') ?? undefined;
    const website = normaliseWebsite(r[col.website]);
    // Keep the row as long as there's SOMETHING to match it by — either a
    // usable location (for the state+name pass) or a website (for the
    // domain-based fallback passes below). Only truly give up when
    // neither exists.
    if (!title || (!loc && !website)) { stats.unusable++; continue; }
    const abnRaw = (r[col.abn] ?? '').replace(/^ABN:?\s*/i, '').replace(/\D/g, '');
    rows.push({
      title, loc,
      phone: normalisePhone(r[col.phone]),
      email: (() => { const e = (r[col.email] ?? '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : undefined; })(),
      website,
      abn: abnRaw.length === 11 ? abnRaw : undefined,
      interpreting: servicesCol >= 0 && /\binterpreting and translation\b/i.test(r[servicesCol] ?? ''),
    });
    stats.kept++;
  }
  console.log(`[merge-contact] ${stats.total} data rows, ${stats.unusable} unusable (no title, or no location AND no website), ${stats.kept} kept.`);

  const { connectDB } = await import('../config/db.js');
  const { default: RegisterListing } = await import('../models/RegisterListing.js');
  await connectDB();

  // Three ways to find the listing a row describes, tried in order of
  // confidence:
  //  1. name + STATE — the official register's own "areas" for a listing
  //     come from ABS-style statistical regions ("Act Remainder - Kowen")
  //     rather than the common suburb names this CSV uses ("Ocean
  //     Grove"), so requiring an exact suburb match would miss most real
  //     matches even for a provider genuinely operating there. State is
  //     reliable on both sides.
  //  2. name + the row's own website domain, against every listing that
  //     shares that domain regardless of state — covers a row whose
  //     location didn't parse at all (~30% of this file) or whose state
  //     pass found nothing.
  //  3. website domain alone, when it belongs to EXACTLY ONE listing in
  //     the whole collection — a domain coinciding by chance is far
  //     less likely than a truncated/reworded name failing to match, so
  //     this is still a safe match on its own.
  // Every candidate list fits easily in memory, so both indexes are
  // built once up front, and each listing's word-tokenised name is
  // cached once rather than recomputed on every comparison.
  console.log('[merge-contact] Loading existing register listings…');
  const all = await RegisterListing.find({}).select('_id name states website claimStatus abn').lean();
  const byState = new Map<string, typeof all>();
  const byDomain = new Map<string, typeof all>();
  const wordsCache = new Map<string, string[]>();
  for (const d of all) {
    wordsCache.set(String(d._id), wordsOf(d.name as string));
    for (const s of (d.states as string[])) (byState.get(s) ?? byState.set(s, []).get(s)!).push(d);
    const domain = domainOf(d.website as string | undefined);
    if (domain) (byDomain.get(domain) ?? byDomain.set(domain, []).get(domain)!).push(d);
  }
  console.log(`[merge-contact] ${all.length} existing listings loaded (${byDomain.size} distinct website domains).`);

  /** Candidates whose (cached) word-tokenised name matches targetWords exactly or as a truncation-tolerant prefix. */
  function nameMatches(candidates: typeof all, targetWords: string[]): typeof all {
    return candidates.filter((c) => {
      const cnWords = wordsCache.get(String((c as any)._id))!;
      return cnWords.join(' ') === targetWords.join(' ') || isWordPrefixMatch(targetWords, cnWords);
    });
  }
  /** Null = no safe match; returns the single hit otherwise. Ambiguous (>1 different listing) and claimed are reported via the mutable counters closed over below. */
  function resolveUnique(hits: typeof all): (typeof all)[number] | null {
    if (hits.length === 0) return null;
    const uniqueIds = new Set(hits.map((h) => String((h as any)._id)));
    if (uniqueIds.size > 1) { ambiguous++; return null; }
    return hits[0];
  }

  type Merge = { phone?: string; email?: string; abn?: string; verified: boolean; interpreting: boolean; contactRow: boolean };
  const updates = new Map<string, Merge>(); // by listing _id string
  // ABN -> the listing(s) it belongs to, from listings already carrying that ABN and from rows matched in this run.
  // A business has several rows (one per outlet) and only some match by name/state/domain; an ABN shared with an
  // already-matched row is how the others find the same listing. Used for the interpreting tag only.
  const abnToIds = new Map<string, Set<string>>();
  const rememberAbn = (abn: string | undefined, id: string) => {
    if (!abn) return;
    (abnToIds.get(abn) ?? abnToIds.set(abn, new Set()).get(abn)!).add(id);
  };
  for (const d of all) rememberAbn((d as any).abn as string | undefined, String((d as any)._id));
  const pendingInterpretingAbns: string[] = [];
  let matched = 0, unmatched = 0, ambiguous = 0, skippedClaimed = 0;
  let byStateCount = 0, byDomainCount = 0, byPureDomainCount = 0;
  const unmatchedSample: string[] = [];

  let done = 0;
  for (const r of rows) {
    done++;
    if (done % 5000 === 0) process.stdout.write(`\r[merge-contact] matched ${done}/${rows.length} rows...`);

    const targetWords = wordsOf(r.title);
    const siteDomain = domainOf(r.website);

    let hit: (typeof all)[number] | null = null;
    let matchType: 'state' | 'domain' | 'pure-domain' | null = null;

    if (targetWords.length > 0 && r.loc) {
      hit = resolveUnique(nameMatches(byState.get(r.loc.state) ?? [], targetWords));
      if (hit) matchType = 'state';
    }
    if (!hit && targetWords.length > 0 && siteDomain) {
      hit = resolveUnique(nameMatches(byDomain.get(siteDomain) ?? [], targetWords));
      if (hit) matchType = 'domain';
    }
    if (!hit && siteDomain) {
      const domainCandidates = byDomain.get(siteDomain) ?? [];
      const uniqueIds = new Set(domainCandidates.map((h) => String((h as any)._id)));
      if (uniqueIds.size === 1) { hit = domainCandidates[0]; matchType = 'pure-domain'; }
    }

    if (!hit) {
      unmatched++;
      if (r.interpreting && r.abn) pendingInterpretingAbns.push(r.abn);
      if (unmatchedSample.length < 15) unmatchedSample.push(`${r.title} (${r.loc ? `${r.loc.suburb}, ${r.loc.state}` : 'no location'})`);
      continue;
    }
    if ((hit as any).claimStatus === 'claimed') { skippedClaimed++; continue; }
    matched++;
    if (matchType === 'state') byStateCount++;
    else if (matchType === 'domain') byDomainCount++;
    else byPureDomainCount++;

    const emailDomain = domainOfEmail(r.email);
    const verified = !!(emailDomain && siteDomain && emailDomain === siteDomain);

    const id = String((hit as any)._id);
    rememberAbn(r.abn, id);
    const existing = updates.get(id) ?? { verified: false, interpreting: false, contactRow: true };
    updates.set(id, {
      phone: existing.phone ?? r.phone,
      email: existing.email ?? r.email,
      abn: existing.abn ?? r.abn,
      verified: existing.verified || verified,
      interpreting: existing.interpreting || !!r.interpreting,
      contactRow: true,
    });
  }

  // Interpreting rows that matched nothing by name/state/domain: tag the listing their ABN points to, but only when
  // that ABN points to exactly one listing. Nothing else about these rows (phone, email) is applied.
  let interpretingByAbn = 0;
  for (const abn of new Set(pendingInterpretingAbns)) {
    const ids = abnToIds.get(abn);
    if (!ids || ids.size !== 1) continue;
    const id = [...ids][0];
    const hitListing = all.find((d) => String((d as any)._id) === id);
    if (!hitListing || (hitListing as any).claimStatus === 'claimed') continue;
    const existing = updates.get(id);
    if (existing?.interpreting) continue;
    updates.set(id, existing ? { ...existing, interpreting: true } : { verified: false, interpreting: true, contactRow: false });
    interpretingByAbn++;
  }
  if (interpretingByAbn) console.log(`\n[merge-contact] ${interpretingByAbn} more listing(s) found for interpreting through a shared ABN.`);
  console.log(`\n[merge-contact] ${matched} row(s) matched an existing listing (${byStateCount} by name+state, ${byDomainCount} by name+domain, ${byPureDomainCount} by domain alone), ${unmatched} matched none, ${ambiguous} matched more than one different listing (skipped), ${skippedClaimed} matched a claimed listing (skipped).`);
  if (unmatchedSample.length) console.log('[merge-contact] sample unmatched:', unmatchedSample);

  const withPhone = [...updates.values()].filter((u) => u.phone).length;
  const withEmail = [...updates.values()].filter((u) => u.email).length;
  const withAbn = [...updates.values()].filter((u) => u.abn).length;
  const interpretingCount = [...updates.values()].filter((u) => u.interpreting).length;
  console.log(`[merge-contact] ${interpretingCount} matched listing(s) are listed for "Interpreting and translation" and will be tagged with that support.`);
  const verifiedCount = [...updates.values()].filter((u) => u.verified).length;
  console.log(`[merge-contact] ${updates.size} listing(s) to update: ${withPhone} with a phone, ${withEmail} with an email, ${withAbn} with an ABN, ${verifiedCount} cross-verified (email domain matches website domain — these are the only ones whose phone/email become publicly visible).`);

  if (dryRun) { console.log('\n[merge-contact] --dry-run: nothing written.'); process.exit(0); }

  const ops = [...updates.entries()].map(([id, u]) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        // A listing found only through the interpreting ABN pass has no contact data to apply, so its contactVerified is left alone.
        ...(u.contactRow ? { $set: { ...(u.phone ? { phone: u.phone } : {}), ...(u.email ? { email: u.email } : {}), ...(u.abn ? { abn: u.abn } : {}), contactVerified: u.verified } } : {}),
        // $addToSet, so re-running never duplicates the tag and never removes anything the register import set.
        ...(u.interpreting ? { $addToSet: { services: 'Interpreting and translation', supportCategories: 'Interpreting & translation' } } : {}),
      },
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
