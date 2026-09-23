import type { Request, Response } from 'express';
import Provider from '../models/Provider.js';
import RegisterListing from '../models/RegisterListing.js';
import { computeHub } from './register.controller.js';
import { REGISTER_TYPES, STATE_CODES, type RegisterType } from '../services/registerNormalise.js';

// Real sitemap — every URL here is either a genuinely static public
// route, a real provider slug from the database, a public-register page
// that actually has content, or (best-effort) real WordPress content
// fetched at request time. Nothing invented.
//
// /sitemap.xml is an INDEX pointing at:
//   /sitemap-pages.xml          — the marketing/CMS pages and real providers
//   /sitemap-register-N.xml     — register listing pages, 10,000 per file
// A single sitemap file is capped at 50,000 URLs / 50 MB, and register
// pages alone are in the tens of thousands, so they're split up front
// rather than left to break later.

const STATIC_PUBLIC_ROUTES = ['/', '/directory', '/services', '/locations', '/providers', '/ndis-providers', '/aged-care-providers'];
const REGISTER_PATH: Record<RegisterType, string> = { ndis: '/ndis-providers', aged_care: '/aged-care-providers' };
const REGISTER_CHUNK = 10_000;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes
const REGISTER_CACHE_MS = 30 * 60 * 1000;

interface UrlEntry { path: string; lastmod?: Date }

let pagesCache: { urls: UrlEntry[]; at: number } | null = null;
let registerCache: { urls: UrlEntry[]; at: number } | null = null;

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const siteUrlFor = (req: Request) => (process.env.SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// Skips anything an editor has flagged "Hide from search engines"
// (the SEO field group's seo_noindex toggle, custom-fields.php) — a
// sitemap entry for a page that also tells crawlers not to index it
// would just waste crawl budget on a contradiction.
async function fetchWpSlugs(base: string, path: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}${path}?per_page=100&_fields=slug,meta.seo_noindex`);
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items.filter((i: any) => !i?.meta?.seo_noindex).map((i: any) => i.slug).filter(Boolean);
  } catch {
    return [];
  }
}

// Matches web/src/data/slugHelpers.ts's slugify() exactly — the real
// service_area_page's own service_name/suburb fields (not a guessed
// split of its WP slug) are what building /services/:service/:suburb
// correctly depends on.
function slugify(text: string): string {
  return text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * service_area_page is the service×suburb combo page
 * (ServiceLocationPage.tsx, route /services/:serviceSlug/:suburb) — by
 * far the largest and most search-relevant page type on the site, so
 * it gets its own fetch rather than reusing fetchWpSlugs: the route
 * needs the real service_name/suburb fields, not the post's own WP
 * slug (which isn't unambiguously splittable back into the two).
 */
async function fetchServiceAreaPaths(base: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}/wp-json/wp/v2/service-area-pages?per_page=100&_fields=meta`);
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];
    return items
      .filter((i: any) => !i?.meta?.seo_noindex)
      .map((i: any) => {
        const service = slugify(String(i?.meta?.service_name ?? ''));
        const suburb = slugify(String(i?.meta?.suburb ?? ''));
        return service && suburb ? `/services/${service}/${suburb}` : null;
      })
      .filter((p): p is string => !!p);
  } catch {
    return [];
  }
}

