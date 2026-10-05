import { bannerFor } from '../../data/bannerImages';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import { Breadcrumbs, trimTo } from './register/RegisterParts';
import TopicLayout, { heroExcerpt, type TopicTocItem } from '../../components/topic/TopicLayout';
import TopicRegisterProviders from '../../components/topic/TopicRegisterProviders';
import { listProvidersBy, listPublicAreas, listPublicConditions, type CountRow, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import { conditionBySlug, CONDITION_CATEGORY_GROUPS } from '../../data/conditionContent';
import { conditionEditorialFor } from '../../data/conditionEditorial';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
/** Mirrors MIN_INDEXABLE_PROVIDERS in the API's providersPublic.controller.ts. */
const MIN_INDEXABLE = 3;
const fmt = (n: number) => n.toLocaleString('en-AU');

const conditionFaqs = (name: string) => {
  const lower = name.toLowerCase();
  return [
    {
      question: `Does SolDirectory verify a provider’s experience with ${lower}?`,
      answer: 'No. Providers write their own profiles, including which conditions they have experience supporting. Confirm the details that matter to you directly with the provider.',
    },
    {
      question: 'No providers are listed here yet — what can I do?',
      answer: 'Submit a free enquiry and we’ll notify suitable providers in your area as they join and confirm their capacity — there’s no cost and no obligation.',
    },
    {
      question: 'Is this page medical advice?',
      answer: 'No. It’s general information to help with browsing providers. For anything about diagnosis, treatment or a specific person’s needs, speak with a GP or the relevant specialist.',
    },
    {
      question: `Does a diagnosis of ${lower} automatically qualify someone for funding?`,
      answer: 'No. Funding bodies apply their own current eligibility rules and usually consider functional impact, the support requested and available evidence. Confirm requirements with the responsible program.',
    },
    {
      question: 'What should I ask before choosing a provider?',
      answer: `Ask about direct experience with ${lower}, the allocated worker’s training, communication and safety planning, current availability, fees, funding, service agreements and how support will be reviewed.`,
    },
  ];
};

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
  const topRef = useRef<HTMLParagraphElement>(null);

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
  // The condition's own name is known before the provider counts load, so the banner doesn't flash "Provider directory".
  const knownName = row?.name ?? (mode === 'condition' ? conditionMeta?.name : undefined);
  const heading = knownName
    ? (mode === 'area' ? `Providers supporting people in ${knownName}` : `Providers with experience supporting ${knownName}`)
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
      title: conditionMeta
        ? `${conditionMeta.name} support providers and guide | SolDirectory`
        : `${heading}${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
      description: conditionMeta
        ? trimTo(`Understand support considerations for ${conditionMeta.name}, compare providers who list relevant experience, and prepare practical questions about funding, safety and fit.`, 158)
        : trimTo(`${fmt(total)} ${total === 1 ? 'provider lists' : 'providers list'} ${row.name} as an area they support on SolDirectory. See their supports and service areas, then get matched for free.`, 158),
      canonicalUrl: `${window.location.origin}${page > 1 ? `${base}?page=${page}` : base}`,
      noindex: mode === 'area' && total < MIN_INDEXABLE,
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
    const faqs = conditionMeta ? conditionFaqs(conditionMeta.name) : [];
    setJsonLd('condition-page', conditionMeta ? {
      '@type': 'WebPage',
      name: heading,
      description: conditionMeta.summary,
      url: `${window.location.origin}${base}`,
      isPartOf: { '@type': 'WebSite', name: 'SolDirectory', url: window.location.origin },
    } : null);
    setJsonLd('condition-faq', faqs.length ? {
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    } : null);
    return () => {
      setJsonLd('directory-breadcrumbs', null);
      setJsonLd('condition-page', null);
      setJsonLd('condition-faq', null);
    };
  }, [row, loading, total, page, heading, base, mode, conditionMeta]);

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

  const groupNote = mode === 'condition' && conditionMeta ? CONDITION_CATEGORY_GROUPS.find((g) => g.title === conditionMeta.categoryGroup)?.note : undefined;
  const hasMembers = !loading && !error && items.length > 0;
  const showEmptyArea = !loading && !error && items.length === 0 && mode === 'area';

  const toc: TopicTocItem[] = [];
  if (conditionMeta) toc.push({ id: 'about', label: 'Overview' });
  if (hasMembers || showEmptyArea) toc.push({ id: 'providers', label: 'Providers on SolDirectory' });
  if (conditionMeta) {
    toc.push({ id: 'register-providers', label: 'Providers on the register' });
    if (conditionMeta.relatedCategories.length > 0) toc.push({ id: 'support-types', label: 'Related supports' });
    toc.push({ id: 'method', label: 'How providers are listed' });
    toc.push({ id: 'checking-experience', label: 'Checking experience' });
    toc.push({ id: 'planning-support', label: 'Planning support' });
    toc.push({ id: 'access-pathways', label: 'Funding and access' });
    toc.push({ id: 'safety', label: 'Safety and coordination' });
    toc.push({ id: 'related-conditions', label: 'Other conditions' });
    toc.push({ id: 'faq', label: 'FAQ' });
    toc.push({ id: 'sources', label: 'Official sources' });
  }
  toc.push({ id: 'wp-cpt-cta', label: 'Get matched' });

  const description = conditionMeta
    ? heroExcerpt(conditionMeta.summary)
    : row && !loading
      ? `${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory ${total === 1 ? 'lists' : 'list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`}. Providers write their own profiles — confirm details with them directly.`
      : undefined;

  return (
    <TopicLayout
      crumbs={[
        { label: 'Home', to: '/' },
        mode === 'area' ? { label: 'Provider directory', to: '/find-a-provider' } : { label: 'Condition', to: '/condition' },
        { label: knownName ?? '…' },
      ]}
      eyebrow={mode === 'area' ? 'Local providers' : conditionMeta?.categoryGroup ?? 'Provider experience'}
      title={heading}
      description={description}
      image={mode === 'area' ? bannerFor({ section: 'locations' }) : bannerFor({ text: `${knownName ?? ''} ${conditionMeta?.categoryGroup ?? ''}`, section: 'conditions' })}
      toc={toc}
    >
      {conditionMeta && (
        <>
          <section id="about" className="wp-cpt-short">
            <h2>About {conditionMeta.name}</h2>
            <p>{conditionMeta.summary}</p>
            <p className="wp-cpt-table-note">
              This is general information, not medical advice or a diagnosis. Every person’s needs are different — a provider’s general
              experience with {conditionMeta.name.toLowerCase()} is a starting point for a conversation, not a guarantee of fit.
              {groupNote ? ` ${groupNote}` : ''}
            </p>
          </section>
        </>
      )}

      {error && <div className="dir-empty" role="alert"><p>We couldn’t load providers just now. Please try again.</p></div>}

      {(hasMembers || showEmptyArea || loading) && (
        <section id="providers" className="wp-cpt-section">
          <h2>Providers on SolDirectory</h2>
          <p className="wp-cpt-showing" ref={topRef}>
            {row && !loading
              ? `${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory ${total === 1 ? 'lists' : 'list'} ${mode === 'area' ? `${row.name} as an area they support` : `experience supporting ${row.name}`}. Providers write their own profiles — confirm details with them directly.`
              : 'Loading…'}
          </p>
          {showEmptyArea ? (
            <div className="dir-empty">
              <h2>No providers currently list this</h2>
              <p>No providers on SolDirectory currently list this suburb as an area they support. Submit a free enquiry and we’ll notify suitable providers as they join.</p>
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
        </section>
      )}

      {conditionMeta && (
        <>
          <TopicRegisterProviders
            id="register-providers"
            leadNote={!loading && !error && items.length === 0 ? `No SolDirectory members have listed experience supporting ${conditionMeta.name.toLowerCase()} yet. The register providers below list supports people with ${conditionMeta.name.toLowerCase()} commonly look for.` : undefined}
            heading={`Providers on the register for ${conditionMeta.name.toLowerCase()} supports`}
            intro={`These are providers on the public registers that list supports people with ${conditionMeta.name.toLowerCase()} commonly look for. Pick a support type to browse them.`}
            defaultType="ndis"
            categories={conditionMeta.relatedCategories}
            disclaimer={`A listing shows that a business lists this support on the public register. It does not show that it has experience supporting ${conditionMeta.name.toLowerCase()} — ask the provider directly.`}
          />
          <ConditionContentSections meta={conditionMeta} />
        </>
      )}

      <section id="wp-cpt-cta" className="wp-cpt-cta">
        <h2>{conditionMeta ? `Looking for support with ${conditionMeta.name.toLowerCase()}?` : 'Need help choosing?'}</h2>
        <p>Tell us where you are, when you need support and how it’s funded, and relevant providers will review your enquiry — free, no obligation.</p>
        <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
      </section>
    </TopicLayout>
  );
}

/**
 * The long-form part of a condition page: links to related support
 * categories, the same "how providers are listed" / "checking experience"
 * method explanation used across the site (reused verbatim, not
 * per-condition — it's genuinely the same process for every condition),
 * links to sibling conditions, and a short condition-specific FAQ.
 * General information, not medical advice — see data/conditionContent.ts.
 */
function ConditionContentSections({ meta }: { meta: NonNullable<ReturnType<typeof conditionBySlug>> }) {
  const group = CONDITION_CATEGORY_GROUPS.find((g) => g.title === meta.categoryGroup);
  const siblings = (group?.items ?? []).filter((c) => c.slug !== meta.slug);
  const lower = meta.name.toLowerCase();
  const faqs = conditionFaqs(meta.name);
  const editorial = conditionEditorialFor(meta);

  return (
    <>
      {meta.relatedCategories.length > 0 && (
        <section id="support-types" className="wp-cpt-section">
          <h2>Support commonly linked to {meta.name}</h2>
          <p>These are supports people with {lower} commonly look for — not a personal recommendation, just a starting point for browsing.</p>
          <div className="wp-cpt-provider-grid">
            {meta.relatedCategories.map((c) => (
              <Link key={c} className="wp-cpt-provider-card" to={`/find-a-provider?service=${encodeURIComponent(c)}`}>{c}</Link>
            ))}
          </div>
        </section>
      )}

      <section id="method" className="wp-cpt-section">
        <h2>How providers are listed</h2>
        <p>
          <strong>Provider-supplied.</strong> Whether a provider has experience supporting {lower} is written by the provider themselves,
          the same way they write their supports and service areas. SolDirectory doesn’t independently verify clinical experience or assess quality.
        </p>
        <p>
          <strong>Alphabetical, not ranked.</strong> Providers are shown alphabetically. Payment for a subscription doesn’t change
          whether or where a provider appears.
        </p>
        <p>
          <strong>Availability.</strong> Providers confirm each week that they’re taking referrals. One that hasn’t confirmed recently
          is removed from results until they do.
        </p>
      </section>

      <section id="checking-experience" className="wp-cpt-section">
        <h2>Checking a provider’s experience with {meta.name}</h2>
        <p>A listing here is a starting point, not a substitute for asking directly. Before engaging a provider, it’s worth confirming:</p>
        <ol className="wp-cpt-plain-list">
          <li>How many people with {lower} specifically they’ve supported, not disability support in general.</li>
          <li>Which staff member would actually work with you or your family member, and their relevant training.</li>
          <li>How they’d handle a change in needs over time — a one-off assessment or an ongoing, adjustable plan.</li>
          <li>Their current registration, insurance and worker screening — ask to see it directly, don’t assume from the listing.</li>
        </ol>
      </section>

      <section id="planning-support" className="wp-cpt-section">
        <h2>Planning support around the person</h2>
        <p>A diagnosis or condition name does not describe a complete support plan. Useful planning starts with the person’s goals, functional needs, preferences, environment and existing relationships.</p>
        <ol className="wp-cpt-plain-list">
          {editorial.planning.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section id="access-pathways" className="wp-cpt-section">
        <h2>Funding and access pathways</h2>
        {editorial.access.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <p className="wp-cpt-table-note">Eligibility and funding decisions are made by the responsible program, not by SolDirectory or by a directory listing. Confirm current requirements with the official body.</p>
      </section>

      <section id="safety" className="wp-cpt-section">
        <h2>Safety, consent and coordination</h2>
        <ul className="wp-cpt-plain-list">
          {editorial.safeguards.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      {siblings.length > 0 && (
        <section id="related-conditions" className="wp-cpt-section">
          <h2>Other conditions in {meta.categoryGroup}</h2>
          <ul className="reg-linkgrid">
            {siblings.map((c) => (
              <li key={c.slug}><Link to={`/condition/${c.slug}/`}><span>{c.name}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section id="faq" className="wp-cpt-section">
        <h2>Frequently asked questions</h2>
        <div className="wp-cpt-faq-list">
          {faqs.map((faq) => (
            <details className="wp-cpt-faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="sources" className="wp-cpt-section">
        <h2>Official sources and further support</h2>
        <ul className="wp-cpt-plain-list">
          {editorial.sources.map((source) => (
            <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>
          ))}
        </ul>
        <p className="wp-cpt-table-note">Use these sources for current program and health information. For personal diagnosis or treatment advice, speak with an appropriately qualified health professional.</p>
      </section>
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
