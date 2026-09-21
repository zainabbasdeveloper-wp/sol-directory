import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Counter from '../../components/Counter';
import PhotoSlot from '../../components/PhotoSlot';
import { useSiteStats } from '../../hooks/useSiteStats';
import { siteConfig, phoneHref } from '../../config/siteConfig';
import { providerCountLabel, serviceCount, stateGroupCount } from '../../lib/statsCounts';
import { useMatchModal } from '../../context/MatchModalContext';
import { LOCATION_GROUPS } from '../../data/providers';
import './Home.css';
import { useMatchModal } from '../../context/MatchModalContext';

const SERVICE_ICONS: Record<string, JSX.Element> = {
  'Personal care': <path d="M12 20.5S4 15.5 4 9.8A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 20 9.8c0 5.7-8 10.7-8 10.7Z" />,
  'Therapy services': (
    <>
      <path d="M4 4v6a5 5 0 0 0 10 0V4" />
      <path d="M2 4h4M12 4h4" />
      <path d="M9 15v2a4 4 0 0 0 8 0v-1" />
      <circle cx="18" cy="13" r="2.5" />
    </>
  ),
  'Domestic assistance': (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  Nursing: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M9 6V4h6v2" />
      <path d="M12 10v6M9 13h6" />
    </>
  ),
};

