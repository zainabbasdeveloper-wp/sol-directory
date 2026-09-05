import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLeads, getPlans } from '../api/resources';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import type { Lead, PlanConfig } from '@soldirectory/shared-types';
import './Dashboard.css';

// Per-role landing content. Only the provider case calls real,
// existing endpoints (leads/plans). The other roles show honest
// placeholder copy rather than fabricated "opportunities" or
// "referrals" lists — those features don't exist in the backend yet
// (Lead has no connection to a worker/coordinator/participant at
// all), and calling provider-only endpoints for them is exactly what
// was 403ing before this fix.
function NonProviderDashboard({ role }: { role: string }) {
  const COPY: Record<string, { heading: string; body: string }> = {
    worker: {
      heading: 'Your worker account',
      body: "Profile management, availability, and opportunity matching aren't built yet — this is where they'll live once they are.",
    },
    coordinator: {
      heading: 'Your coordinator account',
      body: 'Search the provider directory and keep a shortlist of providers for the participants you support.',
    },
    participant: {
      heading: 'Your account',
      body: 'Search the provider directory and save providers to your shortlist for later.',
    },
  };
  const content = COPY[role] ?? { heading: 'Dashboard', body: '' };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="page-title">{content.heading}</h1>
        <p className="dashboard-summary">{content.body}</p>
      </div>
      {role === 'admin' && (
        <Link to="/verification" className="dashboard-card-link">Go to verification queue →</Link>
      )}
      {(role === 'coordinator' || role === 'participant') && (
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/find-providers" className="dashboard-card-link">Find a provider →</Link>
          <Link to="/saved-providers" className="dashboard-card-link">Saved providers →</Link>
        </div>
      )}
    </div>
  );
}

function ProviderDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listLeads(), getPlans()])
      .then(([l, p]) => { setLeads(l); setPlans(p); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-page">Loading…</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="dashboard-summary">Here's what's come in and what you're paying for.</p>
      </div>

      <div className="kpi-row">
        <div className="kpi-card" style={{ borderTopColor: '#1769E0' }}>
          <div className="kpi-label-row">
            <span className="kpi-dot" style={{ background: '#1769E0' }} />
            <span className="kpi-label">Leads matched</span>
          </div>
          <p className="kpi-value">{leads.length}</p>
        </div>
        <div className="kpi-card" style={{ borderTopColor: '#2F80ED' }}>
          <div className="kpi-label-row">
            <span className="kpi-dot" style={{ background: '#2F80ED' }} />
            <span className="kpi-label">Plans available</span>
          </div>
          <p className="kpi-value">{plans.length}</p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header-row">
          <h2 className="dashboard-card-title">Latest leads</h2>
          <Link to="/leads" className="dashboard-card-link">All leads →</Link>
        </div>
        <div className="latest-leads-list">
          {leads.slice(0, 4).map((lead) => (
            <div key={lead.id} className="latest-lead-row">
              <p className="latest-lead-need">{lead.need}</p>
              <p className="latest-lead-meta">{lead.suburb} · {lead.hoursPerWeek} · {lead.funding}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null; // RequireAuth in AppRoutes guarantees this won't render for long
  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'provider') return <ProviderDashboard />;
  return <NonProviderDashboard role={user.role} />;
}
