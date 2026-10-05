/**
 * SEO audit bot — scores every public page 0-100 from the HTML a crawler
 * is actually served, then reports the worst pages, the worst page TYPES
 * (templates), and the most common problems.
 *
 *   npm run audit:seo -- --base https://directory.example.com
 *   npm run audit:seo -- --base https://directory.example.com --per-type 40
 *   npm run audit:seo -- --base http://localhost:4000 --shell-prefix /seo-shell --public-origin https://directory.example.com
 *   npm run audit:seo -- --base https://directory.example.com --urls urls.txt
 *
 * Flags:
 *   --base URL          Site to audit (sitemap.xml is read from here).            [or SITE_URL]
 *   --per-type N        Audit at most N evenly-spaced pages per page type (e.g. 26,000
 *                       /ndis-providers/* pages are one template). Default: all.
 *   --limit N           Stop after N URLs in total.
 *   --path-prefix P     Audit only URLs whose path starts with P (for example /funding/).
 *   --urls FILE         Audit the URLs listed in FILE (one per line) instead of the sitemap.
 *   --out DIR           Where to write pages.csv / report.json / report.html. Default: seo-report
 *   --min-score N       Pages below N are listed as "low". Default: 80
 *   --concurrency N     Parallel requests (1-20). Default: 6
 *   --shell-prefix P    Fetch the server-rendered shell routes from P (e.g. /seo-shell) instead of
 *                       the public path — to audit what nginx WILL serve before it's deployed.
 *   --spa-base URL      With --shell-prefix: where every OTHER path is fetched from — the static built site
 *                       (e.g. `npx vite preview` at http://localhost:4173), as nginx would serve it.
 *   --public-origin O   The origin canonicals must use (e.g. https://directory.example.com).
 *
 * What is scored is the raw server HTML (what Bing, social-share scrapers and
 * Google's first pass see). Google also runs JavaScript, so a client-rendered
 * page is indexed late rather than never — but it still scores low here
 * because everything but the generic title is missing until the script runs.
 */
import fs from 'node:fs';
import path from 'node:path';

type Severity = 'error' | 'warn';
interface Issue { code: string; severity: Severity; points: number; message: string }
interface PageResult {
  url: string;
  type: string;
  score: number;
  title: string;
  description: string;
  words: number;
  ms: number;
  issues: Issue[];
}

const args = process.argv.slice(2);
const argValue = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const numArg = (name: string): number | null => {
  const raw = argValue(name);
  return raw ? Math.max(1, Number(raw)) || null : null;
};

const rawBase = argValue('--base') || process.env.SITE_URL || '';
if (!rawBase && !argValue('--urls')) {
  console.error('Usage: npm run audit:seo -- --base https://www.example.com [--path-prefix /funding/] [--concurrency 6] [--limit 100]');
  process.exit(1);
}
const options = {
  baseUrl: rawBase.replace(/\/$/, ''),
  concurrency: Math.max(1, Math.min(20, Number(argValue('--concurrency')) || 6)),
  limit: numArg('--limit'),
  perType: numArg('--per-type'),
  pathPrefix: argValue('--path-prefix') || null,
  urlsFile: argValue('--urls'),
  outDir: argValue('--out') || 'seo-report',
  minScore: Number(argValue('--min-score')) || 80,
  shellPrefix: (argValue('--shell-prefix') || '').replace(/\/$/, ''),
  spaBase: (argValue('--spa-base') || '').replace(/\/$/, ''),
  publicOrigin: (argValue('--public-origin') || '').replace(/\/$/, ''),
};

// Same list as the nginx rule in deploy/nginx-soldirectory.conf — the paths served by the SEO shell.
const SHELL_PATH = /^\/((ndis-providers|aged-care-providers)(\/|$)|find-a-provider\/?$|locations\/?$|providers\/?$|support-coordinators\/?$|directory\/[^/]+\/?$|directory\/in\/[^/]+\/?$|condition(\/[^/]+)?\/?$|funding(\/[^/]+)?\/?$|guides(\/[^/]+)?\/?$|language(\/[^/]+)?\/?$|services\/[^/]+\/?$|services\/[^/]+\/[^/]+\/?$|services\/[^/]+\/[^/]+\/[^/]+\/?$|independent-workers(\/[^/]+)?\/?$)/;

