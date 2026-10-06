import fs from 'node:fs';

interface LinkRef { source: string; href: string }
interface TargetResult {
  url: string;
  status: number;
  location: string;
  error: string;
  noindex: boolean;
  anchors: Set<string>;
  refs: LinkRef[];
}

const args = process.argv.slice(2);
const arg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const base = (arg('--base') || process.env.SITE_URL || '').replace(/\/$/, '');
if (!base) {
  console.error('Usage: npm run audit:links -- --base https://directory.example.com [--per-type 20] [--concurrency 8] [--out report.json]');
  process.exit(1);
}
const origin = new URL(base).origin;
const perType = Math.max(1, Number(arg('--per-type')) || 20);
const concurrency = Math.max(1, Math.min(12, Number(arg('--concurrency')) || 8));
const outFile = arg('--out');
const timeoutMs = 25_000;

const decode = (value: string) => value
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

async function fetchText(url: string, redirect: RequestRedirect = 'follow') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect,
      signal: controller.signal,
      headers: { 'user-agent': 'SolDirectoryLinkAudit/1.0' },
    });
    return { response, body: await response.text(), error: '' };
  } catch (error) {
    return { response: null, body: '', error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapConcurrent<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

const sitemapLocations = (xml: string) => [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));

async function discoverSitemapUrls(): Promise<string[]> {
  const root = await fetchText(`${base}/sitemap.xml`);
  if (!root.response?.ok || !/<(urlset|sitemapindex)\b/i.test(root.body)) throw new Error('/sitemap.xml is unavailable or invalid');
  const initial = sitemapLocations(root.body);
  const childMaps = initial.filter((url) => /\/sitemap-[^/]+\.xml(?:\?|$)/i.test(url));
  const pages = initial.filter((url) => !childMaps.includes(url));
  const children = await mapConcurrent(childMaps, async (url) => {
    const fetched = await fetchText(url);
    if (!fetched.response?.ok) throw new Error(`${url} returned ${fetched.response?.status ?? fetched.error}`);
    return sitemapLocations(fetched.body);
  });
  return [...new Set([...pages, ...children.flat()].map((url) => {
    const parsed = new URL(url);
    return `${base}${parsed.pathname}${parsed.search}`;
  }))];
}

const pageType = (url: string) => {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments.length ? `/${segments[0]}${segments.slice(1).map(() => '/*').join('')}` : '/';
};

function sampleUrls(urls: string[]): string[] {
  const groups = new Map<string, string[]>();
  for (const url of urls) groups.set(pageType(url), [...(groups.get(pageType(url)) ?? []), url]);
  const sampled = new Set<string>();
  for (const group of groups.values()) {
    if (group.length <= perType) group.forEach((url) => sampled.add(url));
    else for (let index = 0; index < perType; index += 1) sampled.add(group[Math.floor(index * group.length / perType)]);
  }
  return [...sampled];
}

const assetPath = /\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|ico|pdf|zip|mp4|mp3|woff2?|ttf|eot|xml|json|txt)$/i;
const privatePath = /^\/(?:api|admin|dashboard|leads|login|onboarding|plans|providers\/|signup|workers(?:\/|$)|worker\/|provider\/|find-providers(?:\/|$)|saved-providers(?:\/|$))/;

function linksFrom(html: string, source: string): LinkRef[] {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1] ?? html;
  const links: LinkRef[] = [];
  for (const match of main.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decode(match[1].trim());
    if (!href || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const target = new URL(href, source);
      if (target.origin !== origin || assetPath.test(target.pathname) || privatePath.test(target.pathname)) continue;
      links.push({ source, href: target.href });
    } catch { /* malformed URLs are reported by browser tooling, not fetched */ }
  }
  return links;
}

const targetKey = (href: string) => {
  const url = new URL(href);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
  return url.href;
};

