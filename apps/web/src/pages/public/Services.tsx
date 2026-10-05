import { hubHeaderStyle } from '../../data/bannerImages';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, serviceCount } from '../../lib/statsCounts';
import { applySeoTags } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Directory.css';
import './Home.css';

// `name` must match the service names providers register under (the
// directory's ?service= filter and the live provider counts key off it).
const ALL_SERVICES = [
  { name: 'Support coordination', body: 'Coordinators who help participants understand their plan, connect with providers and put their supports in place.' },
  { name: 'Personal care', body: 'Assistance with personal hygiene, dressing, medication and daily living.' },
  { name: 'Therapy services', body: 'Occupational therapy, physiotherapy, speech pathology and other allied health supports.' },
  { name: 'Domestic assistance', body: 'Assistance with cleaning, laundry, meal preparation and household tasks.' },
  { name: 'Nursing', body: 'In-home clinical nursing, wound care and complex health supports.' },
  { name: 'Transport', body: 'Accessible transport to appointments, work, study and community activities.' },
  { name: 'Housing (SDA & SIL)', body: 'Supported Independent Living (SIL) and Specialist Disability Accommodation (SDA).' },
  { name: 'Plan management', body: 'Payment of provider invoices and clear budget reporting for plan-managed participants.' },
];

export default function Services() {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();
  // Real provider counts from the database. A support with no listed
  // providers yet simply shows no count.
  const stats = useSiteStats();

  useEffect(() => {
    applySeoTags({
      title: 'NDIS and aged care support services | SolDirectory',
      description: 'Browse personal care, therapy, nursing, transport, support coordination, housing and other supports, then compare providers serving your area.',
      canonicalUrl: `${window.location.origin}/services`,
    });
  }, []);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header directory-page-header--services" style={hubHeaderStyle('personal-care')}>
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            Browse by support
          </span>
          <h1 className="section-heading section-heading-light">Supports available through SolDirectory</h1>
          <p className="directory-page-subtitle">
            Select a support to see the providers who offer it. Providers who have
            confirmed their availability recently are shown.
          </p>
        </div>
      </div>

      <main className="directory-section directory-content-page">
        <section className="directory-intro" aria-labelledby="services-intro-heading">
          <span className="directory-section-label">Start with the support you need</span>
          <h2 id="services-intro-heading">Browse common supports, then compare the practical details</h2>
          <p>
            A service name is only the starting point. Check where a provider works, the funding arrangements they accept,
            whether they have current capacity and how their experience relates to the person who needs support.
          </p>
        </section>

        <div className="services-grid">
          {ALL_SERVICES.map((s) => (
            <button
              key={s.name}
              type="button"
              className="service-card"
              onClick={() => navigate(`/find-a-provider?service=${encodeURIComponent(s.name)}`)}
            >
              <h3 className="service-title">{s.name}</h3>
              <p className="service-body">{s.body}</p>
              <span className="service-count">{providerCountLabel(serviceCount(stats, s.name)) ?? 'View providers'} →</span>
            </button>
          ))}
        </div>

        <section className="directory-guidance" aria-labelledby="services-compare-heading">
          <div className="directory-section-heading">
            <span className="directory-section-label">Before you contact a provider</span>
            <h2 id="services-compare-heading">Three useful checks for any support</h2>
          </div>
          <ol className="directory-guidance-grid">
            <li><span>01</span><h3>Describe the outcome</h3><p>Explain what support is needed, where it will happen and what a good result would look like.</p></li>
            <li><span>02</span><h3>Confirm service fit</h3><p>Ask about relevant experience, worker screening, registration, insurance and how support is supervised.</p></li>
            <li><span>03</span><h3>Check the practical details</h3><p>Confirm availability, travel, fees, cancellations, funding and what will be recorded in the service agreement.</p></li>
          </ol>
        </section>

        <section className="directory-source-section" aria-labelledby="service-sources-heading">
          <div className="directory-section-heading">
            <span className="directory-section-label">Understand the results</span>
            <h2 id="service-sources-heading">Two useful sources, kept clearly separate</h2>
          </div>
          <div className="directory-source-grid">
            <article>
              <span className="directory-source-kicker">SolDirectory profiles</span>
              <h3>Current information supplied by providers</h3>
              <p>Profiles can show supports, service areas, funding and intake status. Providers are asked to keep their capacity current.</p>
              <Link to="/find-a-provider">Search provider profiles →</Link>
            </article>
            <article>
              <span className="directory-source-kicker">Public registers</span>
              <h3>Broader reference listings</h3>
              <p>Register pages show organisations and supports recorded in public NDIS and My Aged Care data. They do not confirm current availability.</p>
              <div className="directory-source-links"><Link to="/ndis-providers">Browse NDIS listings</Link><Link to="/aged-care-providers">Browse aged care listings</Link></div>
            </article>
          </div>
        </section>

        <section className="directory-content-cta">
          <div><span className="directory-section-label">Not sure where to begin?</span><h2>Describe the support once</h2><p>Send a free request with the support, location, timeframe and funding details. Relevant providers can review it and respond.</p></div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Get matched, free</button>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
