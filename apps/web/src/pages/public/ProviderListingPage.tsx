import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import { Breadcrumbs, trimTo } from './register/RegisterParts';
import { listProvidersBy, listPublicAreas, listPublicConditions, type CountRow, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
/** Mirrors MIN_INDEXABLE_PROVIDERS in the API's providersPublic.controller.ts. */
const MIN_INDEXABLE = 3;
const fmt = (n: number) => n.toLocaleString('en-AU');

type Mode = 'area' | 'condition';

export function ProviderCardItem({ p }: { p: PublicProviderCard }) {
  const name = p.tradingName || p.legalEntityName;
  return (
    <li className="dir-card">
      <div className="dir-card-top">
        <Avatar src={p.logoUrl} name={name} shape="square" />
        <div className="dir-card-title">
          <h3>{p.slug ? <Link to={`/directory/${p.slug}`}>{name}</Link> : name}</h3>
        </div>
      </div>
      {p.registrationGroups.length > 0 && (
        <div className="dir-tags" aria-label="Supports offered">
          {p.registrationGroups.slice(0, 4).map((g) => <span key={g} className="dir-tag">{g}</span>)}
          {p.registrationGroups.length > 4 && <span className="dir-tag dir-tag-more">+{p.registrationGroups.length - 4} more</span>}
        </div>
      )}
      {p.slug && <Link className="dir-card-cta" to={`/directory/${p.slug}`}>View profile →</Link>}
    </li>
  );
}

/**
 * /directory/in/:suburb (mode "area") and /directory/for/:condition (mode
 * "condition"): real providers who list this suburb as an area they
 * support, or this condition as experience they have. The wording says
 * exactly that — providers write their own profiles. Pages with fewer than
 * a handful of providers stay reachable but are kept out of search results.
 */
export default function ProviderListingPage({ mode }: { mode: Mode }) {
  const { suburb = '', condition = '' } = useParams();
  const slug = (mode === 'area' ? suburb : condition).toLowerCase();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const { openMatchModal } = useMatchModal();

  const [row, setRow] = useState<CountRow | null | undefined>(undefined); // undefined = still resolving
  const [items, setItems] = useState<PublicProviderCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setRow(undefined);
    (mode === 'area' ? listPublicAreas() : listPublicConditions())
      .then((r) => { if (alive) setRow(r.items.find((x) => x.slug === slug) ?? null); })
      .catch(() => { if (alive) { setRow(null); setError(true); } });
    return () => { alive = false; };
  }, [mode, slug]);

  useEffect(() => {
    if (!row) return;
    let alive = true;
    setLoading(true);
    setError(false);
    listProvidersBy({ ...(mode === 'area' ? { suburb: row.name } : { condition: row.name }), page, limit: PAGE_SIZE })
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [row, mode, page]);

  const base = `/directory/${mode === 'area' ? 'in' : 'for'}/${slug}`;
  const heading = row
    ? (mode === 'area' ? `Providers supporting people in ${row.name}` : `Providers with experience supporting ${row.name}`)
    : 'Provider directory';
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (row === undefined) return;
    if (!row) {
      applySeoTags({ title: 'Page not found | SolDirectory', description: 'This page could not be found.', noindex: true });
      return;
    }
    if (loading) return;
    applySeoTags({
      title: `${heading}${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
      description: trimTo(`${fmt(total)} ${total === 1 ? 'provider lists' : 'providers list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`} on SolDirectory. See their supports and service areas, then get matched for free.`, 158),
      canonicalUrl: `${window.location.origin}${page > 1 ? `${base}?page=${page}` : base}`,
      noindex: total < MIN_INDEXABLE,
    });
    setJsonLd('directory-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Provider directory', item: `${window.location.origin}/directory` },
        { '@type': 'ListItem', position: 3, name: row.name, item: `${window.location.origin}${base}` },
      ],
    });
    return () => setJsonLd('directory-breadcrumbs', null);
  }, [row, loading, total, page, heading, base, mode]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (row === null) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty">
            <h1>{error ? 'We couldn’t load this page' : 'We couldn’t find that page'}</h1>
            <p>{error ? 'Please try again in a moment.' : 'No providers currently list this.'}</p>
            <Link className="btn-gradient" to="/directory">Browse the provider directory</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Provider directory', to: '/directory' }, { label: row?.name ?? '…' }]} />
        <h1 className="pp-head-h1">{heading}</h1>
        <p className="reg-lede" ref={topRef}>
          {row && !loading
            ? `${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory ${total === 1 ? 'lists' : 'list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`}. Providers write their own profiles — confirm details with them directly.`
            : 'Loading…'}
        </p>

        {error && <div className="dir-empty" role="alert"><p>We couldn’t load providers just now. Please try again.</p></div>}

        <ul className="dir-grid" aria-busy={loading}>
          {items.map((p) => <ProviderCardItem key={p.id} p={p} />)}
        </ul>

        <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={(n) => { setParams(n > 1 ? { page: String(n) } : {}); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />

        <div className="reg-note">
          <strong>Need help choosing?</strong> Tell us where you are, when you need support and how it’s funded, and relevant providers
          will review your enquiry — it’s free.{' '}
          <button type="button" className="link-btn" onClick={() => openMatchModal()}>Submit an enquiry</button>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

/** /directory/for — every condition/need that at least one provider says they have experience supporting. */
export function ConditionsHubPage() {
  const [rows, setRows] = useState<CountRow[] | null>(null);
  const [minIndexable, setMin] = useState(MIN_INDEXABLE);

  useEffect(() => {
    listPublicConditions().then((r) => { setRows(r.items); setMin(r.minIndexable); }).catch(() => setRows([]));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (rows === null) return;
    applySeoTags({
      title: 'Providers by experience supporting a condition or need | SolDirectory',
      description: 'Browse providers by the conditions and needs they say they have experience supporting. Providers write their own profiles.',
      canonicalUrl: `${window.location.origin}/directory/for`,
      noindex: rows.length === 0,
    });
  }, [rows]);

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Provider directory', to: '/directory' }, { label: 'By experience' }]} />
        <h1 className="pp-head-h1">Find providers by experience</h1>
        <p className="reg-lede">
          Providers choose the conditions and needs they have experience supporting. This isn’t a clinical recommendation — always confirm
          a provider’s experience and qualifications with them.
        </p>
        {rows !== null && rows.length === 0 && <p className="dir-results-head">No providers have listed this yet.</p>}
        <ul className="reg-linkgrid">
          {(rows ?? []).map((r) => (
            <li key={r.slug}><Link to={`/directory/for/${r.slug}`}>{r.name}<span>{fmt(r.count)}</span></Link></li>
          ))}
        </ul>
        <p className="reg-note">Pages with fewer than {minIndexable} providers are shown to visitors but not offered to search engines.</p>
      </main>
      <PublicFooter />
    </>
  );
}
