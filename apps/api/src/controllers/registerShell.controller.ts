import fs from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import RegisterListing from '../models/RegisterListing.js';
import Provider from '../models/Provider.js';
import Worker from '../models/Worker.js';
import WorkerReview from '../models/WorkerReview.js';
import { MIN_SUBURB_LISTINGS, STATE_CODES, type RegisterType } from '../services/registerNormalise.js';
import { categoryListings, computeCategoryOverview, computeHub } from './register.controller.js';
import { workersForService } from './workersPublic.controller.js';
import { MIN_INDEXABLE_PROVIDERS, VISIBLE_PROVIDER, areaRows, conditionRows, publicLogoUrl } from './providersPublic.controller.js';

/**
 * Crawler-readable HTML for the public-register pages.
 *
 * The web app is a client-rendered SPA served as static files, so a
 * crawler that doesn't run JavaScript would see an empty <div id="root">
 * for all ~26,000 register pages. nginx sends /ndis-providers/* and
 * /aged-care-providers/* here instead: we return the SAME built
 * index.html the SPA uses, with this page's <title>, description,
 * canonical, robots, JSON-LD and a plain-HTML copy of its main content
 * (headline, facts, links to related pages) filled in. When the browser
 * runs the app it replaces #root, so people see the normal page; the
 * content is the same one, not something shown only to bots.
 *
 * The same shell also serves WordPress service pages (/services/:slug, content fetched
 * from WordPress), the public provider profile (/directory/:slug)
 * and the independent-worker pages (/independent-workers/find and
 * /independent-workers/:slug).
 *
 * Every rule here (titles, noindex, thin-page threshold) mirrors the
 * client pages in apps/web/src/pages/public (register/*, ProviderPublicPage,
 * WorkerFinder, WorkerPublicProfile) — keep them in step.
 */

const KINDS = {
  'ndis-providers': {
    type: 'ndis' as RegisterType, label: 'NDIS',
    register: 'NDIS Commission register of registered providers',
    listedAs: 'listed as an NDIS registered provider',
  },
  'aged-care-providers': {
    type: 'aged_care' as RegisterType, label: 'Aged care',
    register: 'My Aged Care provider register',
    listedAs: 'listed as an approved aged care provider',
  },
};
type KindPath = keyof typeof KINDS;

const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
};
const PAGE_SIZE = 12;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,200}$/;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const fmt = (n: number) => n.toLocaleString('en-AU');
const trimTo = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

function siteUrl(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0];
  return `${proto}://${req.get('host')}`;
}

// --- the built index.html, re-read when it changes on disk (a redeploy) ---
let shellCache: { html: string; mtimeMs: number; checkedAt: number } | null = null;
async function loadShell(): Promise<string> {
  const file = path.join(process.env.WEB_DIST_DIR || path.resolve(process.cwd(), '../web/dist'), 'index.html');
  if (shellCache && Date.now() - shellCache.checkedAt < 30_000) return shellCache.html;
  const stat = await fs.stat(file);
  if (!shellCache || stat.mtimeMs !== shellCache.mtimeMs) {
    shellCache = { html: await fs.readFile(file, 'utf8'), mtimeMs: stat.mtimeMs, checkedAt: Date.now() };
  } else {
    shellCache.checkedAt = Date.now();
  }
  return shellCache.html;
}

// --- hub numbers, cached: they're aggregated over every listing ---
const hubCache = new Map<RegisterType, { at: number; value: Awaited<ReturnType<typeof computeHub>> }>();
async function hubFor(type: RegisterType) {
  const hit = hubCache.get(type);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.value;
  const value = await computeHub(type);
  hubCache.set(type, { at: Date.now(), value });
  return value;
}

interface Page {
  status: number;
  title: string;
  description: string;
  canonical: string; // path
  noindex: boolean;
  jsonLd: { id: string; data: Record<string, unknown> }[];
  body: string;
  ogImage?: string; // absolute URL
}

const li = (href: string, text: string, extra = '') => `<li><a href="${esc(href)}">${esc(text)}</a>${extra ? ` ${esc(extra)}` : ''}</li>`;

