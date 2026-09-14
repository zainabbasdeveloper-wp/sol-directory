// Real fetch client for the headless WordPress CMS at apps/cms.
// This is a separate origin/base URL from the Node API — set
// VITE_WORDPRESS_URL in apps/web's .env (e.g.
// http://localhost:8080 for local dev, matching whatever apps/cms
// is actually served from).

const WP_URL = (import.meta as any).env?.VITE_WORDPRESS_URL;

export interface ServiceAreaPage {
  id: number;
  title: string;
  serviceName: string;
  suburb: string;
  state: string;
  introParagraph: string;
  faq: { question: string; answer: string }[];
  toc: string[];
  suburbFacts: { label: string; value: string }[];
  compare: unknown[]; // shape depends on what's actually authored in wp-admin — not fixed here
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A content editor typo in the JSON meta field shouldn't crash
    // the page — fall back to empty rather than throwing.
    console.warn('[wordpressApi] Failed to parse JSON meta field, using fallback.');
    return fallback;
  }
}

function mapServiceAreaPage(raw: any): ServiceAreaPage {
  const meta = raw.meta ?? {};
  return {
    id: raw.id,
    title: raw.title?.rendered ?? '',
    serviceName: meta.service_name ?? '',
    suburb: meta.suburb ?? '',
    state: meta.state ?? '',
    introParagraph: meta.intro_paragraph ?? '',
    faq: safeParseJson(meta.faq_json, []),
    toc: safeParseJson(meta.toc_json, []),
    suburbFacts: safeParseJson(meta.suburb_facts_json, []),
    compare: safeParseJson(meta.compare_json, []),
  };
}

/**
 * Fetches one service-area page by service+suburb slug, matching
 * ServiceLocationPage.tsx's route params exactly. Returns null if
 * WordPress isn't configured (VITE_WORDPRESS_URL unset) or nothing
 * matches — callers should fall back to the existing illustrative
 * data in that case, not crash.
 */
export async function getServiceAreaPage(serviceSlug: string, suburbSlug: string): Promise<ServiceAreaPage | null> {
  if (!WP_URL) {
    console.warn('[wordpressApi] VITE_WORDPRESS_URL is not set — falling back to illustrative data.');
    return null;
  }

  try {
    const res = await fetch(`${WP_URL}/wp-json/wp/v2/service-area-pages?slug=${serviceSlug}-${suburbSlug}`);
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    return mapServiceAreaPage(results[0]);
  } catch (err) {
    console.error('[wordpressApi] Request failed:', err);
    return null;
  }
}

// --- Generic content layer: Pages, Services, Locations, Guides ---
// This is the centralized WordPress data layer item 28 asked for —
// one place, with an in-memory cache so navigating between pages in
// the same session doesn't refetch identical content repeatedly.
// Cache is intentionally simple (no TTL/revalidation yet — see the
// README note on webhook revalidation, which needs a real backend
// endpoint to land content invalidation into, not just a frontend
// cache).

const contentCache = new Map<string, unknown>();
const API_URL_FOR_REVALIDATION = (import.meta as any).env?.VITE_API_URL ?? '/api';

// The real revalidation check: compares when the cache was last
// populated against when WordPress last reported a content change
// via the webhook. Checked at most once every 30s, not on every
// single fetch, since it's a network round-trip on its own and
// content doesn't change second-to-second.
let cacheBuiltAt = Date.now();
let lastFreshnessCheck = 0;
async function ensureCacheFresh(): Promise<void> {
  const now = Date.now();
  if (now - lastFreshnessCheck < 30_000) return;
  lastFreshnessCheck = now;

  try {
    const res = await fetch(`${API_URL_FOR_REVALIDATION}/webhooks/wordpress/last-changed`);
    if (!res.ok) return;
    const { lastChangedAt } = await res.json();
    if (lastChangedAt && new Date(lastChangedAt).getTime() > cacheBuiltAt) {
      contentCache.clear();
      cacheBuiltAt = now;
    }
  } catch {
    // If the revalidation check itself fails, keep serving whatever
    // is cached rather than breaking content display over it.
  }
}

async function wpFetch<T>(path: string, cacheKey: string): Promise<T | null> {
  await ensureCacheFresh();
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey) as T;
  if (!WP_URL) {
    console.warn('[wordpressApi] VITE_WORDPRESS_URL is not set.');
    return null;
  }
  try {
    const res = await fetch(`${WP_URL}${path}`);
    if (!res.ok) return null;
    const data = await res.json();
    contentCache.set(cacheKey, data);
    return data as T;
  } catch (err) {
    console.error(`[wordpressApi] Request failed for ${path}:`, err);
    return null;
  }
}

// --- Media handling (item 8) — never crash or show a broken icon
// for a missing featured image; every consumer gets a safe shape
// back even when WordPress has no image set. ---
export interface WPImage { url: string; alt: string; width?: number; height?: number }

