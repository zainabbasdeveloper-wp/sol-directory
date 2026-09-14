// Routed through the Node API's WordPress REST proxy (/api/wp/rest/...)
// instead of fetching WordPress directly — the browser only ever
// talks to the Node API, which is already same-origin and already
// proven working. A server-to-server request from Node to WordPress
// has no concept of CORS at all, since CORS is exclusively a
// browser-enforced restriction — this removes the cross-origin
// request from existing in the first place, which is a more durable
// fix than any WordPress-side CORS header configuration.
const API_URL = ((import.meta as any).env?.VITE_API_URL ?? '/api').replace(/\/$/, '');

export interface ServiceAreaPage {
  id: number;
  title: string;
  serviceName: string;
  suburb: string;
  state: string;
  introParagraph: string;
  faq: { q: string; a: string }[];
  toc: { label: string; href: string }[];
  suburbFacts: { label: string; value: string; note?: string }[];
  compare: { title: string; body: string; ask: string }[];
  demand: { title: string; rows: [string, number][] }[];
  glance: [string, string][];
  serviceCounts: [string, number][];
  requested: { label: string; requests: string; providers: string; v: number; on: boolean }[];
  languages: { name: string; native: string; count: string; share: string }[];
  heroStats: { providerCount?: number; medianResponseMinutes?: number; hourlyRate?: number } | null;
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
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
    demand: safeParseJson(meta.demand_json, []),
    glance: safeParseJson(meta.glance_json, []),
    serviceCounts: safeParseJson(meta.service_counts_json, []),
    requested: safeParseJson(meta.requested_json, []),
    languages: safeParseJson(meta.languages_json, []),
    heroStats: safeParseJson(meta.hero_stats_json, null),
  };
}

export async function getServiceAreaPage(serviceSlug: string, suburbSlug: string): Promise<ServiceAreaPage | null> {
  try {
    const res = await fetch(`${API_URL}/wp/rest/wp-json/wp/v2/service-area-pages?slug=${serviceSlug}-${suburbSlug}`);
    if (!res.ok) return null;
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    return mapServiceAreaPage(results[0]);
  } catch (err) {
    console.error('[wordpressApi] Request failed:', err);
    return null;
  }
}

// --- Generic content layer: Pages + any registered CPT ---
const contentCache = new Map<string, unknown>();

let cacheBuiltAt = Date.now();
let lastFreshnessCheck = 0;
async function ensureCacheFresh(): Promise<void> {
  const now = Date.now();
  if (now - lastFreshnessCheck < 30_000) return;
  lastFreshnessCheck = now;
  try {
    const res = await fetch(`${API_URL}/webhooks/wordpress/last-changed`);
    if (!res.ok) return;
    const { lastChangedAt } = await res.json();
    if (lastChangedAt && new Date(lastChangedAt).getTime() > cacheBuiltAt) {
      contentCache.clear();
      cacheBuiltAt = now;
    }
  } catch {
    // Keep serving whatever is cached rather than breaking content display.
  }
}

async function wpFetch<T>(path: string, cacheKey: string): Promise<T | null> {
  await ensureCacheFresh();
  if (contentCache.has(cacheKey)) return contentCache.get(cacheKey) as T;
  try {
    const res = await fetch(`${API_URL}/wp/rest${path}`);
    if (!res.ok) return null;
    const data = await res.json();
    contentCache.set(cacheKey, data);
    return data as T;
  } catch (err) {
    console.error(`[wordpressApi] Request failed for ${path}:`, err);
    return null;
  }
}

export interface WPImage { url: string; alt: string; width?: number; height?: number }

