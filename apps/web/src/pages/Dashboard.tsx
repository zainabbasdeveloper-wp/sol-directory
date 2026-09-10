import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLeads, getPlans } from '../api/resources';
import { getMyReferrals, type ReferralInfo } from '../api/providerResources';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import type { Lead, PlanConfig } from '@soldirectory/shared-types';
import './Dashboard.css';

// Self-contained — same pattern as adminResources.ts and
// providerResources.ts — avoids assuming an unconfirmed addition to
// the real api/resources.ts file.
const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function markLeadViewed(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/leads/${id}/view`, { method: 'POST', headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
}

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

type LeadWithViewed = Lead & { viewed?: boolean };

function ProviderDashboard() {
  const [leads, setLeads] = useState<LeadWithViewed[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([listLeads(), getPlans()])
      .then(([l, p]) => { setLeads(l); setPlans(p); })
      .finally(() => setLoading(false));
    getMyReferrals().then(setReferral).catch(() => {});
  }, []);

  function copyReferralLink() {
    if (!referral) return;
    const link = `${window.location.origin}/signup?role=provider&ref=${referral.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleViewLead(id: string) {
    // Optimistic — the badge should feel instant, and a failed
    // background call here isn't worth blocking on since it's just
    // marking something as read.
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, viewed: true } : l)));
    markLeadViewed(id).catch(() => {});
  }

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
              <p className="latest-lead-need">
                {lead.need}
                {lead.viewed && <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 700, color: '#177C4B' }}>Viewed ✓</span>}
              </p>
              <p className="latest-lead-meta">
                {lead.suburb} · {lead.hoursPerWeek} · {lead.funding}
                {!lead.viewed && (
                  <button
                    onClick={() => handleViewLead(lead.id)}
                    style={{ marginLeft: 10, background: 'none', border: 0, color: '#1769E0', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Mark viewed
                  </button>
                )}
                <Link to={`/leads/${lead.id}`} style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, color: '#1769E0' }}>View details →</Link>
              </p>
            </div>
          ))}
        </div>
      </div>

      {referral && (
        <div className="dashboard-card">
          <div className="dashboard-card-header-row">
            <h2 className="dashboard-card-title">Refer a friend</h2>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-muted, #5A6B84)', margin: '0 0 14px' }}>
            Know another provider who'd be a good fit for SolDirectory? Share your link.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ background: 'var(--color-primary-tint, #F2F7FF)', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              {window.location.origin}/signup?role=provider&ref={referral.referralCode}
            </code>
            <button
              onClick={copyReferralLink}
              style={{ border: 0, borderRadius: 8, padding: '8px 16px', background: '#1769E0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
          </div>
          <p style={{ fontSize: 13, marginTop: 14, marginBottom: referral.referrals.length ? 8 : 0 }}>
            <strong>{referral.totalReferrals}</strong> provider{referral.totalReferrals === 1 ? '' : 's'} referred so far.
          </p>
          {referral.referrals.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: 'var(--color-text-muted, #5A6B84)' }}>
              {referral.referrals.map((r, i) => (
                <li key={i} style={{ padding: '4px 0' }}>{r.email} · {new Date(r.createdAt).toLocaleDateString()}</li>
              ))}
            </ul>
          )}
        </div>
      )}
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
