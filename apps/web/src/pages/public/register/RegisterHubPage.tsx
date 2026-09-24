import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../PublicLayout';
import Pagination from '../../../components/ui/Pagination';
import { getRegisterHub, searchRegister, type RegisterHub, type RegisterSearchResult } from '../../../api/registerApi';
import { STATES, absoluteUrl, registerPath, stateByCode, type RegisterKind } from '../../../lib/registerMeta';
import { applySeoTags, setJsonLd } from '../../../lib/seo';
import RegisterCard from './RegisterCard';
import { Breadcrumbs, GetMatchedCta, VerifyNote, formatCount, trimTo } from './RegisterParts';
import '../Home.css';
import '../Directory.css';
import './register.css';

const PAGE_SIZE = 12;
const TOP_SUBURBS = 24;

/** /ndis-providers and /aged-care-providers — the entry point: states, busiest suburbs, name search. */
export default function RegisterHubPage({ kind }: { kind: RegisterKind }) {
  const [hub, setHub] = useState<RegisterHub | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<RegisterSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;
    setHub(null);
    setFailed(false);
    getRegisterHub(kind.type).then((h) => { if (alive) setHub(h); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [kind.type]);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(text.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    let alive = true;
    setSearching(true);
    searchRegister({ type: kind.type, q: query, page, limit: PAGE_SIZE })
      .then((r) => { if (alive) setResults(r); })
      .catch(() => { if (alive) setResults({ items: [], page: 1, limit: PAGE_SIZE, total: 0 }); })
      .finally(() => { if (alive) setSearching(false); });
    return () => { alive = false; };
  }, [kind.type, query, page]);

  const title = `${kind.label} providers in Australia: browse the public register | SolDirectory`;
  useEffect(() => {
    const total = hub ? formatCount(hub.total) : null;
    applySeoTags({
      title,
      description: trimTo(
        `Browse ${total ? `${total} ` : ''}${kind.label} providers listed on the public register, by state and suburb. See the supports listed, then get matched for free.`,
        158
      ),
      canonicalUrl: absoluteUrl(registerPath(kind)),
      noindex: failed,
    });
    setJsonLd('register-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: `${kind.label} providers`, item: absoluteUrl(registerPath(kind)) },
      ],
    });
    return () => setJsonLd('register-breadcrumbs', null);
  }, [hub, failed, kind, title]);

  const topSuburbs = (hub?.suburbs ?? []).slice(0, TOP_SUBURBS);
  const totalPages = results ? Math.max(1, Math.ceil(results.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Provider register</span>
          <h1 className="section-heading section-heading-light">{kind.label} providers in Australia</h1>
          <p className="directory-page-subtitle">
            Browse providers listed on the {kind.register}, by state and suburb. See the supports each one lists and where it operates,
            then get matched with providers who have confirmed they can start.
          </p>
        </div>
      </div>

      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: `${kind.label} providers` }]} />

        <div className="reg-search" role="search">
          <input
            type="search"
            value={text}
            placeholder="Search by provider name"
            aria-label={`Search ${kind.label} providers by name`}
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {query.length >= 2 && (
          <section aria-live="polite">
            <p className="dir-results-head">
              {searching ? 'Searching…' : results ? `${formatCount(results.total)} ${results.total === 1 ? 'provider' : 'providers'} match “${query}”` : ''}
            </p>
            {results && results.items.length > 0 && <ul className="dir-grid">{results.items.map((i) => <RegisterCard key={`${i.type}-${i.slug}`} item={i} />)}</ul>}
            {results && results.total > PAGE_SIZE && <Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={searching} />}
          </section>
        )}

        {failed && (
          <div className="dir-empty" role="alert">
            <p>We couldn’t load the register just now. Please try again shortly.</p>
          </div>
        )}

        {hub && hub.total === 0 && (
          <div className="dir-empty">
            <h2>No listings yet</h2>
            <p>The register hasn’t been loaded for this provider type yet.</p>
          </div>
        )}

        {hub && hub.total > 0 && (
          <>
            <h2 className="reg-h2">Browse {kind.label} providers by state</h2>
            <ul className="reg-linkgrid">
              {STATES.filter((s) => hub.states[s.code]).map((s) => (
                <li key={s.code}>
                  <Link to={registerPath(kind, s.slug)}>
                    <span>{s.name}</span>
                    <span className="reg-count">{formatCount(hub.states[s.code])}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {topSuburbs.length > 0 && (
              <>
                <h2 className="reg-h2">Suburbs with the most listings</h2>
                <ul className="reg-linkgrid">
                  {topSuburbs.map((s) => (
                    <li key={`${s.state}-${s.slug}`}>
                      <Link to={registerPath(kind, s.state.toLowerCase(), s.slug)}>
                        <span>{s.suburb}, {stateByCode(s.state)?.code}</span>
                        <span className="reg-count">{formatCount(s.count)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h2 className="reg-h2">What “listed on the register” means</h2>
            <p className="reg-lede">
              Each provider here appears on the {kind.register}. That tells you what the provider was listed for and where — it is not a
              recommendation, a quality rating or a statement about availability. SolDirectory separately asks providers to confirm each week
              whether they can take on new people; that is what “Get matched” uses.
            </p>
            <VerifyNote kind={kind} />

            <GetMatchedCta
              title="Want providers who can start soon?"
              body="Tell us what you need and where. We match you with providers who have recently confirmed they have capacity — it’s free and there’s no obligation."
            />
          </>
        )}
      </main>

      <PublicFooter />
    </>
  );
}
