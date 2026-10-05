import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { GUIDE_DOCS } from '@soldirectory/topic-content';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './LegalPage.css';

/** One template for all four guide pages — pass the doc's slug. */
export default function GuidePage({ slug }: { slug: keyof typeof GUIDE_DOCS | string }) {
  const doc = GUIDE_DOCS[slug];

  useEffect(() => {
    if (doc) {
      const path = `/guides/${doc.slug}`;
      applySeoTags({
        title: `${doc.title} | SolDirectory`,
        description: doc.summary,
        canonicalUrl: `${window.location.origin}${path}`,
      });
      setJsonLd('guide-breadcrumbs', {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: `${window.location.origin}/guides` },
          { '@type': 'ListItem', position: 3, name: doc.title, item: `${window.location.origin}${path}` },
        ],
      });
    }
    window.scrollTo(0, 0);
    return () => setJsonLd('guide-breadcrumbs', null);
  }, [doc]);

  if (!doc) return null;

  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <nav className="legal-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">/</span> <Link to="/guides">Guides</Link> <span aria-hidden="true">/</span> <span>{doc.title}</span>
        </nav>

        <h1>{doc.title}</h1>
        <p className="legal-summary">{doc.summary}</p>

        <p className="legal-draft-banner" role="note">
          This guide explains general NDIS and aged care concepts and is not personal advice. Support names, price
          limits and eligibility rules are set by the NDIA and the Australian Government and can change — always
          confirm current details with the official source linked below before making a decision.
        </p>

        {doc.sections.map((s) => (
          <section key={s.heading} className="legal-section">
            <h2>{s.heading}</h2>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
            {s.list && (
              <ul className="guide-list">
                {s.list.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        <section className="legal-section">
          <h2>Continue your search</h2>
          <ul className="guide-list">
            {doc.internalLinks.map((item) => <li key={item.href}><Link to={item.href}>{item.label}</Link></li>)}
          </ul>
        </section>

        <section className="legal-section">
          <h2>Official source</h2>
          <p>
            <a href={doc.officialLink.href} target="_blank" rel="noopener noreferrer">{doc.officialLink.label}</a>
          </p>
        </section>

        <nav className="legal-other" aria-label="Other guides">
          {Object.values(GUIDE_DOCS).filter((d) => d.slug !== doc.slug).map((d) => (
            <Link key={d.slug} to={`/guides/${d.slug}`}>{d.title}</Link>
          ))}
        </nav>
      </main>
      <PublicFooter />
    </>
  );
}

const GUIDE_LABELS: Record<string, string> = {
  'ndis-price-guide': 'NDIS pricing',
  'choosing-a-provider': 'Choosing support',
  'plan-management-basics': 'Managing a plan',
  'aged-care-support': 'Aged care',
};

export function GuidesHubPage() {
  const { openMatchModal } = useMatchModal();
  const guides = Object.values(GUIDE_DOCS);

  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoTags({
      title: 'NDIS and aged care guides | SolDirectory',
      description: 'Practical guides to NDIS pricing, plan management, choosing a provider and finding aged care support, with links to current official sources.',
      canonicalUrl: `${window.location.origin}/guides`,
    });
    setJsonLd('guides-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Guides', item: `${window.location.origin}/guides` },
      ],
    });
    return () => setJsonLd('guides-breadcrumbs', null);
  }, []);

  return (
    <>
      <PublicHeader />
      <section className="guide-hub-header">
        <div className="guide-hub-header-inner">
          <span className="guide-hub-eyebrow">Practical information</span>
          <h1>NDIS and aged care guides</h1>
          <p>Understand common funding and provider terms before you compare support options. Each guide links to the relevant official source for current rules.</p>
        </div>
      </section>

      <main className="guide-hub-page">
        <nav className="legal-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">/</span> <span>Guides</span>
        </nav>

        <section aria-labelledby="guide-topics-heading">
          <div className="guide-hub-intro">
            <span>Choose a topic</span>
            <h2 id="guide-topics-heading">Start with the decision in front of you</h2>
            <p>These guides explain the language and questions that commonly arise when arranging disability or aged care support. They are general information, not personal, financial or legal advice.</p>
          </div>
          <div className="guide-hub-grid">
            {guides.map((guide, index) => (
              <article className="guide-hub-card" key={guide.slug}>
                <div className="guide-hub-card-meta">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <span>{GUIDE_LABELS[guide.slug]}</span>
                </div>
                <h3><Link to={`/guides/${guide.slug}`}>{guide.title}</Link></h3>
                <p>{guide.summary}</p>
                <Link className="guide-hub-card-link" to={`/guides/${guide.slug}`}>Read the guide <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-hub-checks" aria-labelledby="guide-checks-heading">
          <div>
            <span className="guide-hub-eyebrow guide-hub-eyebrow-dark">Use guides with confidence</span>
            <h2 id="guide-checks-heading">Check the detail that applies today</h2>
          </div>
          <ol>
            <li><strong>Confirm the date.</strong><span>Funding rules, program names and price limits can change.</span></li>
            <li><strong>Open the official source.</strong><span>Each guide links to the government body responsible for the current information.</span></li>
            <li><strong>Ask providers directly.</strong><span>Confirm fees, registration, availability and service terms before entering an agreement.</span></li>
          </ol>
        </section>

        <section className="guide-hub-intro" aria-labelledby="guide-using-heading">
          <span>From information to a decision</span>
          <h2 id="guide-using-heading">Use the current rule, then check the real arrangement</h2>
          <p>Open the official source linked from each guide because program names, prices, eligibility and assessment pathways can change. General information can help you prepare questions, but it cannot determine a person’s funding, clinical needs or legal rights.</p>
          <p>When comparing providers, confirm registration requirements, worker qualifications, service areas, current capacity, complete rates, travel, cancellations and complaint processes directly. Keep important answers, quotes and service terms in writing, and use public-register records as a verification starting point rather than proof of availability or fit.</p>
        </section>

        <section className="guide-hub-cta">
          <div>
            <span className="guide-hub-eyebrow guide-hub-eyebrow-dark">Ready to compare support?</span>
            <h2>Move from information to provider options</h2>
            <p>Browse profiles and public-register listings yourself, or describe what you need once so relevant providers can assess your request.</p>
          </div>
          <div className="guide-hub-actions">
            <Link className="btn-tint" to="/find-a-provider">Browse providers</Link>
            <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Get matched, free</button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
