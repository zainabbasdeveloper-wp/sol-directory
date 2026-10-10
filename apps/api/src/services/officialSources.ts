import { createHash } from 'node:crypto';
import { load, type CheerioAPI } from 'cheerio';
import SourceUpdate, { type SourceUpdateDoc } from '../models/SourceUpdate.js';
import CrawlState from '../models/CrawlState.js';

/**
 * Polite crawler for official NDIS sources. It records what was published and when, never article text:
 *  - obeys robots.txt, identifies itself, waits between requests and caps how many pages it opens per run;
 *  - keeps only facts (title, date, category, section headings, a content fingerprint) in SourceUpdate;
 *  - classifies each item into topics so an editor can see what is worth writing about and which of our own pages to link.
 * The NDIA licenses its site CC BY-NC and asks that it is not used for commercial traffic (ndis.gov.au copyright page), so
 * the writing is ours and the source is cited and linked, never copied.
 */

const USER_AGENT = 'SolDirectoryBot/1.0 (+https://directory.solbusinessconsultant.com.au; official-source monitor)';
const NDIS_ORIGIN = 'https://www.ndis.gov.au';
const REQUEST_GAP_MS = Math.max(500, Number(process.env.OFFICIAL_SOURCES_GAP_MS) || 1500);
const MAX_DETAIL_FETCHES = Math.max(1, Number(process.env.OFFICIAL_SOURCES_MAX_DETAILS) || 15);
const RECHECK_PER_RUN = 3;

// ---------- polite fetching ----------------------------------------------------------------------------------------

const robotsCache = new Map<string, { at: number; rules: { allow: boolean; path: string }[] }>();
const lastRequest = new Map<string, number>();

function parseRobots(text: string): { allow: boolean; path: string }[] {
  const rules: { allow: boolean; path: string }[] = [];
  let applies = false;
  let sawAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      // A new group starts after rules; consecutive User-agent lines share one group.
      if (!sawAgent) applies = false;
      sawAgent = true;
      if (value === '*' || USER_AGENT.toLowerCase().startsWith(value.toLowerCase())) applies = true;
    } else if (key === 'allow' || key === 'disallow') {
      sawAgent = false;
      if (applies && value) rules.push({ allow: key === 'allow', path: value });
    }
  }
  return rules;
}

function ruleMatches(rulePath: string, path: string): boolean {
  const anchored = rulePath.endsWith('$');
  const pattern = (anchored ? rulePath.slice(0, -1) : rulePath).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${pattern}${anchored ? '$' : ''}`).test(path);
}

async function allowedByRobots(url: URL): Promise<boolean> {
  const cached = robotsCache.get(url.origin);
  let rules = cached && Date.now() - cached.at < 6 * 3600_000 ? cached.rules : null;
  if (!rules) {
    try {
      const res = await fetch(`${url.origin}/robots.txt`, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
      rules = res.ok ? parseRobots(await res.text()) : [];
    } catch {
      rules = [];
    }
    robotsCache.set(url.origin, { at: Date.now(), rules });
  }
  // Longest matching rule wins; Allow wins a tie (the standard interpretation).
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules) {
    if (!ruleMatches(r.path, url.pathname + url.search)) continue;
    if (!best || r.path.length > best.len || (r.path.length === best.len && r.allow)) best = { allow: r.allow, len: r.path.length };
  }
  return best ? best.allow : true;
}

/** Thrown when a site has refused automated requests. The crawl stops and stays away for a while. */
export class BlockedError extends Error {
  until: Date;
  constructor(message: string, until: Date) {
    super(message);
    this.until = until;
  }
}

const BACKOFF_MINUTES = Math.max(5, Number(process.env.OFFICIAL_SOURCES_BACKOFF_MINUTES) || 60);

async function assertNotBlocked(origin: string): Promise<void> {
  const state = await CrawlState.findOne({ origin }).lean().catch(() => null);
  if (state?.blockedUntil && state.blockedUntil.getTime() > Date.now()) {
    throw new BlockedError(`${origin} refused automated requests recently (${state.reason ?? 'blocked'}); paused until ${state.blockedUntil.toISOString().slice(11, 16)} UTC.`, state.blockedUntil);
  }
}

async function noteBlocked(origin: string, status: number, retryAfter: string | null): Promise<BlockedError> {
  const seconds = Number(retryAfter);
  const minutes = Number.isFinite(seconds) && seconds > 0 ? Math.max(5, Math.ceil(seconds / 60)) : BACKOFF_MINUTES;
  const until = new Date(Date.now() + minutes * 60_000);
  await CrawlState.updateOne({ origin }, { blockedUntil: until, reason: `HTTP ${status}`, updatedAt: new Date() }, { upsert: true }).catch(() => {});
  return new BlockedError(`${origin} refused automated requests (HTTP ${status}). The crawler is backing off for ${minutes} minutes and will not retry sooner.`, until);
}

export async function politeFetch(rawUrl: string): Promise<string> {
  const url = new URL(rawUrl);
  await assertNotBlocked(url.origin);
  if (!(await allowedByRobots(url))) throw new Error(`robots.txt asks crawlers not to fetch ${url.pathname}`);
  const wait = (lastRequest.get(url.origin) ?? 0) + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest.set(url.origin, Date.now());
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(25_000),
    redirect: 'follow',
  });
  // A refusal is respected, not worked around: remember it and stop.
  if (res.status === 403 || res.status === 429 || res.status === 503) throw await noteBlocked(url.origin, res.status, res.headers.get('retry-after'));
  if (!res.ok) throw new Error(`${url.href} returned HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > 3_000_000) throw new Error(`${url.href} is unexpectedly large`);
  return res.text();
}