const decode = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const text = (html: string) => decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const first = (html: string, pattern: RegExp) => decode(pattern.exec(html)?.[1]?.trim() ?? '');
const metaContent = (html: string, attr: 'name' | 'property', key: string) =>
  first(html, new RegExp(`<meta\\s+[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'))
  || first(html, new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`, 'i'));

async function fetchText(url: string): Promise<{ response: Response; body: string; ms: number }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    const started = Date.now();
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'SolDirectorySeoAudit/2.0' }, redirect: 'follow', signal: controller.signal });
      const body = await response.text();
      clearTimeout(timer);
      return { response, body, ms: Date.now() - started };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
    }
  }
  throw lastError;
}

const sitemapLocations = (xml: string): string[] => [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));

/** Sitemap URLs carry whatever SITE_URL the API was started with; audit them on the site we were pointed at. */
const onBase = (url: string): string => {
  if (!options.baseUrl) return url;
  try {
    const u = new URL(url);
    return `${options.baseUrl}${u.pathname}${u.search}`;
  } catch { return url; }
};

async function discoverUrls(): Promise<string[]> {
  if (options.urlsFile) {
    return fs.readFileSync(options.urlsFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((l) => (l.startsWith('/') ? `${options.baseUrl}${l}` : l));
  }
  const { response, body } = await fetchText(`${options.baseUrl}/sitemap.xml`);
  const isXml = response.ok && /<(urlset|sitemapindex)\b/i.test(body);
  if (!isXml) {
    throw new Error(
      `${options.baseUrl}/sitemap.xml did not return a sitemap (HTTP ${response.status}, ${response.headers.get('content-type') ?? 'no content-type'}). ` +
      'Search engines cannot find your pages from it either. On the server, nginx must proxy /sitemap*.xml to the API ' +
      '(deploy/nginx-soldirectory.conf). To audit anyway, pass --urls urls.txt, or point --base at the API directly.',
    );
  }
  const locations = sitemapLocations(body);
  const childMaps = locations.filter((url) => /\/sitemap-[^/]+\.xml(?:\?|$)/i.test(url));
  const pageUrls = locations.filter((url) => !childMaps.includes(url));
  for (const child of childMaps) {
    const result = await fetchText(onBase(child));
    if (!result.response.ok) throw new Error(`${child} returned ${result.response.status}`);
    pageUrls.push(...sitemapLocations(result.body));
  }
  const unique = [...new Set(pageUrls.map(onBase))]
    .filter((url) => !options.pathPrefix || new URL(url).pathname.startsWith(options.pathPrefix));
  if (unique.length === 0) throw new Error('Sitemap discovery returned no page URLs');
  return unique;
}

/** "/ndis-providers/nsw/sydney" -> "/ndis-providers/*\/*": pages that share a template share a type. */
function pageType(url: string): string {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  return `/${segments[0]}${segments.slice(1).map(() => '/*').join('')}`;
}

/** Evenly-spaced sample (deterministic), so a re-run audits the same pages. */
function sample(urls: string[], perType: number | null): string[] {
  if (!perType) return urls;
  const groups = new Map<string, string[]>();
  for (const url of urls) groups.set(pageType(url), [...(groups.get(pageType(url)) ?? []), url]);
  const picked: string[] = [];
  for (const group of groups.values()) {
    if (group.length <= perType) { picked.push(...group); continue; }
    for (let i = 0; i < perType; i += 1) picked.push(group[Math.floor((i * group.length) / perType)]);
  }
  return picked;
}

/** Words a page of this type should carry — thinner than this is penalised in proportion. */
function wordTarget(pathname: string): { target: number; severity: Severity } {
  if (/^\/services\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname)) return { target: 1000, severity: 'error' };
  if (/^\/services\/[^/]+\/?$/.test(pathname)) return { target: 600, severity: 'warn' };
  if (/^\/(funding|guides)\/[^/]+\/?$/.test(pathname)) return { target: 1000, severity: 'error' };
  if (/^\/(condition|language)\/[^/]+\/?$/.test(pathname)) return { target: 500, severity: 'warn' };
  if (/^\/(ndis-providers|aged-care-providers)\/[^/]+\/[^/]+\/?$/.test(pathname)) return { target: 120, severity: 'warn' };
  if (/^\/(ndis-providers|aged-care-providers)\/[^/]+\/?$/.test(pathname)) return { target: 120, severity: 'warn' };
  if (/^\/directory\/[^/]+\/?$/.test(pathname)) return { target: 120, severity: 'warn' };
  return { target: 250, severity: 'warn' };
}