export default function Home() {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();

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
            Tell us what you need and we will do the searching for you, free.
            A new connection every 5 minutes during business hours.
          </p>
          <div className="hero-actions">
            <button className="btn-gradient btn-lg" onClick={openMatchModal}>
              Get matched free <span aria-hidden="true">→</span>
            </button>
            <button className="btn-outline-light btn-lg" onClick={() => navigate('/directory')}>
              Find support
            </button>
          </div>
        </div>
      </section>

      <section className="info-cards">
        <div className="info-card info-card-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
          </svg>
          {siteConfig.contactPhone ? (
            <>
              <h3 className="info-title">Talk to a person</h3>
              <p className="info-body info-body-light">We will shortlist providers for you over the phone, at no cost.</p>
              <a className="info-phone" href={phoneHref(siteConfig.contactPhone)}>{siteConfig.contactPhone}</a>
            </>
          ) : (
            <>
              <h3 className="info-title">Tell us what you need</h3>
              <p className="info-body info-body-light">Answer a few questions and we will match you with providers who have capacity — free.</p>
              <button type="button" className="info-phone" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'inherit', textAlign: 'left', font: 'inherit' }} onClick={() => openMatchModal()}>
                Get matched, free →
              </button>
            </>
          )}
        </div>

        <div className="info-card">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
            <path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <h3 className="info-title">Checked, not scraped</h3>
          <p className="info-body">Providers confirm they are still taking referrals every week. Anyone who stops answering is taken off the list until they confirm again.</p>
          <Link to="/directory" className="link-btn">
            How listings are checked →
          </Link>
        </div>

        <div className="info-card">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <h3 className="info-title">Support hours</h3>
          <dl className="hours-dl">
            <dt>Monday – Friday</dt>
            <dd>8:00 – 18:00</dd>
            <dt>Saturday</dt>
            <dd>9:00 – 13:00</dd>
            <dt>Directory search</dt>
            <dd>Always open</dd>
          </dl>
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
          <h2 className="section-heading">The list is short because it is honest</h2>
          <p className="section-copy">
            Most directories list everyone and let you find out for yourself who has
            capacity. We ask providers to confirm availability every week, and quietly
            remove the ones who stop answering.
          </p>
          <ul className="check-list">
            <li>
              <CheckIcon /> Availability confirmed weekly, not at sign-up
            </li>
            <li>
            </li>
            <li>
              <CheckIcon /> Providers cannot pay for a higher position
            </li>
            <li>
              <CheckIcon /> Your details go only to the providers you choose
            </li>
          </ul>
          <div className="about-cta-row">
            <button className="btn-gradient" onClick={() => navigate('/directory')}>
              Start searching
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

      <section className="stats-section">
        <p className="stats-headline">
          A long list is not the useful thing.{' '}
          <span className="stats-headline-accent">What matters is who has room to start</span> — so we ask providers to
          confirm their capacity every week and show the real numbers below.
        </p>
        <div className="stats-row">
          {stats && stats.providersListed > 0 && (
            <div>
              <span className="stat-value">
                <Counter value={stats.providersListed} />
              </span>
              <span className="stat-label">Providers listed</span>
            </div>
          )}
          {stats && stats.suburbsCovered > 0 && (
            <div>
              <span className="stat-value">
                <Counter value={stats.suburbsCovered} />
              </span>
              <span className="stat-label">Suburbs covered</span>
            </div>
          )}
          {stats && stats.medianFirstReplyMinutes !== null && (
            <div>
              <span className="stat-value stat-value-accent">
                <Counter value={stats.medianFirstReplyMinutes} suffix=" min" format={false} />
              </span>
              <span className="stat-label">Median first reply</span>
            </div>
          )}
          {stats && stats.enquiriesLast30Days > 0 && (
            <div>
              <span className="stat-value">
                <Counter value={stats.enquiriesLast30Days} />
              </span>
              <span className="stat-label">Enquiries in the last 30 days</span>
            </div>
          )}
          <div>
            <span className="stat-value">
              <Counter value={0} prefix="$" format={false} />
            </span>
            <span className="stat-label">Cost to families</span>
          </div>
        </div>
      </section>

      <section id="services" className="services-section">
        <div className="services-inner">
          <div className="section-header-row">
            <div>
              <span className="eyebrow">
                <span className="eyebrow-rule" />
                What people search for
              </span>
              <h2 className="section-heading">Supports you can find here</h2>
            </div>
            <Link to="/directory" className="btn-white">
              Browse all providers
            </Link>
          </div>

          <div className="services-grid">
            <button className="service-card service-card-featured" onClick={() => navigate('/directory?service=Support%20coordination')}>
              <div>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="service-icon-featured">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="5" cy="5" r="2" />
                  <circle cx="19" cy="5" r="2" />
                  <circle cx="12" cy="21" r="2" />
                  <path d="M6.5 6.5 10 10M17.5 6.5 14 10M12 15v4" />
                </svg>
                <span className="service-badge">Most searched</span>
                <h3 className="service-title-featured">Support coordination</h3>
                <p className="service-body-featured">
                  Coordinators who help you understand a plan, choose providers and keep
                  everything moving between reviews.
                </p>
              </div>
              <span className="service-count-featured">
                {providerCountLabel(serviceCount(stats, 'Support coordination')) ?? 'Browse providers'} →
              </span>
            </button>

            {[
              { name: 'Personal care', body: 'Bathing, dressing, medication prompts and daily routines.' },
              { name: 'Therapy services', body: 'Occupational therapy, physio, speech and allied health.' },
              { name: 'Domestic assistance', body: 'Cleaning, laundry, meals and everyday household help.' },
              { name: 'Nursing', body: 'In-home clinical care, wound care and high-intensity supports.' },
            ].map((s) => (
              <button key={s.name} className="service-card" onClick={() => navigate(`/directory?service=${encodeURIComponent(s.name)}`)}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="service-icon">
                  {SERVICE_ICONS[s.name]}
                </svg>
                <h3 className="service-title">{s.name}</h3>
                <p className="service-body">{s.body}</p>
                <span className="service-count">{providerCountLabel(serviceCount(stats, s.name)) ?? 'Browse providers'} →</span>
              </button>
            ))}
          </div>

          <div className="pill-row">
            <button className="pill-btn" onClick={() => navigate('/directory?service=Transport')}>
              Transport{serviceCount(stats, 'Transport') !== null && <span className="pill-count">{serviceCount(stats, 'Transport')}</span>}
            </button>
            <button className="pill-btn" onClick={() => navigate('/directory?service=Housing%20(SDA%20%26%20SIL)')}>
              Housing, SDA &amp; SIL{serviceCount(stats, 'Housing (SDA & SIL)') !== null && <span className="pill-count">{serviceCount(stats, 'Housing (SDA & SIL)')}</span>}
            </button>
            <button className="pill-btn" onClick={() => navigate('/directory?service=Plan%20management')}>
              Plan management{serviceCount(stats, 'Plan management') !== null && <span className="pill-count">{serviceCount(stats, 'Plan management')}</span>}
            </button>
          </div>
        </div>
      </section>

      <section className="checks-section">
        <div className="checks-photo-bg">
          <PhotoSlot src="/images/six-checks-on-every-provider.jpg" alt="A provider team at work" variant="team" />
          <div className="checks-photo-overlay" />
        </div>
        <div className="checks-inner">
          <div className="checks-content">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            Before a listing goes live
          </span>
          <h2 className="section-heading section-heading-light">Six checks on every provider</h2>
          <div className="checks-grid">
            {[
              ['Registration status', 'Matched to the NDIS Commission register weekly.'],
              ['Current capacity', 'Confirmed every Monday, or the listing is paused.'],
              ['Worker screening', 'Clearance policy sighted for every listed service.'],
              ['Service area', 'Suburb-level coverage, travel charges stated up front.'],
              ['Languages spoken', 'Listed per team, including Auslan and interpreters.'],
              ['Response record', 'Median reply time measured over thirty days.'],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="check-title">{title}</h3>
                <p className="check-body">{body}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>


      <section id="locations" className="locations-section">
        <div className="locations-inner">
          <div className="section-header-row">
            <h2 className="section-heading">Cities, suburbs and regions</h2>
            <Link to="/locations" className="link-btn">
              View all locations →
            </Link>
          </div>
          <div className="locations-grid">
            {LOCATION_GROUPS.slice(0, 4).map((g) => (
              <div key={g.state}>
                <h3 className="location-state">{g.state}</h3>
                {providerCountLabel(stateGroupCount(stats, g.states)) && (
                  <p className="location-count">{providerCountLabel(stateGroupCount(stats, g.states))}</p>
                )}
                <div className="location-places">
                  {g.places.slice(0, 4).map((place) => (
                    <button key={place} className="location-link" onClick={() => navigate('/directory')}>
                      {place}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="providers" className="providers-cta-section">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            For providers
          </span>
          <h2 className="section-heading">List your service where families are already looking</h2>
          <p className="section-copy">
            One flat monthly fee, no cost per enquiry and no bidding for position. Update
            capacity in the portal and you drop out of results the moment your books
            close.
          </p>
          <div className="providers-cta-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=provider')}>
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
