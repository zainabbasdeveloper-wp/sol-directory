import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { setJsonLd } from '../../lib/seo';
import Counter from '../../components/Counter';
import PhotoSlot from '../../components/PhotoSlot';
import { useSiteStats } from '../../hooks/useSiteStats';
import { getRegisterHub } from '../../api/registerApi';
import { siteConfig, phoneHref } from '../../config/siteConfig';
import { providerCountLabel } from '../../lib/statsCounts';
import SupportFinder from '../../components/home/SupportFinder';
import { useMatchModal } from '../../context/MatchModalContext';
import { LOCATION_GROUPS, SERVICES } from '../../data/providers';
import { slugify } from '../../data/slugHelpers';
import './Home.css';

const SEO_SERVICE_AREAS = LOCATION_GROUPS.flatMap((group) => group.places).slice(0, 4);
const SEO_SERVICES = SERVICES.filter((service) => service !== 'All services');

export default function Home() {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();
  // Real numbers from the database (api stats.controller.ts). null while
  // loading, on failure, or — for the reply time — until there's enough
  // real data to publish an honest median. Each stat below hides itself
  // when it has nothing true to show.
  const stats = useSiteStats();

  // Organisations imported from the public NDIS/My Aged Care registers —
  // real, but not SolDirectory members and not counted in the figures
  // above. Fetched and shown separately, with its own label, so it can
  // never read as "providers accepting enquiries".
  const [registerTotal, setRegisterTotal] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([getRegisterHub('ndis').catch(() => null), getRegisterHub('aged_care').catch(() => null)])
      .then(([ndis, agedCare]) => { if (alive) setRegisterTotal((ndis?.total ?? 0) + (agedCare?.total ?? 0)); });
    return () => { alive = false; };
  }, []);

  // Each figure appears only when the database can back it (see
  // stats.controller.ts); nothing here is estimated or padded.
  const supportTypes = stats ? Object.values(stats.providersByService).filter((n) => n > 0).length : 0;
  const reply = stats?.medianFirstReplyMinutes ?? null;
  const figures: { label: string; value: number; suffix?: string; format?: boolean; accent?: boolean }[] = [];
  if (stats && stats.providersListed > 0) figures.push({ label: 'Providers accepting enquiries', value: stats.providersListed });
  if (stats && stats.suburbsCovered > 0) figures.push({ label: 'Suburbs with a listed provider', value: stats.suburbsCovered });
  if (supportTypes > 0) figures.push({ label: 'Support types offered', value: supportTypes });
  if (reply !== null) {
    figures.push(
      reply < 120
        ? { label: 'Median time to first provider response', value: reply, suffix: ' min', format: false, accent: true }
        : { label: 'Median time to first provider response', value: Math.round(reply / 60), suffix: ' hr', format: false, accent: true }
    );
  }
  if (stats && stats.enquiriesLast30Days > 0) figures.push({ label: 'Support requests in the last 30 days', value: stats.enquiriesLast30Days });

  // Organization structured data — every field is either fixed (the
  // site's own name/URL) or read straight from siteConfig (apps/web/.env),
  // never invented. Fields siteConfig leaves blank (no address on file,
  // no social links) are simply left out, not padded with placeholders.
  useEffect(() => {
    setJsonLd('organization', {
      '@type': 'Organization',
      name: siteConfig.legalEntity || 'SolDirectory',
      url: window.location.origin,
      ...(siteConfig.contactPhone ? { telephone: siteConfig.contactPhone } : {}),
      ...(siteConfig.contactEmail ? { email: siteConfig.contactEmail } : {}),
      ...(siteConfig.contactAddress ? { address: { '@type': 'PostalAddress', streetAddress: siteConfig.contactAddress } } : {}),
    });
    return () => setJsonLd('organization', null);
  }, []);

  return (
    <>
      <PublicHeader />

      <section id="top" className="hero-section">
        <div className="hero-photo-bg">
          <PhotoSlot src="/images/front-view-smiley-girl-woman-indoors-hero.jpg" alt="A support worker with a participant" variant="care" />
          <div className="hero-photo-overlay" />
        </div>
        <div className="hero-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            NDIS &amp; aged care · Australia wide
          </span>
          <h1 className="hero-heading">Find NDIS &amp; Aged Care Providers Near You</h1>
          <p className="hero-copy">
            Search provider profiles by support and location, or submit a free request to identify providers serving your area.
          </p>
          <div className="hero-actions">
            <button className="btn-gradient btn-lg" onClick={openMatchModal}>
              Get matched free <span aria-hidden="true">→</span>
            </button>
            <button className="btn-outline-light btn-lg" onClick={() => navigate('/providers')}>
              List your business
            </button>
          </div>
        </div>
      </section>

      <section className="info-cards" aria-label="How Get Matched works">
        <div className="info-card info-card-accent">
          <span className="info-step">Step 1</span>
          <h3 className="info-title">Submit your support request</h3>
          <p className="info-body info-body-light">Provide your location, preferred timeframe and funding information so relevant providers can assess your request.</p>
          <button type="button" className="info-action" onClick={() => openMatchModal()}>
            Get matched <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="info-card">
          <span className="info-step">Step 2</span>
          <h3 className="info-title">Review relevant provider options</h3>
          <p className="info-body">Your request is compared with provider service areas, funding arrangements and recently confirmed availability.</p>
          <Link to="/directory" className="link-btn">
            Browse the directory →
          </Link>
        </div>

        <div className="info-card">
          <span className="info-step">Step 3</span>
          <h3 className="info-title">Make an informed choice</h3>
          <p className="info-body">Notified providers may contact you directly. You can compare options, verify credentials and decide whether to enter a service agreement.</p>
          <Link to="/privacy" className="link-btn">
            How we handle your details →
          </Link>
        </div>
      </section>

      <section id="about" className="about-section">
        <div className="about-photo-wrap">
          <div className="about-photo">
            <PhotoSlot src="/images/why-sol-directory.jpg" alt="A family meeting a provider" variant="care" />
          </div>
          {stats && stats.providersListed > 0 && (
            <div className="about-stat-badge">
              <span className="about-stat-value">
                <Counter value={stats.providersListed} />
              </span>
              <span className="about-stat-label">providers currently listed and accepting enquiries</span>
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            Why SolDirectory
          </span>
          <h2 className="section-heading">Current provider information to support your choice</h2>
          <p className="section-copy">
            Provider listings include service areas and availability information supplied by each provider.
            Providers are asked to confirm their capacity each week, and listings are paused when that
            confirmation is not received within the required period.
          </p>
          <ul className="check-list">
            <li>
              <CheckIcon /> Provider capacity is reconfirmed each week
            </li>
            <li>
              <CheckIcon /> Search results are not ordered by paid placement
            </li>
            <li>
              <CheckIcon /> Personal information is shared only for the purpose of responding to your request
            </li>
          </ul>
          <div className="about-cta-row">
            <button className="btn-gradient" onClick={() => navigate('/directory')}>
              Search provider listings
            </button>
            {siteConfig.contactPhone && (
              <div>
                <a className="about-phone" href={phoneHref(siteConfig.contactPhone)}>{siteConfig.contactPhone}</a>
                {siteConfig.supportHours && <span className="about-hours">{siteConfig.supportHours}</span>}
              </div>
            )}
          </div>
        </div>
      </section>

      {figures.length > 0 && (
        <section className="stats-section home-stats" aria-label="Directory figures">
          <p className="stats-headline">
            Directory figures are based on current platform records, including{' '}
            <span className="stats-headline-accent">providers accepting enquiries and locations represented</span>.
          </p>
          <dl className="home-stats-row">
            {figures.map((f) => (
              <div key={f.label} className="home-stat">
                <dt className="home-stat-label">{f.label}</dt>
                <dd className={`home-stat-value${f.accent ? ' home-stat-accent' : ''}`}>
                  <Counter value={f.value} suffix={f.suffix} format={f.format ?? true} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="home-stats-note">Providers confirm their availability every week. Figures are calculated from live directory records.</p>
        </section>
      )}

      {registerTotal !== null && registerTotal > 0 && (
        <section className="stats-section home-register-note" aria-label="Public register inventory">
          <p>
            SolDirectory's directory also draws on <Counter value={registerTotal} /> organisations listed on the public{' '}
            <Link to="/ndis-providers">NDIS</Link> and <Link to="/aged-care-providers">My Aged Care</Link> registers. These are real
            businesses, but they haven't signed up to or claimed a listing on SolDirectory yet, so they can't receive enquiries here —
            browse them on the register pages, or a business can <Link to="/ndis-providers">claim its own listing</Link>.
          </p>
        </section>
      )}

      <SupportFinder stats={stats} />

      <section className="checks-section">
        <div className="checks-photo-bg">
          <PhotoSlot src="/images/six-checks-on-every-provider.jpg" alt="A provider team at work" variant="team" />
          <div className="checks-photo-overlay" />
        </div>
        <div className="checks-inner">
          <div className="checks-content">
          <span className="eyebrow checks-eyebrow">
            <span className="eyebrow-rule" />
            How listings work
          </span>
          <h2 className="section-heading checks-heading">What every listing tells you</h2>
          <div className="checks-grid">
            {[
              ['Current capacity', 'Providers confirm each week that they are taking referrals. If they do not, the listing is paused.'],
              ['Supports offered', 'Each listing states the supports the provider delivers.'],
              ['Service areas', 'Providers list the suburbs they support, so you can search by location.'],
              ['Languages spoken', 'Providers can list the languages their team speaks.'],
              ['Response times', 'Shown only once enough real enquiries have been answered to report an accurate figure.'],
              ['Registration details', 'Supplied by the provider. Always confirm registration with the provider or the NDIS Commission’s public register.'],
            ].map(([title, body]) => (
              <div key={title} className="check-item">
                <span className="check-item-mark" aria-hidden="true">✓</span>
                <div>
                <h3 className="check-title">{title}</h3>
                <p className="check-body">{body}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section className="coverage-section" aria-labelledby="coverage-heading">
        <div className="coverage-inner">
          <div className="section-header-row">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-rule" />
                Services and areas we cover
              </span>
              <h2 id="coverage-heading" className="section-heading">Explore support by service and location</h2>
            </div>
            <Link to="/services" className="btn-white">Browse all services</Link>
          </div>
          <p className="coverage-intro">
            Compare services and search the locations currently represented in the SolDirectory.
            Each page explains what to look for and helps you find providers who cover that support area.
          </p>
          <div className="coverage-grid">
            {SEO_SERVICES.map((service) => (
              <div key={service} className="coverage-group">
                <h3 className="coverage-service-title">
                  <Link to={`/services/${slugify(service)}/${slugify(SEO_SERVICE_AREAS[0])}`}>{service}</Link>
                </h3>
                <ul className="coverage-links">
                  {SEO_SERVICE_AREAS.map((place) => (
                    <li key={place}>
                      <Link to={`/services/${slugify(service)}/${slugify(place)}`}>
                        {service} in {place}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link to="/services" className="coverage-all-link">Cannot find your suburb? Search all services and areas →</Link>
        </div>
      </section>

      <section id="providers" className="providers-cta-section">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            For providers
          </span>
          <h2 className="section-heading">Present your services to participants, families and support coordinators</h2>
          <p className="section-copy">
            Create a provider profile with your supports, service areas, funding arrangements and intake details.
            Keep your capacity current so people can make informed enquiries about your services.
          </p>
          <div className="providers-cta-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/providers')}>
              List your business
            </button>
            <Link to="/providers" className="link-btn">
              See how it works →
            </Link>
          </div>
        </div>
        <div className="providers-photo-wrap">
          <div className="providers-photo">
            <PhotoSlot src="/images/providers.jpg" alt="A provider at their desk" variant="meeting" />
          </div>
          <div className="providers-steps-card">
            <span className="providers-steps-label">Listing, in three steps</span>
            <div className="providers-steps">
              <div className="providers-step">
                <span className="providers-step-num">1</span>
                <p>Send your registration number and service areas. We check the register.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">2</span>
                <p>Write your profile, or send a service brochure and we will draft it.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">3</span>
                <p>Confirm capacity each Monday. Enquiries reach you by email or SMS.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2 }}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
