import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import ProviderMap from '../components/ProviderMap';
import './Dashboard.css';

interface LeadDetail {
  id: string; need: string; conditions: string[]; suburb: string; distanceKm: number;
  hoursPerWeek: string; funding: string; fundingType: string; careFor: string; timeframe: string;
  planManagement?: string; status: string; createdAt: string;
  // Present only once this provider has actually unlocked the lead —
  // see leads.controller.ts's getLeadDetail, which masks these
  // entirely otherwise rather than trusting the frontend to hide them.
  contactName?: string; contactPhone?: string; budget?: string; note?: string;
  location?: { lat: number; lng: number } | null;
}

const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function getLeadDetail(id: string): Promise<LeadDetail> {
  const res = await fetch(`${API_URL}/leads/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

export default function LeadDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeadDetail(id)
      .then(setLead)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load this lead.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="dashboard-page">Loading…</div>;

  if (error) {
    return (
      <div className="dashboard-page">
        <p style={{ color: '#B4232F' }}>{error}</p>
        <Link to="/dashboard" className="dashboard-card-link">← Back to dashboard</Link>
      </div>
    );
  }
  if (!lead) return null;

  return (
    <div className="dashboard-page">
      <Link to="/dashboard" style={{ display: 'inline-block', marginBottom: 16, fontSize: 13.5, color: 'var(--color-primary, #1769E0)' }}>
        ← Back to dashboard
      </Link>

      <div className="dashboard-header">
        <h1 className="page-title">{lead.need}</h1>
        <p className="dashboard-summary">{lead.suburb} · {lead.hoursPerWeek} · {lead.funding}</p>
      </div>

      {lead.location && (
        <div style={{ marginBottom: 24 }}>
          <ProviderMap providers={[{ id: lead.id, name: lead.suburb, location: lead.location, suburb: lead.suburb }]} address={lead.suburb} />
        </div>
      )}

      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ marginBottom: 14 }}>Services requested</h2>
        {lead.conditions.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
            <li>{lead.need}</li>
            {lead.conditions.map((c) => <li key={c}>Support need: {c}</li>)}
          </ul>
        ) : (
          <p style={{ fontSize: 14, margin: 0 }}>{lead.need}</p>
        )}
      </div>

      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <h2 className="dashboard-card-title" style={{ marginBottom: 14 }}>Request details</h2>
        <p style={{ fontSize: 14, margin: '0 0 6px' }}>Who this is for: <strong>{lead.careFor}</strong></p>
        <p style={{ fontSize: 14, margin: '0 0 6px' }}>Timeframe: <strong>{lead.timeframe}</strong></p>
        <p style={{ fontSize: 14, margin: '0 0 6px' }}>Funding: <strong>{lead.fundingType}{lead.planManagement ? ` · ${lead.planManagement}` : ''}</strong></p>
        <p style={{ fontSize: 14, margin: '0 0 6px' }}>Status: <strong style={{ textTransform: 'capitalize' }}>{lead.status}</strong></p>
        {lead.distanceKm != null && <p style={{ fontSize: 14, margin: '0 0 6px' }}>Distance: {lead.distanceKm}km</p>}
        <p style={{ fontSize: 14, margin: 0 }}>Received: {new Date(lead.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="dashboard-card" style={{ marginTop: 16 }}>
        <h2 className="dashboard-card-title" style={{ marginBottom: 14 }}>Contact details</h2>
        {lead.contactName ? (
          <>
            <p style={{ fontSize: 14, margin: '0 0 6px' }}><strong>{lead.contactName}</strong></p>
            <p style={{ fontSize: 14, margin: '0 0 6px' }}>{lead.contactPhone}</p>
            {lead.budget && <p style={{ fontSize: 14, margin: '0 0 6px' }}>Budget: {lead.budget}</p>}
            {lead.note && <p style={{ fontSize: 14, margin: '10px 0 0', color: 'var(--color-text-muted, #5A6B84)' }}>{lead.note}</p>}
          </>
        ) : (
          <>
            <p style={{ fontSize: 14, margin: '0 0 10px', color: 'var(--color-text-muted, #5A6B84)' }}>
              Unlock this lead to see the requester's name, phone number, and any additional notes.
            </p>
            <Link to="/leads" className="dashboard-card-link">Go to leads →</Link>
          </>
        )}
      </div>
    </div>
  );
}
