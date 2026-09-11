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

async function fetchWpSlugs(base: string, path: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}${path}?per_page=100&_fields=slug`);
    if (!res.ok) return [];
    const items = await res.json();
    return Array.isArray(items) ? items.map((i: any) => i.slug).filter(Boolean) : [];
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
    const [pages, services, locations, guides] = await Promise.all([
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/pages'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/services'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/locations'),
      fetchWpSlugs(wpUrl, '/wp-json/wp/v2/guides'),
    ]);
    pages.forEach((slug) => urls.push(`/${slug}`));
    services.forEach((slug) => urls.push(`/services/${slug}`));
    locations.forEach((slug) => urls.push(`/locations/${slug}`));
    guides.forEach((slug) => urls.push(`/guides/${slug}`));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}
</urlset>`;

  cached = { xml, at: Date.now() };
  res.set('Content-Type', 'application/xml');
  res.send(xml);
}
