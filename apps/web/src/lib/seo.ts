/**
 * Shared <head> tag + structured-data writer for every public page.
 * This app is a plain Vite SPA with no SSR/meta-framework, so these
 * are the real <head> tags the document has — not a virtual
 * representation rendered server-side. A crawler that doesn't execute
 * JavaScript (some social-media unfurlers, some bots) won't see any
 * of this; that's a real, stated limitation, not glossed over.
 *
 * Used by WordPressTemplate (every Page/Service/Location/Guide CPT)
 * and ServiceLocationPage (the service×suburb combo page, which has
 * its own hero and doesn't go through WordPressTemplate).
 */
/**
 * The robots value the HTML shell shipped with (index.html's %ROBOTS%,
 * driven by VITE_ALLOW_INDEXING). Captured once, before any page has
 * touched it, so an indexable page falls back to the SITE default rather
 * than hard-coding "index" — otherwise every page that calls
 * applySeoTags would quietly override a staging site's noindex.
 */
const SITE_ROBOTS: string =
  (typeof document !== 'undefined' && document.querySelector('meta[name="robots"]')?.getAttribute('content')) || 'index, follow';

export interface SeoTags {
  title: string;
  description: string;
  ogImage?: string | null;
  /** When true, tells crawlers not to index this specific page (e.g. an editor marked it draft-quality). */
  noindex?: boolean;
  /** Defaults to the current URL — only pass this to point a page's canonical at a different, more canonical URL. */
  canonicalUrl?: string;
}

function setMetaTag(selector: string, attr: string, value: string, createTag: () => HTMLElement) {
  let el = document.querySelector(selector) as HTMLElement | null;
  if (!el) { el = createTag(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

export function applySeoTags(seo: SeoTags): void {
  if (!seo.title) return; // nothing real to say yet (e.g. still loading) — leave whatever's there

  document.title = seo.title;

  setMetaTag('meta[name="description"]', 'content', seo.description, () => {
    const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m;
  });
  setMetaTag('meta[property="og:title"]', 'content', seo.title, () => {
    const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m;
  });
  setMetaTag('meta[property="og:description"]', 'content', seo.description, () => {
    const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m;
  });
  if (seo.ogImage) {
    setMetaTag('meta[property="og:image"]', 'content', seo.ogImage, () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:image'); return m;
    });
  }
  setMetaTag('meta[name="twitter:card"]', 'content', seo.ogImage ? 'summary_large_image' : 'summary', () => {
    const m = document.createElement('meta'); m.setAttribute('name', 'twitter:card'); return m;
  });
  setMetaTag('link[rel="canonical"]', 'href', seo.canonicalUrl || window.location.href, () => {
    const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
  });
  // "noindex, follow": keep the page out of results but let crawlers
  // still follow its links (thin pages still link to real ones).
  setMetaTag('meta[name="robots"]', 'content', seo.noindex ? 'noindex, follow' : SITE_ROBOTS, () => {
    const m = document.createElement('meta'); m.setAttribute('name', 'robots'); return m;
  });
}

/**
 * Writes (or clears, when data is null) a JSON-LD structured-data
 * block. `id` scopes it to one <script> tag so unrelated pages/effects
 * never stomp on each other's schema. Every field passed in must be
 * real — this never invents ratings, review counts or prices that
 * aren't backed by actual data, per this project's standing rule
 * against fabricated content.
 */
export function setJsonLd(id: string, data: Record<string, unknown> | null): void {
  const elId = `jsonld-${id}`;
  const existing = document.getElementById(elId);
  if (!data) { existing?.remove(); return; }
  const json = JSON.stringify({ '@context': 'https://schema.org', ...data });
  if (existing instanceof HTMLScriptElement) { existing.textContent = json; return; }
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = elId;
  script.textContent = json;
  document.head.appendChild(script);
}
