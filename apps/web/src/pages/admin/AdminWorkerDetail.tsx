import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWorkerAdmin, setWorkerAccountStatus } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

interface AdminWorkerDetailData {
  _id: string;
  firstName: string;
  lastName: string;
  role?: string;
  suburb?: string;
  services?: string[];
  hourlyRate?: number;
  verificationStatus: string;
  accountStatus: 'active' | 'suspended';
  published: boolean;
  clearances?: { name: string; status: string }[];
  userId?: { name: string; email: string; mobile?: string };
}

export default function AdminWorkerDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<AdminWorkerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    getWorkerAdmin(id)
      .then((data) => setWorker(data as unknown as AdminWorkerDetailData))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load this worker.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleStatus() {
    if (!worker) return;
    const next = worker.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdating(true);
    try {
      await setWorkerAccountStatus(worker._id, next);
      setWorker({ ...worker, accountStatus: next });
      showToast(next === 'suspended' ? 'Worker suspended.' : 'Worker reactivated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this worker.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!worker) return <p>Worker not found. <Link to="/admin/workers">Back to workers</Link></p>;

  return (
    <div className="admin-providers-page">
      <Link to="/admin/workers" className="admin-providers-back">← All workers</Link>
      <div className="admin-providers-header">
        <div>
          <h1 className="page-title">{worker.firstName} {worker.lastName}</h1>
          <span className={`admin-status-pill admin-status-pill-${worker.accountStatus}`}>{worker.accountStatus}</span>
        </div>
        <button
          className={`admin-toggle-btn ${worker.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
          disabled={updating}
          onClick={toggleStatus}
        >
          {updating ? 'Saving…' : worker.accountStatus === 'active' ? 'Suspend account' : 'Reactivate account'}
        </button>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Account</h2>
          <p>{worker.userId?.name ?? '—'}</p>
          <p>{worker.userId?.email ?? '—'}</p>
          <p>{worker.userId?.mobile ?? '—'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Profile</h2>
          <p>{worker.role || 'No role set'}</p>
          <p>{worker.suburb || 'No suburb set'}</p>
          <p>{worker.hourlyRate ? `$${worker.hourlyRate}/hr` : 'No rate set'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Verification</h2>
          <p style={{ textTransform: 'capitalize' }}>{worker.verificationStatus.replace('_', ' ')}</p>
          <p>{worker.published ? 'Published in directory' : 'Not published'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Clearances</h2>
          {worker.clearances?.length ? (
            <ul className="admin-onboarding-list">
              {worker.clearances.map((c, i) => (
                <li key={i}>{c.name} — {c.status}</li>
              ))}
            </ul>
          ) : (
            <p>None on file</p>
          )}
        </div>
      </div>
    </div>
  );
}
