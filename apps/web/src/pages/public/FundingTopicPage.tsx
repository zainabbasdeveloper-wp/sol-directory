import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Pagination from '../../components/ui/Pagination';
import { Breadcrumbs } from './register/RegisterParts';
import TopicLayout, { heroExcerpt, type TopicTocItem } from '../../components/topic/TopicLayout';
import TopicRegisterProviders from '../../components/topic/TopicRegisterProviders';
import { fundingProviderLink } from '../../data/topicProviderLinks';
import { ProviderCardItem } from './ProviderListingPage';
import { listProvidersBy, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import { fundingBySlug, FUNDING_CATEGORY_GROUPS, FUNDING_CONTENT, type FundingContent } from '../../data/fundingContent';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
const fmt = (n: number) => n.toLocaleString('en-AU');

/**
 * /funding/:slug — one of the 25 funding topics from the mega menu's
 * "Funding" tab (data/fundingContent.ts). Only the 3 NDIS
 * plan-management-style topics (fundingFilter set) actually have a
 * matching Provider field, so only those show a real provider list —
 * every other topic is honest general-information content plus a link
 * to the main directory, never a fake or empty "0 providers" section
 * for something SolDirectory doesn't actually track.
 */
export default function FundingTopicPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const meta = fundingBySlug(slug);
  const { openMatchModal } = useMatchModal();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const topRef = useRef<HTMLElement>(null);

  const [items, setItems] = useState<PublicProviderCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!!meta?.fundingFilter);

  useEffect(() => {
    if (!meta?.fundingFilter) return;
    let alive = true;
    setLoading(true);
    listProvidersBy({ funding: meta.fundingFilter, page, limit: PAGE_SIZE })
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.fundingFilter, page]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    if (!meta) {
      applySeoTags({ title: 'Page not found | SolDirectory', description: 'This page could not be found.', noindex: true });
      return;
    }
    applySeoTags({
      title: `${meta.name} | Funding | SolDirectory`,
      description: meta.summary.slice(0, 155).replace(/\s+\S*$/, '') + '…',
      canonicalUrl: `${window.location.origin}/funding/${meta.slug}/`,
      // Only indexable once there's either real provider data behind it,
      // or — for the informational-only topics — always, since the
      // content itself is the real, useful thing on those pages.
      noindex: !!meta.fundingFilter && total === 0,
    });
    setJsonLd('funding-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Funding', item: `${window.location.origin}/funding` },
        { '@type': 'ListItem', position: 3, name: meta.name, item: `${window.location.origin}/funding/${meta.slug}/` },
      ],
    });
    return () => setJsonLd('funding-breadcrumbs', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, total]);

  if (!meta) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty">
            <h1>We couldn’t find that page</h1>
            <p>This funding topic doesn’t exist.</p>
            <Link className="btn-gradient" to="/funding">Browse funding topics</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const group = FUNDING_CATEGORY_GROUPS.find((g) => g.title === meta.categoryGroup);
  const siblings = (group?.items ?? []).filter((f) => f.slug !== meta.slug);
  const link = fundingProviderLink(meta.slug);
  const hasMembers = !!meta.fundingFilter && !loading && items.length > 0;

  const toc: TopicTocItem[] = [{ id: 'overview', label: 'Overview' }];
  if (hasMembers) toc.push({ id: 'providers', label: 'Providers on SolDirectory' });
  if (link) toc.push({ id: 'register-providers', label: 'Providers on the register' });
  if (siblings.length > 0) toc.push({ id: 'related-funding', label: `Other ${meta.categoryGroup} topics` });
  toc.push({ id: 'wp-cpt-cta', label: 'Get matched' });

  return (
    <TopicLayout
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Funding', to: '/funding' }, { label: meta.name }]}
      eyebrow={meta.categoryGroup}
      title={meta.name}
      description={heroExcerpt(meta.summary)}
      image="/images/providers.jpg"
      toc={toc}
    >
      <section id="overview" className="wp-cpt-short" ref={topRef}>
        <h2>About {meta.name}</h2>
        <p>{meta.summary}</p>
        <p className="wp-cpt-table-note">
          This is general information, not financial or funding advice. Program names, amounts and eligibility rules change over
          time — always confirm current detail with the relevant official body before relying on it.
        </p>
        {!link && (
          <p className="wp-cpt-table-note">
            SolDirectory doesn’t currently track which providers work with {meta.name.toLowerCase()} specifically — this page is
            general information only. <Link to="/find-a-provider">Browse all providers</Link> and ask directly.
          </p>
        )}
      </section>

      {hasMembers && (
        <section id="providers" className="wp-cpt-section">
          <h2>Providers on SolDirectory who accept {meta.name.toLowerCase()} funding</h2>
          <p className="wp-cpt-showing">
            {fmt(total)} {total === 1 ? 'provider' : 'providers'} on SolDirectory {total === 1 ? 'accepts' : 'accept'} {meta.name.toLowerCase()} funding.
            Providers write their own profiles — confirm details with them directly.
          </p>
          <ul className="dir-grid" aria-busy={loading}>
            {items.map((p) => <ProviderCardItem key={p.id} p={p} />)}
          </ul>
          <Pagination
            page={page} totalPages={totalPages} disabled={loading}
            onChange={(n) => { setParams(n > 1 ? { page: String(n) } : {}); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          />
        </section>
      )}

      {link ? (
        <TopicRegisterProviders
          id="register-providers"
          heading={`Providers on the ${link.type === 'ndis' ? 'NDIS' : 'aged care'} register`}
          intro={link.intro}
          defaultType={link.type}
          categories={link.categories}
          includeAll={link.includeAll}
          disclaimer={link.disclaimer}
        />
      ) : null}

      {siblings.length > 0 && (
        <section id="related-funding" className="wp-cpt-section">
          <h2>Other topics in {meta.categoryGroup}</h2>
          <ul className="reg-linkgrid">
            {siblings.map((f) => (
              <li key={f.slug}><Link to={`/funding/${f.slug}/`}><span>{f.name}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section id="wp-cpt-cta" className="wp-cpt-cta">
        <h2>Not sure what funding applies to you?</h2>
        <p>Tell us your situation and we’ll connect you with providers who can help you work it out — free, no obligation.</p>
        <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Get matched, free →</button>
      </section>
    </TopicLayout>
  );
}

/** /funding — every funding topic, grouped the same way the mega menu groups them. */
export function FundingHubPage() {
  const { openMatchModal } = useMatchModal();

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoTags({
      title: 'NDIS, aged care, DVA and private funding explained | SolDirectory',
      description: 'General information on NDIS plan management, aged care programs, DVA funding, Medicare and private options — and which providers accept each, where SolDirectory tracks it.',
      canonicalUrl: `${window.location.origin}/funding`,
    });
  }, []);

  return (
    <>
      <PublicHeader />
      <div className="directory-page-header directory-page-header--funding">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Understand your options</span>
          <h1 className="section-heading section-heading-light">NDIS, aged care and other funding explained</h1>
          <p className="directory-page-subtitle">Use these general guides to understand common terms and prepare questions for the relevant official body or provider.</p>
        </div>
      </div>
      <main className="reg-page category-hub-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Funding' }]} />
        <section className="directory-intro">
          <span className="directory-section-label">A practical starting point</span>
          <h2>Understand the terms before comparing providers</h2>
          <p>Funding affects which providers you can use, how invoices are paid and what records may be required. These pages provide general information, not financial advice. Program rules change, so confirm current details with the NDIS, My Aged Care, DVA, Services Australia or another relevant official body.</p>
        </section>

        <section className="directory-guidance" aria-labelledby="funding-checks-heading">
          <div className="directory-section-heading"><span className="directory-section-label">Prepare before contacting providers</span><h2 id="funding-checks-heading">Keep three details close at hand</h2></div>
          <ol className="directory-guidance-grid">
            <li><span>01</span><h3>Your funding arrangement</h3><p>Know the program, plan-management type or private payment arrangement that applies to the support.</p></li>
            <li><span>02</span><h3>The approved support</h3><p>Check the relevant budget, service category, dates and any requirements before agreeing to services.</p></li>
            <li><span>03</span><h3>Provider payment terms</h3><p>Confirm rates, travel, cancellations, invoicing and whether the provider can work with your funding arrangement.</p></li>
          </ol>
        </section>

        {FUNDING_CATEGORY_GROUPS.map((group) => (
          <section className="category-hub-group" key={group.title}>
            <h2 className="reg-h2">{group.title}</h2>
            <ul className="reg-linkgrid">
              {group.items.map((f: FundingContent) => (
                <li key={f.slug}><Link to={`/funding/${f.slug}/`}><span>{f.name}</span></Link></li>
              ))}
            </ul>
          </section>
        ))}
        <p className="reg-note"><strong>{FUNDING_CONTENT.length} topics covered.</strong> Only funding types that map to information providers actually supply can filter provider profiles. Other pages are clearly marked as general information.</p>
        <section className="directory-content-cta">
          <div><span className="directory-section-label">Ready to discuss support?</span><h2>Include the funding details in one request</h2><p>Tell providers how the support is funded, where it is needed and when you would like it to begin.</p></div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Get matched, free</button>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
