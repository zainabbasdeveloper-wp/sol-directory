import 'dotenv/config';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { runJob } from '../services/jobRunner.js';

const NDIS_ORIGIN = 'https://www.ndis.gov.au';
const SOURCES = [
  { url: `${NDIS_ORIGIN}/news/latest`, kind: 'news' as const },
  { url: `${NDIS_ORIGIN}/recent-content`, kind: 'site update' as const },
];
const RELEVANT_UPDATE_PATH = /^\/(?:news\/\d+-|changes-ndis(?:\/|$)|ndis-laws(?:\/|$)|understanding-ndis\/about-ndis\/our-guidelines(?:\/|$)|publications\/|policies-rules-and-legal\/|strategies\/)/i;
const MAX_DRAFTS_PER_RUN = Math.max(1, Number(process.env.NDIS_NEWS_MONITOR_MAX_DRAFTS) || 6);

interface SourceUpdate {
  url: string;
  date: string;
  kind: 'news' | 'site update';
  reference: string;
}

function updateDate(text: string): string {
  const found = /\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/.exec(text);
  if (!found) return 'undated';
  const parsed = new Date(found[1]);
  return Number.isNaN(parsed.getTime()) ? 'undated' : parsed.toISOString().slice(0, 10);
}

async function fetchSource(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'SolDirectoryBot/1.0 (+https://directory.solbusinessconsultant.com.au)',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`NDIS source ${url} returned HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function discoverUpdates(): Promise<SourceUpdate[]> {
  const discovered = new Map<string, SourceUpdate>();
  for (const source of SOURCES) {
    const html = await fetchSource(source.url);
    const $ = load(html);
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;
      let parsed: URL;
      try { parsed = new URL(href, NDIS_ORIGIN); } catch { return; }
      if (parsed.origin !== NDIS_ORIGIN || !RELEVANT_UPDATE_PATH.test(parsed.pathname)) return;
      if (source.kind === 'news' && !/^\/news\/\d+-/i.test(parsed.pathname)) return;
      const container = $(element).closest('article, .views-row, tr, li');
      const context = `${$(element).text()} ${container.text()}`;
      const reference = /^\/news\/(\d+)-/i.exec(parsed.pathname)?.[1]
        ?? parsed.pathname.split('/').filter(Boolean).slice(-1)[0]
        ?? 'update';
      const url = `${NDIS_ORIGIN}${parsed.pathname}`;
      const date = updateDate(context);
      const key = `${url}|${date}`;
      if (!discovered.has(key)) discovered.set(key, { url, date, kind: source.kind, reference });
    });
  }
  if (!discovered.size) throw new Error('No relevant NDIS update links were found; source markup may have changed.');
  return [...discovered.values()].slice(0, 100);
}

function wordpressAuth(): { base: string; authorization: string } {
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  const username = process.env.WORDPRESS_APP_USER;
  const password = process.env.WORDPRESS_APP_PASSWORD;
  if (!base || !username || !password) throw new Error('WORDPRESS_URL, WORDPRESS_APP_USER, and WORDPRESS_APP_PASSWORD are required to create editorial drafts.');
  return {
    base,
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string);
}

async function wordpressRequest(url: string, authorization: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, authorization, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const message = (await response.text()).slice(0, 300);
    throw new Error(`WordPress returned HTTP ${response.status}: ${message}`);
  }
  return response;
}

function draftSlug(update: SourceUpdate): string {
  const fingerprint = createHash('sha256').update(`${update.url}|${update.date}`).digest('hex').slice(0, 16);
  return `ndis-editorial-review-${fingerprint}`;
}

function editorialBrief(update: SourceUpdate): string {
  const sourceId = update.reference.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 120);
  return `<p><strong>Internal editorial brief. This draft is not ready to publish.</strong></p>` +
    `<p>Source type: ${escapeHtml(update.kind)}. Source reference: ${escapeHtml(sourceId)}. Detected date: ${escapeHtml(update.date)}.</p>` +
    `<p><a href="${escapeHtml(update.url)}" target="_blank" rel="noopener noreferrer">Open the official NDIS source</a></p>` +
    `<h2>Editorial work required</h2><ol>` +
    `<li>Read the complete official source and any linked legislation, pricing documents or operational instructions.</li>` +
    `<li>Write an original explanation of what changed, who may be affected, the effective date and any action readers should consider.</li>` +
    `<li>Separate confirmed facts from interpretation. Quote exact requirements only when necessary and cite the official source beside the claim.</li>` +
    `<li>Explain limitations and exceptions. Do not imply that SolDirectory or the NDIA has approved or endorsed a provider, service or interpretation.</li>` +
    `<li>Do not reproduce NDIA article copy, images, logos or other protected material. Replace this brief with original, editor-reviewed content before publication.</li>` +
    `</ol><p><strong>Publication gate:</strong> An editor must verify accuracy, add current citations and replace this entire brief. This post was intentionally created with WordPress status “draft”.</p>`;
}

async function createDrafts(updates: SourceUpdate[], dryRun: boolean): Promise<{ created: number; existing: number; candidates: number }> {
  const { base, authorization } = wordpressAuth();
  let created = 0;
  let existing = 0;
  let candidates = 0;

  for (const update of updates) {
    const slug = draftSlug(update);
    const query = new URLSearchParams({ slug, status: 'any' });
    const check = await wordpressRequest(`${base}/wp-json/wp/v2/posts?${query}`, authorization);
    const found = await check.json();
    if (Array.isArray(found) && found.length) { existing += 1; continue; }
    candidates += 1;
    if (dryRun || created >= MAX_DRAFTS_PER_RUN) continue;

    const payload = {
      title: `EDITOR REVIEW REQUIRED - NDIS source ${update.reference}`,
      slug,
      status: 'draft',
      excerpt: 'Internal editorial brief. Replace with original, verified writing before publication.',
      content: editorialBrief(update),
      comment_status: 'closed',
    };
    await wordpressRequest(`${base}/wp-json/wp/v2/posts`, authorization, { method: 'POST', body: JSON.stringify(payload) });
    created += 1;
  }
  return { created, existing, candidates };
}

const dryRun = process.argv.includes('--dry-run');

runJob('ndis-news-monitor', async () => {
  const updates = await discoverUpdates();
  const result = await createDrafts(updates, dryRun);
  return `${dryRun ? 'Dry run: found' : 'Found'} ${updates.length} relevant source updates; ${result.candidates} new candidate(s), ${result.created} private draft(s) created, ${result.existing} already tracked.`;
});