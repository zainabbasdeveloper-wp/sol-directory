import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../PublicLayout';
import Pagination from '../../../components/ui/Pagination';
import ProviderMap from '../../../components/ProviderMap';
import { getRegisterHub, searchRegister, type RegisterHub, type RegisterSearchResult } from '../../../api/registerApi';
import { MIN_INDEXABLE, absoluteUrl, registerPath, stateBySlug, type RegisterKind } from '../../../lib/registerMeta';
import { applySeoTags, setJsonLd } from '../../../lib/seo';
import RegisterCard from './RegisterCard';
import LocationWorkers from './LocationWorkers';
import { Breadcrumbs, GetMatchedCta, VerifyNote, formatCount, titleCase, trimTo } from './RegisterParts';
import '../Home.css';
import '../Directory.css';
import './register.css';

const PAGE_SIZE = 12;
const NEARBY_SUBURBS = 18;

interface Props { kind: RegisterKind; stateSlug: string; suburbSlug?: string }

/**
 * A state page (/ndis-providers/nsw) or a suburb page
 * (/ndis-providers/nsw/parramatta): the listings for that area, paginated,
 * with real per-area counts of which supports are listed. Kept out of
 * search results while thin or filtered (see the noindex rule below).
 */
export default function RegisterListPage({ kind, stateSlug, suburbSlug }: Props) {
  const state = stateBySlug(stateSlug);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [text, setText] = useState(q);
  const [data, setData] = useState<RegisterSearchResult | null>(null);
  const [facets, setFacets] = useState<{ category: string; count: number }[]>([]);
  const [hub, setHub] = useState<RegisterHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const facetsFor = useRef('');

  const areaKey = `${kind.type}|${stateSlug}|${suburbSlug ?? ''}`;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };

  // Debounce the name box into the URL (and back to page 1).
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => setParam({ q: text.trim() || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => { setText(q); }, [areaKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suburb links for internal navigation (cached server-side).
  useEffect(() => {
    let alive = true;
    getRegisterHub(kind.type).then((h) => { if (alive) setHub(h); }).catch(() => {});
    return () => { alive = false; };
  }, [kind.type]);

  useEffect(() => {
    if (!state) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    const wantFacets = facetsFor.current !== areaKey;
    searchRegister({ type: kind.type, state: state.code, suburb: suburbSlug, category: category || undefined, q: q || undefined, page, limit: PAGE_SIZE, facets: wantFacets })
      .then((r) => {
        if (!alive) return;
        setData(r);
        if (r.categories) { setFacets(r.categories); facetsFor.current = areaKey; }
      })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaKey, category, q, page]);

  const suburbName = useMemo(() => {
    if (!suburbSlug || !state) return '';
    for (const item of data?.items ?? []) {
      const hit = item.areas.find((a) => a.suburbSlug === suburbSlug && a.state === state.code);
      if (hit) return hit.suburb;
    }
    return hub?.suburbs.find((s) => s.slug === suburbSlug && s.state === state.code)?.suburb ?? titleCase(suburbSlug);
  }, [data, hub, suburbSlug, state]);

  const areaName = suburbSlug ? `${suburbName}, ${state?.code ?? ''}` : state?.name ?? '';
  const filtered = !!(category || q);
  const total = data?.total ?? 0;
  const basePath = registerPath(kind, stateSlug, suburbSlug);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const topFacets = facets.slice(0, 3);

  // A page is worth indexing only if it's a real, unfiltered list. Suburb
  // pages also need a few genuine listings — below that it's a near-empty
  // page that exists only to carry a keyword.
  const noindex = !state || failed || (data !== null && (total === 0 || filtered || (!!suburbSlug && total < MIN_INDEXABLE)));

  useEffect(() => {
    if (!state || loading) return;
    const title = `${kind.label} providers in ${areaName}${page > 1 ? ` (page ${page})` : ''} | SolDirectory`;
    applySeoTags({
      title,
      description: trimTo(
        `${formatCount(total)} ${kind.label} ${total === 1 ? 'provider is' : 'providers are'} listed on the ${kind.register} for ${areaName}. See the supports listed and service areas, then get matched for free.`,
        158
      ),
      canonicalUrl: absoluteUrl(page > 1 && !filtered ? `${basePath}?page=${page}` : basePath),
      noindex,
    });
    const crumbs = [
      { name: 'Home', path: '/' },
      { name: `${kind.label} providers`, path: registerPath(kind) },
      { name: state.name, path: registerPath(kind, stateSlug) },
      ...(suburbSlug ? [{ name: suburbName, path: basePath }] : []),
    ];
    setJsonLd('register-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
    });
    return () => setJsonLd('register-breadcrumbs', null);
  }, [state, loading, kind, areaName, page, total, filtered, noindex, basePath, stateSlug, suburbSlug, suburbName]);

  if (!state) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page"><div className="dir-empty"><h1>State not found</h1><p><Link to={registerPath(kind)}>Browse {kind.label} providers by state</Link></p></div></main>
        <PublicFooter />
      </>
    );
  }

  const nearby = (hub?.suburbs ?? []).filter((s) => s.state === state.code && s.slug !== suburbSlug).slice(0, NEARBY_SUBURBS);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Provider register</span>
          <h1 className="section-heading section-heading-light">{kind.label} providers in {areaName}</h1>
          <p className="directory-page-subtitle">
            {loading && !data
              ? 'Loading the register…'
              : total > 0 && !filtered
                ? `${formatCount(total)} ${total === 1 ? 'provider is' : 'providers are'} listed on the ${kind.register} for ${areaName}.`
                : `Providers listed on the ${kind.register} for ${areaName}.`}
            {topFacets.length > 0 && !filtered && (
              <> The supports listed most often here are {topFacets.map((f) => `${f.category.toLowerCase()} (${formatCount(f.count)})`).join(', ')}.</>
            )}
          </p>
        </div>
      </div>

      <main className="reg-page">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: `${kind.label} providers`, to: registerPath(kind) },
            { label: state.name, to: registerPath(kind, stateSlug) },
            ...(suburbSlug ? [{ label: suburbName }] : []),
          ]}
        />

        {facets.length > 0 && (
          <div className="reg-filters" role="group" aria-label="Filter by support">
            <button type="button" className="reg-chip" aria-pressed={!category} onClick={() => setParam({ category: null, page: null })}>All supports</button>
            {/* Top supports for the area, plus the active one even if it's rarer — otherwise a filter set from a link would be invisible. */}
            {[...facets.slice(0, 12), ...facets.slice(12).filter((f) => f.category === category)].map((f) => (
              <button
                key={f.category}
                type="button"
                className="reg-chip"
                aria-pressed={category === f.category}
                onClick={() => setParam({ category: category === f.category ? null : f.category, page: null })}
              >
                {f.category}<small>{formatCount(f.count)}</small>
              </button>
            ))}
          </div>
        )}

        <div className="reg-search" role="search">
          <input
            type="search"
            value={text}
            placeholder={`Search ${areaName} by provider name`}
            aria-label="Search by provider name"
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <p className="dir-results-head" aria-live="polite">
          {loading ? 'Searching…' : failed ? '' : total === 0 ? '' : total <= PAGE_SIZE
            ? `${formatCount(total)} ${total === 1 ? 'provider' : 'providers'}${filtered ? ' match your search' : ''}`
            : `Showing ${formatCount((page - 1) * PAGE_SIZE + 1)}–${formatCount(Math.min(page * PAGE_SIZE, total))} of ${formatCount(total)} providers${filtered ? ' matching your search' : ''}`}
        </p>

        {failed && <div className="dir-empty" role="alert"><p>We couldn’t load these listings just now. Please try again shortly.</p></div>}

        {!failed && !loading && total === 0 && (
          <div className="dir-empty">
            <h2>{filtered ? 'No providers match that search' : `No listings for ${areaName} yet`}</h2>
            <p>{filtered ? 'Try a different support or remove the name filter.' : 'You can still send a request and we’ll match you with providers who cover this area.'}</p>
            <div className="dir-empty-actions">
              {filtered && <button type="button" className="btn-tint" onClick={() => { setText(''); setParams(new URLSearchParams(), { replace: true }); }}>Clear filters</button>}
              {suburbSlug && <Link className="btn-tint" to={registerPath(kind, stateSlug)}>All of {state.name}</Link>}
            </div>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <ProviderMap
              providers={data.items.map((i) => ({
                id: `${i.type}-${i.slug}`,
                name: i.name,
                location: i.location,
                category: i.supportCategories[0] ?? null,
                suburb: i.areas[0] ? `${i.areas[0].suburb}, ${i.areas[0].state}` : null,
                href: registerPath(kind, i.slug),
              }))}
            />
            <ul className={`dir-grid${loading ? ' dir-grid-loading' : ''}`} aria-busy={loading}>
              {data.items.map((i) => <RegisterCard key={`${i.type}-${i.slug}`} item={i} />)}
            </ul>
          </>
        )}

        {!failed && total > PAGE_SIZE && (
          <Pagination
            page={page}
            totalPages={totalPages}
            disabled={loading}
            onChange={(p) => { setParam({ page: p > 1 ? String(p) : null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

        {!failed && !loading && total > 0 && !filtered && (
          <LocationWorkers stateCode={state.code} stateName={state.name} suburbName={suburbSlug ? suburbName : undefined} />
        )}

        {nearby.length > 0 && (
          <>
            <h2 className="reg-h2">{suburbSlug ? `More suburbs in ${state.name}` : `Suburbs in ${state.name} with the most listings`}</h2>
            <ul className="reg-linkgrid">
              {nearby.map((s) => (
                <li key={`${s.state}-${s.slug}`}>
                  <Link to={registerPath(kind, stateSlug, s.slug)}><span>{s.suburb}</span><span className="reg-count">{formatCount(s.count)}</span></Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <VerifyNote kind={kind} />
        <GetMatchedCta
          title={`Looking for support in ${areaName}?`}
          body="We match you with providers who have recently confirmed they can take on new people. It’s free and there’s no obligation."
        />
      </main>

      <PublicFooter />
    </>
  );
}