function auditHtml(url: string, response: Response, html: string, ms: number): PageResult {
  const issues: Issue[] = [];
  const add = (code: string, severity: Severity, points: number, message: string) => issues.push({ code, severity, points, message });
  const pathname = new URL(url).pathname;
  const type = pageType(url);

  const done = (): PageResult => {
    const penalty = issues.reduce((sum, i) => sum + i.points, 0);
    return { url, type, score: Math.max(0, 100 - penalty), title, description, words, ms, issues };
  };

  let title = '';
  let description = '';
  let words = 0;

  if (!response.ok) { add('http', 'error', 100, `HTTP ${response.status}`); return done(); }
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) { add('not-html', 'error', 100, 'response is not HTML'); return done(); }

  title = first(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  description = metaContent(html, 'name', 'description');
  const canonical = first(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    || first(html, /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const robots = metaContent(html, 'name', 'robots').toLowerCase();
  const mainHtml = first(html, /<main\b[^>]*>([\s\S]*?)<\/main>/i) || html;
  words = text(mainHtml).split(/\s+/).filter(Boolean).length;
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const h2Count = (html.match(/<h2\b/gi) ?? []).length;
  const jsonLdBlocks = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonLdCount = jsonLdBlocks.length;

  // The app shell with nothing server-rendered into it: crawlers that don't run JavaScript see no content at all.
  const emptyShell = /<div id="root">\s*<\/div>/i.test(html) && h1Count === 0;
  if (emptyShell) {
    add('empty-shell', 'error', 55, 'raw HTML is an empty app shell — no heading, text or links until JavaScript runs');
  }

  if (response.redirected) add('redirect', 'error', 8, `sitemap URL redirects to ${response.url}`);
  if (/^\/services\/[^/]+\/[^/]+\/?$/.test(pathname)) add('legacy-service-url', 'error', 15, 'legacy two-segment service URL is present in sitemap');

  if (!title) add('title-missing', 'error', 25, 'missing <title>');
  else if (title.length > 65) add('title-long', 'warn', 5, `title is ${title.length} characters (aim for 30-65)`);
  else if (title.length < 25) add('title-short', 'warn', 4, `title is only ${title.length} characters (aim for 30-65)`);

  if (!description) add('description-missing', 'error', 15, 'missing meta description');
  else if (description.length < 80 || description.length > 165) add('description-length', 'warn', 4, `meta description is ${description.length} characters (aim for 80-165)`);

  if (robots.includes('noindex')) add('noindex', 'error', 25, 'page is in the sitemap but marked noindex');

  if (!canonical) add('canonical-missing', 'error', 8, 'missing canonical link');
  else {
    try {
      const actual = new URL(canonical);
      const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);
      if (norm(actual.pathname) !== norm(pathname)) add('canonical-mismatch', 'error', 8, `canonical points to a different page: ${canonical}`);
      else if (options.publicOrigin && actual.origin !== options.publicOrigin) add('canonical-origin', 'error', 5, `canonical origin is ${actual.origin}, expected ${options.publicOrigin} (SITE_URL?)`);
    } catch { add('canonical-invalid', 'error', 8, `invalid canonical: ${canonical}`); }
  }

  if (h1Count === 0) add('h1-missing', 'error', 12, 'no <h1>');
  else if (h1Count > 1) add('h1-multiple', 'warn', 5, `${h1Count} <h1> elements`);
  if (words > 400 && h2Count === 0) add('no-subheadings', 'warn', 3, 'long page with no <h2> subheadings');

  if (jsonLdCount === 0) add('jsonld-missing', 'error', 6, 'no structured data (JSON-LD)');
  for (const block of jsonLdBlocks) {
    try { JSON.parse(block[1]); } catch { add('jsonld-invalid', 'error', 8, 'invalid JSON-LD'); break; }
  }

  const { target, severity } = wordTarget(pathname);
  if (words < target) add('thin-content', severity, Math.round(20 * (1 - words / target)), `thin content: ${words} words (target ${target})`);

  const og = ['og:title', 'og:description', 'og:image'].filter((key) => !metaContent(html, 'property', key));
  if (og.length) add('open-graph', 'warn', Math.min(6, og.length * 2), `missing social-share tags: ${og.join(', ')}`);
  if (!/<meta\s+[^>]*name=["']viewport["']/i.test(html)) add('viewport', 'warn', 4, 'missing mobile viewport meta tag');
  if (!/<html\b[^>]*\blang=/i.test(html)) add('lang', 'warn', 2, 'missing lang attribute on <html>');

  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = images.filter((img) => !/\balt=/i.test(img)).length;
  if (images.length >= 3 && noAlt / images.length > 0.2) add('image-alt', 'warn', Math.min(5, Math.ceil((noAlt / images.length) * 5)), `${noAlt} of ${images.length} images have no alt attribute`);

  const internalLinks = (mainHtml.match(/<a\b[^>]*href=["']\/(?!\/)[^"']*["']/gi) ?? []).length;
  if (!emptyShell && internalLinks < 3) add('few-links', 'warn', 4, `only ${internalLinks} internal links in the main content`);

  if (ms > 2500) add('slow', 'warn', 4, `slow response: ${ms} ms`);
  if (html.length > 1_500_000) add('heavy', 'warn', 3, `HTML is ${(html.length / 1_000_000).toFixed(1)} MB`);

  if (/[A-Z]/.test(pathname) || pathname.length > 100) add('url-hygiene', 'warn', 2, 'URL is long or contains capitals');
  if (new URL(url).search) add('url-query', 'warn', 2, 'sitemap URL carries a query string');

  return done();
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

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const escHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const grade = (score: number) => (score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 45 ? 'D' : 'F');

function writeReports(results: PageResult[], summary: ReturnType<typeof summarise>) {
  fs.mkdirSync(options.outDir, { recursive: true });

  const header = ['url', 'type', 'score', 'grade', 'words', 'title_chars', 'description_chars', 'response_ms', 'errors', 'warnings'];
  const rows = [...results].sort((a, b) => a.score - b.score).map((r) => [
    r.url, r.type, r.score, grade(r.score), r.words, r.title.length, r.description.length, r.ms,
    r.issues.filter((i) => i.severity === 'error').map((i) => i.message).join(' | '),
    r.issues.filter((i) => i.severity === 'warn').map((i) => i.message).join(' | '),
  ]);
  fs.writeFileSync(path.join(options.outDir, 'pages.csv'), [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n'));
  fs.writeFileSync(path.join(options.outDir, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), options, summary, pages: results }, null, 2));

  const typeRows = summary.byType.map((t) => `<tr><td><code>${escHtml(t.type)}</code></td><td>${t.pages}</td><td><span class="pill g${grade(t.avg)}">${t.avg}</span></td><td>${t.min}</td><td>${escHtml(t.topIssue)}</td></tr>`).join('');
  const issueRows = summary.topIssues.map((i) => `<tr><td>${escHtml(i.message)}</td><td>${i.pages}</td><td>${Math.round((i.pages / results.length) * 100)}%</td><td>${i.severity}</td></tr>`).join('');
  const pageRows = [...results].sort((a, b) => a.score - b.score).map((r) =>
    `<tr data-score="${r.score}"><td><span class="pill g${grade(r.score)}">${r.score}</span></td><td><a href="${escHtml(r.url)}" target="_blank" rel="noopener">${escHtml(new URL(r.url).pathname)}</a><div class="t">${escHtml(r.title || '(no title)')}</div></td><td><code>${escHtml(r.type)}</code></td><td>${r.words}</td><td>${r.issues.map((i) => `<div class="${i.severity}">${escHtml(i.message)}</div>`).join('') || '<span class="ok">No issues</span>'}</td></tr>`).join('');

  fs.writeFileSync(path.join(options.outDir, 'report.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO audit report</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:0;background:#f5f8fc;color:#10233f}main{max-width:1200px;margin:0 auto;padding:24px 16px 60px}h1{margin:0 0 4px}h2{margin:34px 0 10px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:18px 0}.card{background:#fff;border:1px solid #e3eaf4;border-radius:12px;padding:14px 16px}.card b{display:block;font-size:26px}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3eaf4;border-radius:10px;overflow:hidden}th,td{padding:9px 12px;text-align:left;vertical-align:top;border-bottom:1px solid #eef2f8}th{background:#eef4ff;font-size:12px;text-transform:uppercase;letter-spacing:.04em;cursor:pointer}
.pill{display:inline-block;min-width:34px;text-align:center;padding:3px 8px;border-radius:99px;font-weight:700;color:#fff}.gA,.gB{background:#177c4b}.gC{background:#b7791f}.gD{background:#c05621}.gF{background:#b4232f}
.error{color:#b4232f}.warn{color:#8a5a00}.ok{color:#177c4b}.t{color:#5a6b84;font-size:12px}code{font-size:12px}input{padding:8px 12px;border:1px solid #cfd9e8;border-radius:8px;width:min(420px,100%);margin:6px 0 12px}</style></head><body><main>
<h1>SEO audit report</h1><div class="t">${escHtml(options.baseUrl || 'URL list')} &middot; ${new Date().toLocaleString('en-AU')} &middot; scored from the raw server HTML</div>
<div class="cards"><div class="card"><b>${summary.average}</b>average score</div><div class="card"><b>${results.length}</b>pages audited</div><div class="card"><b>${summary.low}</b>below ${options.minScore}</div><div class="card"><b>${summary.withErrors}</b>with errors</div></div>
<h2>Page types, worst first</h2><table><tr><th>Type</th><th>Pages</th><th>Avg</th><th>Lowest</th><th>Most common problem</th></tr>${typeRows}</table>
<h2>Most common problems</h2><table><tr><th>Problem</th><th>Pages</th><th>Share</th><th>Severity</th></tr>${issueRows}</table>
<h2>Every page, lowest score first</h2><input id="q" placeholder="Filter by URL, title or problem…"><table id="pages"><tr><th>Score</th><th>Page</th><th>Type</th><th>Words</th><th>Problems</th></tr>${pageRows}</table>
<script>document.getElementById('q').addEventListener('input',function(e){var v=e.target.value.toLowerCase();document.querySelectorAll('#pages tr[data-score]').forEach(function(r){r.style.display=r.textContent.toLowerCase().indexOf(v)>-1?'':'none'})})</script>
</main></body></html>`);
}

function summarise(results: PageResult[]) {
  const average = Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length));
  const issueCounts = new Map<string, { message: string; severity: Severity; pages: number }>();
  for (const r of results) {
    for (const i of r.issues) {
      // Group by code so "thin content: 83 words" and "...: 91 words" count as one problem.
      const entry = issueCounts.get(i.code) ?? { message: i.message.replace(/[\d,.]+/g, '#'), severity: i.severity, pages: 0 };
      entry.pages += 1;
      issueCounts.set(i.code, entry);
    }
  }
  const labels: Record<string, string> = {
    'empty-shell': 'Raw HTML is an empty app shell (no content until JavaScript runs)', 'title-missing': 'Missing <title>', 'title-long': 'Title too long',
    'title-short': 'Title too short', 'description-missing': 'Missing meta description', 'description-length': 'Meta description wrong length', 'noindex': 'In sitemap but noindex',
    'canonical-missing': 'Missing canonical', 'canonical-mismatch': 'Canonical points elsewhere', 'canonical-origin': 'Canonical on the wrong origin', 'canonical-invalid': 'Invalid canonical',
    'h1-missing': 'No <h1>', 'h1-multiple': 'Multiple <h1>', 'no-subheadings': 'Long page with no <h2>', 'jsonld-missing': 'No structured data (JSON-LD)', 'thin-content': 'Thin content',
    'open-graph': 'Missing social-share (Open Graph) tags', 'viewport': 'Missing viewport meta', 'lang': 'Missing html lang', 'image-alt': 'Images without alt text', 'few-links': 'Too few internal links',
    'slow': 'Slow response (>2.5s)', 'heavy': 'Heavy HTML', 'url-hygiene': 'URL long or has capitals', 'url-query': 'Sitemap URL has a query string', 'http': 'HTTP error', 'not-html': 'Not HTML',
    'dup-title': 'Duplicate title on several pages', 'dup-description': 'Duplicate meta description on several pages',
  };
  const topIssues = [...issueCounts.entries()].map(([code, v]) => ({ code, message: labels[code] ?? v.message, severity: v.severity, pages: v.pages })).sort((a, b) => b.pages - a.pages);

  const types = new Map<string, PageResult[]>();
  for (const r of results) types.set(r.type, [...(types.get(r.type) ?? []), r]);
  const byType = [...types.entries()].map(([type, pages]) => {
    const counts = new Map<string, number>();
    pages.forEach((p) => p.issues.forEach((i) => counts.set(i.code, (counts.get(i.code) ?? 0) + 1)));
    const worst = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      type, pages: pages.length,
      avg: Math.round(pages.reduce((s, p) => s + p.score, 0) / pages.length),
      min: Math.min(...pages.map((p) => p.score)),
      topIssue: worst ? `${labels[worst[0]] ?? worst[0]} (${Math.round((worst[1] / pages.length) * 100)}%)` : 'none',
    };
  }).sort((a, b) => a.avg - b.avg);

  return {
    average, low: results.filter((r) => r.score < options.minScore).length,
    withErrors: results.filter((r) => r.issues.some((i) => i.severity === 'error')).length,
    topIssues, byType,
  };
}

async function main() {
  console.log(options.urlsFile ? `Reading URLs from ${options.urlsFile}` : `Discovering URLs from ${options.baseUrl}/sitemap.xml`);
  const allUrls = await discoverUrls();
  let urls = sample(allUrls, options.perType);
  if (options.limit) urls = urls.slice(0, options.limit);
  console.log(`Found ${allUrls.length.toLocaleString('en-AU')} URLs${urls.length < allUrls.length ? `; auditing a sample of ${urls.length.toLocaleString('en-AU')}` : ''} (concurrency ${options.concurrency})`);

  const results = await mapConcurrent(urls, options.concurrency, async (url, index) => {
    let result: PageResult;
    try {
      const pathname = new URL(url).pathname;
      const search = new URL(url).search;
      const fetchUrl = options.shellPrefix && SHELL_PATH.test(pathname)
        ? `${options.baseUrl}${options.shellPrefix}${pathname}${search}`
        : options.shellPrefix && options.spaBase ? `${options.spaBase}${pathname}${search}` : url;
      const { response, body, ms } = await fetchText(fetchUrl);
      result = auditHtml(url, response, body, ms);
    } catch (error) {
      result = { url, type: pageType(url), score: 0, title: '', description: '', words: 0, ms: 0, issues: [{ code: 'http', severity: 'error', points: 100, message: `request failed: ${(error as Error).message}` }] };
    }
    if ((index + 1) % 100 === 0 || index + 1 === urls.length) console.log(`  checked ${(index + 1).toLocaleString('en-AU')} / ${urls.length.toLocaleString('en-AU')}`);
    return result;
  });

  // Site-wide checks: the same title/description on several pages makes them compete with each other.
  const byTitle = new Map<string, PageResult[]>();
  const byDescription = new Map<string, PageResult[]>();
  for (const r of results) {
    if (r.title) byTitle.set(r.title, [...(byTitle.get(r.title) ?? []), r]);
    if (r.description) byDescription.set(r.description, [...(byDescription.get(r.description) ?? []), r]);
  }
  const penalise = (r: PageResult, issue: Issue) => { r.issues.push(issue); r.score = Math.max(0, r.score - issue.points); };
  for (const [title, matches] of byTitle) if (matches.length > 1) matches.forEach((r) => penalise(r, { code: 'dup-title', severity: 'warn', points: 6, message: `same title on ${matches.length} pages: ${title.slice(0, 60)}` }));
  for (const [description, matches] of byDescription) if (matches.length > 1) matches.forEach((r) => penalise(r, { code: 'dup-description', severity: 'warn', points: 3, message: `same meta description on ${matches.length} pages: ${description.slice(0, 60)}` }));

  const summary = summarise(results);
  writeReports(results, summary);

  console.log(`\nAverage score ${summary.average}/100 across ${results.length.toLocaleString('en-AU')} pages — ${summary.low} below ${options.minScore}, ${summary.withErrors} with errors.`);
  console.log('\nPage types, worst first:');
  for (const t of summary.byType.slice(0, 15)) console.log(`  ${String(t.avg).padStart(3)}  ${t.type.padEnd(34)} ${String(t.pages).padStart(4)} pages  ${t.topIssue}`);
  console.log('\nMost common problems:');
  for (const i of summary.topIssues.slice(0, 12)) console.log(`  ${String(i.pages).padStart(5)} pages  ${i.severity === 'error' ? 'ERROR' : 'warn '}  ${i.message}`);
  console.log('\nLowest-scoring pages:');
  for (const r of [...results].sort((a, b) => a.score - b.score).slice(0, 25)) console.log(`  ${String(r.score).padStart(3)}  ${new URL(r.url).pathname}`);
  console.log(`\nFull report: ${path.resolve(options.outDir, 'report.html')}\n             ${path.resolve(options.outDir, 'pages.csv')}`);
  if (results.some((r) => r.issues.some((i) => i.severity === 'error'))) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`\nSEO audit could not run: ${(error as Error).message}`);
  process.exitCode = 1;
});