// ---------- what we find ---------------------------------------------------------------------------------------------

export interface Discovered {
  source: string;
  url: string;
  title: string;
  categories: string[];
  teaser?: string;
  publishedAt?: Date;
  kind: 'news' | 'page';
}

export interface SourceDefinition {
  id: string;
  label: string;
  listUrl: string;
  parse: ($: CheerioAPI) => Discovered[];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const asDate = (s?: string) => { if (!s) return undefined; const d = new Date(s); return Number.isNaN(d.getTime()) ? undefined : d; };

/** Pages worth tracking on the "recently updated" list: news, legislation, policy, pricing and published guidance. */
const TRACKED_PATH = /^\/(?:news\/\d+-|changes-ndis(?:\/|$)|ndis-laws(?:\/|$)|understanding-ndis\/about-ndis\/our-guidelines(?:\/|$)|publications\/|policies-rules-and-legal\/|strategies\/|providers\/|participants\/|working-provider\/)/i;

export const SOURCES: SourceDefinition[] = [
  {
    id: 'ndis-news',
    label: 'NDIS news and media releases',
    listUrl: `${NDIS_ORIGIN}/news/latest`,
    parse: ($) => {
      const out: Discovered[] = [];
      $('article.node').each((_, el) => {
        const a = $(el).find('.field-name-node-title a[href]').first();
        const href = a.attr('href');
        if (!href || !/^\/news\/\d+-/i.test(href)) return;
        out.push({
          source: 'ndis-news',
          url: `${NDIS_ORIGIN}${href.split('#')[0].split('?')[0]}`,
          title: clean(a.text()),
          categories: $(el).find('.categories li').map((__, li) => clean($(li).text())).get().filter(Boolean),
          teaser: clean($(el).find('.field-name-body').first().text()).slice(0, 300) || undefined,
          publishedAt: asDate($(el).find('time[datetime]').first().attr('datetime')),
          kind: 'news',
        });
      });
      return out;
    },
  },
  {
    id: 'ndis-recent',
    label: 'NDIS pages recently updated',
    listUrl: `${NDIS_ORIGIN}/recent-content`,
    parse: ($) => {
      const out: Discovered[] = [];
      $('table tr').each((_, tr) => {
        const a = $(tr).find('a[href]').first();
        const href = a.attr('href');
        if (!href || !TRACKED_PATH.test(href)) return;
        const isNews = /^\/news\/\d+-/i.test(href);
        out.push({
          source: isNews ? 'ndis-news' : 'ndis-recent',
          url: `${NDIS_ORIGIN}${href.split('#')[0].split('?')[0]}`,
          title: clean(a.text()),
          categories: isNews ? ['News'] : ['Page update'],
          publishedAt: asDate($(tr).find('time[datetime]').first().attr('datetime')),
          kind: isNews ? 'news' : 'page',
        });
      });
      return out;
    },
  },
];

export async function discover(): Promise<{ items: Discovered[]; problems: string[] }> {
  const byUrl = new Map<string, Discovered>();
  const problems: string[] = [];
  for (const source of SOURCES) {
    try {
      const html = await politeFetch(source.listUrl);
      const found = source.parse(load(html));
      if (!found.length) problems.push(`${source.label}: no items recognised (the page layout may have changed)`);
      for (const item of found) {
        const existing = byUrl.get(item.url);
        // The news list carries the richer record (categories, teaser); keep that one when both list the same page.
        if (!existing || (item.teaser && !existing.teaser)) byUrl.set(item.url, existing ? { ...existing, ...item, publishedAt: existing.publishedAt ?? item.publishedAt } : item);
      }
    } catch (err) {
      problems.push(`${source.label}: ${(err as Error).message}`);
    }
  }
  return { items: [...byUrl.values()], problems };
}

// ---------- reading one page ------------------------------------------------------------------------------------------

export interface PageFacts {
  title: string;
  publishedAt?: Date;
  headings: string[];
  wordCount: number;
  contentHash: string;
  teaser?: string;
}

export async function readPage(url: string): Promise<PageFacts> {
  const $ = load(await politeFetch(url));
  const root = $('.field-name-body').first().length ? $('.field-name-body').first() : $('main').first();
  const text = clean(root.text());
  const NOISE = /^(resources?|related (?:links|content|information)|more information|share|on this page|contact us|useful links)$/i;
  const headings = root.find('h2, h3').map((_, h) => clean($(h).text())).get().filter((h) => h && h.length < 140 && !NOISE.test(h)).slice(0, 12);
  return {
    title: clean($('h1').first().text()) || clean($('title').text().replace(/\s*\|\s*NDIS\s*$/i, '')),
    publishedAt: asDate($('time[datetime]').first().attr('datetime')),
    headings,
    wordCount: text ? text.split(' ').length : 0,
    contentHash: createHash('sha256').update(text).digest('hex'),
    teaser: clean(root.find('p').first().text()).slice(0, 300) || undefined,
  };
}

// ---------- what is worth writing about --------------------------------------------------------------------------------

export interface TopicRule {
  topic: string;
  label: string;
  test: RegExp;
  weight: number;
  /** Our own pages an article on this topic should link to. */
  related: { label: string; path: string }[];
}

export const TOPIC_RULES: TopicRule[] = [
  { topic: 'pricing', label: 'Pricing and price limits', test: /\b(pric(?:e|es|ing)|price guide|price limit|fees?|rates?|support catalogue)\b/i, weight: 18,
    related: [{ label: 'NDIS price guide explained', path: '/guides/ndis-price-guide' }, { label: 'Funding and plan types', path: '/funding' }] },
  { topic: 'plans', label: 'Plans and budgets', test: /\b(plans?|budgets?|reassess\w*|funding|framework|participant statement|variation|support needs)\b/i, weight: 16,
    related: [{ label: 'Plan management basics', path: '/guides/plan-management-basics' }, { label: 'Funding and plan types', path: '/funding' }] },
  { topic: 'providers', label: 'Providers and registration', test: /\b(providers?|registration|registered|quality and safeguards|practice standards|audit|worker screening|compliance|workforce|claims?|payments?|invoices?)\b/i, weight: 14,
    related: [{ label: 'Choosing a provider', path: '/guides/choosing-a-provider' }, { label: 'Find a provider', path: '/find-a-provider' }, { label: 'List your business', path: '/providers' }] },
  { topic: 'legislation', label: 'Laws and rules', test: /\b(act|rules?|legislation|laws?|bill|amendments?|determination|instrument)\b/i, weight: 14,
    related: [{ label: 'Funding and plan types', path: '/funding' }] },
  { topic: 'housing', label: 'Housing (SDA and SIL)', test: /\b(sda|sil|housing|accommodation|supported independent living|specialist disability accommodation)\b/i, weight: 10,
    related: [{ label: 'Housing, SDA and SIL providers', path: '/find-a-provider?service=Housing%20(SDA%20%26%20SIL)' }] },
  { topic: 'support-coordination', label: 'Support coordination', test: /\b(support coordinat\w+|plan manage\w+)\b/i, weight: 10,
    related: [{ label: 'Support coordination providers', path: '/find-a-provider?service=Support%20coordination' }] },
  { topic: 'workers', label: 'Support workers', test: /\b(support workers?|workers?|employ\w+|careers?)\b/i, weight: 6,
    related: [{ label: 'Independent workers', path: '/independent-workers' }] },
  { topic: 'enforcement', label: 'Fraud and enforcement', test: /\b(fraud|charged|scam|alleged|arrest\w*|court|sentenced|taskforce)\b/i, weight: -22,
    related: [{ label: 'Choosing a provider', path: '/guides/choosing-a-provider' }] },
  { topic: 'system-notices', label: 'System notices', test: /\b(system updates?|planned (?:system )?(?:updates?|outage|maintenance)|portal|outage|maintenance)\b/i, weight: -32, related: [] },
];

export function classify(input: { title: string; categories: string[]; headings: string[]; kind: 'news' | 'page'; publishedAt?: Date }): { topics: string[]; priority: number; related: { label: string; path: string }[] } {
  const haystack = [input.title, ...input.categories, ...input.headings].join(' ');
  const hits = TOPIC_RULES.filter((r) => r.test.test(haystack));
  let score = input.kind === 'news' ? 52 : 30;
  // Positive topics add up to a ceiling; negative ones always count in full.
  score += Math.min(30, hits.filter((h) => h.weight > 0).reduce((n, h) => n + h.weight, 0));
  score += hits.filter((h) => h.weight < 0).reduce((n, h) => n + h.weight, 0);
  if (input.publishedAt) {
    const ageDays = (Date.now() - input.publishedAt.getTime()) / 86_400_000;
    score += ageDays <= 7 ? 10 : ageDays <= 30 ? 5 : ageDays > 120 ? -15 : 0;
  }
  const related: { label: string; path: string }[] = [];
  for (const h of hits) for (const r of h.related) if (!related.some((x) => x.path === r.path)) related.push(r);
  return { topics: hits.map((h) => h.topic), priority: Math.max(0, Math.min(100, Math.round(score))), related: related.slice(0, 5) };
}

// ---------- the scan: discover, read what is new, remember --------------------------------------------------------------

export interface ScanResult {
  discovered: number;
  added: number;
  changed: number;
  rechecked: number;
  enriched: number;
  blocked: boolean;
  problems: string[];
}

const fingerprint = (parts: (string | undefined)[]) => createHash('sha256').update(parts.map((p) => p ?? '').join('|')).digest('hex');

/**
 * Finds what the sources list, records new items, and reads the pages themselves when it is allowed to. The list pages
 * alone are enough to record an item (title, date, category), so a site that refuses detail requests still yields a
 * useful queue; section headings and body fingerprints are filled in on a later run.
 */
export async function scanSources(options: { dryRun?: boolean } = {}): Promise<ScanResult> {
  const { items, problems } = await discover();
  const result: ScanResult = { discovered: items.length, added: 0, changed: 0, rechecked: 0, enriched: 0, blocked: false, problems };
  if (problems.some((p) => /refused automated requests|paused until/i.test(p))) result.blocked = true;
  if (!items.length) return result;

  const existing = new Map<string, SourceUpdateDoc>();
  for (const d of await SourceUpdate.find({ url: { $in: items.map((i) => i.url) } })) existing.set(d.url, d);

  let detailBudget = MAX_DETAIL_FETCHES;
  const now = new Date();

  /** Reads one page if the budget and the site allow; a refusal ends all further reading for this run. */
  const tryRead = async (url: string): Promise<PageFacts | null> => {
    if (result.blocked || detailBudget <= 0) return null;
    detailBudget -= 1;
    try {
      return await readPage(url);
    } catch (err) {
      if (err instanceof BlockedError) { result.blocked = true; problems.push(err.message); }
      else problems.push(`${url}: ${(err as Error).message}`);
      return null;
    }
  };

  for (const item of items) {
    const known = existing.get(item.url);
    const listingMoved = Boolean(known && item.kind === 'page' && item.publishedAt && known.publishedAt && item.publishedAt.getTime() !== known.publishedAt.getTime());
    if (known && !listingMoved) {
      if (!options.dryRun) await SourceUpdate.updateOne({ _id: known._id }, { lastSeenAt: now });
      continue;
    }

    const facts = options.dryRun ? null : await tryRead(item.url);
    const title = facts?.title || item.title;
    const publishedAt = item.publishedAt ?? facts?.publishedAt;
    const headings = facts?.headings ?? known?.headings ?? [];
    const cls = classify({ title, categories: item.categories, headings, kind: item.kind, publishedAt });

    if (options.dryRun) {
      if (known) result.changed += 1; else result.added += 1;
      continue;
    }

    if (!known) {
      await SourceUpdate.create({
        source: item.source, url: item.url, title, categories: item.categories, teaser: item.teaser ?? facts?.teaser,
        publishedAt, headings, wordCount: facts?.wordCount ?? 0,
        contentHash: facts?.contentHash ?? fingerprint([item.url, title, item.publishedAt?.toISOString(), item.teaser]),
        detailAt: facts ? now : undefined,
        topics: cls.topics, priority: cls.priority, firstSeenAt: now, lastSeenAt: now,
      });
      result.added += 1;
    } else {
      // The list says this page was updated. With the page read we can tell whether the text moved; without it the
      // list's own "updated" time is evidence enough to ask for a second look.
      const changed = facts ? facts.contentHash !== known.contentHash : true;
      known.title = title;
      known.publishedAt = publishedAt ?? known.publishedAt;
      known.headings = headings;
      known.topics = cls.topics;
      known.priority = cls.priority;
      known.lastSeenAt = now;
      if (facts) { known.wordCount = facts.wordCount; known.detailAt = now; }
      if (changed) {
        if (facts) known.contentHash = facts.contentHash;
        known.lastChangedAt = now;
        known.changeCount += 1;
        if (['brief', 'scheduled', 'published'].includes(known.status)) known.needsRecheck = true;
        else if (known.status === 'dismissed') known.status = 'new';
        result.changed += 1;
      }
      await known.save();
    }
  }

  if (options.dryRun) return result;

  // Items recorded from the list alone get their page read when the site allows it.
  const lacking = await SourceUpdate.find({ detailAt: { $exists: false } }).sort({ priority: -1, publishedAt: -1 }).limit(8);
  for (const doc of lacking) {
    const facts = await tryRead(doc.url);
    if (!facts) { if (result.blocked) break; continue; }
    const cls = classify({ title: facts.title || doc.title, categories: doc.categories, headings: facts.headings, kind: doc.source === 'ndis-news' ? 'news' : 'page', publishedAt: doc.publishedAt });
    doc.title = facts.title || doc.title;
    doc.headings = facts.headings;
    doc.wordCount = facts.wordCount;
    doc.contentHash = facts.contentHash; // the baseline for spotting later changes
    doc.detailAt = now;
    doc.teaser = doc.teaser ?? facts.teaser;
    doc.topics = cls.topics;
    doc.priority = cls.priority;
    await doc.save();
    result.enriched += 1;
  }

  // A few items we have already written about are re-read each run, so a change to the official page is noticed
  // even though it no longer shows up as new.
  const stale = await SourceUpdate.find({ status: { $in: ['brief', 'scheduled', 'published'] }, needsRecheck: false, detailAt: { $exists: true } }).sort({ lastSeenAt: 1 }).limit(RECHECK_PER_RUN);
  for (const doc of stale) {
    const facts = await tryRead(doc.url);
    if (!facts) { if (result.blocked) break; continue; }
    doc.lastSeenAt = now;
    doc.detailAt = now;
    if (facts.contentHash !== doc.contentHash) {
      doc.contentHash = facts.contentHash;
      doc.lastChangedAt = now;
      doc.changeCount += 1;
      doc.needsRecheck = true;
      result.changed += 1;
    }
    await doc.save();
    result.rechecked += 1;
  }
  return result;
}
