import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCPTItem, type WPCPTItem } from '../../api/wordpressApi';
import { listProviders, type ProviderRow } from '../../api/providerResources';
import { useMatchModal } from '../../context/MatchModalContext';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';
import type { CPTRouteConfig } from '../../lib/cptRouteConfig';
import './WordPressCPTPage.css';

interface FAQItem { question: string; answer: string }

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

/**
 * ONE generic page for every CPT registered in cptRouteConfig.ts —
 * replaces three near-identical page components (WordPressServicePage/
 * WordPressGuidePage/WordPressLocationPage) that only differed by
 * which CPT they fetched and whether they showed related providers.
 * A new content type needs a config entry and this one route, not a
 * new component (spec item 6).
 *
 * Also implements the structured layout spec item 10 asked for —
 * breadcrumb, eligibility, funding info, FAQs, related providers,
 * Get Matched CTA — each rendered ONLY when the real WordPress data
 * for it actually exists. No fake content for empty fields.
 */
export default function WordPressCPTPage({ config }: { config: CPTRouteConfig }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const { openMatchModal } = useMatchModal();
  const [content, setContent] = useState<WPCPTItem | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
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
        if (config.showRelatedProviders) {
          return listProviders({ suburb: item.title }).then((res) => setProviders(res.items)).catch(() => {});
        }
      })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [config, slug]);

  if (!loading && !error && notFound) return <NotFound />;

  const eligibility = typeof content?.meta.eligibility === 'string' ? content.meta.eligibility : '';
  const fundingInfo = typeof content?.meta.funding_info === 'string' ? content.meta.funding_info : '';
  const faqs = content ? safeParseJson<FAQItem[]>(content.meta.faq_json, []) : [];

  return (
    <WordPressTemplate loading={loading} error={error} content={content}>
      {!loading && content && (
        <>
          <nav className="wp-cpt-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link to={`/${config.pathPrefix}`} style={{ textTransform: 'capitalize' }}>{config.pathPrefix}</Link>
            <span aria-hidden="true"> / </span>
            <span>{content.title}</span>
          </nav>

          {eligibility && (
            <section className="wp-cpt-section">
              <h2>Eligibility</h2>
              <p>{eligibility}</p>
            </section>
          )}

          {fundingInfo && (
            <section className="wp-cpt-section">
              <h2>Funding</h2>
              <p>{fundingInfo}</p>
            </section>
          )}

          {config.showRelatedProviders && providers.length > 0 && (
            <section className="wp-cpt-section">
              <h2>Providers in this area</h2>
              <div className="wp-cpt-provider-grid">
                {providers.slice(0, 6).map((p) => (
                  <Link key={p.id} to={p.slug ? `/providers/${p.slug}` : '/find-providers'} className="wp-cpt-provider-card">
                    {p.tradingName || p.legalEntityName}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {faqs.length > 0 && (
            <section className="wp-cpt-section">
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

          <section className="wp-cpt-cta">
            <h2>Ready to find the right support?</h2>
            <p>Tell us what you need and we'll help connect you with suitable providers — free.</p>
            <button className="btn-gradient" onClick={openMatchModal}>Get matched, free →</button>
          </section>
        </>
      )}
    </WordPressTemplate>
  );
}
