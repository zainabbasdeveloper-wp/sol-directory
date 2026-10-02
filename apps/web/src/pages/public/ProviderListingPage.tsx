import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import { Breadcrumbs, trimTo } from './register/RegisterParts';
import { listProvidersBy, listPublicAreas, listPublicConditions, type CountRow, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import { conditionBySlug, CONDITION_CATEGORY_GROUPS } from '../../data/conditionContent';
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
 * /directory/in/:suburb (mode "area") and /condition/:slug/ (mode
 * "condition", permalink-style — its own top-level category prefix, not
 * nested under /find-a-provider): real providers who list this suburb as an
 * area they support, or this condition as experience they have. The
 * wording says exactly that — providers write their own profiles. Pages
 * with fewer than a handful of providers stay reachable but are kept
 * out of search results.
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

  // Real educational content for this condition, if it's one of the 40
  // the site has written up (data/conditionContent.ts) — independent of
  // whether any real provider has tagged it yet, so the page (and the
  // mega menu link to it) works from day one, not only once a provider
  // exists. Area pages are unaffected: they still only exist once a
  // real provider actually lists that suburb.
  const conditionMeta = mode === 'condition' ? conditionBySlug(slug) : undefined;

  useEffect(() => {
    let alive = true;
    setRow(undefined);
    (mode === 'area' ? listPublicAreas() : listPublicConditions())
      .then((r) => {
        if (!alive) return;
        const apiRow = r.items.find((x) => x.slug === slug);
        if (apiRow) { setRow(apiRow); return; }
        setRow(conditionMeta ? { slug: conditionMeta.slug, name: conditionMeta.name, count: 0 } : null);
      })
      .catch(() => { if (alive) { setRow(conditionMeta ? { slug: conditionMeta.slug, name: conditionMeta.name, count: 0 } : null); setError(true); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Condition pages live under their own top-level "category" prefix
  // (/condition/:slug/, permalink-style, per explicit request) rather
  // than nested under /directory — area pages are unchanged.
  const base = mode === 'area' ? `/directory/in/${slug}` : `/condition/${slug}/`;
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
    const parent = mode === 'area' ? { name: 'Provider directory', to: '/find-a-provider' } : { name: 'Condition', to: '/condition' };
    setJsonLd('directory-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: parent.name, item: `${window.location.origin}${parent.to}` },
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
            <Link className="btn-gradient" to="/find-a-provider">Browse the provider directory</Link>
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
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            mode === 'area' ? { label: 'Provider directory', to: '/find-a-provider' } : { label: 'Condition', to: '/condition' },
            { label: row?.name ?? '…' },
          ]}
        />
        <h1 className="pp-head-h1">{heading}</h1>
        <p className="reg-lede" ref={topRef}>
          {row && !loading
            ? `${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory ${total === 1 ? 'lists' : 'list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`}. Providers write their own profiles — confirm details with them directly.`
            : 'Loading…'}
        </p>

        {mode === 'condition' && conditionMeta && CONDITION_CATEGORY_GROUPS.find((g) => g.title === conditionMeta.categoryGroup)?.note && (
          <div className="reg-note" role="note">
            {CONDITION_CATEGORY_GROUPS.find((g) => g.title === conditionMeta.categoryGroup)?.note}
          </div>
        )}

        {error && <div className="dir-empty" role="alert"><p>We couldn’t load providers just now. Please try again.</p></div>}

        {!loading && !error && items.length === 0 ? (
          <div className="dir-empty">
            <h2>No providers currently list this</h2>
            <p>
              {mode === 'area'
                ? 'No providers on SolDirectory currently list this suburb as an area they support.'
                : `No providers on SolDirectory currently list experience supporting ${row?.name ?? 'this'}.`}{' '}
              Submit a free enquiry and we’ll notify suitable providers as they join.
            </p>
            <div className="dir-empty-actions">
              <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
            </div>
          </div>
        ) : (
          <ul className="dir-grid" aria-busy={loading}>
            {items.map((p) => <ProviderCardItem key={p.id} p={p} />)}
          </ul>
        )}

        <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={(n) => { setParams(n > 1 ? { page: String(n) } : {}); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />

        <div className="reg-note">
          <strong>Need help choosing?</strong> Tell us where you are, when you need support and how it’s funded, and relevant providers
          will review your enquiry — it’s free.{' '}
          <button type="button" className="link-btn" onClick={() => openMatchModal()}>Submit an enquiry</button>
        </div>

        {mode === 'condition' && conditionMeta && <ConditionContentSections meta={conditionMeta} />}
      </main>
      <PublicFooter />
    </>
  );
}

/**
 * The extra ~700-900 words of real content on a condition page: an
 * honest "about" summary (general information, not medical advice —
 * see data/conditionContent.ts), links to relevant support categories,
 * the same "how providers are listed" / "checking experience" method
 * explanation used across the site (reused verbatim here, not
 * per-condition — it's genuinely the same process for every condition),
 * links to sibling conditions, and a short condition-specific FAQ.
 */
function ConditionContentSections({ meta }: { meta: NonNullable<ReturnType<typeof conditionBySlug>> }) {
  const group = CONDITION_CATEGORY_GROUPS.find((g) => g.title === meta.categoryGroup);
  const siblings = (group?.items ?? []).filter((c) => c.slug !== meta.slug);
  const { openMatchModal } = useMatchModal();

  return (
    <>
      <section id="about" style={{ marginTop: 40 }}>
        <h2 className="reg-h2" style={{ marginTop: 0 }}>About {meta.name}</h2>
        <p className="reg-lede">{meta.summary}</p>
        <p className="reg-note" style={{ marginTop: 12 }}>
          This is general information, not medical advice or a diagnosis. Every person’s needs are different — a provider’s general
          experience with {meta.name.toLowerCase()} is a starting point for a conversation, not a guarantee of fit.
        </p>
      </section>

      {meta.relatedCategories.length > 0 && (
        <section id="support-types">
          <h2 className="reg-h2">Support commonly linked to {meta.name}</h2>
          <p className="reg-lede" style={{ marginBottom: 14 }}>
            These are supports people with {meta.name.toLowerCase()} commonly look for — not a personal recommendation, just a starting
            point for browsing.
          </p>
          <ul className="reg-services">
            {meta.relatedCategories.map((c) => (
              <li key={c}><Link to={`/find-a-provider?service=${encodeURIComponent(c)}`}>{c}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <section id="method">
        <h2 className="reg-h2">How providers are listed</h2>
        <p className="reg-lede" style={{ marginBottom: 8 }}>
          <strong>Provider-supplied.</strong> Whether a provider has experience supporting {meta.name.toLowerCase()} is written by the
          provider themselves, the same way they write their supports and service areas. SolDirectory doesn’t independently verify
          clinical experience or assess quality.
        </p>
        <p className="reg-lede" style={{ marginBottom: 8 }}>
          <strong>Alphabetical, not ranked.</strong> Providers are shown alphabetically. Payment for a subscription doesn’t change
          whether or where a provider appears.
        </p>
        <p className="reg-lede">
          <strong>Availability.</strong> Providers confirm each week that they’re taking referrals. One that hasn’t confirmed recently
          is removed from results until they do.
        </p>
      </section>

      <section id="checking-experience">
        <h2 className="reg-h2">Checking a provider’s experience with {meta.name}</h2>
        <p className="reg-lede" style={{ marginBottom: 14 }}>
          A listing here is a starting point, not a substitute for asking directly. Before engaging a provider, it’s worth confirming:
        </p>
        <ol className="reg-checklist">
          <li>How many people with {meta.name.toLowerCase()} specifically they’ve supported, not disability support in general.</li>
          <li>Which staff member would actually work with you or your family member, and their relevant training.</li>
          <li>How they’d handle a change in needs over time — a one-off assessment or an ongoing, adjustable plan.</li>
          <li>Their current registration, insurance and worker screening — ask to see it directly, don’t assume from the listing.</li>
        </ol>
      </section>

      {siblings.length > 0 && (
        <section id="related-conditions">
          <h2 className="reg-h2">Other conditions in {meta.categoryGroup}</h2>
          <ul className="reg-linkgrid">
            {siblings.map((c) => (
              <li key={c.slug}><Link to={`/condition/${c.slug}/`}><span>{c.name}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section id="faq">
        <h2 className="reg-h2">Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Does SolDirectory verify a provider’s experience with {meta.name.toLowerCase()}?</p>
            <p className="reg-lede" style={{ marginBottom: 0 }}>
              No. Providers write their own profiles, including which conditions they have experience supporting. Confirm the details
              that matter to you directly with the provider.
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>No providers are listed here yet — what can I do?</p>
            <p className="reg-lede" style={{ marginBottom: 0 }}>
              Submit a free enquiry and we’ll notify suitable providers in your area as they join and confirm their capacity — there’s
              no cost and no obligation.
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Is this page medical advice?</p>
            <p className="reg-lede" style={{ marginBottom: 0 }}>
              No. It’s general information to help with browsing providers. For anything about diagnosis, treatment or a specific
              person’s needs, speak with a GP or the relevant specialist.
            </p>
          </div>
        </div>
      </section>

      <div className="reg-cta" style={{ marginTop: 32 }}>
        <div>
          <strong>Looking for support with {meta.name.toLowerCase()}?</strong>
          <span>Tell us what you need and we’ll connect you with providers who confirm they can help — free, no obligation.</span>
        </div>
        <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
      </div>
    </>
  );
}

/**
 * /condition — every condition/need SolDirectory has a page for (see
 * data/conditionContent.ts), grouped the same way the mega menu groups
 * them. Real provider counts are overlaid where they exist, but — same
 * principle as the detail pages — a condition with zero real providers
 * so far still gets a real, reachable link, not just the ones already
 * tagged by a provider.
 */
export function ConditionsHubPage() {
  const [rows, setRows] = useState<CountRow[]>([]);
  const { openMatchModal } = useMatchModal();

  useEffect(() => {
    listPublicConditions().then((r) => setRows(r.items)).catch(() => setRows([]));
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    applySeoTags({
      title: 'Providers by experience supporting a condition or need | SolDirectory',
      description: 'Browse providers by the conditions and needs they say they have experience supporting. Providers write their own profiles.',
      canonicalUrl: `${window.location.origin}/condition`,
    });
  }, []);

  const countFor = (slug: string) => rows.find((r) => r.slug === slug)?.count ?? 0;

  return (
    <>
      <PublicHeader />
      <div className="directory-page-header directory-page-header--conditions">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Provider experience</span>
          <h1 className="section-heading section-heading-light">Find providers by condition or support need</h1>
          <p className="directory-page-subtitle">Explore general information and providers who say they have relevant experience, then confirm fit directly.</p>
        </div>
      </div>
      <main className="reg-page category-hub-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Condition' }]} />
        <section className="directory-intro">
          <span className="directory-section-label">Experience is one part of fit</span>
          <h2>Use a condition page to start a more specific conversation</h2>
          <p>Providers choose the conditions and needs shown on their own profiles. This is not a clinical recommendation or proof of specialist expertise. Ask what experience is relevant to the person, who will deliver the support and how outcomes are reviewed.</p>
        </section>

        <section className="directory-guidance" aria-labelledby="condition-checks-heading">
          <div className="directory-section-heading"><span className="directory-section-label">Before engaging a provider</span><h2 id="condition-checks-heading">Three questions worth asking</h2></div>
          <ol className="directory-guidance-grid">
            <li><span>01</span><h3>What experience is relevant?</h3><p>Ask about similar support needs, age groups, communication preferences and the provider’s role in previous work.</p></li>
            <li><span>02</span><h3>Who provides the support?</h3><p>Confirm qualifications, worker screening, supervision and whether the same team members can provide continuity.</p></li>
            <li><span>03</span><h3>How is support adapted?</h3><p>Discuss the person’s goals, routines, culture, communication and sensory or accessibility needs before services begin.</p></li>
          </ol>
        </section>

        {CONDITION_CATEGORY_GROUPS.map((group) => (
          <section className="category-hub-group" key={group.title}>
            <h2 className="reg-h2">{group.title}</h2>
            {group.note && <p className="reg-lede">{group.note}</p>}
            <ul className="reg-linkgrid">
              {group.items.map((c) => {
                const count = countFor(c.slug);
                return (
                  <li key={c.slug}>
                    <Link to={`/condition/${c.slug}/`}><span>{c.name}</span>{count > 0 && <span>{fmt(count)}</span>}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <p className="reg-note"><strong>About the counts:</strong> A count appears only when at least one real provider profile lists that experience. It is not a quality score or recommendation.</p>
        <section className="directory-content-cta">
          <div><span className="directory-section-label">Need support tailored to one person?</span><h2>Describe the person’s needs and preferences</h2><p>Send a free enquiry so relevant providers can review the support, location, funding and preferred timeframe.</p></div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry</button>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
