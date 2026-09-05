import { useEffect, useState } from 'react';
import { listProviders, listMyShortlist, type ProviderRow } from '../../api/providerResources';
import { ApiError } from '../../api/client';
import ProviderDetailModal from '../../components/ProviderDetailModal';
import './ProviderDirectory.css';

export default function ProviderDirectory() {
  const [items, setItems] = useState<ProviderRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  // Kept at page level so a card's shortlist indicator stays in sync
  // with whatever the modal just did, without a full reload.
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listMyShortlist().then((r) => setShortlistedIds(new Set(r.items.map((i) => i.provider.id)))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      listProviders({ q: query })
        .then((res) => setItems(res.items))
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load providers.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function handleShortlistChange(providerId: string, shortlisted: boolean) {
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (shortlisted) next.add(providerId); else next.delete(providerId);
      return next;
    });
  }

  return (
    <div className="pd-page">
      <h1 className="pd-heading">Find providers</h1>
      <input className="pd-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" />

      {error && <p className="pd-error">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="pd-grid">
          {items.map((p) => (
            <button key={p.id} className="pd-card" onClick={() => setOpenId(p.id)}>
              {shortlistedIds.has(p.id) && <span className="pd-shortlisted-badge">✓ Shortlisted</span>}
              <h3 className="pd-card-name">{p.tradingName || p.legalEntityName}</h3>
              <p className="pd-card-suburbs">{p.serviceSuburbs.join(', ') || 'No suburbs listed'}</p>
              <div className="pd-card-chips">
                {p.registrationGroups.slice(0, 3).map((g) => <span key={g} className="pd-chip">{g}</span>)}
              </div>
              <span className="pd-view-link">View profile →</span>
            </button>
          ))}
          {items.length === 0 && <p>No providers found.</p>}
        </div>
      )}

      {openId && (
        <ProviderDetailModal providerId={openId} onClose={() => setOpenId(null)} onShortlistChange={handleShortlistChange} />
      )}
    </div>
  );
}
