import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { runAction } from '../../lib/runAction';
import { useAuth } from '../../context/AuthContext';
import { canViewProviderProfiles } from '../../lib/profileAccess';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, stateGroupCount } from '../../lib/statsCounts';
import PhotoSlot from '../../components/PhotoSlot';
import {
  COMPARE, REGULATORS, POLICIES, FAQ,
} from '../../data/servicePageFixtures';
import { unslugify, stateForSuburb, STATE_ABBR } from '../../data/slugHelpers';
import { SERVICES } from '../../data/providers';
import { slugify } from '../../data/slugHelpers';
import Counter from '../../components/Counter';
import { useMatchModal } from '../../context/MatchModalContext';
import { getServiceAreaPage, type ServiceAreaPage } from '../../api/wordpressApi';
import { listPublicProviders, type PublicProviderRow } from '../../api/providerResources';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import './ServiceLocationPage.css';

// REAL DATA, TWO SOURCES, PER THE ARCHITECTURE DECIDED WITH THE USER:
//
// 1. Providers (this section, the hero provider count) come from the
//    real Provider database via listPublicProviders() — never WordPress,
//    never the old fixture data. This was previously the same 6 fake
//    providers shown on every single service×suburb combination,
//    which actively misrepresented real data. That's fixed here.
//
// 2. Editorial content (intro paragraph, compare cards, suburb facts,
//    language stats, FAQ, demand stats, glance table, service counts,
//    most-requested support) comes from the real service_area_page
//    WordPress CPT, keyed by slug `${service}-${suburb}`, WITH
//    PER-FIELD FALLBACK to the original illustrative fixture content
//    when no WordPress content has been authored yet for this exact
//    combination. Most combinations won't have real content authored
//    — that's expected, not a bug — so this page must keep working
//    gracefully either way, per-field, not all-or-nothing.
//
// 3. Genuinely generic, site-wide content (ranking methodology, how
//    to check credentials, regulator contact info, response time by
//    state, state coverage list) is NOT per-combination fake data —
//    it's real explanatory content that happens to be the same
//    everywhere. Left as-is; migrating this to a CMS isn't fixing
//    anything that's actually broken.

const OTHER_SERVICES = [
  'Aged Care Support',
  'Allied Health Services',
  'Assistive Technology',
  'NDIS Plan Management',
  'Disability Employment Services',
  'Community Access Support',
];

// Capitals only used for links; the provider COUNT shown on each card
// comes from real data (stats.providersByState), never from this list.
const STATE_COVERAGE = [
  { abbr: 'NSW', citySlug: 'sydney' },
  { abbr: 'VIC', citySlug: 'melbourne' },
  { abbr: 'QLD', citySlug: 'brisbane' },
  { abbr: 'WA', citySlug: 'perth' },
  { abbr: 'SA', citySlug: 'adelaide' },
  { abbr: 'TAS', citySlug: 'hobart' },
  { abbr: 'ACT', citySlug: 'canberra' },
  { abbr: 'NT', citySlug: 'darwin' },
];