function breadcrumbLd(site: string, crumbs: { name: string; path: string }[]) {
  return {
    id: 'register-breadcrumbs',
    data: {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${site}${c.path}` })),
    },
  };
}

function notFound(): Page {
  return {
    status: 404, title: 'Provider not found | SolDirectory', description: 'This listing could not be found.',
    canonical: '', noindex: true, jsonLd: [], body: '<h1>Page not found</h1><p><a href="/ndis-providers">Browse NDIS providers</a></p>',
  };
}

async function hubPage(site: string, kindPath: KindPath): Promise<Page> {
  const kind = KINDS[kindPath];
  const hub = await hubFor(kind.type);
  const base = `/${kindPath}`;
  return {
    status: 200,
    title: `${kind.label} providers in Australia: browse the public register | SolDirectory`,
    description: trimTo(`Browse ${fmt(hub.total)} ${kind.label} providers listed on the public register, by state and suburb. See the supports listed, then get matched for free.`, 158),
    canonical: base,
    noindex: hub.total === 0,
    jsonLd: [breadcrumbLd(site, [{ name: 'Home', path: '/' }, { name: `${kind.label} providers`, path: base }])],
    body:
      `<h1>${esc(kind.label)} providers in Australia</h1>` +
      `<p>${fmt(hub.total)} ${esc(kind.label)} providers are listed on the ${esc(kind.register)}. Browse by state or suburb.</p>` +
      `<h2>Browse by state</h2><ul>${STATE_CODES.filter((c) => hub.states[c]).map((c) => li(`${base}/${c.toLowerCase()}`, `${kind.label} providers in ${STATE_NAMES[c]}`, `(${fmt(hub.states[c])})`)).join('')}</ul>` +
      `<h2>Popular suburbs</h2><ul>${hub.suburbs.slice(0, 40).map((s) => li(`${base}/${s.state.toLowerCase()}/${s.slug}`, `${s.suburb}, ${s.state}`, `(${fmt(s.count)})`)).join('')}</ul>`,
  };
}

async function listPage(site: string, kindPath: KindPath, stateSlug: string, suburbSlug: string | null, page: number, filtered: boolean): Promise<Page> {
  const kind = KINDS[kindPath];
  const code = stateSlug.toUpperCase();
  if (!STATE_CODES.includes(code as never)) return notFound();
  if (suburbSlug && !SLUG_RE.test(suburbSlug)) return notFound();

  const base = `/${kindPath}/${stateSlug}${suburbSlug ? `/${suburbSlug}` : ''}`;
  const filter = suburbSlug
    ? { type: kind.type, areas: { $elemMatch: { state: code, suburbSlug } } }
    : { type: kind.type, states: code };

  const [docs, total] = await Promise.all([
    RegisterListing.find(filter).select('slug name areas supportCategories').sort({ nameLower: 1, _id: 1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    RegisterListing.countDocuments(filter),
  ]);
  if (suburbSlug && total === 0) return { ...notFound(), title: `${kind.label} providers | SolDirectory` };

  // Same suburb spelling the register uses, taken from a real listing.
  const suburbName = suburbSlug
    ? docs[0]?.areas.find((a) => a.state === code && a.suburbSlug === suburbSlug)?.suburb
      ?? suburbSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : null;
  const areaName = suburbName ? `${suburbName}, ${code}` : STATE_NAMES[code];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const noindex = filtered || total === 0 || (!!suburbSlug && total < MIN_SUBURB_LISTINGS);

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: `${kind.label} providers`, path: `/${kindPath}` },
    { name: STATE_NAMES[code], path: `/${kindPath}/${stateSlug}` },
    ...(suburbSlug ? [{ name: suburbName as string, path: base }] : []),
  ];

  let extra = '';
  if (!suburbSlug) {
    const hub = await hubFor(kind.type);
    extra = `<h2>Suburbs in ${esc(STATE_NAMES[code])}</h2><ul>${hub.suburbs.filter((s) => s.state === code).slice(0, 40).map((s) => li(`${base}/${s.slug}`, `${s.suburb}, ${s.state}`, `(${fmt(s.count)})`)).join('')}</ul>`;
  }
  const pager =
    (page > 1 ? `<a rel="prev" href="${esc(page === 2 ? base : `${base}?page=${page - 1}`)}">Previous page</a> ` : '') +
    (page < totalPages ? `<a rel="next" href="${esc(`${base}?page=${page + 1}`)}">Next page</a>` : '');

  return {
    status: 200,
    title: `${kind.label} providers in ${areaName}${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
    description: trimTo(`${fmt(total)} ${kind.label} ${total === 1 ? 'provider is' : 'providers are'} listed on the ${kind.register} for ${areaName}. See the supports listed and service areas, then get matched for free.`, 158),
    canonical: page > 1 && !filtered ? `${base}?page=${page}` : base,
    noindex,
    jsonLd: [breadcrumbLd(site, crumbs)],
    body:
      `<nav aria-label="Breadcrumb">${crumbs.map((c, i) => (i < crumbs.length - 1 ? `<a href="${esc(c.path)}">${esc(c.name)}</a>` : esc(c.name))).join(' / ')}</nav>` +
      `<h1>${esc(kind.label)} providers in ${esc(areaName)}</h1>` +
      `<p>${fmt(total)} ${esc(kind.label)} ${total === 1 ? 'provider is' : 'providers are'} listed on the ${esc(kind.register)} for ${esc(areaName)}.</p>` +
      `<ul>${docs.map((d) => li(`/${kindPath}/${d.slug}`, d.name, d.supportCategories.length ? `– ${d.supportCategories.slice(0, 3).join(', ')}` : '')).join('')}</ul>` +
      `<p>${pager}</p>${extra}`,
  };
}

async function providerPage(site: string, kindPath: KindPath, slug: string): Promise<Page> {
  const kind = KINDS[kindPath];
  if (!SLUG_RE.test(slug)) return notFound();
  const doc = await RegisterListing.findOne({ type: kind.type, slug }).lean();
  if (!doc) return notFound();

  const p = `/${kindPath}/${slug}`;
  const first = doc.areas[0];
  const where = first ? `${first.suburb}, ${first.state}` : 'Australia';
  const shown = doc.areas.slice(0, 2).map((a) => `${a.suburb}, ${a.state}`);
  const more = doc.areaCount - shown.length;
  const thin = doc.services.length === 0;

  return {
    status: 200,
    title: `${trimTo(doc.name, 44)} | ${kind.label} provider in ${where}`,
    description: trimTo(
      `${doc.name} is ${kind.listedAs}${shown.length ? ` for ${shown.join(' and ')}${more > 0 ? ` and ${more} more area${more === 1 ? '' : 's'}` : ''}` : ''}. See the supports listed, where it operates and how to check its current status.`,
      158
    ),
    canonical: p,
    noindex: thin,
    jsonLd: [
      {
        id: 'register-provider',
        data: {
          '@type': 'Organization',
          name: doc.name,
          ...(doc.website ? { url: doc.website } : {}),
          areaServed: doc.states.map((s) => ({ '@type': 'AdministrativeArea', name: STATE_NAMES[s] ?? s })),
        },
      },
      breadcrumbLd(site, [{ name: 'Home', path: '/' }, { name: `${kind.label} providers`, path: `/${kindPath}` }, { name: doc.name, path: p }]),
    ],
    body:
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/${kindPath}">${esc(kind.label)} providers</a> / ${esc(doc.name)}</nav>` +
      `<h1>${esc(doc.name)}</h1>` +
      `<p>${esc(doc.name)} is ${esc(kind.listedAs)} in ${esc(doc.states.map((s) => STATE_NAMES[s] ?? s).join(', '))}. This listing comes from the ${esc(kind.register)} — check the official register for its current status.</p>` +
      (doc.services.length ? `<h2>Supports listed</h2><ul>${doc.services.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '') +
      (doc.areas.length ? `<h2>Areas listed</h2><ul>${doc.areas.slice(0, 60).map((a) => li(`/${kindPath}/${a.state.toLowerCase()}/${a.suburbSlug}`, `${a.suburb}, ${a.state}`)).join('')}</ul>` : ''),
  };
}

function render(html: string, req: Request, page: Page, site: string): string {
  const head = [
    page.canonical ? `<link rel="canonical" href="${esc(site + page.canonical)}" />` : '',
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    page.ogImage ? `<meta property="og:image" content="${esc(page.ogImage)}" />` : '',
    `<meta name="twitter:card" content="${page.ogImage ? 'summary_large_image' : 'summary'}" />`,
    ...page.jsonLd.map((j) =>
      // "<" is escaped so a business name can never close the script tag.
      `<script type="application/ld+json" id="jsonld-${j.id}">${JSON.stringify({ '@context': 'https://schema.org', ...j.data }).replace(/</g, '\\u003c')}</script>`
    ),
  ].join('\n    ');

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(page.description)}" />`);
  // Only ever tighten robots: an indexable page keeps the site-wide value
  // the build shipped with, so a staging build stays noindex.
  if (page.noindex) out = out.replace(/<meta name="robots"[^>]*>/, '<meta name="robots" content="noindex, follow" />');
  out = out.replace('</head>', () => `    ${head}\n  </head>`);
  const style = '<style>main[data-seo-shell]{max-width:860px;margin:0 auto;padding:24px 16px;font-family:system-ui,sans-serif;line-height:1.5}main[data-seo-shell] li{margin:2px 0}</style>';
  return out.replace('<div id="root"></div>', () => `<div id="root">${style}<main data-seo-shell>${page.body}</main></div>`);
}

// ---------------------------------------------------------------
// Provider directory profile — /directory/:slug
// ---------------------------------------------------------------
const LEVEL_PAGE = 12;

async function providerProfilePage(site: string, slug: string): Promise<Page> {
  if (!SLUG_RE.test(slug)) return notFound();
  const p: any = await Provider.findOne({ slug, accountStatus: 'active', listingPaused: { $ne: true } })
    .select('legalEntityName tradingName slug registrationGroups acceptedFunding conditionExperience languages ageGroups serviceSuburbs businessAddress.suburb businessAddress.state logoUrl hasLogoUpload updatedAt')
    .lean();
  if (!p) return notFound();

  const name: string = p.tradingName || p.legalEntityName;
  const groups: string[] = p.registrationGroups ?? [];
  const suburbs: string[] = p.serviceSuburbs ?? [];
  const where = p.businessAddress?.suburb && p.businessAddress?.state ? `${p.businessAddress.suburb}, ${p.businessAddress.state}` : suburbs[0] ?? 'Australia';
  const offers = groups.slice(0, 3).join(', ');
  const path = `/directory/${p.slug}`;
  const section = (h: string, items: string[]) => (items.length ? `<h2>${esc(h)}</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  return {
    status: 200,
    title: `${trimTo(name, 44)} | Provider in ${where}`,
    description: trimTo(
      `${name}${offers ? ` offers ${offers}` : ' is listed on SolDirectory'}${suburbs.length ? ` and supports people in ${suburbs.slice(0, 3).join(', ')}` : ''}. See supports, funding accepted and service areas, then get matched for free.`,
      158
    ),
    canonical: path,
    noindex: groups.length === 0,
    jsonLd: [
      { id: 'directory-provider', data: { '@type': 'Organization', name, ...(publicLogoUrl(p) ? { logo: publicLogoUrl(p)!.startsWith('/') ? `${site}${publicLogoUrl(p)}` : publicLogoUrl(p) } : {}), ...(suburbs.length ? { areaServed: suburbs.slice(0, 20).map((s) => ({ '@type': 'Place', name: s })) } : {}) } },
      { id: 'directory-breadcrumbs', data: { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
        { '@type': 'ListItem', position: 2, name: 'Provider directory', item: `${site}/directory` },
        { '@type': 'ListItem', position: 3, name, item: `${site}${path}` },
      ] } },
    ],
    body:
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/directory">Provider directory</a> / ${esc(name)}</nav><h1>${esc(name)}</h1>` +
      section('Supports offered', groups) + section('Service areas', suburbs) + section('Funding accepted', p.acceptedFunding ?? []) +
      section('Experience supporting', p.conditionExperience ?? []) + section('Age groups', p.ageGroups ?? []) + section('Languages', p.languages ?? []),
  };
}

// ---------------------------------------------------------------
// Independent workers — /independent-workers/find and /:slug
// ---------------------------------------------------------------
const workerVisible = () => ({ publicProfile: true, published: true, accountStatus: 'active', publicSlug: { $exists: true, $ne: null } });
const workerName = (w: any) => `${w.firstName}${w.lastName ? ` ${String(w.lastName).charAt(0).toUpperCase()}.` : ''}`;

async function workerProfilePage(site: string, slug: string): Promise<Page> {
  if (!SLUG_RE.test(slug)) return notFound();
  const w: any = await Worker.findOne({ ...workerVisible(), publicSlug: slug })
    .select('firstName lastName role suburb state services languages conditionExperience bio hasPhoto publicSlug updatedAt').lean();
  if (!w) return notFound();

  // Approved reviews only, same as the page itself.
  const reviews: any[] = await WorkerReview.find({ workerId: w._id, status: 'approved' }).sort({ createdAt: -1 }).limit(10).select('rating text reviewerName createdAt').lean();
  const reviewCount = await WorkerReview.countDocuments({ workerId: w._id, status: 'approved' });
  const average = reviewCount ? Math.round((await WorkerReview.aggregate([{ $match: { workerId: w._id, status: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]))[0].avg * 10) / 10 : null;

  const name = workerName(w);
  const where = [w.suburb, w.state].filter(Boolean).join(', ');
  const offers = (w.services ?? []).slice(0, 3).join(', ');
  const path = `/independent-workers/${w.publicSlug}`;
  const list = (h: string, items: string[]) => (items.length ? `<h2>${esc(h)}</h2><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  return {
    status: 200,
    title: `${name}${w.role ? `, ${trimTo(w.role, 30)}` : ''} | Independent worker${where ? ` in ${where}` : ''}`,
    description: trimTo(`${name} is an independent ${w.role ? String(w.role).toLowerCase() : 'support worker'}${where ? ` in ${where}` : ''}${offers ? ` offering ${offers}` : ''}. See supports, languages and availability.`, 158),
    canonical: path,
    noindex: false,
    ogImage: w.hasPhoto ? `${site}/api/workers/public/${w.publicSlug}/photo?v=${new Date(w.updatedAt).getTime()}` : undefined,
    jsonLd: [{ id: 'worker-breadcrumbs', data: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Independent workers', item: `${site}/independent-workers/find` },
      { '@type': 'ListItem', position: 3, name, item: `${site}${path}` },
    ] } }],
    body:
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/independent-workers/find">Independent workers</a> / ${esc(name)}</nav>` +
      `<h1>${esc(name)}</h1><p>${esc([w.role, where].filter(Boolean).join(' · '))}</p>` +
      (w.bio ? `<h2>About</h2><p>${esc(w.bio)}</p>` : '') +
      list('Supports offered', w.services ?? []) + list('Experience supporting', w.conditionExperience ?? []) + list('Languages', w.languages ?? []) +
      `<h2>Reviews</h2>` +
      (reviewCount
        ? `<p>${average!.toFixed(1)} out of 5 from ${fmt(reviewCount)} ${reviewCount === 1 ? 'review' : 'reviews'}.</p><ul>${reviews.map((r) => `<li>${r.rating}/5 - ${esc(r.text)} (${esc(r.reviewerName)})</li>`).join('')}</ul>`
        : '<p>No reviews yet.</p>'),
  };
}

async function workerListPage(site: string, page: number, filtered: boolean): Promise<Page> {
  const filter = workerVisible();
  const [docs, total] = await Promise.all([
    Worker.find(filter).select('firstName lastName role suburb state services publicSlug').sort({ firstName: 1, _id: 1 }).skip((page - 1) * LEVEL_PAGE).limit(LEVEL_PAGE).lean(),
    Worker.countDocuments(filter),
  ]);
  const base = '/independent-workers/find';
  const totalPages = Math.max(1, Math.ceil(total / LEVEL_PAGE));
  const pager =
    (page > 1 ? `<a rel="prev" href="${esc(page === 2 ? base : `${base}?page=${page - 1}`)}">Previous page</a> ` : '') +
    (page < totalPages ? `<a rel="next" href="${esc(`${base}?page=${page + 1}`)}">Next page</a>` : '');
  return {
    status: 200,
    title: `Independent support workers${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
    description: 'Browse independent support workers who have created a public profile: their supports, suburb, languages and availability.',
    canonical: page > 1 && !filtered ? `${base}?page=${page}` : base,
    noindex: filtered || total === 0,
    jsonLd: [],
    body:
      `<h1>Find an independent support worker</h1><p>${fmt(total)} ${total === 1 ? 'worker has' : 'workers have'} a public profile.</p>` +
      `<ul>${(docs as any[]).map((w) => li(`/independent-workers/${w.publicSlug}`, workerName(w), `– ${[w.role, [w.suburb, w.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')}`)).join('')}</ul><p>${pager}</p>`,
  };
}

// ---------------------------------------------------------------
// Real-provider location and "experience supporting" pages
//   /directory/in/:suburb      /directory/for/:condition      /directory/for
// ---------------------------------------------------------------
async function providerFilterPage(site: string, mode: 'area' | 'condition', slug: string, page: number): Promise<Page> {
  const rows = mode === 'area' ? await areaRows() : await conditionRows();
  const row = rows.find((r) => r.slug === slug);
  if (!row) return notFound();

  const field = mode === 'area' ? 'serviceSuburbs' : 'conditionExperience';
  const filter = { ...VISIBLE_PROVIDER, slug: { $exists: true, $ne: null }, [field]: new RegExp(`^\\s*${row.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') };
  const [docs, total] = await Promise.all([
    Provider.find(filter).select('legalEntityName tradingName slug registrationGroups').sort({ tradingName: 1, legalEntityName: 1, _id: 1 }).skip((page - 1) * LEVEL_PAGE).limit(LEVEL_PAGE).lean(),
    Provider.countDocuments(filter),
  ]);

  const base = `/directory/${mode === 'area' ? 'in' : 'for'}/${row.slug}`;
  const totalPages = Math.max(1, Math.ceil(total / LEVEL_PAGE));
  const heading = mode === 'area' ? `Providers supporting people in ${row.name}` : `Providers with experience supporting ${row.name}`;
  const pager =
    (page > 1 ? `<a rel="prev" href="${esc(page === 2 ? base : `${base}?page=${page - 1}`)}">Previous page</a> ` : '') +
    (page < totalPages ? `<a rel="next" href="${esc(`${base}?page=${page + 1}`)}">Next page</a>` : '');

  return {
    status: 200,
    title: `${heading}${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
    description: trimTo(`${fmt(total)} ${total === 1 ? 'provider lists' : 'providers list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`} on SolDirectory. See their supports and service areas, then get matched for free.`, 158),
    canonical: page > 1 ? `${base}?page=${page}` : base,
    noindex: total < MIN_INDEXABLE_PROVIDERS,
    jsonLd: [{ id: 'directory-breadcrumbs', data: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site}/` },
      { '@type': 'ListItem', position: 2, name: 'Provider directory', item: `${site}/directory` },
      { '@type': 'ListItem', position: 3, name: row.name, item: `${site}${base}` },
    ] } }],
    body:
      `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/directory">Provider directory</a> / ${esc(row.name)}</nav><h1>${esc(heading)}</h1>` +
      `<p>${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory.</p>` +
      `<ul>${(docs as any[]).map((p) => li(`/directory/${p.slug}`, p.tradingName || p.legalEntityName, (p.registrationGroups ?? []).length ? `– ${(p.registrationGroups as string[]).slice(0, 3).join(', ')}` : '')).join('')}</ul><p>${pager}</p>`,
  };
}

async function conditionsHubPage(site: string): Promise<Page> {
  const rows = await conditionRows();
  return {
    status: 200,
    title: 'Providers by experience supporting a condition or need | SolDirectory',
    description: 'Browse providers by the conditions and needs they say they have experience supporting. Providers write their own profiles.',
    canonical: '/directory/for',
    noindex: rows.length === 0,
    jsonLd: [],
    body: `<h1>Find providers by experience</h1><ul>${rows.map((r) => li(`/directory/for/${r.slug}`, r.name, `(${fmt(r.count)})`)).join('')}</ul>`,
  };
}

// ---------------------------------------------------------------
// WordPress service pages - /services/:slug
// The content lives in WordPress; crawlers get it here as plain HTML.
// ---------------------------------------------------------------
class WordPressUnavailable extends Error {}

const WP_TTL_MS = 5 * 60 * 1000;
const serviceCache = new Map<string, { at: number; item: any | null }>();

/** WordPress returns titles with HTML entities ("&amp;", "&#8217;"). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[n as string] as string));
}
const plain = (html: string) => decodeEntities(String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

async function fetchWpService(slug: string): Promise<any | null> {
  const hit = serviceCache.get(slug);
  if (hit && Date.now() - hit.at < WP_TTL_MS) return hit.item;
  const base = process.env.WORDPRESS_URL;
  if (!base) throw new WordPressUnavailable('WORDPRESS_URL is not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/wp-json/wp/v2/services?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal });
    if (!res.ok) throw new WordPressUnavailable(`WordPress responded ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list)) throw new WordPressUnavailable('Unexpected WordPress response');
    const item = list[0] ?? null;
    serviceCache.set(slug, { at: Date.now(), item }); // failures are never cached
    return item;
  } catch (e) {
    throw e instanceof WordPressUnavailable ? e : new WordPressUnavailable(String((e as Error).message));
  } finally {
    clearTimeout(timer);
  }
}

const AGED_CARE_CATEGORIES = ['Dementia care', 'Palliative care', 'Residential aged care'];
const overviewCache = new Map<string, { at: number; value: Awaited<ReturnType<typeof computeCategoryOverview>> }>();
async function overviewFor(type: RegisterType, category: string) {
  const key = `${type}|${category}`;
  const hit = overviewCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) return hit.value;
  const value = await computeCategoryOverview(type, category);
  overviewCache.set(key, { at: Date.now(), value });
  return value;
}
const STATE_SLUGS: Record<string, string> = { NSW: 'nsw', VIC: 'vic', QLD: 'qld', WA: 'wa', SA: 'sa', TAS: 'tas', ACT: 'act', NT: 'nt' };

const jsonArr = (v: unknown): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v !== 'string' || !v.trim()) return [];
  try { const d = JSON.parse(v); return Array.isArray(d) ? d : []; } catch { return []; }
};

async function servicePage(site: string, slug: string): Promise<Page> {
  if (!SLUG_RE.test(slug)) return notFound();
  const item = await fetchWpService(slug);
  if (!item) return { ...notFound(), title: 'Service not found | SolDirectory', body: '<h1>Page not found</h1><p><a href="/services">Browse services</a></p>' };

  const meta = item.meta ?? {};
  const s = (k: string) => (typeof meta[k] === 'string' ? plain(meta[k]) : '');
  const title = plain(item.title?.rendered ?? '');
  const excerpt = plain(item.excerpt?.rendered ?? '');
  const seoTitle = s('seo_title') || title;
  const description = trimTo(s('seo_description') || excerpt || `${title} on SolDirectory.`, 160);
  const path = `/services/${item.slug}`;
  const faqs = jsonArr(meta.faq_json).filter((f: any) => f?.question && f?.answer);
  const related = (Array.isArray(meta.related_services) ? meta.related_services : []).filter((r: any) => r?.slug && r?.title);
  const cards = jsonArr(meta.regulator_cards_json).filter((c: any) => c?.title);
  const creds = jsonArr(meta.credentials_json).filter((c: any) => c?.title);
  const noindex = meta.seo_noindex === true || meta.seo_noindex === '1';

  const block = (h: string, text: string) => (text ? `<h2>${esc(h)}</h2><p>${esc(text)}</p>` : '');
  const paras = (k: string) => (typeof meta[k] === 'string' ? String(meta[k]).split(/\n{2,}/).map(plain).filter(Boolean) : []);
  const lines = (k: string) => (typeof meta[k] === 'string' ? String(meta[k]).split(/\r?\n/).map(plain).filter(Boolean) : []);
  const sources = jsonArr(meta.sources_json).filter((x: any) => x?.title && /^https?:\/\//i.test(String(x.url ?? '')));

  // Live register data for this service's category (facts from the imported register only).
  const category = s('register_category');
  let registerHtml = '';
  if (category) {
    const type: RegisterType = AGED_CARE_CATEGORIES.includes(category) ? 'aged_care' : 'ndis';
    const kind = KINDS[type === 'ndis' ? 'ndis-providers' : 'aged-care-providers'];
    const base = `/${type === 'ndis' ? 'ndis-providers' : 'aged-care-providers'}`;
    try {
      const [o, listings] = await Promise.all([overviewFor(type, category), categoryListings(type, category, 12)]);
      if (o.total > 0) {
        const stateRows = Object.entries(o.states).sort((a, b) => b[1] - a[1]);
        registerHtml =
          `<h2>${esc(category)} providers on the ${esc(kind.label)} register</h2>` +
          `<p>${fmt(o.total)} ${esc(kind.label)} ${o.total === 1 ? 'provider lists' : 'providers list'} ${esc(category.toLowerCase())} supports on the ${esc(kind.register)}. A register listing shows what the register says, not who has capacity.</p>` +
          (listings.length ? `<h3>Providers listing ${esc(category.toLowerCase())}</h3><ul>${listings.map((x) => li(`${base}/${x.slug}`, x.name, `- ${x.states.join(', ')}${x.areas.length ? `; includes ${x.areas.slice(0, 3).map((a) => `${a.suburb}, ${a.state}`).join('; ')}` : ''}`)).join('')}</ul><p><a href="${base}?category=${encodeURIComponent(category)}">See all ${fmt(o.total)} ${esc(category.toLowerCase())} providers</a></p>` : '') +
          `<h3>Listings by state and territory</h3><ul>${stateRows.map(([code, n]) => li(`${base}/${STATE_SLUGS[code] ?? code.toLowerCase()}?category=${encodeURIComponent(category)}`, STATE_NAMES[code] ?? code, `(${fmt(n)})`)).join('')}</ul>` +
          (o.topSuburbs.length ? `<h3>Suburbs with the most listings</h3><ul>${o.topSuburbs.slice(0, 12).map((x) => li(`${base}/${STATE_SLUGS[x.state] ?? x.state.toLowerCase()}/${x.slug}`, `${x.suburb}, ${x.state}`, `(${fmt(x.count)})`)).join('')}</ul>` : '') +
          (o.widest.length ? `<h3>Listings covering the most areas</h3><ul>${o.widest.slice(0, 8).map((x) => li(`${base}/${x.slug}`, x.name, `- ${fmt(x.areaCount)} areas`)).join('')}</ul>` : '');
      }
    } catch {
      registerHtml = ''; // the register data is an extra; never fail the page over it
    }
  }
  // Independent workers who published a profile for this service (opt-in, admin-approved only).
  let workersHtml = '';
  try {
    const w = await workersForService(title, category || undefined, { limit: 6 });
    if (w.total > 0) {
      workersHtml =
        `<h2>Independent support workers offering ${esc(title)}</h2>` +
        `<p>${fmt(w.total)} independent ${w.total === 1 ? 'worker has' : 'workers have'} published a public profile for ${w.level === 'service' ? esc(title.toLowerCase()) : `${esc(category.toLowerCase() || title.toLowerCase())} supports (the wider category this service falls under)`}. Contact details are not shown; organisations request contact through SolDirectory.</p>` +
        `<ul>${w.items.map((x) => li(`/independent-workers/${x.slug}`, `${x.firstName}${x.lastInitial ? ` ${x.lastInitial}.` : ''}`, `${[x.role, [x.suburb, x.state].filter(Boolean).join(', '), x.services.slice(0, 4).join(', ')].filter(Boolean).join(' - ')}`)).join('')}</ul>` +
        `<p><a href="/independent-workers/find?service=${encodeURIComponent(w.matchedNames[0] ?? title)}">Browse independent workers</a></p>`;
    }
  } catch {
    workersHtml = ''; // an extra: never fail the page over it
  }
  const body =
    `<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/services">Services</a> / ${esc(title)}</nav>` +
    `<h1>${esc(s('hero_headline') || title)}</h1>` +
    (s('hero_eyebrow') ? `<p>${esc(s('hero_eyebrow'))}</p>` : '') +
    (s('hero_description') || excerpt ? `<p>${esc(s('hero_description') || excerpt)}</p>` : '') +
    (s('short_answer') ? `<h2>The short answer</h2><p>${esc(s('short_answer'))}</p>` : '') +
    (plain(item.content?.rendered ?? '') ? `<div>${esc(plain(item.content.rendered))}</div>` : '') +
    (paras('overview_content').length ? `<h2>${esc(s('overview_heading') || `About ${title}`)}</h2>${paras('overview_content').map((p) => `<p>${esc(p)}</p>`).join('')}` : '') +
    block('Who is this service for?', s('who_for')) +
    (lines('how_to_choose').length ? `<h2>How to choose a provider</h2><ul>${lines('how_to_choose').map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '') +
    (lines('getting_started').length ? `<h2>Getting started</h2><ol>${lines('getting_started').map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : '') +
    block('Eligibility', s('eligibility')) +
    block('Funding', [s('funding_info'), s('plan_management_info')].filter(Boolean).join(' ')) +
    block('What it costs', s('cost_info')) +
    registerHtml +
    workersHtml +
    (creds.length ? `<h2>Checking credentials</h2><ul>${creds.map((c: any) => `<li><strong>${esc(plain(c.title))}</strong> ${esc(plain(c.description ?? ''))}</li>`).join('')}</ul>` : '') +
    (cards.length ? `<h2>${esc(s('regulations_heading') || 'Regulation and safeguards')}</h2>${s('regulations_intro') ? `<p>${esc(s('regulations_intro'))}</p>` : ''}<ul>${cards.map((c: any) => `<li><strong>${esc(plain(c.title))}</strong> ${esc(plain(c.description ?? ''))}${c.phone ? ` Phone: ${esc(String(c.phone))}.` : ''}</li>`).join('')}</ul>` : '') +
    (related.length ? `<h2>Related services</h2><ul>${related.map((r: any) => li(`/services/${r.slug}`, plain(r.title))).join('')}</ul>` : '') +
    (faqs.length ? `<h2>Frequently asked questions</h2>${faqs.map((f: any) => `<h3>${esc(plain(f.question))}</h3><p>${esc(plain(f.answer))}</p>`).join('')}` : '') +
    (sources.length ? `<h2>Sources and further reading</h2><ul>${sources.map((x: any) => `<li><a href="${esc(String(x.url))}" rel="noopener nofollow">${esc(plain(x.title))}</a></li>`).join('')}</ul>` : '') +
    `<p><a href="/directory">Browse the provider directory</a></p>`;

  return {
    status: 200,
    title: seoTitle,
    description,
    canonical: path,
    noindex,
    ogImage: typeof meta.seo_og_image === 'string' && meta.seo_og_image ? meta.seo_og_image : undefined,
    jsonLd: [
      { ...breadcrumbLd(site, [{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }, { name: title, path }]), id: 'cpt-breadcrumbs' },
      ...(faqs.length
        ? [{ id: 'cpt-faq', data: { '@type': 'FAQPage', mainEntity: faqs.map((f: any) => ({ '@type': 'Question', name: plain(f.question), acceptedAnswer: { '@type': 'Answer', text: plain(f.answer) } })) } }]
        : []),
    ],
    body,
  };
}

/** GET /seo-shell/<original path>?<original query> — see the file comment. */
export async function registerShell(req: Request, res: Response) {
  const url = new URL(req.originalUrl, 'http://x');
  const parts = url.pathname.replace(/^\/seo-shell/, '').split('/').filter(Boolean).map((p) => p.toLowerCase());
  const site = siteUrl(req);
  const pageNum = /^\d{1,4}$/.test(url.searchParams.get('page') ?? '') ? Math.max(1, Number(url.searchParams.get('page'))) : 1;

  let page: Page;
  const root = parts[0];
  if (root === 'services' && parts.length === 2) {
    try {
      page = await servicePage(site, parts[1]);
    } catch (e) {
      // WordPress is down or broken: don't answer 404 (the page may well exist) - nginx then serves the plain app.
      if (e instanceof WordPressUnavailable) return res.status(502).send('Content service unavailable');
      throw e;
    }
  } else if (root === 'directory' && parts.length === 3 && (parts[1] === 'in' || parts[1] === 'for')) {
    page = await providerFilterPage(site, parts[1] === 'in' ? 'area' : 'condition', parts[2], pageNum);
  } else if (root === 'directory' && parts.length === 2 && parts[1] === 'for') {
    page = await conditionsHubPage(site);
  } else if (root === 'directory' && parts.length === 2) {
    page = await providerProfilePage(site, parts[1]);
  } else if (root === 'independent-workers' && parts.length === 2) {
    page = parts[1] === 'find'
      ? await workerListPage(site, pageNum, ['service', 'suburb', 'q'].some((k) => url.searchParams.has(k)))
      : await workerProfilePage(site, parts[1]);
  } else if (root in KINDS && parts.length <= 3) {
    const kindPath = root as KindPath;
    const filtered = ['category', 'q'].some((k) => url.searchParams.has(k));
    if (parts.length === 1) page = await hubPage(site, kindPath);
    else if (parts.length === 3 || STATE_CODES.includes(parts[1].toUpperCase() as never)) page = await listPage(site, kindPath, parts[1], parts[2] ?? null, pageNum, filtered);
    else page = await providerPage(site, kindPath, parts[1]);
  } else {
    return res.status(404).send('Not found');
  }

  let html: string;
  try { html = await loadShell(); } catch { return res.status(503).send('Web build not found'); }

  res.status(page.status).set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' });
  res.send(render(html, req, page, site));
}
