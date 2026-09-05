import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyShortlist, removeFromShortlist, type ShortlistItem } from '../../api/providerResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import ProviderDetailModal from '../../components/ProviderDetailModal';
import './ProviderDirectory.css';

export default function SavedProviders() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    listMyShortlist()
      .then((r) => setItems(r.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load your shortlist.'))
      .finally(() => setLoading(false));
  }, []);

  async function remove(providerId: string) {
    try {
      await removeFromShortlist(providerId);
      setItems((prev) => prev.filter((i) => i.provider.id !== providerId));
      showToast('Provider removed from your shortlist.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not remove this provider.');
    }
  }

  return (
    <div className="pd-page">
      <h1 className="pd-heading">Saved providers</h1>
      <p style={{ marginTop: -14, marginBottom: 24, color: 'var(--color-text-muted, #5A6B84)', fontSize: 14 }}>
        Providers you've shortlisted for future reference.
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', border: '1px dashed var(--color-border-strong, #DDE4EF)', borderRadius: 14 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>You haven't shortlisted any providers yet.</p>
          <p style={{ color: 'var(--color-text-muted, #5A6B84)', marginBottom: 20 }}>Browse providers to find services that suit your needs.</p>
          <button className="pd-view-link" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 14 }} onClick={() => navigate('/find-providers')}>Find providers →</button>
        </div>
      ) : (
        <div className="pd-grid">
          {items.map(({ provider }) => (
            <div key={provider.id} className="pd-card" style={{ cursor: 'default' }}>
              <h3 className="pd-card-name">{provider.tradingName || provider.legalEntityName}</h3>
              <p className="pd-card-suburbs">{provider.serviceSuburbs.join(', ') || 'No suburbs listed'}</p>
              <p className="pd-card-suburbs">{provider.intakeStatus}</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                <button className="pd-view-link" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setOpenId(provider.id)}>View profile →</button>
                <button style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12.5, color: '#B4232F' }} onClick={() => remove(provider.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openId && (
        <ProviderDetailModal
          providerId={openId}
          onClose={() => setOpenId(null)}
          onShortlistChange={(id, shortlisted) => { if (!shortlisted) setItems((prev) => prev.filter((i) => i.provider.id !== id)); }}
        />
      )}
    </div>
  );
}
