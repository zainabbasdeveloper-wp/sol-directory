import { bannerFor, hubHeaderStyle } from '../../data/bannerImages';
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
import { fundingEditorialFor } from '../../data/fundingEditorial';
import { fundingShellEditorial } from '@soldirectory/topic-content';
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
    });
    setJsonLd('funding-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Funding', item: `${window.location.origin}/funding` },
        { '@type': 'ListItem', position: 3, name: meta.name, item: `${window.location.origin}/funding/${meta.slug}/` },
      ],
    });
    const editorial = fundingEditorialFor(meta);
    setJsonLd('funding-page', {
      '@type': 'WebPage',
      name: meta.name,
      description: meta.summary,
      url: `${window.location.origin}/funding/${meta.slug}/`,
      isPartOf: { '@type': 'WebSite', name: 'SolDirectory', url: window.location.origin },
    });
    setJsonLd('funding-faq', {
      '@type': 'FAQPage',
      mainEntity: editorial.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
    return () => {
      setJsonLd('funding-breadcrumbs', null);
      setJsonLd('funding-page', null);
      setJsonLd('funding-faq', null);
    };
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
  const editorial = fundingEditorialFor(meta);
  const longform = fundingShellEditorial(meta);

  const toc: TopicTocItem[] = [{ id: 'overview', label: 'Overview' }];
  if (hasMembers) toc.push({ id: 'providers', label: 'Providers on SolDirectory' });
  if (link) toc.push({ id: 'register-providers', label: 'Providers on the register' });
  toc.push({ id: 'access', label: 'How to access or use it' });
  toc.push({ id: 'scope', label: 'What to verify' });
  toc.push({ id: 'records', label: 'What to have ready' });
  toc.push({ id: 'provider-questions', label: 'Questions for providers' });
  toc.push({ id: 'pitfalls', label: 'Common mistakes' });
  toc.push({ id: 'funding-arrangement', label: 'Reviewing the arrangement' });
  toc.push({ id: 'faq', label: 'FAQ' });
  toc.push({ id: 'sources', label: 'Official sources' });
  if (siblings.length > 0) toc.push({ id: 'related-funding', label: `Other ${meta.categoryGroup} topics` });
  toc.push({ id: 'wp-cpt-cta', label: 'Get matched' });

  return (
    <TopicLayout
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Funding', to: '/funding' }, { label: meta.name }]}
      eyebrow={meta.categoryGroup}
      title={meta.name}
      description={heroExcerpt(meta.summary)}
      image={bannerFor({ text: `${meta.name} ${meta.categoryGroup}`, section: 'funding' })}
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

      <section id="access" className="wp-cpt-section">
        <h2>{editorial.accessHeading}</h2>
        <p>{editorial.accessIntro}</p>
        <ol className="wp-cpt-plain-list">
          {editorial.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section id="scope" className="wp-cpt-section">
        <h2>What this page can and cannot confirm</h2>
        <p>This guide explains the usual questions, records and safeguards connected with {meta.name.toLowerCase()}, but it cannot confirm an individual approval, available budget, current provider capacity or payment outcome. Check the current arrangement with the responsible funding body and ask the provider to put its role, complete fees, service scope and approval dependencies in writing before support begins.</p>
      </section>

      <section id="records" className="wp-cpt-section">
        <h2>Information and records to have ready</h2>
        <p>Having the relevant records available makes it easier to confirm eligibility, obtain an accurate quote and resolve payment questions before they interrupt support.</p>
        <ul className="wp-cpt-plain-list">
          {editorial.records.map((record) => <li key={record}>{record}</li>)}
        </ul>
      </section>

      <section id="provider-questions" className="wp-cpt-section">
        <h2>Questions to ask a provider</h2>
        <p>A provider should be able to explain its role, fees and billing process without implying that a directory listing guarantees funding approval.</p>
        <ul className="wp-cpt-plain-list">
          {editorial.providerQuestions.map((question) => <li key={question}>{question}</li>)}
        </ul>
      </section>

      <section id="pitfalls" className="wp-cpt-section">
        <h2>Common mistakes to avoid</h2>
        <ul className="wp-cpt-plain-list">
          {editorial.pitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}
        </ul>
      </section>

      <section id="funding-arrangement" className="wp-cpt-section">
        <h2>How to make and review the funding arrangement</h2>
        {(longform.deepDive ?? []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <h3>Review checklist</h3>
        <p>Recheck the arrangement at regular intervals and whenever services, circumstances, rates or program rules change. Record who confirmed each important decision and the date it was made. Before relying on an older approval or agreement, confirm that it remains current and still covers the service, provider and dates involved.</p>
        <ul className="wp-cpt-plain-list">
          {(longform.reviewChecklist ?? []).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section id="faq" className="wp-cpt-section">
        <h2>Frequently asked questions</h2>
        <div className="wp-cpt-faq-list">
          {editorial.faqs.map((faq) => (
            <details className="wp-cpt-faq-item" key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="sources" className="wp-cpt-section">
        <h2>Official sources and further reading</h2>
        <ul className="wp-cpt-plain-list">
          {editorial.sources.map((source) => (
            <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>
          ))}
        </ul>
        <p className="wp-cpt-table-note">Programs and rules change. Check the official source before making a decision or entering a service agreement.</p>
      </section>

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
      title: 'NDIS, aged care and other funding | SolDirectory',
      description: 'Understand NDIS plan management, aged care, DVA, Medicare and private funding, with practical checks, records and provider questions.',
      canonicalUrl: `${window.location.origin}/funding`,
    });
  }, []);

  return (
    <>
      <PublicHeader />
      <div className="directory-page-header directory-page-header--funding" style={hubHeaderStyle('plan-management')}>
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
