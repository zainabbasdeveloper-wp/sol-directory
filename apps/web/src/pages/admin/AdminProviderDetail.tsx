import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProviderAdmin, setProviderAccountStatus } from '../../api/adminResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';

interface AdminProviderDetailData {
  _id: string;
  legalEntityName?: string;
  tradingName?: string;
  abn?: string;
  plan: string;
  intakeStatus: string;
  accountStatus: 'active' | 'suspended';
  serviceSuburbs?: string[];
  travelRadiusKm?: number;
  weeklyCapacityHours?: number;
  rosterSize?: number;
  onboarding?: { key: string; complete: boolean }[];
  userId?: { name: string; email: string; mobile?: string };
}

export default function AdminProviderDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<AdminProviderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    getProviderAdmin(id)
      .then((data) => setProvider(data as unknown as AdminProviderDetailData))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Could not load this provider.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleStatus() {
    if (!provider) return;
    const next = provider.accountStatus === 'active' ? 'suspended' : 'active';
    setUpdating(true);
    try {
      await setProviderAccountStatus(provider._id, next);
      setProvider({ ...provider, accountStatus: next });
      showToast(next === 'suspended' ? 'Provider suspended.' : 'Provider reactivated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this provider.');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading…</p>;
  if (!provider) return <p>Provider not found. <Link to="/admin/providers">Back to providers</Link></p>;

  return (
    <div className="admin-providers-page">
      <Link to="/admin/providers" className="admin-providers-back">← All providers</Link>
      <div className="admin-providers-header">
        <div>
          <h1 className="page-title">{provider.tradingName || provider.legalEntityName || 'Unnamed provider'}</h1>
          <span className={`admin-status-pill admin-status-pill-${provider.accountStatus}`}>{provider.accountStatus}</span>
        </div>
        <button
          className={`admin-toggle-btn ${provider.accountStatus === 'active' ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
          disabled={updating}
          onClick={toggleStatus}
        >
          {updating ? 'Saving…' : provider.accountStatus === 'active' ? 'Suspend account' : 'Reactivate account'}
        </button>
      </div>

      <div className="admin-detail-grid">
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Owner</h2>
          <p>{provider.userId?.name ?? '—'}</p>
          <p>{provider.userId?.email ?? '—'}</p>
          <p>{provider.userId?.mobile ?? '—'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Business</h2>
          <p>ABN: {provider.abn || 'Not provided'}</p>
          <p>Plan: {provider.plan}</p>
          <p>Intake status: {provider.intakeStatus}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Coverage</h2>
          <p>{provider.serviceSuburbs?.length ? provider.serviceSuburbs.join(', ') : 'No suburbs set'}</p>
          <p>{provider.travelRadiusKm ? `${provider.travelRadiusKm}km radius` : 'No radius set'}</p>
        </div>
        <div className="admin-detail-card">
          <h2 className="admin-detail-card-title">Onboarding</h2>
          {provider.onboarding?.length ? (
            <ul className="admin-onboarding-list">
              {provider.onboarding.map((s) => (
                <li key={s.key}>{s.key} — {s.complete ? 'complete' : 'incomplete'}</li>
              ))}
            </ul>
          ) : (
            <p>Not started</p>
          )}
        </div>
      </div>
    </div>
  );
}
