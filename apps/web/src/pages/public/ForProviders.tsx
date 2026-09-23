import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import PhotoSlot from '../../components/PhotoSlot';
import Counter from '../../components/Counter';
import { useSiteStats } from '../../hooks/useSiteStats';
import './Home.css';
import './ForProviders.css';

// Mirrors the default rows seeded in apps/api/src/models/PlanConfig.ts —
// update both together if pricing or quotas change.
const STARTER_FEATURES = ['Public provider listing', 'Search the worker directory', 'Contact requests to workers', 'Lead headlines, no contact details'];
const GROWTH_FEATURES = ['15 lead unlocks per month', 'Full brief, budget and contact details', 'Matched to your service areas', 'Three team seats', 'Response time reporting'];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Is a lead the same as a booked client?',
    a: 'No. A lead is an enquiry from someone looking for support in your area. Several matched providers can see the same enquiry, and the person decides who to contact back. We do not guarantee a booking, a response, or a fixed volume of enquiries.',
  },
  {
    q: 'Do I need to be NDIS registered?',
    a: 'No, but your registration status is shown on your listing and some participants specifically search for registered providers. Unregistered providers can still list and be matched to self-managed or plan-managed enquiries.',
  },
  {
    q: 'How much does it cost?',
    a: 'Claiming and verifying your listing is free. The Growth plan is a flat monthly subscription that includes a set number of lead unlocks — see the comparison below for current pricing and inclusions.',
  },
  {
    q: 'Will listing guarantee me new clients?',
    a: 'No directory can guarantee that. Enquiry volume depends on demand in your service area, your capacity, and how complete your profile is. We only ask that your service area, funding types and contact details are accurate.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes. Growth is billed monthly with no lock-in contract — cancel from your dashboard whenever you like and you will not be billed again for the next cycle.',
  },
  {
    q: 'How do participants find me?',
    a: 'Participants and support coordinators search the public directory by suburb, service type and funding, or submit a "Get matched" request that we compare against your listed service areas and confirmed capacity.',
  },
];