const hasNoindex = (html: string, header: string) => /\bnoindex\b/i.test(header)
  || /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*\bnoindex\b/i.test(html)
  || /<meta\b[^>]*content=["'][^"']*\bnoindex\b[^"']*["'][^>]*name=["']robots["']/i.test(html);

const anchorsFrom = (html: string) => new Set([
  ...[...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => decode(match[1])),
  ...[...html.matchAll(/\bname=["']([^"']+)["']/gi)].map((match) => decode(match[1])),
]);

const sitemapUrls = await discoverSitemapUrls();
const sourceUrls = sampleUrls(sitemapUrls);
const sourcePages = await mapConcurrent(sourceUrls, async (url) => {
  const fetched = await fetchText(url);
  return {
    url,
    status: fetched.response?.status ?? 0,
    error: fetched.error,
    noindex: hasNoindex(fetched.body, fetched.response?.headers.get('x-robots-tag') ?? ''),
    links: fetched.response?.ok ? linksFrom(fetched.body, url) : [],
  };
});

const refsByTarget = new Map<string, LinkRef[]>();
for (const source of sourcePages.filter((page) => !page.noindex)) {
  for (const ref of source.links) {
    const key = targetKey(ref.href);
    refsByTarget.set(key, [...(refsByTarget.get(key) ?? []), ref]);
  }
}

const targets = await mapConcurrent([...refsByTarget.entries()], async ([url, refs]): Promise<TargetResult> => {
  const fetched = await fetchText(url, 'manual');
  const response = fetched.response;
  return {
    url,
    status: response?.status ?? 0,
    location: response?.headers.get('location') ?? '',
    error: fetched.error,
    noindex: hasNoindex(fetched.body, response?.headers.get('x-robots-tag') ?? ''),
    anchors: response?.ok ? anchorsFrom(fetched.body) : new Set(),
    refs,
  };
});
const targetsByUrl = new Map(targets.map((target) => [target.url, target]));

const sourceExamples = (refs: LinkRef[]) => [...new Set(refs.map((ref) => ref.source))].slice(0, 3);
const failures = targets.filter((target) => target.error || target.status >= 400 || target.status === 0).map((target) => ({
  url: target.url, status: target.status, error: target.error, sources: sourceExamples(target.refs),
}));
const redirects = targets.filter((target) => target.status >= 300 && target.status < 400).map((target) => ({
  url: target.url, status: target.status, location: target.location, sources: sourceExamples(target.refs),
}));
const noindexTargets = targets.filter((target) => target.status >= 200 && target.status < 300 && target.noindex).map((target) => ({
  url: target.url, sources: sourceExamples(target.refs),
}));
const fragments = [...new Map(sourcePages.flatMap((source) => source.links).filter((ref) => new URL(ref.href).hash).map((ref) => [ref.href, ref])).values()];
const missingFragments = fragments.flatMap((ref) => {
  const parsed = new URL(ref.href);
  const target = targetsByUrl.get(targetKey(ref.href));
  const fragment = decodeURIComponent(parsed.hash.slice(1));
  return target?.status === 200 && !target.anchors.has(fragment) ? [{ source: ref.source, url: ref.href, fragment }] : [];
});
const inbound = new Set(refsByTarget.keys());
const zeroInbound = sitemapUrls.filter((url) => !inbound.has(targetKey(url)));

const report = {
  generatedAt: new Date().toISOString(), base, sitemapUrls: sitemapUrls.length,
  sampledSources: sourceUrls.length,
  extractedLinks: sourcePages.reduce((sum, page) => sum + page.links.length, 0),
  uniqueTargets: targets.length,
  sourceFetchFailures: sourcePages.filter((page) => page.error || page.status >= 400).map((page) => ({ url: page.url, status: page.status, error: page.error })),
  failures, redirects, noindexTargets, missingFragments,
  zeroInbound: { count: zeroInbound.length, examples: zeroInbound.slice(0, 50) },
};
if (outFile) fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.sourceFetchFailures.length || failures.length || redirects.length || missingFragments.length) process.exitCode = 1;