export default function ServiceLocationPage() {
  const navigate = useNavigate();
  const stats = useSiteStats();
  const { user } = useAuth();
  const canOpenProfiles = canViewProviderProfiles(user?.role);
  const { openMatchModal } = useMatchModal();
  const { serviceSlug = 'nursing', suburb: suburbSlug = 'bankstown' } = useParams<{ serviceSlug: string; suburb: string }>();

  const serviceName = unslugify(serviceSlug);
  const serviceLower = serviceName.toLowerCase();
  const suburbName = unslugify(suburbSlug);
  const stateName = stateForSuburb(suburbSlug);
  const stateAbbr = STATE_ABBR[stateName] ?? stateName;

  // Real WordPress content for this exact combination, if an editor
  // has written it. null means "nothing authored yet" — every usage
  // below falls back to the original fixture content per-field, not
  // as an all-or-nothing switch.
  const [wp, setWp] = useState<ServiceAreaPage | null>(null);
  const [wpLoading, setWpLoading] = useState(true);

  // Real providers actually matching this service + suburb — this
  // replaces the fixture PROVIDERS array entirely, not just when WP
  // content exists. Real data, always, regardless of WordPress.
  const [providers, setProviders] = useState<PublicProviderRow[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersTotal, setProvidersTotal] = useState(0);

  useEffect(() => {
    setWpLoading(true);
    getServiceAreaPage(serviceSlug, suburbSlug)
      .then(setWp)
      .finally(() => setWpLoading(false));

    setProvidersLoading(true);
    listPublicProviders({ service: serviceName, suburb: suburbName })
      .then((res) => { setProviders(res.items); setProvidersTotal(res.total); })
      .catch(() => {})
      .finally(() => setProvidersLoading(false));
  }, [serviceSlug, suburbSlug, serviceName, suburbName]);

  const act = (value: string | undefined) => runAction(value, { openMatchModal, navigate });

  // Regulator cards, response times and related services: editor-authored
  // values (extended ACF group) win; the built-in generic content is the
  // per-section fallback, same rule as every other section on this page.
  const regulatorItems = wp?.regulations?.cards?.length
    ? wp.regulations.cards.map((c) => ({ name: c.title, phone: c.phone, site: c.website, description: c.description }))
    : REGULATORS.map((r) => ({ name: r.name, phone: r.phone, site: r.site, description: '' }));
  const responseTimeItems = (wp?.responseTimes ?? []).map((r) => ({ abbr: r.state, minutes: r.minutes }));
  const relatedLinks = wp?.relatedServices?.length
    ? wp.relatedServices.map((r) => ({ name: r.title, to: `/services/${r.slug}/${suburbSlug}` }))
    : OTHER_SERVICES.map((name) => ({ name, to: `/services/${slugify(name)}/${suburbSlug}` }));
  const localFacts: [string, string][] = wp?.local
    ? ([
        ['Population', wp.local.population],
        ['Median personal income', wp.local.medianIncome],
        ['Nearest hospital', wp.local.nearestHospital],
        ['Public transport', wp.local.publicTransport],
        ['Postcode', wp.local.postcode],
      ] as [string, string][]).filter(([, v]) => v)
    : [];

  const introParagraph = wp?.introParagraph || `This page lists ${serviceLower} providers who support ${suburbName} and the surrounding area. Providers set their own supports, service areas and availability, and confirm their capacity each week. Before you engage a provider, confirm their registration, insurance and worker screening directly with them.`;
  const compareItems = wp?.compare?.length ? wp.compare : COMPARE;
  const demandItems = wp?.demand ?? [];
  const suburbFactsItems = wp?.suburbFacts ?? [];
  const languageItems = wp?.languages ?? [];
  const glanceItems = wp?.glance ?? [];
  const serviceCountsItems = wp?.serviceCounts ?? [];
  const requestedItems = wp?.requested ?? [];
  const faqItems = wp?.faq?.length ? wp.faq : FAQ;

  // The ToC only lists sections that actually render — "Costs" and
  // "What to expect" used to be listed unconditionally although no such
  // sections existed (dead anchors). They're now real sections that
  // appear only when an editor has filled in their ACF group.
  const toc = wp?.toc?.length ? wp.toc : [
    { label: 'Top providers', href: '#providers' },
    { label: `About ${serviceLower}`, href: '#about-service' },
    { label: 'What to compare', href: '#compare' },
    ...(demandItems.length > 0 ? [{ label: "Who's asking", href: '#asking' }] : []),
    { label: 'How providers are listed', href: '#method' },
    { label: 'Where to find providers', href: '#where-to-find' },
    { label: 'Checking credentials', href: '#credentials' },
    ...(suburbFactsItems.length > 0 || localFacts.length > 0 ? [{ label: `About ${suburbName}`, href: '#suburb' }] : []),
    ...(languageItems.length > 0 ? [{ label: 'Language support', href: '#language' }] : []),
    ...(glanceItems.length > 0 ? [{ label: `${serviceName} at a glance`, href: '#glance' }] : []),
    ...(wp?.cost ? [{ label: wp.cost.heading || 'Costs and how to pay', href: '#costs' }] : []),
    ...(wp?.expect ? [{ label: wp.expect.heading || 'What to expect', href: '#expect' }] : []),
    ...(serviceCountsItems.length > 0 ? [{ label: 'Services in this suburb', href: '#services' }] : []),
    ...(requestedItems.length > 0 ? [{ label: 'Most requested support', href: '#requested' }] : []),
    { label: 'Regulations & compliance', href: '#rules' },
    { label: 'Find providers near you', href: '#find-near-you' },
    { label: 'FAQ', href: '#faq' },
  ];

  // SEO: an editor's own "SEO" fields (wp.seo) win when they've filled
  // them in; otherwise a real, page-specific title/description built
  // from the actual service + suburb + the real intro paragraph above
  // — never a generic or invented line. Runs once wp has resolved
  // (null on "nothing authored", which still yields a real fallback).
  useEffect(() => {
    if (wpLoading) return;
    applySeoTags({
      title: wp?.seo.title || `${serviceName} providers in ${suburbName}, ${stateAbbr} | SolDirectory`,
      description: wp?.seo.description || introParagraph,
      ogImage: wp?.seo.ogImage,
      noindex: wp?.seo.noindex,
    });
    setJsonLd('service-location', {
      '@type': 'Service',
      name: `${serviceName} in ${suburbName}, ${stateAbbr}`,
      serviceType: serviceName,
      areaServed: { '@type': 'City', name: suburbName, containedInPlace: { '@type': 'State', name: stateName } },
      provider: { '@type': 'Organization', name: 'SolDirectory', url: `${window.location.origin}/` },
      description: introParagraph,
      url: window.location.href,
    });
    return () => setJsonLd('service-location', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpLoading, wp, serviceName, suburbName, stateAbbr, stateName, introParagraph]);

  const HERO_CHECKS = [
    `${providersLoading ? '…' : providersTotal} providers in ${suburbName}`,
    'Funded via NDIS and aged care',
    'Free, no obligation',
    'One request, providers respond',
  ];

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [finderLocationInput, setFinderLocationInput] = useState(suburbName);
  const [finderServiceInput, setFinderServiceInput] = useState(SERVICES.includes(serviceName) ? serviceName : SERVICES[1]);

  function toggleBlurb(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <>
      <PublicHeader />

      <div className="svc-breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/services">Services</Link>
        <span>›</span>
        <span>{serviceName}</span>
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
                Real, verified {serviceLower} providers serving {suburbName} — matched to your actual request, not a generic list.
              </p>
              <div className="svc-hero-stats">
                <span><strong>{providersLoading ? '…' : providersTotal} providers</strong> cover {suburbName}</span>
              </div>
            </div>

            <div className="svc-hero-panel">
              <h2 className="svc-hero-panel-title">For {serviceLower}</h2>
              <div className="svc-hero-checks">
                {HERO_CHECKS.map((c) => (
                  <span key={c} className="svc-hero-check">
                    <CheckCircleIcon /> {c}
                  </span>
                ))}
              </div>
              <button className="btn-gradient svc-hero-search-btn" onClick={openMatchModal}>
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
            {toc.map((t) => (
              <a key={t.href} href={t.href} className="svc-toc-link">
                {t.label}
              </a>
            ))}
          </div>
        </aside>

        <main className="svc-main">
          {/* Providers — REAL data, not fixtures */}
          <section id="providers">
            <h2 className="svc-h2">{serviceName} providers supporting {suburbName}</h2>

            {providersLoading ? (
              <p className="svc-p">Loading providers…</p>
            ) : providers.length === 0 ? (
              <div className="svc-empty">
                <p>No providers currently registered for {serviceLower} in {suburbName}.</p>
                <button className="btn-gradient" onClick={openMatchModal}>Get matched anyway</button>
              </div>
            ) : (
              <>
                <p className="svc-showing">
                  Showing {providers.length} of {providersTotal} real registered providers
                </p>
                <div className="svc-provider-list">
                  {providers.map((p, i) => (
                    <article key={p.id} className="svc-provider-card">
                      <div className="svc-provider-top">
                        <div className="svc-provider-info">
                          <div className="svc-provider-name-row">
                            <h3 className="svc-provider-name">
                              {p.slug && canOpenProfiles ? (
                                <Link to={`/providers/${p.slug}`}>{p.tradingName || p.legalEntityName}</Link>
                              ) : (
                                p.tradingName || p.legalEntityName
                              )}
                            </h3>
                          </div>
                          <p className="svc-provider-area">{p.serviceSuburbs.join(', ') || 'Service area not listed'}</p>
                          {p.registrationGroups.length > 0 && (
                            <div className="svc-provider-checks">
                              {p.registrationGroups.slice(0, 4).map((g) => (
                                <span key={g} className="svc-provider-check"><CheckIcon /> {g}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="svc-provider-meta">
                        <span>Availability</span>
                        <span className={p.intakeStatus === 'Open to referrals' ? 'svc-avail-ok' : 'svc-avail-closed'}>{p.intakeStatus}</span>
                      </div>

                      <div className="svc-provider-cta">
                        <button className="btn-gradient" onClick={openMatchModal}>Get matched</button>
                        {p.slug && canOpenProfiles && <Link to={`/providers/${p.slug}`} className="svc-readmore">View full profile</Link>}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            <div id="match" className="svc-match-card">
              <div className="svc-match-header">Get matched directly</div>
              <div className="svc-match-body">
                <h3>Not finding the right match?</h3>
                <p>Tell us what you need and we will connect you with home {serviceLower} providers in {suburbName}. No wait list.</p>
                {/* This used to be an inline "email or phone" box whose
                    Send button only flipped a local flag to "Thanks —
                    we'll be in touch" — nothing was ever sent, so a real
                    enquiry was silently discarded. It now opens the real
                    Get Matched wizard, which validates, saves and matches. */}
                <div className="svc-match-form">
                  <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>
                    Start your free request →
                  </button>
                </div>
                <p className="svc-match-footnote">Free, no obligation. Providers respond directly to you.</p>
              </div>
            </div>

            <Link to={`/directory?service=${encodeURIComponent(serviceName)}`} className="svc-seeall-card">
              <span><MapPinIcon /> See all providers in {suburbName}, {stateAbbr}</span>
              <span>›</span>
            </Link>
          </section>

          <section id="about-service">
            <h2 className="svc-h2-sm">About home {serviceLower} in {suburbName}</h2>
            <p className="svc-p">{introParagraph}</p>
          </section>

          <section id="compare">
            <h2 className="svc-h2-sm">What to compare before choosing</h2>
            <p className="svc-p svc-p-tight">
              Use these {serviceLower}-specific checks when you contact providers in {suburbName}. Confirm each answer directly: a directory listing does not prove current capacity.
            </p>
            <div className="svc-compare-grid">
              {compareItems.map((c) => (
                <div key={c.title} className="svc-compare-card">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                  <p className="svc-compare-ask"><strong>Ask:</strong> {c.ask}</p>
                </div>
              ))}
            </div>
          </section>

          {demandItems.length > 0 && (
          <section id="asking">
            <h2 className="svc-h2-sm">Who is asking for home {serviceLower}</h2>
            <div className="svc-demand-grid">
              {demandItems.map((d) => (
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
          </section>
          )}

          <section id="method">
            <h2 className="svc-h2-sm">How providers are listed</h2>
            <div className="svc-method-list">
              <p className="svc-p"><strong>Alphabetical order.</strong> Providers are listed alphabetically. SolDirectory does not rank providers, assess the quality of any provider’s supports, or recommend a provider.</p>
              <p className="svc-p"><strong>Payment does not affect position.</strong> Providers pay a subscription to receive and respond to enquiries. Payment does not change whether or where a provider appears.</p>
              <p className="svc-p"><strong>Availability.</strong> Providers confirm each week that they are taking referrals. A provider who has not confirmed recently is removed from results until they do.</p>
              <p className="svc-p"><strong>Provider-supplied details.</strong> Registration, insurance and other details are supplied by providers. Always confirm them directly with a provider before you engage them.</p>
            </div>
          </section>

          <section id="where-to-find">
            <h2 className="svc-h2-sm">Where to find {serviceLower} providers</h2>
            <p className="svc-p svc-p-tight">Browse {serviceLower} by state — pick one to see providers in that state's capital.</p>
            <div className="svc-state-grid">
              {STATE_COVERAGE.map((s) => (
                <Link key={s.abbr} to={`/services/${serviceSlug}/${s.citySlug}`} className="svc-state-card">
                  <span className="svc-state-abbr">{s.abbr}</span>
                  {providerCountLabel(stateGroupCount(stats, [s.abbr])) && (
                    <span className="svc-state-count">{providerCountLabel(stateGroupCount(stats, [s.abbr]))}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>

          <section id="credentials">
            <h2 className="svc-h2-sm">How to check a provider's credentials</h2>
            <p className="svc-p svc-p-tight">Confirm these five things directly with any provider before booking — a directory listing alone doesn't prove current status.</p>
            <ol className="svc-credentials-list">
              <li><span className="svc-credentials-num">1</span><div><p className="svc-credentials-title">NDIS registration</p><p className="svc-credentials-body">Ask for their registration number and check it against the NDIS Commission's public register.</p></div></li>
              <li><span className="svc-credentials-num">2</span><div><p className="svc-credentials-title">Insurance</p><p className="svc-credentials-body">Ask to see current public liability and professional indemnity certificates.</p></div></li>
              <li><span className="svc-credentials-num">3</span><div><p className="svc-credentials-title">Qualifications</p><p className="svc-credentials-body">Ask which specific staff member is assigned and what their relevant qualification is.</p></div></li>
              <li><span className="svc-credentials-num">4</span><div><p className="svc-credentials-title">Experience</p><p className="svc-credentials-body">Ask how long they've delivered this exact service.</p></div></li>
              <li><span className="svc-credentials-num">5</span><div><p className="svc-credentials-title">Compliance</p><p className="svc-credentials-body">Ask about their worker screening status and how they handle incidents or complaints.</p></div></li>
            </ol>
          </section>

          {(suburbFactsItems.length > 0 || localFacts.length > 0) && (
          <section id="suburb">
            <h2 className="svc-h2-sm">About {suburbName}</h2>
            <div className="svc-facts-grid">
              {suburbFactsItems.map((f) => (
                <div key={f.label} className="svc-fact-card">
                  <p className="svc-fact-label">{f.label}</p>
                  <p className="svc-fact-value">{f.value}</p>
                  {f.note && <p className="svc-fact-note">{f.note}</p>}
                </div>
              ))}
              {localFacts.map(([label, value]) => (
                <div key={`local-${label}`} className="svc-fact-card">
                  <p className="svc-fact-label">{label}</p>
                  <p className="svc-fact-value">{value}</p>
                </div>
              ))}
            </div>
            {wp?.local?.communityInfo && <p className="svc-p" style={{ marginTop: 16 }}>{wp.local.communityInfo}</p>}
            {wp?.local?.dataDate && <p className="svc-fact-note" style={{ marginTop: 8 }}>Source: {wp.local.dataDate}</p>}
          </section>
          )}

          {languageItems.length > 0 && (
          <section id="language">
            <h2 className="svc-h2-sm">Language support in {suburbName}</h2>
            <div className="svc-language-grid">
              {languageItems.map((l) => (
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
          </section>
          )}

          {glanceItems.length > 0 && (
          <section id="glance">
            <h2 className="svc-h2-sm">Home {serviceLower} at a glance</h2>
            <div className="svc-glance-table">
              {glanceItems.map(([label, value], i) => (
                <div key={label} className="svc-glance-row" style={{ background: i % 2 === 1 ? '#F2F7FF' : 'transparent' }}>
                  <span>{label}</span>
                  <span className="svc-glance-value">{value}</span>
                </div>
              ))}
            </div>
          </section>
          )}

          {wp?.cost && (
            <section id="costs">
              <h2 className="svc-h2-sm">{wp.cost.heading || 'Costs and how to pay'}</h2>
              {wp.cost.intro && <p className="svc-p svc-p-tight">{wp.cost.intro}</p>}
              {wp.cost.pricingInfoHtml && (
                <div className="svc-p svc-rich" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(wp.cost.pricingInfoHtml) }} />
              )}
              <div className="svc-facts-grid">
                {([
                  ['NDIS', wp.cost.ndis],
                  ['Private payment', wp.cost.privatePay],
                  ['Aged care', wp.cost.agedCare],
                  ['DVA', wp.cost.dva],
                ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="svc-fact-card">
                    <p className="svc-fact-label">{label}</p>
                    <p className="svc-fact-value svc-fact-value-body">{value}</p>
                  </div>
                ))}
              </div>
              {wp.cost.notes && <p className="svc-fact-note" style={{ marginTop: 12 }}>{wp.cost.notes}</p>}
            </section>
          )}

          {wp?.expect && (
            <section id="expect">
              <h2 className="svc-h2-sm">{wp.expect.heading || 'What to expect'}</h2>
              {wp.expect.intro && <p className="svc-p svc-p-tight">{wp.expect.intro}</p>}
              {wp.expect.steps.length > 0 && (
                <ol className="svc-credentials-list">
                  {wp.expect.steps.map((st) => (
                    <li key={`${st.number}-${st.title}`}>
                      <span className="svc-credentials-num">{st.number}</span>
                      <div>
                        <p className="svc-credentials-title">{st.title}</p>
                        {st.description && <p className="svc-credentials-body">{st.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {serviceCountsItems.length > 0 && (
          <section id="services">
            <h2 className="svc-h2-sm">Care services available in {suburbName}</h2>
            <div className="svc-bar-list">
              {(() => {
                const maxCount = Math.max(...serviceCountsItems.map(([, c]) => c));
                return serviceCountsItems.map(([label, count]) => (
                  <div key={label}>
                    <div className="svc-bar-row"><span>{label}</span><span className="svc-bar-pct">{count}</span></div>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ marginTop: 24 }}>
              <Link to="/services" className="svc-link-strong">View all services →</Link>
            </div>
          </section>
          )}

          {requestedItems.length > 0 && (
          <section id="requested">
            <h2 className="svc-h2-sm">Most requested support in {suburbName}</h2>
            <div className="svc-bar-list">
              {(() => {
                const maxV = Math.max(...requestedItems.map((r) => r.v));
                return requestedItems.map((r) => (
                  <div key={r.label}>
                    <div className="svc-bar-row">
                      <span style={{ fontWeight: r.on ? 600 : 400 }}>{r.label}</span>
                      <span className="svc-bar-pct"><strong>{r.requests}</strong> · {r.providers}</span>
                    </div>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(r.v / maxV) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
          </section>
          )}

          <section id="rules">
            <h2 className="svc-h2-sm">{wp?.regulations?.heading || `${stateName} regulations and compliance`}</h2>
            {wp?.regulations?.intro && <p className="svc-p svc-p-tight">{wp.regulations.intro}</p>}
            <div className="svc-regulators-grid">
              {regulatorItems.map((r) => (
                <div key={r.name} className="svc-regulator-card">
                  <p className="svc-regulator-name">{r.name}</p>
                  {r.description && <p>{r.description}</p>}
                  {r.phone && <p>Phone: {r.phone}</p>}
                  {r.site && <p>Website: {r.site}</p>}
                </div>
              ))}
            </div>
            <div className="svc-policy-pills">
              {POLICIES.map((p) => <span key={p} className="svc-policy-pill">{p}</span>)}
            </div>
          </section>

          <section id="find-near-you" className="svc-finder">
            <h2 className="svc-h2-sm">{wp?.finder?.heading || `Find ${serviceLower} providers near you`}</h2>
            {wp?.finder?.description && <p className="svc-p svc-p-tight">{wp.finder.description}</p>}
            <form className="svc-finder-form" onSubmit={(e) => { e.preventDefault(); navigate(`/services/${slugify(finderServiceInput)}/${slugify(finderLocationInput)}`); }}>
              <label className="svc-finder-field">
                <span>Location</span>
                <input value={finderLocationInput} onChange={(e) => setFinderLocationInput(e.target.value)} placeholder="Suburb or postcode" />
              </label>
              <label className="svc-finder-field">
                <span>Service / need</span>
                <select value={finderServiceInput} onChange={(e) => setFinderServiceInput(e.target.value)}>
                  {SERVICES.filter((s) => s !== 'All services').map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <button type="submit" className="btn-gradient svc-finder-btn">Search →</button>
            </form>
          </section>

          <section id="faq">
            <h2 className="svc-h2-sm" style={{ marginBottom: 22 }}>Frequently asked questions</h2>
            <div className="svc-faq-list">
              {faqItems.map((f, i) => (
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

          {responseTimeItems.length > 0 && (
          <section id="response-by-state">
            <h2 className="svc-h2-sm">Response time by state</h2>
            <div className="svc-bar-list">
              {(() => {
                const maxMin = Math.max(...responseTimeItems.map((r) => r.minutes));
                return responseTimeItems.map((r) => (
                  <div key={r.abbr}>
                    <div className="svc-bar-row"><span>{r.abbr}</span><span className="svc-bar-pct">{r.minutes} min</span></div>
                    <div className="svc-bar-track"><div className="svc-bar-fill" style={{ width: `${(r.minutes / maxMin) * 100}%` }} /></div>
                  </div>
                ));
              })()}
            </div>
          </section>
          )}
        </main>
      </div>

      <section className="svc-cta-band">
        <div className="svc-cta-band-inner">
          <h2>{wp?.cta?.heading || 'Need support at home?'}</h2>
          <p>{wp?.cta?.description || 'Not sure what service you need? We can help you find the right support.'}</p>
          <div className="svc-cta-band-actions">
            <button type="button" className="btn-gradient btn-lg" onClick={() => act(wp?.cta?.primaryAction || wp?.cta?.primaryUrl || '#providers')}>
              {wp?.cta?.primaryLabel || 'Find providers'}
            </button>
            <button type="button" className="svc-cta-band-secondary" onClick={() => act(wp?.cta?.secondaryAction || wp?.cta?.secondaryUrl || 'get_matched')}>
              {wp?.cta?.secondaryLabel || 'Get matched'}
            </button>
          </div>
        </div>
      </section>

      <section className="svc-related-section">
        <div className="svc-related-inner">
          <h2 className="svc-h2-sm">Other services</h2>
          <div className="svc-related-grid">
            {relatedLinks.map((r) => (
              <Link key={r.to} to={r.to} className="svc-related-link">{r.name}</Link>
            ))}
          </div>
        </div>
      </section>

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
