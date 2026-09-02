import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import PhotoSlot from '../../components/PhotoSlot';
import {
  PROVIDERS, FUNDING_OPTIONS, LANGUAGE_OPTIONS, TOC, COMPARE, DEMAND, METHOD,
  SUBURB_FACTS, LANGUAGES, GLANCE, SERVICE_COUNTS, REQUESTED, REGULATORS, POLICIES, FAQ,
} from '../../data/servicePageFixtures';
import { unslugify, stateForSuburb, STATE_ABBR } from '../../data/slugHelpers';
import './ServiceLocationPage.css';

// This page opens for any /services/:serviceSlug/:suburb combination
// clicked from the mega menu, service cards or location links — the
// heading, breadcrumb and body copy below all retarget to whatever
// was clicked. What does NOT change per route: the provider list,
// census facts, demand percentages and language stats are the one
// real populated example from the design source (Nursing ·
// Bankstown, NSW) reused as illustrative content everywhere else.
// Building genuine per-suburb data (real census facts, a real
// ranked provider set, real demand stats) for every service × suburb
// combination needs an actual data pipeline behind this template —
// that's a separate, much larger project.

export default function ServiceLocationPage() {
  const navigate = useNavigate();
  const { serviceSlug = 'nursing', suburb: suburbSlug = 'bankstown' } = useParams<{ serviceSlug: string; suburb: string }>();

  const serviceName = unslugify(serviceSlug);
  const serviceLower = serviceName.toLowerCase();
  const suburbName = unslugify(suburbSlug);
  const stateName = stateForSuburb(suburbSlug);
  const stateAbbr = STATE_ABBR[stateName] ?? stateName;

  const HERO_CHECKS = [
    `152 providers in ${suburbName}`,
    'Funded via NDIS and aged care',
    'Free, no obligation',
    'One request, providers respond',
  ];

  const [fundingFilter, setFundingFilter] = useState('All funding types');
  const [languageFilter, setLanguageFilter] = useState('All languages');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);

  const filtered = useMemo(() => {
    return PROVIDERS.filter((p) => {
      if (fundingFilter !== 'All funding types' && !p.funding.includes(fundingFilter)) return false;
      if (languageFilter !== 'All languages' && !p.languages.includes(languageFilter)) return false;
      return true;
    });
  }, [fundingFilter, languageFilter]);

  function toggleBlurb(rank: number) {
    setExpanded((e) => ({ ...e, [rank]: !e[rank] }));
  }

  function sendContact() {
    if (!contact.trim()) return;
    setSent(true);
  }

  return (
    <>
      <PublicHeader />

      <div className="svc-breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/services">Services</Link>
        <span>›</span>
        <Link to={`/directory?service=${encodeURIComponent(serviceName)}`}>{serviceName}</Link>
        <span>›</span>
        <span>{stateName}</span>
        <span>›</span>
        <strong>{suburbName}</strong>
      </div>

      {/* Hero */}
      <section className="svc-hero-section">
        <div className="svc-hero-card">
          <div className="svc-hero-photo">
            <PhotoSlot src="/images/service-hero.jpg" alt={`A support worker delivering ${serviceLower}`} variant="care" />
          </div>
          <div className="svc-hero-overlay" />
          <div className="svc-hero-grid">
            <div className="svc-hero-copy">
              <span className="svc-hero-eyebrow">
                <span className="svc-hero-eyebrow-rule" />
                {serviceName} · {stateName}
              </span>
              <h1 className="svc-hero-heading">Home {serviceLower} providers in {suburbName}, {stateName}</h1>
              <p className="svc-hero-sub">
                Up to $99.88 an hour under NDIS and aged care funding. Twelve care
                requests from participants, families and coordinators in {suburbName}
                came through SolDirectory this quarter.
              </p>
              <div className="svc-hero-stats">
                <span><strong>10 providers</strong> cover {suburbName}</span>
                <span><strong>4.6</strong> respond to a typical request</span>
                <span><strong>3 minutes</strong> to the first response</span>
                <span>from <strong>$99/hr</strong></span>
              </div>
            </div>

            <div className="svc-hero-panel">
              <h2 className="svc-hero-panel-title">For home {serviceLower}</h2>
              <div className="svc-hero-checks">
                {HERO_CHECKS.map((c) => (
                  <span key={c} className="svc-hero-check">
                    <CheckCircleIcon /> {c}
                  </span>
                ))}
              </div>
              <button className="btn-gradient" style={{ width: '100%' }} onClick={() => navigate('/signup')}>
                Find providers in {suburbName} →
              </button>
              <p className="svc-hero-panel-note">One minute to send, and it costs nothing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Body: TOC + main content */}
      <div className="svc-body">
        <aside className="svc-toc">
          <p className="svc-toc-title">On this page</p>
          <div className="svc-toc-list">
            {TOC.map((t) => (
              <a key={t.href} href={t.href} className="svc-toc-link">
                {t.label}
              </a>
            ))}
          </div>
        </aside>

        <main className="svc-main">
          {/* Providers */}
          <section id="providers">
            <h2 className="svc-h2">Best home {serviceLower} providers near me</h2>
            <div className="svc-providers-toolbar">
              <p className="svc-showing">
                Showing {filtered.length} of {PROVIDERS.length} ranked providers · <a href="#method">How we chose these</a>
              </p>
              <div className="svc-filters">
                <select className="svc-select" value={fundingFilter} onChange={(e) => setFundingFilter(e.target.value)} aria-label="Funding type">
                  {FUNDING_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="svc-select" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} aria-label="Language">
                  {LANGUAGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="svc-provider-list">
              {filtered.map((p) => (
                <article key={p.rank} className="svc-provider-card">
                  {p.strong && (
                    <div className="svc-provider-badge">
                      <span className="svc-provider-badge-strong">
                        <ShieldIcon /> Strong activity
                      </span>
                      <span className="svc-provider-badge-note">Ranked on real directory activity</span>
                    </div>
                  )}

                  <div className="svc-provider-top">
                    <div className="svc-provider-info">
                      <div className="svc-provider-name-row">
                        <span className="svc-provider-rank">{p.rank}</span>
                        <h3 className="svc-provider-name">{p.name}</h3>
                      </div>
                      <p className="svc-provider-area">{p.area} · {p.reach}</p>
                      <p className="svc-provider-also">Also supports {p.also}</p>
                      <div className="svc-provider-checks">
                        {p.checks.map((ck) => (
                          <span key={ck} className="svc-provider-check">
                            <CheckIcon /> {ck}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="svc-provider-initials">{p.initials}</div>
                  </div>

                  <div className="svc-provider-blurb">
                    <p>{expanded[p.rank] ? p.blurb : p.short}</p>
                    <button className="svc-readmore" onClick={() => toggleBlurb(p.rank)}>
                      {expanded[p.rank] ? 'Show less' : 'Read more'}
                    </button>
                  </div>

                  {expanded[p.rank] && (
                    <div className="svc-provider-sourced">
                      {p.sourced.map((s) => (
                        <span key={s} className="svc-provider-sourced-item">
                          <CheckCircleIcon /> {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="svc-provider-meta">
                    <span>Availability</span>
                    <span className={p.availability === 'Taking new clients' ? 'svc-avail-ok' : 'svc-avail-closed'}>{p.availability}</span>
                    <span>Activity</span>
                    <span className="svc-provider-meta-strong">{p.activity}</span>
                  </div>

                  <div className="svc-provider-cta">
                    <button className="btn-gradient">Get matched</button>
                  </div>
                </article>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="svc-empty">
                <p>No {suburbName} provider matches those two filters together.</p>
                <button className="svc-clear-btn" onClick={() => { setFundingFilter('All funding types'); setLanguageFilter('All languages'); }}>
                  Clear both filters
                </button>
              </div>
            )}

            <div id="match" className="svc-match-card">
              <div className="svc-match-header">Get matched directly</div>
              <div className="svc-match-body">
                <h3>Not finding the right match?</h3>
                <p>Leave your details and we will connect you with home {serviceLower} providers in {suburbName}. No wait list.</p>
                {sent ? (
                  <p className="svc-avail-ok" style={{ fontWeight: 600 }}>Thanks — we'll be in touch shortly.</p>
                ) : (
                  <div className="svc-match-form">
                    <input
                      type="text"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Your email or phone"
                      aria-label="Your email or phone"
                      className="svc-match-input"
                    />
                    <button className="btn-gradient" disabled={!contact.trim()} onClick={sendContact}>
                      Send request →
                    </button>
                  </div>
                )}
                <p className="svc-match-footnote">No login, no spam. We text or email when a match is ready.</p>
              </div>
            </div>

            <div className="svc-viewall">
              <Link to={`/directory?service=${encodeURIComponent(serviceName)}`} className="svc-viewall-pill">
                View all 152 providers in {suburbName}
              </Link>
            </div>

            <Link to={`/directory?service=${encodeURIComponent(serviceName)}`} className="svc-seeall-card">
              <span><MapPinIcon /> See all providers in {suburbName}, {stateAbbr}</span>
              <span>›</span>
            </Link>
          </section>

          <section id="about-service">
            <h2 className="svc-h2-sm">About home {serviceLower} in {suburbName}</h2>
            <p className="svc-p">
              This guide compares in-home {serviceLower} providers covering {suburbName}, ranked
              on registration, clinical credentials and service range. The ten
              providers listed service {suburbName} and the surrounding
              Canterbury-{suburbName} area, and deliver registered and enrolled nurse
              care at home for NDIS participants, aged care clients and private
              patients. Several offer overnight and 24-hour {serviceLower} for people with
              complex or high-dependency needs.
            </p>
          </section>

          <section id="compare">
            <h2 className="svc-h2-sm">What to compare before choosing</h2>
            <p className="svc-p svc-p-tight">
              Use these {serviceLower}-specific checks when you contact providers in
              {suburbName}. Confirm each answer directly: a directory listing does not
              prove current capacity.
            </p>
            <div className="svc-compare-grid">
              {COMPARE.map((c) => (
                <div key={c.title} className="svc-compare-card">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                  <p className="svc-compare-ask"><strong>Ask:</strong> {c.ask}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="asking">
            <h2 className="svc-h2-sm">Who is asking for home {serviceLower}</h2>
            <p className="svc-p svc-p-tight">
              Based on 73 real requests families, participants and coordinators sent
              through SolDirectory for {serviceLower} in {stateName}. This is the
              make-up of that demand, not a measure of how it changes over time.
            </p>
            <div className="svc-demand-grid">
              {DEMAND.map((d) => (
                <div key={d.title}>
                  <p className="svc-demand-title">{d.title}</p>
                  <div className="svc-bar-list">
                    {d.rows.map(([label, value]) => (
                      <div key={label}>
                        <div className="svc-bar-row">
                          <span>{label}</span>
                          <span className="svc-bar-pct">{value}%</span>
                        </div>
                        <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${value}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="svc-footnote">
              Percentages are of the 73 requests above and are rounded, so they will
              not always total 100. A request can name more than one service, which
              is why the "also asked for" shares overlap.
            </p>

            <div className="svc-platform-callout">
              <p className="svc-platform-label">SolDirectory platform data</p>
              <h3>How readily are enquiries connecting locally?</h3>
              <p>
                See privacy-thresholded connection speed, listed provider coverage
                and connection rates for <Link to="/locations">Sydney</Link>, or view
                the national <Link to={`/directory?service=${encodeURIComponent(serviceName)}`}>{serviceLower} data</Link>.
              </p>
              <p className="svc-platform-disclaimer">
                Directory data is platform-derived. It is not a population estimate,
                a provider endorsement or advice.
              </p>
            </div>
          </section>

          <section id="method">
            <h2 className="svc-h2-sm">How we rank providers</h2>
            <p className="svc-p">
              Rankings in {suburbName} use directory relevance and observable activity:
              service match, distance, register-sourced status fields, whether an
              enquiry can reach the provider, and recent response and claim
              activity. Rankings are recalculated daily. They do not assess care
              quality and they do not recommend a provider.
            </p>
            <div className="svc-method-list">
              {METHOD.map((m) => (
                <p key={m.title} className="svc-p"><strong>{m.title}</strong> {m.body}</p>
              ))}
            </div>
            <div className="svc-method-note">
              <p className="svc-p">
                <strong>What "taking new clients" means.</strong> It is not a rating.
                It answers one question: would a request sent through SolDirectory
                today actually reach them? Providers not taking new clients move down
                the list and are never hidden, because a top position should go to
                someone who can respond. Providers set this themselves and can turn
                it back on at any time, and availability is refreshed daily.
              </p>
            </div>
          </section>

          <section id="suburb">
            <h2 className="svc-h2-sm">About {suburbName}</h2>
            <p className="svc-p svc-p-tight">
              {suburbName} sits within the Canterbury-{suburbName} council area, home to
              around 32,113 residents. Connecting with a {serviceLower} provider that
              already works locally means shorter travel and familiarity with nearby
              services.
            </p>
            <div className="svc-facts-grid">
              {SUBURB_FACTS.map((f) => (
                <div key={f.label} className="svc-fact-card">
                  <p className="svc-fact-label">{f.label}</p>
                  <p className="svc-fact-value">{f.value}</p>
                  {f.note && <p className="svc-fact-note">{f.note}</p>}
                </div>
              ))}
            </div>
            <div className="svc-suburb-footer">
              <span>Postcode 2200</span>
              <span>Data: ABS Census 2021</span>
            </div>
          </section>

          <section id="language">
            <h2 className="svc-h2-sm">Language support in {suburbName}</h2>
            <p className="svc-p svc-p-tight">
              {suburbName} has a large Arabic-speaking community, so finding {serviceLower} in
              a shared language matters here. When you get matched, ask providers
              which of their staff speak your language and whether that worker can
              stay as your regular. Interpreters are free through TIS National for
              NDIS appointments, and My Aged Care can arrange them for aged care
              assessments.
            </p>
            <div className="svc-language-grid">
              {LANGUAGES.map((l) => (
                <div key={l.name} className="svc-language-card">
                  <span>
                    <span className="svc-language-name">{l.name}</span>
                    <span className="svc-language-native">{l.native}</span>
                  </span>
                  <span style={{ textAlign: 'right' }}>
                    <span className="svc-language-count">{l.count}</span>
                    <span className="svc-language-share">{l.share}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="svc-footnote">
              Speaker counts are persons using the language at home in this
              postcode. Source: ABS Census of Population and Housing 2021, table G13.
            </p>
          </section>

          <section id="glance">
            <h2 className="svc-h2-sm">Home {serviceLower} at a glance</h2>
            <div className="svc-glance-table">
              {GLANCE.map(([label, value], i) => (
                <div key={label} className="svc-glance-row" style={{ background: i % 2 === 1 ? '#F2F7FF' : 'transparent' }}>
                  <span>{label}</span>
                  <span className="svc-glance-value">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="costs">
            <h2 className="svc-h2-sm">Costs and how to pay</h2>
            <div className="svc-p-stack">
              <p className="svc-p">
                {serviceName} at home in {suburbName} is charged by the hour, and the NDIS
                Pricing Arrangements set the ceiling for NDIS-funded work: up to
                $99.88 an hour for a registered nurse on a weekday, more for
                evenings, weekends and public holidays. Aged care clients pay from a
                Home Care Package or Support at Home budget, and private clients pay
                the provider's own rate.
              </p>
              <p className="svc-p">
                Ask what sits outside the hourly rate. Clinical consumables, travel
                between suburbs and short-notice cancellations are billed
                differently by different providers, and for high-intensity supports
                some of the cost may come from a separate budget line.
              </p>
              <p className="svc-p">
                Most people in {suburbName} pay through a Home Care Package or Support
                at Home budget, or through an NDIS plan that is plan-managed.
                Self-managed participants pay the provider and claim it back. DVA
                clients are referred through their coordinator, and private patients
                are invoiced directly.
              </p>
            </div>
          </section>

          <section id="expect">
            <h2 className="svc-h2-sm">What to expect</h2>
            <div className="svc-p-stack">
              <p className="svc-p">
                A first visit is usually an assessment. A registered nurse reviews
                the clinical need, medications and the home itself, then writes the
                care plan that every later visit follows. Expect that visit to run
                longer than the ones after it.
              </p>
              <p className="svc-p">
                A well-run {serviceLower} service coordinates with your GP and treating
                team: clinical notes go back to the GP and any change in your health
                is flagged promptly. Ask how handover works when your regular nurse
                is away.
              </p>
              <p className="svc-p">
                All {serviceLower} providers must comply with AHPRA registration standards
                and the relevant clinical practice guidelines. Ask about the nurse's
                specific experience with your condition before confirming a booking,
                particularly for complex or specialised clinical care.
              </p>
            </div>
          </section>

          <section id="services">
            <h2 className="svc-h2-sm">Care services available in {suburbName}</h2>
            <p className="svc-p svc-p-tight">How many providers cover each type of support in {suburbName}.</p>
            <div className="svc-bar-list">
              {(() => {
                const maxCount = Math.max(...SERVICE_COUNTS.map(([, c]) => c));
                return SERVICE_COUNTS.map(([label, count]) => (
                  <div key={label}>
                    <div className="svc-bar-row">
                      <span>{label}</span>
                      <span className="svc-bar-pct">{count}</span>
                    </div>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ marginTop: 24 }}>
              <Link to="/services" className="svc-link-strong">View all services →</Link>
            </div>
          </section>

          <section id="requested">
            <h2 className="svc-h2-sm">Most requested support in {suburbName}</h2>
            <p className="svc-p svc-p-tight">Based on nine actual requests from participants and families in {suburbName}.</p>
            <div className="svc-bar-list">
              {(() => {
                const maxV = Math.max(...REQUESTED.map((r) => r.v));
                return REQUESTED.map((r) => (
                  <div key={r.label}>
                    <div className="svc-bar-row">
                      <span style={{ fontWeight: r.on ? 600 : 400, color: r.on ? 'var(--color-accent-700)' : 'inherit' }}>{r.label}</span>
                      <span className="svc-bar-pct"><strong>{r.requests}</strong> · {r.providers}</span>
                    </div>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(r.v / maxV) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
            <p className="svc-footnote">
              Real care requests submitted by people in {suburbName}, updated each build
              from enquiry records.
            </p>
          </section>

          <section id="rules">
            <h2 className="svc-h2-sm">{stateName} regulations and compliance</h2>
            <p className="svc-p">
              In {stateName}, NDIS providers may be registered with the NDIS
              Quality and Safeguards Commission, and registered providers comply
              with the NDIS Practice Standards. Registration is mandatory only for
              specified supports, such as specialist disability accommodation, plan
              management and supports involving regulated restrictive practices.
              Self-managed and plan-managed participants may generally choose
              registered or unregistered providers; NDIA-managed participants must
              use registered providers. Aged care services operate under the Aged
              Care Quality Standards. All providers serving NSW participants are
              subject to audit and must maintain worker screening through the NSW
              NDIS Worker Check.
            </p>
            <div className="svc-regulators-grid">
              {REGULATORS.map((r) => (
                <div key={r.name} className="svc-regulator-card">
                  <p className="svc-regulator-name">{r.name}</p>
                  <p>Phone: {r.phone}</p>
                  <p>Website: {r.site}</p>
                </div>
              ))}
            </div>
            <div className="svc-policy-pills">
              {POLICIES.map((p) => (
                <span key={p} className="svc-policy-pill">{p}</span>
              ))}
            </div>
          </section>

          <section id="faq">
            <h2 className="svc-h2-sm" style={{ marginBottom: 22 }}>Frequently asked questions</h2>
            <div className="svc-faq-list">
              {FAQ.map((f, i) => (
                <div key={f.q} className="svc-faq-item">
                  <button className="svc-faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                    {f.q}
                    <span className={`svc-faq-icon ${openFaq === i ? 'svc-faq-icon-open' : ''}`}>+</span>
                  </button>
                  {openFaq === i && <p className="svc-faq-answer">{f.a}</p>}
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <PublicFooter />
    </>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }}>
      <path d="m4 12.5 5 5 11-11" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.3 12.2 2.5 2.5 4.9-5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5 20 6v6c0 4.6-3.3 8.4-8 9.5-4.7-1.1-8-4.9-8-9.5V6Z" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.6" />
    </svg>
  );
}
