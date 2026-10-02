interface AuditOptions {
  baseUrl: string;
  concurrency: number;
  limit: number | null;
}

interface PageResult {
  url: string;
  title: string;
  description: string;
  words: number;
  errors: string[];
  warnings: string[];
}

const args = process.argv.slice(2);

function argValue(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const rawBase = argValue('--base') || process.env.SITE_URL || '';
if (!rawBase) {
  console.error('Usage: npm run audit:seo -- --base https://www.example.com [--concurrency 6] [--limit 100]');
  process.exit(1);
}

const options: AuditOptions = {
  baseUrl: rawBase.replace(/\/$/, ''),
  concurrency: Math.max(1, Math.min(20, Number(argValue('--concurrency')) || 6)),
  limit: argValue('--limit') ? Math.max(1, Number(argValue('--limit'))) : null,
};

const decode = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const text = (html: string) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const first = (html: string, pattern: RegExp) => decode(pattern.exec(html)?.[1]?.trim() ?? '');

async function fetchText(url: string): Promise<{ response: Response; body: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'SolDirectorySeoAudit/1.0' },
        redirect: 'follow',
        signal: controller.signal,
      });
      const body = await response.text();
      clearTimeout(timer);
      return { response, body };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
  }
  throw lastError;
}

function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));
}

async function discoverUrls(): Promise<string[]> {
  const { response, body } = await fetchText(`${options.baseUrl}/sitemap.xml`);
  if (!response.ok) throw new Error(`Sitemap index returned ${response.status}`);
  if (response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Sitemap index returned HTML instead of XML');
  }
  const locations = sitemapLocations(body);
  const sitemapUrls = locations.filter((url) => /\/sitemap-[^/]+\.xml(?:\?|$)/i.test(url));
  const pageUrls = locations.filter((url) => !sitemapUrls.includes(url));

  for (const sitemapUrl of sitemapUrls) {
    const result = await fetchText(sitemapUrl);
    if (!result.response.ok) throw new Error(`${sitemapUrl} returned ${result.response.status}`);
    pageUrls.push(...sitemapLocations(result.body));
  }

  const unique = [...new Set(pageUrls)];
  const urls = options.limit ? unique.slice(0, options.limit) : unique;
  if (urls.length === 0) throw new Error('Sitemap discovery returned no page URLs');
  return urls;
}

function auditHtml(url: string, response: Response, html: string): PageResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const title = first(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = first(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || first(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const canonical = first(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || first(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const robots = first(html, /<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i).toLowerCase();
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const jsonLdCount = (html.match(/type=["']application\/ld\+json["']/gi) ?? []).length;
  const mainHtml = first(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || html;
  const words = text(mainHtml).split(/\s+/).filter(Boolean).length;

  if (!response.ok) errors.push(`HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.includes('text/html')) errors.push('not HTML');
  if (!title) errors.push('missing title');
  if (!description) errors.push('missing description');
  if (!canonical) errors.push('missing canonical');
  if (robots.includes('noindex')) errors.push('sitemap URL is noindex');
  if (h1Count !== 1) errors.push(`${h1Count} H1 elements`);
  if (jsonLdCount === 0) errors.push('missing JSON-LD');
  if (title.length > 65) warnings.push(`title is ${title.length} characters`);
  if (description.length < 80 || description.length > 165) warnings.push(`description is ${description.length} characters`);
  const pathname = new URL(url).pathname;
  const minimumWords = pathname.startsWith('/services/') ? 1000 : 120;
  const isServiceLocation = /^\/services\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname);
  if (words < minimumWords) {
    const message = `thin content: ${words} words (target ${minimumWords})`;
    if (isServiceLocation) errors.push(message);
    else warnings.push(message);
  }

  try {
    const expected = new URL(url);
    const actual = new URL(canonical);
    const normalise = (path: string) => path.length > 1 ? path.replace(/\/$/, '') : path;
    if (expected.origin !== actual.origin || normalise(expected.pathname) !== normalise(actual.pathname)) {
      errors.push(`canonical mismatch: ${canonical}`);
    }
  } catch {
    errors.push(`invalid canonical: ${canonical || '(empty)'}`);
  }

  return { url, title, description, words, errors, warnings };
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, task: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function main() {
  console.log(`Discovering URLs from ${options.baseUrl}/sitemap.xml`);
  const urls = await discoverUrls();
  console.log(`Auditing ${urls.length.toLocaleString('en-AU')} URLs with concurrency ${options.concurrency}`);

  const results = await mapConcurrent(urls, options.concurrency, async (url, index) => {
    try {
      const { response, body } = await fetchText(url);
      const result = auditHtml(url, response, body);
      if ((index + 1) % 250 === 0 || index + 1 === urls.length) console.log(`Checked ${(index + 1).toLocaleString('en-AU')} / ${urls.length.toLocaleString('en-AU')}`);
      return result;
    } catch (error) {
      return { url, title: '', description: '', words: 0, errors: [`request failed: ${(error as Error).message}`], warnings: [] };
    }
  });

  const titleUrls = new Map<string, string[]>();
  const descriptionUrls = new Map<string, string[]>();
  for (const result of results) {
    if (result.title) titleUrls.set(result.title, [...(titleUrls.get(result.title) ?? []), result.url]);
    if (result.description) descriptionUrls.set(result.description, [...(descriptionUrls.get(result.description) ?? []), result.url]);
  }
  for (const [title, matches] of titleUrls) if (matches.length > 1) matches.forEach((url) => results.find((r) => r.url === url)?.warnings.push(`duplicate title on ${matches.length} URLs: ${title}`));
  for (const [description, matches] of descriptionUrls) if (matches.length > 1) matches.forEach((url) => results.find((r) => r.url === url)?.warnings.push(`duplicate description on ${matches.length} URLs: ${description.slice(0, 70)}`));

  const failures = results.filter((result) => result.errors.length > 0);
  const warnings = results.filter((result) => result.warnings.length > 0);
  for (const result of [...failures, ...warnings.filter((result) => !failures.includes(result))].slice(0, 100)) {
    console.log(`\n${result.url}`);
    result.errors.forEach((error) => console.log(`  ERROR: ${error}`));
    result.warnings.forEach((warning) => console.log(`  WARN: ${warning}`));
  }

  console.log(`\nSEO audit complete: ${results.length.toLocaleString('en-AU')} checked, ${failures.length.toLocaleString('en-AU')} failed, ${warnings.length.toLocaleString('en-AU')} with warnings.`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});