export default function ForProviders() {
  const navigate = useNavigate();
  const stats = useSiteStats();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <PublicHeader />

      <section className="fp-hero">
        <div className="fp-hero-inner">
          <span className="fp-badge">
            <span className="fp-badge-dot" aria-hidden="true" />
            Now accepting providers
          </span>
          <h1 className="fp-hero-heading">Connect with NDIS participants and aged care families in your service area</h1>
          <p className="fp-hero-copy">
            We match your listing against enquiries from people searching in your suburbs, then send the
            request straight to your inbox or phone. You make contact and take it from there — no bidding
            for position and no commission on what you earn.
          </p>
          <div className="fp-hero-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=provider')}>
              List your business <span aria-hidden="true">→</span>
            </button>
            <button className="btn-tint" onClick={() => navigate('/login')}>
              Log in
            </button>
            <a className="link-btn" href="#how-it-works">How it works →</a>
            <button className="link-btn fp-coordinator-link" onClick={() => navigate('/directory')}>
              For support coordinators →
            </button>
          </div>
        </div>
      </section>

      {stats && stats.providersListed > 0 && (
        <section className="fp-stats-bar">
          <div className="fp-stats-row">
            <div>
              <span className="fp-stat-value"><Counter value={stats.providersListed} /></span>
              <span className="fp-stat-label">Providers listed</span>
            </div>
            {stats.suburbsCovered > 0 && (
              <div>
                <span className="fp-stat-value"><Counter value={stats.suburbsCovered} /></span>
                <span className="fp-stat-label">Suburbs covered</span>
              </div>
            )}
            {stats.enquiriesLast30Days > 0 && (
              <div>
                <span className="fp-stat-value"><Counter value={stats.enquiriesLast30Days} /></span>
                <span className="fp-stat-label">Enquiries in the last 30 days</span>
              </div>
            )}
          </div>
          <p className="fp-stats-note">Figures are calculated from live directory records and enquiries, not projections.</p>
        </section>
      )}

      <section className="fp-understand">
        <div className="fp-understand-inner">
          <h2 className="section-heading">Understand participant leads before you subscribe</h2>
          <p className="section-copy">
            A lead is an enquiry about support, not an exclusive client or a booked service. Being clear
            about how matching works helps you decide if this is the right channel for your business.
          </p>
          <div className="fp-understand-grid">
            <div className="fp-understand-card">
              <h3>Match your actual service area and capacity</h3>
              <p>Keep your service areas, funding types and contact details accurate, and only pursue enquiries you can genuinely support. Confirm timing, registration requirements and fees directly with the person before you agree to work together.</p>
            </div>
            <div className="fp-understand-card">
              <h3>NDIS and aged care enquiries are different</h3>
              <p>We also match aged care families with providers. Check the funding type and support requested in every enquiry — the totals shown across the directory include both, so they are not a count of NDIS-only demand.</p>
            </div>
            <div className="fp-understand-card">
              <h3>Free notifications, paid contact access</h3>
              <p>Claiming a basic listing is free and you are notified whenever an enquiry matches your service area. Unlocking full contact details is part of the Growth plan. A notification is not the same as a person agreeing to work with you.</p>
            </div>
            <div className="fp-understand-card">
              <h3>Compare directories on fit, not headline numbers</h3>
              <p>When comparing directories, look at what is actually included — billing terms, covered locations, service categories and how enquiries reach you — rather than the size of the register alone. A larger list does not by itself mean more suitable enquiries for your business.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="fp-reach">
        <div className="fp-reach-photo">
          <PhotoSlot src="/images/providers.jpg" alt="A support worker helping a participant" variant="care" />
        </div>
        <div className="fp-reach-content">
          <h2 className="section-heading">How enquiries reach you</h2>
          <p className="section-copy">Enquiries are delivered the way you actually check them, as soon as a match is confirmed.</p>
          <ul className="fp-reach-list">
            <li>
              <strong>Email to your inbox.</strong> The suburb, service and funding type are sent the moment a matching enquiry comes in.
            </li>
            <li>
              <strong>SMS to your phone.</strong> Growth includes text notifications for matched enquiries, so you can review and respond without opening a dashboard.
            </li>
            <li>
              <strong>No commission, ever.</strong> Your subscription is a flat monthly fee — we never take a cut of what you earn from a job.
            </li>
            <li>
              <strong>Connect directly with families.</strong> Unlocking an enquiry gives you their contact details directly; there is no middle step and no obligation on either side.
            </li>
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="fp-steps">
        <div className="fp-steps-inner">
          <h2 className="section-heading">How it works</h2>
          <p className="section-copy">Complete your profile and tell us where you have capacity. Listing does not guarantee enquiries — matching depends on demand and how closely your profile fits what people are searching for.</p>
          <div className="fp-steps-grid">
            <div className="fp-step-card">
              <span className="fp-step-num">1</span>
              <h3>Claim your profile</h3>
              <p>Find your business in our directory and claim it, or create a new listing. Claiming is free.</p>
            </div>
            <div className="fp-step-card">
              <span className="fp-step-num">2</span>
              <h3>Set your service area and capacity</h3>
              <p>Tell us the suburbs you cover, the supports you offer, and where to send matches — email, SMS, or both.</p>
            </div>
            <div className="fp-step-card">
              <span className="fp-step-num">3</span>
              <h3>Get matched, make contact</h3>
              <p>When someone requests support in your area, we compare the request to your profile and send you the brief. You make contact directly.</p>
            </div>
          </div>
          <button className="btn-gradient" onClick={() => navigate('/signup?type=provider')}>
            Claim your profile for free →
          </button>
        </div>
      </section>

      <section className="fp-pricing">
        <div className="fp-pricing-inner">
          <h2 className="section-heading" style={{ textAlign: 'center', maxWidth: 'none' }}>Free listing vs Growth</h2>
          <p className="section-copy" style={{ textAlign: 'center', maxWidth: '52ch', margin: '0 auto 40px' }}>
            Every claimed profile is notified for free. Growth adds full contact details and priority matching for a flat monthly fee.
          </p>
          <div className="fp-pricing-grid">
            <div className="fp-pricing-card">
              <span className="fp-pricing-tier">Free</span>
              <h3 className="fp-pricing-name">Starter</h3>
              <p className="fp-pricing-price">$0<span>/month</span></p>
              <ul className="fp-pricing-features">
                {STARTER_FEATURES.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="btn-white" onClick={() => navigate('/signup?type=provider')}>Claim your profile</button>
            </div>
            <div className="fp-pricing-card fp-pricing-card-featured">
              <span className="fp-pricing-tier">Growth</span>
              <h3 className="fp-pricing-name">Growth</h3>
              <p className="fp-pricing-price">$249<span>/month + GST</span></p>
              <ul className="fp-pricing-features">
                {GROWTH_FEATURES.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="btn-gradient" onClick={() => navigate('/signup?type=provider')}>Start on Growth</button>
            </div>
          </div>
        </div>
      </section>

      <section className="fp-cta-band">
        <h2>Start getting matched</h2>
        <p>Join the providers already receiving NDIS and aged care enquiries by email and SMS, direct to their team.</p>
        <div className="fp-cta-actions">
          <button className="btn-white" onClick={() => navigate('/signup?type=provider')}>List your business →</button>
          <button className="btn-outline-light" onClick={() => navigate('/login')}>Log in</button>
        </div>
      </section>

      <section className="fp-faq">
        <div className="fp-faq-inner">
          <h2 className="section-heading" style={{ textAlign: 'center', maxWidth: 'none' }}>Frequently asked questions</h2>
          <div className="fp-faq-list">
            {FAQS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className="fp-faq-item">
                  <button
                    type="button"
                    className="fp-faq-question"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : i)}
                  >
                    {item.q}
                    <span className="fp-faq-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p className="fp-faq-answer">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
