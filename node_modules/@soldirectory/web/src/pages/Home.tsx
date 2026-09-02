import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './public/PublicLayout';
import TestimonialCarousel from '../components/TestimonialCarousel';
import Counter from '../components/Counter';
import PhotoSlot from '../components/PhotoSlot';
import { LOCATION_GROUPS } from '../data/providers';
import { slugify } from '../data/slugHelpers';
import './Home.css';

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
          <h1 className="hero-heading">Find care providers who are actually taking clients</h1>
          <p className="hero-copy">
            Search 6,400 registered NDIS and aged care providers by service, suburb and
            funding type. Availability is confirmed every Monday, so the list you see is
            the list that can help this month.
          </p>
          <div className="hero-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/directory')}>
              Search the directory
            </button>
            <button className="btn-outline-light btn-lg" onClick={() => navigate('/signup?type=provider')}>
              List your business
            </button>
          </div>
        </div>
      </section>

      <section className="info-cards">
        <div className="info-card info-card-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
          </svg>
          <h3 className="info-title">Talk to a person</h3>
          <p className="info-body info-body-light">We will shortlist providers for you over the phone, at no cost.</p>
          <span className="info-phone">1800 765 000</span>
        </div>

        <div className="info-card">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
            <path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <h3 className="info-title">Checked, not scraped</h3>
          <p className="info-body">Registration is verified against the NDIS Commission register every week.</p>
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
          <div className="about-stat-badge">
            <span className="about-stat-value">
              <Counter value={1240} />
            </span>
            <span className="about-stat-label">providers joined the directory in the last twelve months</span>
          </div>
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
              <CheckIcon /> Registration checked against the NDIS Commission register
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
            <div>
              <span className="about-phone">1800 765 000</span>
              <span className="about-hours">Weekdays 8am – 6pm AEST · interpreters available</span>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <p className="stats-headline">
          Six thousand providers is not the useful number.{' '}
          <span className="stats-headline-accent">The useful number is how many can start this month</span> — so
          that is the one we publish.
        </p>
        <div className="stats-row">
          <div>
            <span className="stat-value">
              <Counter value={6412} />
            </span>
            <span className="stat-label">Providers listed</span>
          </div>
          <div>
            <span className="stat-value">
              <Counter value={1890} />
            </span>
            <span className="stat-label">Suburbs covered</span>
          </div>
          <div>
            <span className="stat-value stat-value-accent">
              <Counter value={7} suffix=" min" format={false} />
            </span>
            <span className="stat-label">Median first reply</span>
          </div>
          <div>
            <span className="stat-value">
              <Counter value={0} prefix="$" format={false} />
            </span>
            <span className="stat-label">Cost to participants</span>
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
            <button className="service-card service-card-featured" onClick={() => navigate('/services/support-coordination/sydney')}>
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
              <span className="service-count-featured">412 providers →</span>
            </button>

            {[
              { name: 'Personal care', body: 'Bathing, dressing, medication prompts and daily routines.', count: '1,038 providers' },
              { name: 'Therapy services', body: 'Occupational therapy, physio, speech and allied health.', count: '694 providers' },
              { name: 'Domestic assistance', body: 'Cleaning, laundry, meals and everyday household help.', count: '876 providers' },
              { name: 'Nursing', body: 'In-home clinical care, wound care and high-intensity supports.', count: '241 providers' },
            ].map((s) => (
              <button key={s.name} className="service-card" onClick={() => navigate(`/services/${slugify(s.name)}/${s.name === 'Nursing' ? 'bankstown' : 'sydney'}`)}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="service-icon">
                  {SERVICE_ICONS[s.name]}
                </svg>
                <h3 className="service-title">{s.name}</h3>
                <p className="service-body">{s.body}</p>
                <span className="service-count">{s.count} →</span>
              </button>
            ))}
          </div>

          <div className="pill-row">
            <button className="pill-btn" onClick={() => navigate('/services/transport/sydney')}>
              Transport <span className="pill-count">318</span>
            </button>
            <button className="pill-btn" onClick={() => navigate('/services/housing-sda-and-sil/sydney')}>
              Housing, SDA &amp; SIL <span className="pill-count">207</span>
            </button>
            <button className="pill-btn" onClick={() => navigate('/services/plan-management/sydney')}>
              Plan management <span className="pill-count">126</span>
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

      <TestimonialCarousel />

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
                <p className="location-count">{g.count}</p>
                <div className="location-places">
                  {g.places.slice(0, 4).map((place) => (
                    <button key={place} className="location-link" onClick={() => navigate(`/services/ndis-support/${slugify(place)}`)}>
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
