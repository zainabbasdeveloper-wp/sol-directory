import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { GUIDE_DOCS } from './guideContent';
import './LegalPage.css';

/** One template for all four guide pages — pass the doc's slug. */
export default function GuidePage({ slug }: { slug: keyof typeof GUIDE_DOCS | string }) {
  const doc = GUIDE_DOCS[slug];

  useEffect(() => {
    if (doc) document.title = `${doc.title} — SolDirectory`;
    window.scrollTo(0, 0);
  }, [doc]);

  if (!doc) return null;

  return (
    <>
      <PublicHeader />
      <main className="legal-page">
        <nav className="legal-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span aria-hidden="true">/</span> <span>{doc.title}</span>
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
