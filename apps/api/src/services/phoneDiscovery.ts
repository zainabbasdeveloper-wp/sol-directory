/**
 * Finds a contact phone number on a business's OWN website — never
 * guessed, never taken from anyone else's site. Same reliability
 * contract and priority shape as emailDiscovery.ts:
 *
 *  1. A real <a href="tel:..."> link — the site owner's own explicit
 *     "call us" signal, same confidence as a mailto: link.
 *  2. An AU-shaped phone number in the page text (mobile, landline,
 *     1300/1800), validated by registerNormalise.ts's own digit-count
 *     check so stray numbers (ABNs, postcodes, years) can't sneak in.
 *  3. The same two checks again on a likely contact page, if the
 *     homepage had neither.
 *
 * Only used to fill in listings the original register import had no
 * phone for — most listings already have one straight from the
 * register/scrape (see registerNormalise.ts's normalisePhone).
 */

import { fetchText } from './logoDiscovery.js';
import { CONTACT_PATHS } from './emailDiscovery.js';
import { normalisePhone } from './registerNormalise.js';

// AU landline (02/03/04 is mobile handled separately/07/08, optionally
// in brackets), 13/1300/1800 numbers, and mobiles — the shapes an AU
// business actually publishes, not a generic international pattern.
const PHONE_RE = /(?:\+?61[\s.-]?)?(?:\(0[2-8]\)[\s.-]?|0[2-8][\s.-]?)\d{4}[\s.-]?\d{4}|\b1[38]00[\s.-]?\d{3}[\s.-]?\d{3}\b|\b13[\s.-]?\d{2}[\s.-]?\d{2}\b|\b04\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g;

function fromTelLink(html: string): string | null {
  const re = /href=["']tel:([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = decodeURIComponent(m[1]).trim();
    const normalised = normalisePhone(raw);
    if (normalised) return normalised;
  }
  return null;
}

function fromText(html: string): string | null {
  // Strip tags first so phone-shaped version/build numbers inside script
  // src="...4-5678..." style asset URLs can't match; plain text only.
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const matches = text.match(PHONE_RE) ?? [];
  for (const raw of matches) {
    const normalised = normalisePhone(raw);
    if (normalised) return normalised;
  }
  return null;
}

/** Exported so the combined fetch script can run this against HTML it already downloaded itself. */
export function extractPhoneFromHtml(html: string): string | null {
  return fromTelLink(html) ?? fromText(html);
}

/**
 * Looks up a phone number for a business's own website. Returns null
 * when nothing usable is found — never throws, same reliability
 * contract as discoverLogo/discoverEmail.
 */
export async function discoverPhone(website: string): Promise<string | null> {
  if (!website) return null;
  let homepage: string;
  try {
    homepage = new URL(website).toString();
  } catch {
    return null;
  }

  const homeHtml = await fetchText(homepage);
  if (homeHtml) {
    const found = extractPhoneFromHtml(homeHtml);
    if (found) return found;
  }

  for (const path of CONTACT_PATHS) {
    const contactUrl = new URL(path, homepage).toString();
    const html = await fetchText(contactUrl);
    if (!html) continue;
    const found = extractPhoneFromHtml(html);
    if (found) return found;
    break; // only the first contact path that actually responds is worth trying
  }

  return null;
}
