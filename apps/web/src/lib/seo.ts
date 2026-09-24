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
 * The site-wide robots value: same rule as vite.config.ts fills into
 * index.html's %ROBOTS% (VITE_ALLOW_INDEXING). An indexable page falls back
 * to this rather than hard-coding "index", so a staging build stays noindex.
 * Computed from the build flag, NOT read back from the document: the server
 * may already have swapped in a page-specific value (e.g. "noindex, follow"
 * on a thin register page), which must not become the default for every
 * page the visitor navigates to next.
 */
const SITE_ROBOTS: string = import.meta.env.VITE_ALLOW_INDEXING === 'true' ? 'index, follow' : 'noindex, nofollow';

// The defaults in index.html - keep in step with it. Not read from the
// document for the same reason as SITE_ROBOTS above.
const SHELL_TITLE = 'SolDirectory — Find NDIS and aged care providers';
const SHELL_DESCRIPTION =
  'Find disability and aged care providers who have capacity, matched to your suburb, funding and support needs. Free for families, participants and coordinators.';

/**
 * Puts the <head> back to what the HTML shell shipped with. Called on every
 * route change, BEFORE the new page sets its own tags, so a page that never
 * calls applySeoTags (e.g. /locations) doesn't inherit the previous page's
 * title, canonical or noindex when someone navigates within the app.
 */
export function resetSeoTags(): void {
  if (typeof document === 'undefined') return;
  document.title = SHELL_TITLE;
  document.querySelector('meta[name="description"]')?.setAttribute('content', SHELL_DESCRIPTION);
  document.querySelector('meta[name="robots"]')?.setAttribute('content', SITE_ROBOTS);
  document.querySelector('link[rel="canonical"]')?.remove();
  for (const sel of ['meta[property="og:title"]', 'meta[property="og:description"]', 'meta[property="og:image"]', 'meta[name="twitter:card"]']) {
    document.querySelector(sel)?.remove();
  }
}

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
