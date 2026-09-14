import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCPTItem, type WPCPTItem } from '../../api/wordpressApi';
import { listProviders, type ProviderRow } from '../../api/providerResources';
import { useMatchModal } from '../../context/MatchModalContext';
import { PublicHeader, PublicFooter } from '../public/PublicLayout';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';
import type { CPTRouteConfig } from '../../lib/cptRouteConfig';
import './WordPressCPTPage.css';

interface FAQItem { question: string; answer: string }

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

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

  if (!loading && !error && notFound) return (<><PublicHeader /><NotFound /><PublicFooter /></>);

  const eligibility = typeof content?.meta.eligibility === 'string' ? content.meta.eligibility : '';
  const fundingInfo = typeof content?.meta.funding_info === 'string' ? content.meta.funding_info : '';
  const faqs = content ? safeParseJson<FAQItem[]>(content.meta.faq_json, []) : [];
  const hasRelatedProviders = config.showRelatedProviders && providers.length > 0;

  // Real TOC — only lists sections that actually have content to show.
  // A link to an empty section would be a dead anchor, which is worse
  // than not showing that TOC entry at all.
  const tocItems: { href: string; label: string }[] = [];
  if (content) {
    tocItems.push({ href: '#wp-cpt-overview', label: 'Overview' });
    if (eligibility) tocItems.push({ href: '#wp-cpt-eligibility', label: 'Eligibility' });
    if (fundingInfo) tocItems.push({ href: '#wp-cpt-funding', label: 'Funding' });
    if (hasRelatedProviders) tocItems.push({ href: '#wp-cpt-providers', label: 'Providers in this area' });
    if (faqs.length > 0) tocItems.push({ href: '#wp-cpt-faq', label: 'Frequently asked questions' });
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
            <WordPressTemplate loading={loading} error={error} content={content}>
              <nav className="wp-cpt-breadcrumb" aria-label="Breadcrumb">
                <Link to="/">Home</Link>
                <span aria-hidden="true"> / </span>
                <Link to={`/${config.pathPrefix}`} style={{ textTransform: 'capitalize' }}>{config.pathPrefix}</Link>
                <span aria-hidden="true"> / </span>
                <span>{content.title}</span>
              </nav>

              <div id="wp-cpt-overview" />

              {eligibility && (
                <section id="wp-cpt-eligibility" className="wp-cpt-section">
                  <h2>Eligibility</h2>
                  <p>{eligibility}</p>
                </section>
              )}

              {fundingInfo && (
                <section id="wp-cpt-funding" className="wp-cpt-section">
                  <h2>Funding</h2>
                  <p>{fundingInfo}</p>
                </section>
              )}

              {hasRelatedProviders && (
                <section id="wp-cpt-providers" className="wp-cpt-section">
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
                <h2>Ready to find the right support?</h2>
                <p>Tell us what you need and we'll help connect you with suitable providers — free.</p>
                <button className="btn-gradient" onClick={openMatchModal}>Get matched, free →</button>
              </section>
            </WordPressTemplate>
          </main>
        </div>
      ) : (
        <WordPressTemplate loading={loading} error={error} content={content} />
      )}

      <PublicFooter />
    </>
  );
}
