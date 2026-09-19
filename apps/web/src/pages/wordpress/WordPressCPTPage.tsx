import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCPTItem, type WPCPTItem } from '../../api/wordpressApi';
import { listProviders, type ProviderRow } from '../../api/providerResources';
import { useMatchModal } from '../../context/MatchModalContext';
import { PublicHeader, PublicFooter } from '../public/PublicLayout';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import ProviderMap from '../../components/ProviderMap';
import NotFound from './NotFound';
import type { CPTRouteConfig } from '../../lib/cptRouteConfig';
import { runAction } from '../../lib/runAction';
import './WordPressCPTPage.css';

interface FAQItem { question: string; answer: string }
interface HeroStat { label: string; value: string; description?: string }
interface HeroSummaryCard {
  title?: string; funding_text?: string; availability_text?: string;
  response_text?: string; cta_label?: string; cta_url?: string;
}
interface RegulatorCard { title: string; description?: string; phone?: string; website?: string; cta?: string }
interface CredentialItem { title: string; description?: string }
interface RelatedService { id: number; title: string; slug: string; featuredImage: string | null; url: string }

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export default function WordPressCPTPage({ config }: { config: CPTRouteConfig }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const { openMatchModal } = useMatchModal();
  const navigate = useNavigate();
  // Every WP-controlled button goes through the shared interpreter
  // (lib/runAction.ts) with a REAL navigate — this page used to pass a
  // no-op, so any button whose ACF URL was a path did nothing.
  const act = (value: string | undefined) => runAction(value, { openMatchModal, navigate });
  const [content, setContent] = useState<WPCPTItem | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [providersTotal, setProvidersTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getCPTItem(config.restBase, slug)
      .then((item) => {
        if (!item) { setNotFound(true); return; }
        setContent(item);
        // Provider Finder section only queries real providers when
        // this route is configured to show them, and only for the
        // real count wp-admin asked for (finder_count) — never more
        // than configured, never fabricated.
        if (config.showRelatedProviders || item.meta.finder_heading || item.meta.finder_show_map !== undefined) {
          const count = Number(item.meta.finder_count) > 0 ? Number(item.meta.finder_count) : 6;
          // A Location page filters providers by that suburb; a Service
          // page filters by the service itself (optionally narrowed by
          // the editor's "Default Location"). Querying a service page by
          // suburb=<service title> — as this did before — never matched.
          const defaultLocation = typeof item.meta.finder_default_location === 'string' ? item.meta.finder_default_location.trim() : '';
          const query = config.pathPrefix === 'services'
            ? { service: item.title, ...(defaultLocation ? { suburb: defaultLocation } : {}) }
            : { suburb: item.title };
          return listProviders(query).then((res) => {
            setProviders(res.items.slice(0, count));
            setProvidersTotal(res.total);
          }).catch(() => {});
        }
      })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [config, slug]);

  if (!loading && !error && notFound) return (<><PublicHeader /><NotFound /><PublicFooter /></>);

  const meta = content?.meta ?? {};

  // --- Hero ---
  const heroEyebrow = str(meta.hero_eyebrow);
  const heroHeadline = str(meta.hero_headline) || content?.title || '';
  const heroDescription = str(meta.hero_description) || content?.excerpt || '';
  const heroBgImage = str(meta.hero_background_image) || content?.featuredImage?.url || '';
  const heroCtaLabel = str(meta.hero_cta_label);
  const heroCtaUrl = str(meta.hero_cta_url);
  const heroStats = safeParseJson<HeroStat[]>(meta.hero_stats_json, []);
  const heroCard = (typeof meta.hero_summary_card === 'object' && meta.hero_summary_card ? meta.hero_summary_card : null) as HeroSummaryCard | null;
  // ACF returns a group with every sub-field present-but-empty when an
  // editor hasn't filled it in — an empty panel would render as a blank
  // white box, so only show it when something is actually authored.
  const heroCardHasContent = !!heroCard && Object.values(heroCard).some((v) => typeof v === 'string' && v.trim() !== '');

  // --- Service Information ---
  const overviewHeading = str(meta.overview_heading);
  const overviewContent = str(meta.overview_content);
  const whoFor = str(meta.who_for);
  const eligibility = str(meta.eligibility);
  const fundingInfo = str(meta.funding_info);
  const planManagementInfo = str(meta.plan_management_info);
  const glanceRows: [string, string][] = [
    ['Availability', str(meta.availability)],
    ['Typical wait time', str(meta.wait_time)],
    ['Typical cost', str(meta.typical_cost)],
    ['Hours', str(meta.hours)],
    ['Registration', str(meta.registration_info)],
  ].filter(([, v]) => v) as [string, string][];
  const howToPay = str(meta.how_to_pay);

  // --- Provider Finder config ---
  const finderHeading = str(meta.finder_heading) || `Providers near you`;
  const finderDescription = str(meta.finder_description);
  const finderCtaLabel = str(meta.finder_cta_label) || 'Get matched';
  const finderShowCount = meta.finder_show_count !== false;
  const finderShowMap = meta.finder_show_map !== false;

  // --- CTA ---
  const ctaHeading = str(meta.cta_heading);
  const ctaDescription = str(meta.cta_description);
  const ctaPrimaryLabel = str(meta.cta_primary_label);
  const ctaPrimaryAction = str(meta.cta_primary_action);
  const ctaSecondaryLabel = str(meta.cta_secondary_label);
  const ctaSecondaryAction = str(meta.cta_secondary_action);

  // --- Related services (already resolved server-side into full objects) ---
  const relatedServices = Array.isArray(meta.related_services) ? (meta.related_services as RelatedService[]) : [];

  // --- Regulations & Credentials ---
  const regulationsHeading = str(meta.regulations_heading);
  const regulationsIntro = str(meta.regulations_intro);
  const regulatorCards = safeParseJson<RegulatorCard[]>(meta.regulator_cards_json, []);
  const credentials = safeParseJson<CredentialItem[]>(meta.credentials_json, []);

  // --- FAQ ---
  const faqs = safeParseJson<FAQItem[]>(meta.faq_json, []);

  const hasRelatedProviders = providers.length > 0;

  const tocItems: { href: string; label: string }[] = [];
  if (content) {
    tocItems.push({ href: '#wp-cpt-overview', label: 'Overview' });
    if (glanceRows.length > 0) tocItems.push({ href: '#wp-cpt-glance', label: 'At a glance' });
    if (eligibility) tocItems.push({ href: '#wp-cpt-eligibility', label: 'Eligibility' });
    if (fundingInfo) tocItems.push({ href: '#wp-cpt-funding', label: 'Funding' });
    if (hasRelatedProviders) tocItems.push({ href: '#wp-cpt-providers', label: 'Providers near you' });
    if (regulatorCards.length > 0) tocItems.push({ href: '#wp-cpt-regulations', label: regulationsHeading || 'Regulations & compliance' });
    if (credentials.length > 0) tocItems.push({ href: '#wp-cpt-credentials', label: 'Checking credentials' });
    if (relatedServices.length > 0) tocItems.push({ href: '#wp-cpt-related', label: 'Related services' });
    if (faqs.length > 0) tocItems.push({ href: '#wp-cpt-faq', label: 'FAQ' });
    tocItems.push({ href: '#wp-cpt-cta', label: 'Get matched' });
  }

  return (
    <>
      <PublicHeader />

      {!loading && !error && content ? (
        <div className="wp-cpt-body">
          <aside className="wp-cpt-toc">
            <p className="wp-cpt-toc-title">On this page</p>
            <div className="wp-cpt-toc-list">
              {tocItems.map((t) => (
                <a key={t.href} href={t.href} className="wp-cpt-toc-link">{t.label}</a>
              ))}
            </div>
          </aside>

          <main className="wp-cpt-main">
            <section className="wp-cpt-hero" aria-labelledby="wp-cpt-hero-title">
              <div
                className="wp-cpt-hero-photo"
                style={heroBgImage ? { backgroundImage: `url(${heroBgImage})` } : undefined}
                aria-hidden="true"
              />
              <div className="wp-cpt-hero-overlay" aria-hidden="true" />
              <div className={`wp-cpt-hero-grid ${heroCardHasContent ? '' : 'wp-cpt-hero-grid-single'}`}>
                <div className="wp-cpt-hero-copy">
                  <nav className="wp-cpt-breadcrumb wp-cpt-breadcrumb-hero" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <span aria-hidden="true"> / </span>
                    <Link to={`/${config.pathPrefix}`} style={{ textTransform: 'capitalize' }}>{config.pathPrefix}</Link>
                    <span aria-hidden="true"> / </span>
                    <span>{content.title}</span>
                  </nav>
                  {heroEyebrow && <p className="wp-cpt-hero-eyebrow"><span className="wp-cpt-hero-rule" />{heroEyebrow}</p>}
                  <h1 id="wp-cpt-hero-title" className="wp-cpt-hero-title">{heroHeadline}</h1>
                  {heroDescription && <p className="wp-cpt-hero-excerpt">{heroDescription}</p>}

                  {heroStats.length > 0 && (
                    <div className="wp-cpt-hero-stats">
                      {heroStats.map((s, i) => (
                        <span key={`${s.label}-${i}`} className="wp-cpt-hero-stat" title={s.description || undefined}>
                          <strong>{s.value}</strong> {s.label}
                        </span>
                      ))}
                    </div>
                  )}

                  <button type="button" className="btn-gradient wp-cpt-hero-cta" onClick={() => act(heroCtaUrl || 'get_matched')}>
                    {heroCtaLabel || 'Get matched, free →'}
                  </button>
                </div>

                {heroCardHasContent && heroCard && (
                  <aside className="wp-cpt-hero-card">
                    {heroCard.title && <h2 className="wp-cpt-hero-card-title">{heroCard.title}</h2>}
                    <ul className="wp-cpt-hero-card-list">
                      {heroCard.funding_text && <li>{heroCard.funding_text}</li>}
                      {heroCard.availability_text && <li>{heroCard.availability_text}</li>}
                      {heroCard.response_text && <li>{heroCard.response_text}</li>}
                    </ul>
                    {heroCard.cta_label && (
                      <button type="button" className="btn-gradient wp-cpt-hero-card-cta" onClick={() => act(heroCard.cta_url || 'get_matched')}>
                        {heroCard.cta_label}
                      </button>
                    )}
                  </aside>
                )}
              </div>
            </section>

            {/* Native WordPress editor content — the bulk of unique
                per-service educational writing belongs here as rich
                text with natural headings, not broken into dozens of
                separate structured fields. The wrapper carries the
                #wp-cpt-overview anchor the "On this page" list links
                to (it previously pointed at nothing). */}
            <div id="wp-cpt-overview">
              <WordPressTemplate loading={false} error="" content={content} hideDefaultTitle />
            </div>

            {(overviewHeading || overviewContent || whoFor) && (
              <section id="wp-cpt-overview-extra" className="wp-cpt-section">
                {overviewHeading && <h2>{overviewHeading}</h2>}
                {overviewContent && <p>{overviewContent}</p>}
                {whoFor && (
                  <>
                    <h3>Who is this service for?</h3>
                    <p>{whoFor}</p>
                  </>
                )}
              </section>
            )}

            {glanceRows.length > 0 && (
              <section id="wp-cpt-glance" className="wp-cpt-section">
                <h2>At a glance</h2>
                <div className="wp-cpt-glance-table">
                  {glanceRows.map(([label, value]) => (
                    <div key={label} className="wp-cpt-glance-row">
                      <span>{label}</span>
                      <span className="wp-cpt-glance-value">{value}</span>
                    </div>
                  ))}
                </div>
                {howToPay && <p className="wp-cpt-howtopay">{howToPay}</p>}
              </section>
            )}

            {eligibility && (
              <section id="wp-cpt-eligibility" className="wp-cpt-section">
                <h2>Eligibility</h2>
                <p>{eligibility}</p>
              </section>
            )}

            {(fundingInfo || planManagementInfo) && (
              <section id="wp-cpt-funding" className="wp-cpt-section">
                <h2>Funding</h2>
                {fundingInfo && <p>{fundingInfo}</p>}
                {planManagementInfo && <p>{planManagementInfo}</p>}
              </section>
            )}

            {hasRelatedProviders && (
              <section id="wp-cpt-providers" className="wp-cpt-section">
                <h2>{finderHeading}</h2>
                {finderDescription && <p className="wp-cpt-finder-desc">{finderDescription}</p>}
                {finderShowCount && <p className="wp-cpt-showing">Showing {providers.length} of {providersTotal} real registered providers</p>}
                {finderShowMap && (
                  <div style={{ marginBottom: 20 }}>
                    <ProviderMap
                      providers={providers.map((p) => ({
                        id: p.id,
                        name: p.tradingName || p.legalEntityName,
                        location: p.location,
                        category: p.registrationGroups[0] ?? null,
                        suburb: p.serviceSuburbs[0] ?? null,
                        href: p.slug ? `/providers/${p.slug}` : null,
                      }))}
                    />
                  </div>
                )}
                <div className="wp-cpt-provider-grid">
                  {providers.map((p) => (
                    <Link key={p.id} to={p.slug ? `/providers/${p.slug}` : '/find-providers'} className="wp-cpt-provider-card">
                      {p.tradingName || p.legalEntityName}
                    </Link>
                  ))}
                </div>
                <button type="button" className="btn-gradient" style={{ marginTop: 16 }} onClick={() => openMatchModal()}>{finderCtaLabel}</button>
              </section>
            )}

            {regulatorCards.length > 0 && (
              <section id="wp-cpt-regulations" className="wp-cpt-section">
                <h2>{regulationsHeading || 'Regulations & compliance'}</h2>
                {regulationsIntro && <p>{regulationsIntro}</p>}
                <div className="wp-cpt-regulator-grid">
                  {regulatorCards.map((r) => (
                    <div key={r.title} className="wp-cpt-regulator-card">
                      <p className="wp-cpt-regulator-title">{r.title}</p>
                      {r.description && <p>{r.description}</p>}
                      {r.phone && <p>Phone: <a href={`tel:${r.phone.replace(/\s+/g, '')}`}>{r.phone}</a></p>}
                      {r.website && (
                        <p>
                          <a href={/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer">
                            {r.cta || r.website}
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {credentials.length > 0 && (
              <section id="wp-cpt-credentials" className="wp-cpt-section">
                <h2>Checking credentials</h2>
                <ol className="wp-cpt-credentials-list">
                  {credentials.map((c, i) => (
                    <li key={c.title}>
                      <span className="wp-cpt-credentials-num">{i + 1}</span>
                      <div>
                        <p className="wp-cpt-credentials-title">{c.title}</p>
                        {c.description && <p>{c.description}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {relatedServices.length > 0 && (
              <section id="wp-cpt-related" className="wp-cpt-section">
                <h2>Related services</h2>
                <div className="wp-cpt-provider-grid">
                  {relatedServices.map((s) => (
                    <Link key={s.id} to={s.url} className="wp-cpt-provider-card">
                      {s.featuredImage && <img src={s.featuredImage} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
                      {s.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section id="wp-cpt-faq" className="wp-cpt-section">
                <h2>Frequently asked questions</h2>
                <div className="wp-cpt-faq-list">
                  {faqs.map((f, i) => (
                    <details key={i} className="wp-cpt-faq-item">
                      <summary>{f.question}</summary>
                      <p>{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            <section id="wp-cpt-cta" className="wp-cpt-cta">
              <h2>{ctaHeading || 'Ready to find the right support?'}</h2>
              <p>{ctaDescription || "Tell us what you need and we'll help connect you with suitable providers — free."}</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn-gradient" onClick={() => act(ctaPrimaryAction || 'get_matched')}>
                  {ctaPrimaryLabel || 'Get matched, free →'}
                </button>
                {ctaSecondaryLabel && (
                  <button type="button" className="wp-cpt-cta-secondary" onClick={() => act(ctaSecondaryAction || 'get_matched')}>
                    {ctaSecondaryLabel}
                  </button>
                )}
              </div>
            </section>
          </main>
        </div>
      ) : (
        <WordPressTemplate loading={loading} error={error} content={content} />
      )}

      <PublicFooter />
    </>
  );
}
