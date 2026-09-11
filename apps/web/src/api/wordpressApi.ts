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
  seo: { title: string; description: string; ogImage: string | null };
}

function mapBaseContent(raw: any): WPContentBase {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.title?.rendered ?? '',
    contentHtml: raw.content?.rendered ?? '',
    excerpt: (raw.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').trim(),
    featuredImage: extractFeaturedImage(raw),
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

export async function getWordPressPage(slug: string): Promise<WPContentBase | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}&_embed`, `page:${slug}`);
  if (!results?.length) return null;
  return mapBaseContent(results[0]);
}

export interface WPService extends WPContentBase {}
export async function getService(slug: string): Promise<WPService | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/services?slug=${encodeURIComponent(slug)}&_embed`, `service:${slug}`);
  if (!results?.length) return null;
  return mapBaseContent(results[0]);
}

export interface WPLocation extends WPContentBase { state: string }
export async function getLocation(slug: string): Promise<WPLocation | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/locations?slug=${encodeURIComponent(slug)}&_embed`, `location:${slug}`);
  if (!results?.length) return null;
  return { ...mapBaseContent(results[0]), state: results[0].meta?.state ?? '' };
}

export interface WPGuide extends WPContentBase {}
export async function getGuide(slug: string): Promise<WPGuide | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/guides?slug=${encodeURIComponent(slug)}&_embed`, `guide:${slug}`);
  if (!results?.length) return null;
  return mapBaseContent(results[0]);
}