function extractFeaturedImage(raw: any): WPImage | null {
  const media = raw._embedded?.['wp:featuredmedia']?.[0];
  if (!media || media.code) return null;
  return {
    url: media.source_url,
    alt: media.alt_text || raw.title?.rendered || '',
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

export interface WPTerm { id: number; name: string; slug: string; taxonomy: string; parent: number }

function extractTerms(raw: any): WPTerm[] {
  const groups = raw._embedded?.['wp:term'] ?? [];
  return groups.flat().filter((t: any) => t && !t.code).map((t: any) => ({
    id: t.id, name: t.name, slug: t.slug, taxonomy: t.taxonomy, parent: t.parent ?? 0,
  }));
}

export interface WPContentBase {
  id: number;
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  featuredImage: WPImage | null;
  terms: WPTerm[];
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
    terms: extractTerms(raw),
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

// One generic fetcher for any CPT registered in cptRouteConfig.ts.
export interface WPCPTItem extends WPContentBase { meta: Record<string, unknown> }
export async function getCPTItem(restBase: string, slug: string): Promise<WPCPTItem | null> {
  const results = await wpFetch<any[]>(`/wp-json/wp/v2/${restBase}?slug=${encodeURIComponent(slug)}&_embed`, `${restBase}:${slug}`);
  if (!results?.length) return null;
  return { ...mapBaseContent(results[0]), meta: results[0].meta ?? {} };
}

// --- Real taxonomy term lists ---
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

// --- Dynamic navigation menu (Appearance > Menus in wp-admin) ---
export interface WPMenuItem { id: number; title: string; url: string; children: WPMenuItem[] }

export async function getMenu(location: string): Promise<WPMenuItem[]> {
  const result = await wpFetch<{ items: WPMenuItem[] }>(`/wp-json/soldirectory/v1/menu/${location}`, `menu:${location}`);
  return result?.items ?? [];
}

// --- Mega menu columns, built from any real taxonomy ---
export interface MegaGroupFromWP { title: string; links: string[] }

/**
 * Generic version — works for any of the mega menu's 5 taxonomies
 * (service-categories, condition-categories, funding-categories,
 * coordinator-categories, language-categories), not just services.
 * Parent terms become column group headings, child terms become the
 * links inside them — same structure MegaMenu.tsx already renders.
 */
export async function getMegaColumnsForTaxonomy(restBase: string, columnCount = 4): Promise<MegaGroupFromWP[][]> {
  const { items: terms } = await getTerms(restBase, `terms:${restBase}`);
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

// Kept for backward compatibility with any existing caller —
// equivalent to getMegaColumnsForTaxonomy('service-categories', n).
export function getServiceCategoryMegaColumns(columnCount = 4): Promise<MegaGroupFromWP[][]> {
  return getMegaColumnsForTaxonomy('service-categories', columnCount);
}

// --- Real fix for the Service tab specifically: unlike the other 4
// mega menu taxonomies (which are genuine two-level term hierarchies
// seeded directly as terms), Service categories are top-level terms
// only — the actual 89 services live as real 'service' POSTS
// assigned to those categories, not as child terms. This function
// queries posts-by-category instead of terms-by-parent, and returns
// each link with its REAL slug so clicking it can go to the actual
// service page rather than guessing a slug from the display name.
export interface MegaLinkWithSlug { name: string; slug: string }
export interface MegaGroupWithSlugs { title: string; links: MegaLinkWithSlug[] }

export async function getServiceMegaColumnsFromPosts(columnCount = 4): Promise<MegaGroupWithSlugs[][]> {
  const { items: categories } = await getServiceCategories();
  if (categories.length === 0) return [];

  const groups: MegaGroupWithSlugs[] = [];
  for (const cat of categories) {
    const posts = await wpFetch<any[]>(
      // WordPress auto-generates this collection filter param from
      // the taxonomy's rest_base ('service-categories', hyphenated —
      // see post-types.php), NOT the taxonomy's own name
      // (service_category, underscored). Using the wrong one here
      // would silently return unfiltered results instead of an
      // error, which is a much harder bug to notice.
      `/wp-json/wp/v2/services?service-categories=${cat.id}&per_page=100`,
      `services-in-category:${cat.id}`
    );
    if (!posts?.length) continue;
    groups.push({
      title: cat.name,
      links: posts.map((p: any) => ({ name: p.title?.rendered ?? '', slug: p.slug })),
    });
  }

  const columns: MegaGroupWithSlugs[][] = Array.from({ length: columnCount }, () => []);
  groups.forEach((g, i) => columns[i % columnCount].push(g));
  return columns.filter((c) => c.length > 0);
}