async function buildPageUrls(): Promise<UrlEntry[]> {
  if (pagesCache && Date.now() - pagesCache.at < CACHE_MS) return pagesCache.urls;

  const paths = [...STATIC_PUBLIC_ROUTES];
  const wpUrl = process.env.WORDPRESS_URL; // server-side var, separate from the frontend's VITE_WORDPRESS_URL

  // Real provider slugs — only accounts that actually completed
  // onboarding far enough to have one, active accounts only.
  const providers = await Provider.find({ accountStatus: 'active', slug: { $exists: true, $ne: null } }).select('slug').lean();
  for (const p of providers) paths.push(`/providers/${(p as any).slug}`);

  // Real WordPress content, best-effort — a WordPress outage
  // shouldn't take the whole sitemap down, it just means those URLs
  // are temporarily missing from it until the next regeneration.
  if (wpUrl) {
    const [pages, services, locations, guides, serviceAreaPaths] = await Promise.all([
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/pages'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/services'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/locations'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/guides'),
      fetchServiceAreaPaths(wpUrl),
    ]);
    pages.forEach((slug) => paths.push(`/${slug}`));
    services.forEach((slug) => paths.push(`/services/${slug}`));
    locations.forEach((slug) => paths.push(`/locations/${slug}`));
    guides.forEach((slug) => paths.push(`/guides/${slug}`));
    paths.push(...serviceAreaPaths);
  }

  const urls = [...new Set(paths)].map((path) => ({ path }));
  pagesCache = { urls, at: Date.now() };
  return urls;
}

/**
 * Register pages worth indexing: every provider page that has at least
 * one recognised service, each state hub, and only those suburb hubs
 * with enough real listings (MIN_SUBURB_LISTINGS) to be more than a
 * keyword page. Providers with nothing but a name are left out — they
 * stay reachable and noindex, they just aren't advertised to crawlers.
 */
async function buildRegisterUrls(): Promise<UrlEntry[]> {
  if (registerCache && Date.now() - registerCache.at < REGISTER_CACHE_MS) return registerCache.urls;

  const urls: UrlEntry[] = [];
  for (const type of REGISTER_TYPES) {
    const base = REGISTER_PATH[type];
    for (const state of STATE_CODES) urls.push({ path: `${base}/${state.toLowerCase()}` });

    const hub = await computeHub(type);
    for (const s of hub.suburbs) urls.push({ path: `${base}/${s.state.toLowerCase()}/${s.slug}` });

    const cursor = RegisterListing.find({ type, 'services.0': { $exists: true } }).select('slug updatedAt').lean().cursor();
    for await (const d of cursor) urls.push({ path: `${base}/${d.slug}`, lastmod: (d as any).updatedAt });
  }
  registerCache = { urls, at: Date.now() };
  return urls;
}

const urlsetXml = (site: string, urls: UrlEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${xmlEscape(site + u.path)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`).join('\n') +
  `\n</urlset>`;

function sendXml(res: Response, xml: string) {
  res.set('Content-Type', 'application/xml');
  res.set('Cache-Control', 'public, max-age=600');
  res.send(xml);
}

/** GET /sitemap.xml — the index. */
export async function getSitemap(req: Request, res: Response) {
  const site = siteUrlFor(req);
  const register = await buildRegisterUrls().catch(() => [] as UrlEntry[]);
  const chunks = Math.ceil(register.length / REGISTER_CHUNK);
  const entries = ['sitemap-pages.xml', ...Array.from({ length: chunks }, (_, i) => `sitemap-register-${i + 1}.xml`)];
  sendXml(
    res,
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      entries.map((e) => `  <sitemap><loc>${xmlEscape(`${site}/${e}`)}</loc></sitemap>`).join('\n') +
      `\n</sitemapindex>`
  );
}

/** GET /sitemap-pages.xml and /sitemap-register-N.xml */
export async function getSitemapPart(req: Request, res: Response) {
  const site = siteUrlFor(req);
  const name = String(req.params.name ?? '');

  if (name === 'pages') return sendXml(res, urlsetXml(site, await buildPageUrls()));

  const match = /^register-(\d+)$/.exec(name);
  if (!match) return res.status(404).send('Not found');
  const n = Number(match[1]);
  const register = await buildRegisterUrls();
  const slice = register.slice((n - 1) * REGISTER_CHUNK, n * REGISTER_CHUNK);
  if (n < 1 || !slice.length) return res.status(404).send('Not found');
  sendXml(res, urlsetXml(site, slice));
}
