import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { serviceEditorialFor } from '@soldirectory/service-content';
import { SERVICES } from '../../data/providers';
import { slugify } from '../../data/slugHelpers';
import { bannerFor } from '../../data/bannerImages';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import PageHero from '../../components/topic/PageHero';
import { PublicFooter, PublicHeader } from './PublicLayout';
import './LegalPage.css';

export default function CoreServiceGuidePage({ slug }: { slug: string }) {
  const name = SERVICES.find((service) => service !== 'All services' && slugify(service) === slug);
  const editorial = name ? serviceEditorialFor(name) : undefined;

  useEffect(() => {
    if (!name || !editorial) return;
    const path = `/services/${slug}`;
    applySeoTags({
      title: `${name} guide | SolDirectory`,
      description: editorial.shortAnswer,
      canonicalUrl: `${window.location.origin}${path}`,
    });
    setJsonLd('core-service-guide', {
      '@type': 'Service',
      name,
      serviceType: name,
      url: `${window.location.origin}${path}`,
      provider: { '@type': 'Organization', name: 'SolDirectory', url: `${window.location.origin}/` },
    });
    return () => setJsonLd('core-service-guide', null);
  }, [editorial, name, slug]);

  if (!name || !editorial) return null;

  return <><PublicHeader />
    <PageHero
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }, { label: name }]}
      title={name}
      description={editorial.shortAnswer}
      image={bannerFor({ text: name, section: 'services' })}
      imageAlt={`${name} support`}
    />
    <main className="legal-page">
      <section className="legal-section"><h2>Understanding {name.toLowerCase()}</h2>{editorial.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      <section className="legal-section"><h2>What support may include</h2><ul className="guide-list">{editorial.includes.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="legal-section"><h2>Plan the support</h2><ul className="guide-list">{editorial.planning.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="legal-section"><h2>Questions to ask providers</h2><ul className="guide-list">{editorial.providerQuestions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="legal-section"><h2>Funding considerations</h2>{editorial.funding.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>
      <section className="legal-section"><h2>Safeguards and records</h2><ul className="guide-list">{editorial.safeguards.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="legal-section"><h2>Official information</h2><ul className="guide-list">{editorial.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul></section>
      <nav className="legal-other" aria-label="Continue your search">
        <Link to={`/find-a-provider?service=${encodeURIComponent(name)}`}>Find {name.toLowerCase()} providers</Link>
        <Link to="/services">Browse all service guides</Link>
        <Link to="/guides/choosing-a-provider">How to choose a provider</Link>
      </nav>
    </main>
    <PublicFooter />
  </>;
}