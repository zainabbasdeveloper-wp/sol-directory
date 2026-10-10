import { createHash } from 'node:crypto';
import SourceUpdate, { type SourceUpdateDoc } from '../models/SourceUpdate.js';
import { classify } from './officialSources.js';

/**
 * Blog automation around WordPress. The pipeline is:
 *   official source change  ->  SourceUpdate  ->  brief (private WordPress draft with an outline and links)
 *   ->  a person writes it  ->  readiness check  ->  schedule or publish.
 * Nothing is ever published without a person writing it: the brief carries markers that block publishing until they
 * are replaced, and the readiness check refuses thin, uncited or unfinished posts.
 */

const CATEGORY_NAME = 'NDIS updates';
const CATEGORY_SLUG = 'ndis-updates';
const MIN_WORDS = Math.max(120, Number(process.env.BLOG_MIN_WORDS) || 300);
export const PUBLISH_HOUR = Math.min(22, Math.max(5, Number(process.env.BLOG_PUBLISH_HOUR) || 9));
export const MAX_PER_DAY = Math.max(1, Number(process.env.BLOG_MAX_PER_DAY) || 1);
const TIMEZONE = 'Australia/Sydney';

// ---------- WordPress connection ------------------------------------------------------------------------------------

export function wordpressConfigured(): boolean {
  return Boolean(process.env.WORDPRESS_URL && process.env.WORDPRESS_APP_USER && process.env.WORDPRESS_APP_PASSWORD);
}

function wpAuth() {
  const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
  const user = process.env.WORDPRESS_APP_USER;
  const pass = process.env.WORDPRESS_APP_PASSWORD;
  if (!base || !user || !pass) throw new Error('WordPress is not connected: set WORDPRESS_URL, WORDPRESS_APP_USER and WORDPRESS_APP_PASSWORD.');
  return { base, authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
}

async function wp<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const { base, authorization } = wpAuth();
  const res = await fetch(`${base}/wp-json/wp/v2${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    throw new Error(`WordPress returned HTTP ${res.status}${text ? `: ${text}` : ''}`);
  }
  return (await res.json()) as T;
}

// ---------- helpers --------------------------------------------------------------------------------------------------

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const textOf = (html: string) => html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function siteOrigin(): string {
  return (process.env.CLIENT_ORIGIN || process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function slugFor(title: string): string {
  return title.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

const BRIEF_SLUG_PREFIX = 'brief-ndis-';
const briefSlug = (update: SourceUpdateDoc) => `${BRIEF_SLUG_PREFIX}${createHash('sha256').update(update.url).digest('hex').slice(0, 12)}`;

/** The slug the earlier monitor used, so briefs it already created are adopted rather than duplicated. */
function legacySlug(update: SourceUpdateDoc): string {
  const date = update.publishedAt ? update.publishedAt.toISOString().slice(0, 10) : 'undated';
  return `ndis-editorial-review-${createHash('sha256').update(`${update.url}|${date}`).digest('hex').slice(0, 16)}`;
}

const formatDate = (d?: Date) => (d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIMEZONE }) : 'date not shown');

// ---------- the brief -------------------------------------------------------------------------------------------------

export function buildBriefHtml(update: SourceUpdateDoc): string {
  const cls = classify({ title: update.title, categories: update.categories, headings: update.headings, kind: update.source === 'ndis-news' ? 'news' : 'page', publishedAt: update.publishedAt });
  const origin = siteOrigin();
  const related = cls.related.length ? cls.related : [{ label: 'Find a provider', path: '/find-a-provider' }];
  const sections = update.headings.length
    ? `<li>The official page covers: ${update.headings.map((h) => escapeHtml(h)).join('; ')}.</li>` : '';
  return [
    `<div class="sd-editor-brief" data-sd-brief="1" style="border:2px solid #E0A021;background:#FFF6E0;padding:16px 18px;border-radius:8px">`,
    `<p><strong>Editor brief. Delete this whole box before publishing. This draft cannot be published while it, or any [[EDITOR…]] marker, is still here.</strong></p>`,
    `<ul>`,
    `<li>Official source: <a href="${escapeHtml(update.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(update.title)}</a> (${escapeHtml(formatDate(update.publishedAt))}).</li>`,
    update.topics.length ? `<li>Topics: ${escapeHtml(update.topics.join(', '))}. Suggested priority ${update.priority}/100.</li>` : '',
    sections,
    `<li>Write it in your own words. Do not copy sentences, images or logos from the source: the NDIA licenses its website content CC BY-NC and asks that it is not used for commercial purposes. Facts, dates and amounts may be stated, with the official page cited.</li>`,
    `<li>Never describe any provider or service as &ldquo;NDIS approved&rdquo; or imply the NDIA endorses it.</li>`,
    `<li>Add an excerpt (50 to 300 characters) in the post settings, check the title and slug, and read the official page again on the day you publish.</li>`,
    `</ul></div>`,
    `<h2>What has changed</h2><p>[[EDITOR: say what changed and the date it applies from, in your own words.]]</p>`,
    `<h2>Who this affects</h2><p>[[EDITOR: participants, families, providers or workers, and any exceptions.]]</p>`,
    `<h2>What to do next</h2><p>[[EDITOR: practical steps a reader could take, and who to ask.]]</p>`,
    `<h2>Where to read the official information</h2><p>Official source: <a href="${escapeHtml(update.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(update.title)}</a>, National Disability Insurance Agency. Information checked on [[EDITOR: date checked]].</p>`,
    `<h2>Related pages on SolDirectory</h2><ul>${related.map((r) => `<li><a href="${origin}${escapeHtml(r.path)}">${escapeHtml(r.label)}</a></li>`).join('')}</ul>`,
    `<p><em>This article is general information, not advice. Check your own plan and the official source for your situation.</em></p>`,
  ].filter(Boolean).join('');
}

