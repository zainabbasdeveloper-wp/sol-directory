import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { LEGAL_DOCS, LEGAL_REVIEWED } from './legalContent';
import { siteConfig } from '../../config/siteConfig';
import './LegalPage.css';

/** One template for all four legal pages — pass the doc's slug. */
export default function LegalPage({ slug }: { slug: keyof typeof LEGAL_DOCS | string }) {
  const doc = LEGAL_DOCS[slug];

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

        {!LEGAL_REVIEWED && (
          <p className="legal-draft-banner" role="note">
            <strong>Draft — pending legal review.</strong> This page describes how the service currently works but has
            not yet been reviewed by a lawyer and may change.
          </p>
        )}

        {doc.sections.map((s) => (
          <section key={s.heading} className="legal-section">
            <h2>{s.heading}</h2>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}

        <section className="legal-section">
          <h2>Contact</h2>
          <p>
            {siteConfig.legalEntity ? `${siteConfig.legalEntity} — ` : ''}
            {siteConfig.contactEmail
              ? <>Questions about this page? Email <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.</>
              : 'Contact details will be published here shortly.'}
          </p>
        </section>

        <nav className="legal-other" aria-label="Other legal pages">
          {Object.values(LEGAL_DOCS).filter((d) => d.slug !== doc.slug).map((d) => (
            <Link key={d.slug} to={`/${d.slug}`}>{d.title}</Link>
          ))}
        </nav>
      </main>
      <PublicFooter />
    </>
  );
}
