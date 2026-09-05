import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserAdmin, setUserAccountStatus, type AdminUserRow } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

export default function AdminUserDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    getUserAdmin(id)
      .then(setUser)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load this account.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleStatus() {
    if (!user) return;
    const next = user.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdating(true);
    try {
      await setUserAccountStatus(user.id, next);
      setUser({ ...user, accountStatus: next });
      showToast(next === 'suspended' ? 'Account suspended.' : 'Account reactivated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this account.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!user) return <p>Account not found. <Link to="/admin/users">Back to list</Link></p>;

  return (
    <div className="admin-providers-page">
      <Link to="/admin/users" className="admin-providers-back">← All coordinators &amp; participants</Link>
      <div className="admin-providers-header">
        <div>
          <h1 className="page-title">{user.name}</h1>
          <span className={`admin-status-pill admin-status-pill-${user.accountStatus}`}>{user.accountStatus}</span>
        </div>
        <button
          className={`admin-toggle-btn ${user.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
          disabled={updating}
          onClick={toggleStatus}
        >
          {updating ? 'Saving…' : user.accountStatus === 'active' ? 'Suspend account' : 'Reactivate account'}
        </button>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Contact</h2>
          <p>{user.email}</p>
          <p>{user.mobile ?? 'No mobile on file'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Account</h2>
          <p style={{ textTransform: 'capitalize' }}>{user.role}</p>
          <p>Joined {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
