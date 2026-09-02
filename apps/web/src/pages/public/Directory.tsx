import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { PROVIDERS, SERVICES, REGIONS, FUNDINGS, type Provider } from '../../data/providers';
import '../public/Home.css';
import './Directory.css';

function ProviderDetailModal({ provider, onClose }: { provider: Provider; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-code">{provider.code}</span>
          <button className="modal-close" onClick={onClose}>
            Close ✕
          </button>
        </div>
        <h3 className="modal-title">{provider.name}</h3>
        <p className="modal-detail">{provider.detail}</p>
        <dl className="modal-dl">
          <dt>Area</dt>
          <dd>{provider.area}</dd>
          <dt>Funding</dt>
          <dd>{provider.funding}</dd>
          <dt>Responds</dt>
          <dd>{provider.response}</dd>
          <dt>Languages</dt>
          <dd>{provider.languages}</dd>
          <dt>Status</dt>
          <dd>{provider.status}</dd>
        </dl>
        <div className="modal-actions">
          <button className="btn-gradient" onClick={onClose}>
            Request a call back
          </button>
          <button className="btn-tint" onClick={onClose}>
            Add to shortlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Directory() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [service, setService] = useState(searchParams.get('service') ?? 'All services');
  const [region, setRegion] = useState('All states');
  const [funding, setFunding] = useState('Any funding');
  const [selected, setSelected] = useState<Provider | null>(null);

  const results = useMemo(() => {
    return PROVIDERS.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query.toLowerCase()) && !p.blurb.toLowerCase().includes(query.toLowerCase())) return false;
      if (service !== 'All services' && !p.services.includes(service)) return false;
      if (region !== 'All states' && p.state !== region) return false;
      if (funding !== 'Any funding' && !p.funding.toLowerCase().includes(funding.toLowerCase().replace('agency managed', 'agency').replace('plan managed', 'plan').replace('self managed', 'self'))) return false;
      return true;
    });
  }, [query, service, region, funding]);

  function reset() {
    setQuery('');
    setService('All services');
    setRegion('All states');
    setFunding('Any funding');
  }

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            The directory
          </span>
          <h1 className="section-heading section-heading-light">Providers with capacity this month</h1>
          <p className="directory-page-subtitle">
            Filter the list, open a profile, then contact the provider directly. We take
            no commission on any connection.
          </p>
        </div>
      </div>

      <section className="directory-section">
        <div className="filter-card">
          <div className="filter-grid">
            <label className="filter-label-block">
              <span className="filter-label-text">Keyword</span>
              <input
                type="search"
                placeholder="Provider name or specialty"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="filter-input"
              />
            </label>
            <label className="filter-label-block">
              <span className="filter-label-text">Service</span>
              <select value={service} onChange={(e) => setService(e.target.value)} className="filter-input">
                {SERVICES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="filter-label-block">
              <span className="filter-label-text">State</span>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="filter-input">
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="filter-label-block">
              <span className="filter-label-text">Funding</span>
              <select value={funding} onChange={(e) => setFunding(e.target.value)} className="filter-input">
                {FUNDINGS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <button className="btn-gradient" onClick={reset}>
              Clear filters
            </button>
          </div>
        </div>

        <div className="results-header">
          <span className="results-count">{results.length} providers matching your filters</span>
          <span className="results-sort">Sorted by response time</span>
        </div>

        <div className="provider-grid">
          {results.map((p) => (
            <article key={p.code} role="button" tabIndex={0} className="provider-card" onClick={() => setSelected(p)}>
              <div className="provider-card-top">
                <span className="provider-code">{p.code}</span>
                <span className="provider-status">{p.status}</span>
              </div>
              <h3 className="provider-name">{p.name}</h3>
              <p className="provider-blurb">{p.blurb}</p>
              <div className="provider-services">
                {p.services.map((s) => (
                  <span key={s} className="provider-service-chip">
                    {s}
                  </span>
                ))}
              </div>
              <dl className="provider-dl">
                <dt>Area</dt>
                <dd>{p.area}</dd>
                <dt>Responds</dt>
                <dd>{p.response}</dd>
                <dt>Funding</dt>
                <dd>{p.funding}</dd>
              </dl>
              <button
                className="link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                }}
              >
                View profile →
              </button>
            </article>
          ))}
        </div>

        {results.length === 0 && (
          <div className="empty-state">
            <p>No providers match those filters yet.</p>
            <button className="btn-gradient" onClick={reset}>
              Show all providers
            </button>
          </div>
        )}
      </section>

      <PublicFooter />

      {selected && <ProviderDetailModal provider={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
