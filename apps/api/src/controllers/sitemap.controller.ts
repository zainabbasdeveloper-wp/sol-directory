import type { Request, Response } from 'express';
import Provider from '../models/Provider.js';

// Real sitemap — every URL here is either a genuinely static public
// route, a real provider slug from the database, or (best-effort)
// real WordPress content fetched at request time. Nothing invented.
// Cached briefly in-memory since a sitemap doesn't need to be
// millisecond-fresh and crawlers can request it frequently.

const STATIC_PUBLIC_ROUTES = ['/', '/directory', '/services', '/locations', '/providers'];

let cached: { xml: string; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000; // 10 minutes

// Skips anything an editor has flagged "Hide from search engines"
// (the SEO field group's seo_noindex toggle, acf-fields.php) — a
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

export async function getSitemap(req: Request, res: Response) {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    res.set('Content-Type', 'application/xml');
    return res.send(cached.xml);
  }

  const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const wpUrl = process.env.WORDPRESS_URL; // server-side var, separate from the frontend's VITE_WORDPRESS_URL

  const urls = [...STATIC_PUBLIC_ROUTES];

  // Real provider slugs — only accounts that actually completed
  // onboarding far enough to have one, active accounts only.
  const providers = await Provider.find({ accountStatus: 'active', slug: { $exists: true, $ne: null } }).select('slug').lean();
  for (const p of providers) urls.push(`/providers/${(p as any).slug}`);

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
    pages.forEach((slug) => urls.push(`/${slug}`));
    services.forEach((slug) => urls.push(`/services/${slug}`));
    locations.forEach((slug) => urls.push(`/locations/${slug}`));
    guides.forEach((slug) => urls.push(`/guides/${slug}`));
    urls.push(...serviceAreaPaths);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}
</urlset>`;

  cached = { xml, at: Date.now() };
  res.set('Content-Type', 'application/xml');
  res.send(xml);
}