async function ensureCategory(): Promise<number | null> {
  try {
    const found = await wp<{ id: number }[]>(`/categories?slug=${CATEGORY_SLUG}&_fields=id`);
    if (found[0]) return found[0].id;
    const created = await wp<{ id: number }>('/categories', { method: 'POST', body: JSON.stringify({ name: CATEGORY_NAME, slug: CATEGORY_SLUG }) });
    return created.id;
  } catch {
    return null; // a missing category must never stop a brief being created
  }
}

export interface BriefOutcome { postId: number; created: boolean; adopted: boolean }

/** Creates the private WordPress draft for an update, or adopts one that already exists for it. Never publishes. */
export async function createBrief(update: SourceUpdateDoc): Promise<BriefOutcome> {
  for (const slug of [briefSlug(update), legacySlug(update)]) {
    const existing = await wp<{ id: number; link: string; status: string }[]>(`/posts?slug=${slug}&status=any&_fields=id,link,status`);
    if (existing[0]) {
      update.wpPostId = existing[0].id;
      update.wpPostUrl = existing[0].link;
      update.status = 'brief';
      update.briefedAt = update.briefedAt ?? new Date();
      await update.save();
      return { postId: existing[0].id, created: false, adopted: true };
    }
  }
  const category = await ensureCategory();
  const post = await wp<{ id: number; link: string }>('/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: `[Brief] ${update.title}`,
      slug: briefSlug(update),
      status: 'draft',
      content: buildBriefHtml(update),
      excerpt: '',
      comment_status: 'closed',
      ...(category ? { categories: [category] } : {}),
    }),
  });
  update.wpPostId = post.id;
  update.wpPostUrl = post.link;
  update.status = 'brief';
  update.briefedAt = new Date();
  await update.save();
  return { postId: post.id, created: true, adopted: false };
}

// ---------- readiness -------------------------------------------------------------------------------------------------

export interface PostSnapshot {
  id: number;
  status: string;
  slug: string;
  link?: string;
  titleRaw: string;
  contentRaw: string;
  excerptRaw: string;
}

export async function getPost(id: number): Promise<PostSnapshot> {
  const p = await wp<any>(`/posts/${id}?context=edit&_fields=id,status,slug,link,title,content,excerpt`);
  return {
    id: p.id, status: p.status, slug: p.slug, link: p.link,
    titleRaw: p.title?.raw ?? '', contentRaw: p.content?.raw ?? '', excerptRaw: p.excerpt?.raw ?? '',
  };
}

export function checkReadiness(post: PostSnapshot, update: Pick<SourceUpdateDoc, 'teaser' | 'url'>): string[] {
  const issues: string[] = [];
  const plain = textOf(post.contentRaw);
  if (/data-sd-brief/i.test(post.contentRaw)) issues.push('The editor brief box is still in the post. Delete it.');
  if (/\[\[EDITOR/i.test(post.contentRaw)) issues.push('There are still [[EDITOR…]] markers to replace with your own writing.');
  if (/^\s*\[brief\]/i.test(post.titleRaw)) issues.push('The title still starts with [Brief]. Give it a real title.');
  const words = plain ? plain.split(' ').length : 0;
  if (words < MIN_WORDS) issues.push(`The post is ${words} words; at least ${MIN_WORDS} are needed to be useful and not thin content.`);
  if (!/<a\s[^>]*href="https?:\/\/(?:www\.)?ndis\.gov\.au/i.test(post.contentRaw)) issues.push('Cite the official NDIS page with a link to it.');
  const excerpt = textOf(post.excerptRaw);
  if (excerpt.length < 50) issues.push('Add an excerpt of at least 50 characters in the post settings (it is used on the blog list and in search results).');
  if (excerpt.length > 300) issues.push('The excerpt is over 300 characters; shorten it.');
  if (update.teaser && update.teaser.length > 60 && norm(plain).includes(norm(update.teaser))) {
    issues.push('The post contains the official summary sentence word for word. Rewrite it in your own words.');
  }
  return issues;
}

// ---------- scheduling ------------------------------------------------------------------------------------------------

function tzOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** The instant at which it is `hour`:00 on the given Sydney calendar date. */
function sydneyInstant(y: number, m: number, d: number, hour: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hour));
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60000);
}

