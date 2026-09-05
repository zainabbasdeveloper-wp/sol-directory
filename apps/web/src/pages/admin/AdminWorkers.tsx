import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWorkersAdmin, setWorkerAccountStatus, type AdminWorkerRow } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

export default function AdminWorkers() {
  const [items, setItems] = useState<AdminWorkerRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const showToast = useToast();

  useEffect(() => {
    setLoading(true);
    listWorkersAdmin(statusFilter === 'all' ? undefined : statusFilter)
      .then((res) => setItems(res.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load workers.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  async function toggleStatus(row: AdminWorkerRow) {
    const next = row.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdatingId(row.id);
    try {
      await setWorkerAccountStatus(row.id, next);
      setItems((prev) => prev.map((w) => (w.id === row.id ? { ...w, accountStatus: next } : w)));
      showToast(next === 'suspended' ? `${row.firstName} ${row.lastName} suspended.` : `${row.firstName} ${row.lastName} reactivated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this worker.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Workers</h1>
        <div className="admin-providers-filter">
          {(['all', 'active', 'suspended'] as const).map((s) => (
            <button
              key={s}
              className={`admin-filter-pill ${statusFilter === s ? 'admin-filter-pill-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-providers-table">
          <div className="admin-providers-row admin-providers-row-head">
            <span>Worker</span>
            <span>Account email</span>
            <span>Verification</span>
            <span>Status</span>
            <span></span>
          </div>
          {items.map((w) => (
            <div key={w.id} className="admin-providers-row">
              <span>
                <Link to={`/admin/workers/${w.id}`} className="admin-providers-org-link">
                  {w.firstName} {w.lastName}
                </Link>
                <span className="admin-providers-abn">{w.suburb || 'No suburb on file'} · {w.role || 'No role set'}</span>
              </span>
              <span>
                {w.ownerName ?? '—'}
                <span className="admin-providers-owner-email">{w.ownerEmail ?? ''}</span>
              </span>
              <span className="admin-providers-plan">{w.verificationStatus.replace('_', ' ')}</span>
              <span>
                <span className={`admin-status-pill admin-status-pill-${w.accountStatus}`}>{w.accountStatus}</span>
              </span>
              <span>
                <button
                  className={`admin-toggle-btn ${w.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
                  disabled={updatingId === w.id}
                  onClick={() => toggleStatus(w)}
                >
                  {updatingId === w.id ? 'Saving…' : w.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="admin-providers-empty">No workers match this filter.</p>}
        </div>
      )}
    </div>
  );
}
