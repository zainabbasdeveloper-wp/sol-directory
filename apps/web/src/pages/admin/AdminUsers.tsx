import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listUsersAdmin, setUserAccountStatus, type AdminUserRow } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

export default function AdminUsers() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | 'coordinator' | 'participant'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const showToast = useToast();

  useEffect(() => {
    setLoading(true);
    listUsersAdmin(roleFilter === 'all' ? undefined : roleFilter, statusFilter === 'all' ? undefined : statusFilter)
      .then((res) => setItems(res.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load users.'))
      .finally(() => setLoading(false));
  }, [roleFilter, statusFilter]);

  async function toggleStatus(row: AdminUserRow) {
    const next = row.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdatingId(row.id);
    try {
      await setUserAccountStatus(row.id, next);
      setItems((prev) => prev.map((u) => (u.id === row.id ? { ...u, accountStatus: next } : u)));
      showToast(next === 'suspended' ? `${row.name} suspended.` : `${row.name} reactivated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this account.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Coordinators &amp; Participants</h1>
        <div className="admin-providers-filter-group">
          <div className="admin-providers-filter">
            {(['all', 'coordinator', 'participant'] as const).map((r) => (
              <button
                key={r}
                className={`admin-filter-pill ${roleFilter === r ? 'admin-filter-pill-active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? 'All roles' : r === 'coordinator' ? 'Coordinators' : 'Participants'}
              </button>
            ))}
          </div>
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
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-providers-table">
          <div className="admin-providers-row admin-providers-row-head">
            <span>Name</span>
            <span>Contact</span>
            <span>Role</span>
            <span>Status</span>
            <span></span>
          </div>
          {items.map((u) => (
            <div key={u.id} className="admin-providers-row">
              <span>
                <Link to={`/admin/users/${u.id}`} className="admin-providers-org-link">{u.name}</Link>
              </span>
              <span>
                {u.email}
                <span className="admin-providers-owner-email">{u.mobile ?? ''}</span>
              </span>
              <span className="admin-providers-plan" style={{ textTransform: 'capitalize' }}>{u.role}</span>
              <span>
                <span className={`admin-status-pill admin-status-pill-${u.accountStatus}`}>{u.accountStatus}</span>
              </span>
              <span>
                <button
                  className={`admin-toggle-btn ${u.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
                  disabled={updatingId === u.id}
                  onClick={() => toggleStatus(u)}
                >
                  {updatingId === u.id ? 'Saving…' : u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </span>
            </div>
          ))}
          {items.length === 0 && <p className="admin-providers-empty">No accounts match this filter.</p>}
        </div>
      )}
    </div>
  );
}