function extractFeaturedImage(raw: any): WPImage | null {
  const media = raw._embedded?.['wp:featuredmedia']?.[0];
  if (!media || media.code) return null; // WP returns an error object here when there's no featured image
  return {
    url: media.source_url,
    alt: media.alt_text || raw.title?.rendered || '',
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

export interface WPContentBase {
  id: number;
  slug: string;
  title: string;
  contentHtml: string; // already-sanitized server-side by WordPress's own content filters — see note in WordPressContentPage.tsx before rendering
  excerpt: string;
  featuredImage: WPImage | null;
  terms: WPTerm[];
  seo: { title: string; description: string; ogImage: string | null };
}

export interface WPTerm { id: number; name: string; slug: string; taxonomy: string; parent: number }

function extractTerms(raw: any): WPTerm[] {
  // _embedded['wp:term'] is an array of arrays — one sub-array per
  // taxonomy registered on this post type, in the same order the
  // REST API lists them. Flattened here since most consumers just
  // want "all the terms this item has," not grouped by taxonomy.
  const groups = raw._embedded?.['wp:term'] ?? [];
  return groups.flat().filter((t: any) => t && !t.code).map((t: any) => ({
    id: t.id, name: t.name, slug: t.slug, taxonomy: t.taxonomy, parent: t.parent ?? 0,
  }));
}

function mapBaseContent(raw: any): WPContentBase {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title?.rendered ?? '',
    contentHtml: raw.content?.rendered ?? '',
    excerpt: (raw.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').trim(),
    featuredImage: extractFeaturedImage(raw),
    terms: extractTerms(raw),
    // Falls back to title/excerpt when no SEO plugin data is present
    // — this project has no Yoast/RankMath configured yet, so these
    // fields are honest fallbacks, not real SEO plugin output.
    seo: {
      title: raw.yoast_head_json?.title ?? raw.title?.rendered ?? '',
      description: raw.yoast_head_json?.description ?? (raw.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').trim(),
      ogImage: raw.yoast_head_json?.og_image?.[0]?.url ?? extractFeaturedImage(raw)?.url ?? null,
    },
  };
}

// --- Real taxonomy term lists — for building filter UIs (e.g. a
// dynamic mega menu) from actual wp-admin-managed categories, not a
// hardcoded array. ---

async function getTerms(restBase: string, cacheKey: string): Promise<{ items: WPTerm[] }> {
  const raw = await wpFetch<any[]>(`/wp-json/wp/v2/${restBase}?per_page=100`, cacheKey);
  return { items: (raw ?? []).map((t: any) => ({ id: t.id, name: t.name, slug: t.slug, taxonomy: t.taxonomy, parent: t.parent ?? 0 })) };
}

export function getServiceCategories(): Promise<{ items: WPTerm[] }> {
  return getTerms('service-categories', 'terms:service-categories');
}
export function getRegions(): Promise<{ items: WPTerm[] }> {
  return getTerms('regions', 'terms:regions');
}
export function getGuideTopics(): Promise<{ items: WPTerm[] }> {
  return getTerms('guide-topics', 'terms:guide-topics');
}

export async function getWordPressPage(slug: string): Promise<WPContentBase | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_embed`, `page:${slug}`);
  if (!results?.length) return null;
  return mapBaseContent(results[0]);
}

// One generic fetcher for any CPT registered in cptRouteConfig.ts,
// replacing three near-identical per-type functions (getService/
// getLocation/getGuide) that only differed by rest_base. Adding a
// new content type now needs a config entry, not a new function.
export interface WPCPTItem extends WPContentBase { meta: Record<string, unknown> }
export type WPService = WPCPTItem;
export type WPLocation = WPCPTItem;
export type WPGuide = WPCPTItem;

export async function getCPTItem(restBase: string, slug: string): Promise<WPCPTItem | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/${restBase}?slug=${encodeURIComponent(slug)}&_embed`, `${restBase}:${slug}`);
  if (!results?.length) return null;
  return { ...mapBaseContent(results[0]), meta: results[0].meta ?? {} };
}

export async function getService(slug: string): Promise<WPService | null> {
  return getCPTItem('services', slug);
}

export async function getLocation(slug: string): Promise<WPLocation | null> {
  return getCPTItem('locations', slug);
}

export async function getGuide(slug: string): Promise<WPGuide | null> {
  return getCPTItem('guides', slug);
}

// --- Dynamic navigation menu — real custom REST route, since core
// WordPress has no built-in menu API endpoint at all. ---

export interface WPMenuItem { id: number; title: string; url: string; children: WPMenuItem[] }

export async function getMenu(location: string): Promise<WPMenuItem[]> {
  const result = await wpFetch<{ items: WPMenuItem[] }>(`/wp-json/soldirectory/v1/menu/${location}`, `menu:${location}`);
  return result?.items ?? [];
}

/**
 * Builds the nested category tree AND groups it into the same
 * MegaColumn[] shape MegaMenu.tsx already renders (columns of
 * {title, links[]} groups) — so wiring this in means swapping a data
 * source, not rebuilding the component. Distributes top-level
 * categories across a fixed number of columns round-robin, same
 * visual density as the hand-authored static data.
 */
export interface MegaGroupFromWP { title: string; links: string[] }
export async function getServiceCategoryMegaColumns(columnCount = 4): Promise<MegaGroupFromWP[][]> {
  const { items: terms } = await getServiceCategories();
  if (terms.length === 0) return [];

  const byParent = new Map<number, WPTerm[]>();
  for (const t of terms as any[]) {
    const parentId = t.parent ?? 0;
    if (!byParent.has(parentId)) byParent.set(parentId, []);
    byParent.get(parentId)!.push(t);
  }

  const topLevel = byParent.get(0) ?? [];
  const groups: MegaGroupFromWP[] = topLevel.map((parent) => ({
    title: parent.name,
    links: (byParent.get(parent.id) ?? []).map((child) => child.name),
  }));

  const columns: MegaGroupFromWP[][] = Array.from({ length: columnCount }, () => []);
  groups.forEach((g, i) => columns[i % columnCount].push(g));
  return columns.filter((c) => c.length > 0);
}
