import { useEffect, useState } from 'react';
import { listProviders, listMyShortlist, type ProviderRow } from '../../api/providerResources';
import { listActiveServices, type ActiveService } from '../../api/serviceCatalogue';
import { ApiError } from '../../api/client';
import ProviderDetailModal from '../../components/ProviderDetailModal';
import ProviderMap from '../../components/ProviderMap';
import './ProviderDirectory.css';

export default function ProviderDirectory() {
  const [items, setItems] = useState<ProviderRow[]>([]);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('');
  const [suburb, setSuburb] = useState('');
  const [serviceOptions, setServiceOptions] = useState<ActiveService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listMyShortlist().then((r) => setShortlistedIds(new Set(r.items.map((i) => i.provider.id)))).catch(() => {});
    listActiveServices('provider').then((res) => setServiceOptions(res.items)).catch(() => {});
  }, []);

  // Filters drive one real query, whose result feeds BOTH the card
  // grid and the map (map receives `items` directly below) — so
  // "filters update both results and map markers" is true by
  // construction, not two separate code paths that could drift out
  // of sync with each other.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      listProviders({ q: query, service: service || undefined, suburb: suburb || undefined })
        .then((res) => setItems(res.items))
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load providers.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, service, suburb]);

  function handleShortlistChange(providerId: string, shortlisted: boolean) {
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (shortlisted) next.add(providerId); else next.delete(providerId);
      return next;
    });
  }

  const withLocationCount = items.filter((p) => p.location).length;

  return (
    <div className="pd-page">
      <h1 className="pd-heading">Find providers</h1>

      <div className="pd-filter-row">
        <input className="pd-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" />
        <select className="pd-select" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">All services</option>
          {serviceOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <input className="pd-select" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb" />
      </div>

      {error && <p className="pd-error">{error}</p>}

      {!loading && (
        <p className="pd-result-count">
          {items.length} provider{items.length === 1 ? '' : 's'} found
          {withLocationCount > 0 && withLocationCount < items.length ? ` · ${withLocationCount} shown on map` : ''}
        </p>
      )}

      {!loading && items.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <ProviderMap
            providers={items.map((p) => ({
              id: p.id,
              name: p.tradingName || p.legalEntityName,
              location: p.location,
              category: p.registrationGroups[0] ?? null,
              suburb: p.serviceSuburbs[0] ?? null,
              href: p.slug ? `/providers/${p.slug}` : null,
            }))}
            selectedProviderId={openId}
            onMarkerClick={(id) => setOpenId(id)}
          />
        </div>
      )}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="pd-grid">
          {items.map((p) => (
            <button key={p.id} className="pd-card" onClick={() => setOpenId(p.id)}>
              {shortlistedIds.has(p.id) && <span className="pd-shortlisted-badge">✓ Shortlisted</span>}
              {p.logoUrl && <img className="pd-card-logo" src={p.logoUrl} alt="" />}
              <h3 className="pd-card-name">{p.tradingName || p.legalEntityName}</h3>
              <p className="pd-card-suburbs">{p.serviceSuburbs.join(', ') || 'No suburbs listed'}</p>
              <div className="pd-card-chips">
                {p.registrationGroups.slice(0, 3).map((g) => <span key={g} className="pd-chip">{g}</span>)}
              </div>
              <span className="pd-view-link">View profile →</span>
            </button>
          ))}
          {items.length === 0 && (
            <div className="pd-empty-state">
              <p>No providers found.</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted, #5A6B84)' }}>Try removing a filter or broadening your search.</p>
            </div>
          )}
        </div>
      )}

      {openId && (
        <ProviderDetailModal providerId={openId} onClose={() => setOpenId(null)} onShortlistChange={handleShortlistChange} />
      )}
    </div>
  );
}