const sydneyDay = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

/** First free publishing slot: PUBLISH_HOUR Sydney time, on a day that has fewer than MAX_PER_DAY posts waiting. */
export async function nextSlot(now = new Date()): Promise<Date> {
  const taken = new Map<string, number>();
  const note = (d: Date) => taken.set(sydneyDay(d), (taken.get(sydneyDay(d)) ?? 0) + 1);
  for (const doc of await SourceUpdate.find({ status: 'scheduled', scheduledFor: { $gte: now } }).select('scheduledFor')) if (doc.scheduledFor) note(doc.scheduledFor);
  if (wordpressConfigured()) {
    try {
      const future = await wp<{ date_gmt: string }[]>('/posts?status=future&per_page=100&_fields=date_gmt');
      for (const f of future) note(new Date(`${f.date_gmt}Z`));
    } catch { /* the local record above is still a good guide */ }
  }
  const [y, m, d] = sydneyDay(now).split('-').map(Number);
  for (let offset = 0; offset < 120; offset += 1) {
    const slot = sydneyInstant(y, m, d + offset, PUBLISH_HOUR);
    if (slot.getTime() <= now.getTime() + 15 * 60_000) continue;
    if ((taken.get(sydneyDay(slot)) ?? 0) < MAX_PER_DAY) return slot;
  }
  return sydneyInstant(y, m, d + 1, PUBLISH_HOUR);
}

export interface PublishOutcome { ok: boolean; issues: string[]; status?: 'published' | 'scheduled'; at?: Date; url?: string }

/** Runs the readiness check and, only if it passes, publishes now or schedules. */
export async function publishUpdate(update: SourceUpdateDoc, mode: 'now' | 'schedule', at?: Date): Promise<PublishOutcome> {
  if (!update.wpPostId) return { ok: false, issues: ['There is no WordPress draft for this item yet. Create the brief first.'] };
  const post = await getPost(update.wpPostId);
  const issues = checkReadiness(post, update);
  if (update.needsRecheck) issues.push('The official page changed after this was briefed. Re-read it, update the post, then use "Mark as rechecked".');
  if (issues.length) return { ok: false, issues };

  const body: Record<string, unknown> = {};
  if (post.slug.startsWith(BRIEF_SLUG_PREFIX) || post.slug.startsWith('ndis-editorial-review-')) body.slug = slugFor(post.titleRaw) || post.slug;
  let when: Date | undefined;
  if (mode === 'schedule') {
    when = at ?? (await nextSlot());
    if (when.getTime() <= Date.now() + 60_000) return { ok: false, issues: ['The scheduled time must be in the future.'] };
    body.status = 'future';
    body.date_gmt = when.toISOString().slice(0, 19);
  } else {
    body.status = 'publish';
  }
  const saved = await wp<{ id: number; link: string; status: string }>(`/posts/${post.id}`, { method: 'POST', body: JSON.stringify(body) });
  update.wpPostUrl = saved.link;
  if (mode === 'schedule') {
    update.status = 'scheduled';
    update.scheduledFor = when;
  } else {
    update.status = 'published';
    update.publishedOnAt = new Date();
  }
  await update.save();
  return { ok: true, issues: [], status: mode === 'schedule' ? 'scheduled' : 'published', at: when, url: saved.link };
}

// ---------- keeping our records in step with WordPress -----------------------------------------------------------------

/** WordPress is the source of truth for posts: a post published, scheduled or deleted there is reflected here. */
export async function syncWordpressStates(): Promise<number> {
  if (!wordpressConfigured()) return 0;
  const tracked = await SourceUpdate.find({ status: { $in: ['brief', 'scheduled'] }, wpPostId: { $exists: true } }).limit(50);
  if (!tracked.length) return 0;
  let changed = 0;
  let rows: { id: number; status: string; link: string; date_gmt: string }[] = [];
  try {
    rows = await wp(`/posts?include=${tracked.map((t) => t.wpPostId).join(',')}&status=any&per_page=100&_fields=id,status,link,date_gmt`);
  } catch {
    return 0;
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const doc of tracked) {
    const row = byId.get(doc.wpPostId!);
    if (!row) { doc.status = 'new'; doc.wpPostId = undefined; doc.wpPostUrl = undefined; await doc.save(); changed += 1; continue; }
    if (row.status === 'publish' && doc.status !== 'published') {
      doc.status = 'published'; doc.wpPostUrl = row.link; doc.publishedOnAt = doc.publishedOnAt ?? new Date(`${row.date_gmt}Z`); await doc.save(); changed += 1;
    } else if (row.status === 'future' && doc.status !== 'scheduled') {
      doc.status = 'scheduled'; doc.scheduledFor = new Date(`${row.date_gmt}Z`); await doc.save(); changed += 1;
    } else if (row.status === 'trash') {
      doc.status = 'new'; doc.wpPostId = undefined; doc.wpPostUrl = undefined; await doc.save(); changed += 1;
    }
  }
  return changed;
}
