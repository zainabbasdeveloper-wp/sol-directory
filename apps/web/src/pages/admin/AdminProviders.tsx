import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProvidersAdmin, setProviderAccountStatus, setProviderListingPaused } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

interface AdminProviderRow {
  id: string;
  legalEntityName: string;
  tradingName: string;
  abn: string;
  plan: string;
  intakeStatus: string;
  accountStatus: 'active' | 'suspended';
  listingPaused: boolean;
  lastCapacityConfirmedAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
}

export default function AdminProviders() {
  const [items, setItems] = useState<AdminProviderRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'paused'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const showToast = useToast();

  useEffect(() => {
    setLoading(true);
    listProvidersAdmin(statusFilter === 'all' ? undefined : statusFilter)
      .then((res) => setItems(res.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load providers.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function toggleStatus(row: AdminProviderRow) {
    const next = row.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdatingId(row.id);
    try {
      await setProviderAccountStatus(row.id, next);
      setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, accountStatus: next } : p)));
      showToast(next === 'suspended' ? `${row.tradingName || row.legalEntityName} suspended.` : `${row.tradingName || row.legalEntityName} reactivated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this provider.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleListing(row: AdminProviderRow) {
    const nextPaused = !row.listingPaused;
    setUpdatingId(row.id);
    try {
      await setProviderListingPaused(row.id, nextPaused);
      // On the "Paused" tab a resumed provider no longer belongs in the list.
      setItems((prev) => statusFilter === 'paused' && !nextPaused
        ? prev.filter((p) => p.id !== row.id)
        : prev.map((p) => (p.id === row.id ? { ...p, listingPaused: nextPaused } : p)));
      showToast(nextPaused ? `${row.tradingName || row.legalEntityName}'s listing paused.` : `${row.tradingName || row.legalEntityName}'s listing resumed.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this listing.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Providers</h1>
        <div className="admin-providers-filter">
          {(['all', 'active', 'paused', 'suspended'] as const).map((s) => (
            <button
              key={s}
              className={`admin-filter-pill ${statusFilter === s ? 'admin-filter-pill-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'active' ? 'Active' : s === 'paused' ? 'Paused' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-providers-table">
          <div className="admin-providers-row admin-providers-row-head">
            <span>Organisation</span>
            <span>Owner</span>
            <span>Plan</span>
            <span>Status</span>
            <span></span>
          </div>
          {items.map((p) => (
            <div key={p.id} className="admin-providers-row">
              <span>
                <Link to={`/admin/providers/${p.id}`} className="admin-providers-org-link">
                  {p.tradingName || p.legalEntityName || 'Unnamed provider'}
                </Link>
                <span className="admin-providers-abn">{p.abn || 'No ABN on file'}</span>
              </span>
              <span>
                {p.ownerName ?? '—'}
                <span className="admin-providers-owner-email">{p.ownerEmail ?? ''}</span>
              </span>
              <span className="admin-providers-plan">{p.plan}</span>
              <span>
                <span className={`admin-status-pill admin-status-pill-${p.accountStatus}`}>{p.accountStatus}</span>
                {p.accountStatus === 'active' && p.listingPaused && (
                  <span
                    className="admin-status-pill admin-status-pill-paused"
                    title={p.lastCapacityConfirmedAt ? `Last confirmed ${new Date(p.lastCapacityConfirmedAt).toLocaleDateString('en-AU')}` : 'Never confirmed capacity'}
                  >
                    paused
                  </span>
                )}
              </span>
              <span>
                {p.accountStatus === 'active' && p.listingPaused && (
                  <button
                    className="admin-toggle-btn admin-toggle-btn-activate"
                    disabled={updatingId === p.id}
                    onClick={() => toggleListing(p)}
                    style={{ marginRight: 8 }}
                  >
                    Resume listing
                  </button>
                )}
                <button
                  className={`admin-toggle-btn ${p.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
                  disabled={updatingId === p.id}
                  onClick={() => toggleStatus(p)}
                >
                  {updatingId === p.id ? 'Saving…' : p.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="admin-providers-empty">No providers match this filter.</p>}
        </div>
      )}
    </div>
  );
}
