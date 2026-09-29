import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Pagination from '../../components/ui/Pagination';
import { Breadcrumbs } from './register/RegisterParts';
import { ProviderCardItem } from './ProviderListingPage';
import { listProvidersBy, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import { fundingBySlug, FUNDING_CATEGORY_GROUPS, FUNDING_CONTENT, type FundingContent } from '../../data/fundingContent';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
const fmt = (n: number) => n.toLocaleString('en-AU');

/**
 * /funding/:slug — one of the 25 funding topics from the mega menu's
 * "Funding" tab (data/fundingContent.ts). Only the 3 NDIS
 * plan-management-style topics (fundingFilter set) actually have a
 * matching Provider field, so only those show a real provider list —
 * every other topic is honest general-information content plus a link
 * to the main directory, never a fake or empty "0 providers" section
 * for something SolDirectory doesn't actually track.
 */
export default function FundingTopicPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const meta = fundingBySlug(slug);
  const { openMatchModal } = useMatchModal();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const topRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<PublicProviderCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(!!meta?.fundingFilter);

  useEffect(() => {
    if (!meta?.fundingFilter) return;
    let alive = true;
    setLoading(true);
    listProvidersBy({ funding: meta.fundingFilter, page, limit: PAGE_SIZE })
      .then((r) => { if (alive) { setItems(r.items); setTotal(r.total); } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.fundingFilter, page]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  useEffect(() => {
    if (!meta) {
      applySeoTags({ title: 'Page not found | SolDirectory', description: 'This page could not be found.', noindex: true });
      return;
    }
    applySeoTags({
      title: `${meta.name} | Funding | SolDirectory`,
      description: meta.summary.slice(0, 155).replace(/\s+\S*$/, '') + '…',
      canonicalUrl: `${window.location.origin}/funding/${meta.slug}`,
      // Only indexable once there's either real provider data behind it,
      // or — for the informational-only topics — always, since the
      // content itself is the real, useful thing on those pages.
      noindex: !!meta.fundingFilter && total === 0,
    });
    setJsonLd('funding-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Funding', item: `${window.location.origin}/funding` },
        { '@type': 'ListItem', position: 3, name: meta.name, item: `${window.location.origin}/funding/${meta.slug}` },
      ],
    });
    return () => setJsonLd('funding-breadcrumbs', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, total]);

  if (!meta) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty">
            <h1>We couldn’t find that page</h1>
            <p>This funding topic doesn’t exist.</p>
            <Link className="btn-gradient" to="/funding">Browse funding topics</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const group = FUNDING_CATEGORY_GROUPS.find((g) => g.title === meta.categoryGroup);
  const siblings = (group?.items ?? []).filter((f) => f.slug !== meta.slug);

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Funding', to: '/funding' }, { label: meta.name }]} />
        <h1 className="pp-head-h1" ref={topRef as never}>{meta.name}</h1>
        <p className="reg-lede">{meta.summary}</p>
        <p className="reg-note">
          This is general information, not financial or funding advice. Program names, amounts and eligibility rules change over
          time — always confirm current detail with the relevant official body before relying on it.
        </p>

        {meta.fundingFilter ? (
          <section id="providers" style={{ marginTop: 32 }}>
            <h2 className="reg-h2" style={{ marginTop: 0 }}>Providers who accept {meta.name.toLowerCase()} funding</h2>
            <p className="reg-lede" style={{ marginBottom: 14 }}>
              {!loading
                ? `${fmt(total)} ${total === 1 ? 'provider' : 'providers'} on SolDirectory ${total === 1 ? 'accepts' : 'accept'} ${meta.name.toLowerCase()} funding. Providers write their own profiles — confirm details with them directly.`
                : 'Loading…'}
            </p>

            {!loading && items.length === 0 ? (
              <div className="dir-empty">
                <h2>No providers currently list this</h2>
                <p>No providers on SolDirectory currently list {meta.name.toLowerCase()} as funding they accept. Submit a free enquiry and we’ll notify suitable providers as they join.</p>
                <div className="dir-empty-actions">
                  <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
                </div>
              </div>
            ) : (
              <ul className="dir-grid" aria-busy={loading}>
                {items.map((p) => <ProviderCardItem key={p.id} p={p} />)}
              </ul>
            )}

            <Pagination
              page={page} totalPages={totalPages} disabled={loading}
              onChange={(n) => { setParams(n > 1 ? { page: String(n) } : {}); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            />
          </section>
        ) : (
          <div className="reg-note">
            SolDirectory doesn’t currently track which providers work with {meta.name.toLowerCase()} specifically — this page is
            general information only. <Link to="/directory">Browse all providers</Link> and ask directly, or{' '}
            <button type="button" className="link-btn" onClick={() => openMatchModal()}>submit a free enquiry</button> and mention it.
          </div>
        )}

        {siblings.length > 0 && (
          <section id="related-funding">
            <h2 className="reg-h2">Other topics in {meta.categoryGroup}</h2>
            <ul className="reg-linkgrid">
              {siblings.map((f) => (
                <li key={f.slug}><Link to={`/funding/${f.slug}`}><span>{f.name}</span></Link></li>
              ))}
            </ul>
          </section>
        )}

        <div className="reg-cta" style={{ marginTop: 32 }}>
          <div>
            <strong>Not sure what funding applies to you?</strong>
            <span>Tell us your situation and we’ll connect you with providers who can help you work it out — free, no obligation.</span>
          </div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}

/** /funding — every funding topic, grouped the same way the mega menu groups them. */
export function FundingHubPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    applySeoTags({
      title: 'NDIS, aged care, DVA and private funding explained | SolDirectory',
      description: 'General information on NDIS plan management, aged care programs, DVA funding, Medicare and private options — and which providers accept each, where SolDirectory tracks it.',
      canonicalUrl: `${window.location.origin}/funding`,
    });
  }, []);

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Funding' }]} />
        <h1 className="pp-head-h1">Funding, explained</h1>
        <p className="reg-lede">
          General information on how different funding types work — NDIS plan management, aged care programs, DVA support, and
          private options. Not financial advice; always confirm current detail with the relevant official body.
        </p>
        {FUNDING_CATEGORY_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="reg-h2">{group.title}</h2>
            <ul className="reg-linkgrid">
              {group.items.map((f: FundingContent) => (
                <li key={f.slug}><Link to={`/funding/${f.slug}`}><span>{f.name}</span></Link></li>
              ))}
            </ul>
          </section>
        ))}
        <p className="reg-note" style={{ marginTop: 24 }}>{FUNDING_CONTENT.length} funding topics covered.</p>
      </main>
      <PublicFooter />
    </>
  );
}
