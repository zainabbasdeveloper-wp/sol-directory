/**
 * Finds a business's own logo/icon on its OWN website — never copied,
 * downloaded or re-hosted from anywhere else, and never from a
 * competitor's site. This fetches the business's homepage HTML, looks
 * for the icon/social-preview image it publishes itself (the same
 * image a browser tab or a social-media share card would show), and
 * returns a URL that still points at the business's own domain.
 *
 * Deliberately does NOT download or store the image bytes: the result
 * is just a link, so if the business changes or removes it later the
 * page simply falls back to initials (same as any other Avatar), and
 * nothing of theirs is ever copied onto this site.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000; // 2MB is enough for any real homepage's <head>
const USER_AGENT = 'Mozilla/5.0 (compatible; SolDirectoryBot/1.0; +https://directory.solbusinessconsultant.com.au)';

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string | null> {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { signal, redirect: 'follow', headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;
    // Read at most MAX_HTML_BYTES — a homepage's <head> is always near the top of the document.
    const reader = res.body?.getReader();
    if (!reader) return res.text();
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) { chunks.push(value); received += value.length; }
    }
    reader.cancel().catch(() => {});
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
  } catch {
    return null;
  } finally {
    cancel();
  }
}

/** HEAD (falling back to a short-range GET) to confirm a candidate URL really serves an image, without downloading it in full. */
async function isRealImage(url: string): Promise<boolean> {
  const { signal, cancel } = withTimeout(5000);
  try {
    let res = await fetch(url, { signal, method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': USER_AGENT } });
    // Some servers don't implement HEAD properly — a tiny ranged GET is the fallback.
    if (!res.ok || !res.headers.get('content-type')) {
      res = await fetch(url, { signal, method: 'GET', redirect: 'follow', headers: { 'User-Agent': USER_AGENT, Range: 'bytes=0-0' } });
    }
    if (!res.ok && res.status !== 206) return false;
    const type = res.headers.get('content-type') ?? '';
    return type.startsWith('image/');
  } catch {
    return false;
  } finally {
    cancel();
  }
}

function absolutize(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Pulls candidate icon/preview-image URLs out of a page's <head>, best first. */
function extractCandidates(html: string, pageUrl: string): string[] {
  const head = html.split(/<\/head>/i)[0] ?? html.slice(0, 20000);
  const candidates: { href: string; score: number }[] = [];

  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(head))) {
    const tag = m[0];
    const relMatch = /\brel=["']?([^"'\s>]+(?:\s+[^"'\s>]+)*)/i.exec(tag);
    const hrefMatch = /\bhref=["']([^"']+)["']/i.exec(tag);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase();
    const href = absolutize(hrefMatch[1], pageUrl);
    if (!href) continue;
    // apple-touch-icon and <link rel="icon"> are both specifically declared
    // as the site's brand icon, so both rank above og:image — a general
    // social-share image that's sometimes a photo (a building, a room, a
    // team) rather than the actual logo.
    if (rel.includes('apple-touch-icon')) candidates.push({ href, score: 4 });
    else if (rel.includes('mask-icon')) continue; // SVG silhouette, not a usable logo image
    else if (rel === 'icon' || rel.includes('shortcut icon')) candidates.push({ href, score: 3 });
  }

  // Lowest priority: a photo-shaped og:image is still better than nothing
  // for a small minority of sites with no icon tag at all, but it's the
  // least reliably "the logo" of any candidate here.
  const ogRe = /<meta\b[^>]*property=["']og:image["'][^>]*>/i.exec(head) ?? /<meta\b[^>]*name=["']og:image["'][^>]*>/i.exec(head);
  if (ogRe) {
    const content = /\bcontent=["']([^"']+)["']/i.exec(ogRe[0]);
    const href = content ? absolutize(content[1], pageUrl) : null;
    if (href) candidates.push({ href, score: 1.5 });
  }

  candidates.push({ href: absolutize('/favicon.ico', pageUrl) ?? `${pageUrl.replace(/\/$/, '')}/favicon.ico`, score: 1 });

  return [...new Set(candidates.sort((a, b) => b.score - a.score).map((c) => c.href))];
}

/**
 * Looks up a logo/icon for a business's own website. Returns an absolute
 * URL still on that business's own domain, or null if nothing usable was
 * found — never throws, same reliability contract as geocodeAddress.
 */
export async function discoverLogo(website: string): Promise<string | null> {
  if (!website) return null;
  let homepage: string;
  try {
    homepage = new URL(website).toString();
  } catch {
    return null;
  }

  const html = await fetchText(homepage);
  const candidates = html ? extractCandidates(html, homepage) : [absolutize('/favicon.ico', homepage)].filter((x): x is string => !!x);

  for (const url of candidates) {
    if (await isRealImage(url)) return url;
  }
  return null;
}
