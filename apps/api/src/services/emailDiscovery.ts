/**
 * Finds a contact email on a business's OWN website — never guessed,
 * never taken from anyone else's site. Deliberately lower confidence
 * than logoDiscovery.ts: a great many business sites expose NO plain
 * email at all, often on purpose (a contact FORM instead, specifically
 * to avoid being scraped by exactly this kind of tool), so a hit rate
 * well below logo discovery's is expected and not a bug.
 *
 * Priority, highest first:
 *  1. A real <a href="mailto:..."> link — the site owner's own explicit
 *     "email us" signal.
 *  2. Cloudflare's "email protection" obfuscation (data-cfemail="...") —
 *     extremely common, trivially reversible, still the owner's own
 *     published address.
 *  3. The same two checks again on a likely contact page, if the
 *     homepage had neither (one extra fetch, first path that responds).
 *  4. A plain-text email pattern in the HTML, but ONLY if its domain
 *     matches the business's own website domain — guards against
 *     picking up a third-party address from an embedded widget, form
 *     service, or analytics snippet instead of the business's own.
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; SolDirectoryBot/1.0; +https://directory.solbusinessconsultant.com.au)';

// Domains that show up in mailto/text scans but are never the business's
// own contact address — form/analytics/CMS vendors, placeholders.
const DOMAIN_DENYLIST = [
  'sentry.io', 'wixpress.com', 'godaddy.com', 'example.com', 'schema.org', 'w3.org',
  'google-analytics.com', 'googletagmanager.com', 'gstatic.com', 'cloudflareinsights.com',
  'hotjar.com', 'doubleclick.net', 'facebook.com', 'wordpress.com', 'sentry-next.io', 'mailchimp.com',
];

const CONTACT_PATHS = ['/contact', '/contact-us', '/contact-us/', '/contactus', '/about/contact', '/about-us/contact'];

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function fetchText(url: string): Promise<string | null> {
  const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal, redirect: 'follow', headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return null;
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

function isEmailShaped(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function domainOf(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

function isDenylisted(email: string): boolean {
  const domain = domainOf(email);
  if (DOMAIN_DENYLIST.some((d) => domain === d || domain.endsWith(`.${d}`))) return true;
  if (/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(email)) return true;
  if (/^(noreply|no-reply|donotreply)@/i.test(email)) return true;
  return false;
}

/** Reverses Cloudflare's email-obfuscation encoding (a documented, simple XOR). */
function decodeCloudflareEmail(hex: string): string | null {
  try {
    const bytes = hex.match(/../g)?.map((h) => parseInt(h, 16));
    if (!bytes || bytes.length < 2) return null;
    const key = bytes[0];
    const decoded = bytes.slice(1).map((b) => String.fromCharCode(b ^ key)).join('');
    return isEmailShaped(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function fromMailto(html: string): string | null {
  const re = /href=["']mailto:([^"'?]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const email = decodeURIComponent(m[1]).trim();
    if (isEmailShaped(email) && !isDenylisted(email)) return email;
  }
  return null;
}

function fromCloudflareProtection(html: string): string | null {
  const re = /data-cfemail=["']([a-f0-9]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const email = decodeCloudflareEmail(m[1]);
    if (email && !isDenylisted(email)) return email;
  }
  return null;
}

function fromSameDomainText(html: string, siteDomain: string): string | null {
  const re = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const matches = html.match(re) ?? [];
  for (const raw of matches) {
    const email = raw.toLowerCase();
    if (isDenylisted(email)) continue;
    if (domainOf(email) === siteDomain || domainOf(email).endsWith(`.${siteDomain}`)) return email;
  }
  return null;
}

function extractFromHtml(html: string, siteDomain: string): string | null {
  return fromMailto(html) ?? fromCloudflareProtection(html) ?? fromSameDomainText(html, siteDomain);
}

/**
 * Looks up a contact email for a business's own website. Returns null far
 * more often than discoverLogo does — that's expected, not a failure.
 * Never throws — same reliability contract as discoverLogo/geocodeAddress.
 */
export async function discoverEmail(website: string): Promise<string | null> {
  if (!website) return null;
  let homepage: string;
  let siteDomain: string;
  try {
    const u = new URL(website);
    homepage = u.toString();
    siteDomain = u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }

  const homeHtml = await fetchText(homepage);
  if (homeHtml) {
    const found = extractFromHtml(homeHtml, siteDomain);
    if (found) return found;
  }

  for (const path of CONTACT_PATHS) {
    const contactUrl = new URL(path, homepage).toString();
    const html = await fetchText(contactUrl);
    if (!html) continue;
    const found = extractFromHtml(html, siteDomain);
    if (found) return found;
    break; // only the first contact path that actually responds is worth trying
  }

  return null;
}
