import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getDashboardOverview, getRecentProviders, getRecentWorkers, getRecentActivity, getUserGrowth,
  type DashboardOverview, type RecentProvider, type RecentWorker, type ActivityItem, type GrowthPoint,
} from '../../api/adminDashboardResources';
import { ApiError } from '../../api/client';
import Counter from '../../components/Counter';
import './AdminDashboard.css';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'This year' },
  { value: 'all', label: 'All time' },
];

const FUNNEL_LABELS: Record<string, string> = {
  org: 'Organisation details', insurance: 'Insurance & registration', areas: 'Service areas & capacity',
  team: 'Team & clearances', policy: 'Incident & complaints', billing: 'Subscription & leads',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) {
  return (
    <div className={`ad-stat-card ${tone === 'warn' ? 'ad-stat-card-warn' : ''}`}>
      <p className="ad-stat-value"><Counter value={value} /></p>
      <p className="ad-stat-label">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState('30d');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [providers, setProviders] = useState<RecentProvider[]>([]);
  const [workers, setWorkers] = useState<RecentWorker[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadAll() {
    setLoading(true);
    setError('');
    Promise.all([
      getDashboardOverview(period),
      getRecentProviders(),
      getRecentWorkers(),
      getRecentActivity(),
      getUserGrowth(period === 'today' || period === 'all' ? '30d' : period),
    ])
      .then(([ov, rp, rw, ra, ug]) => {
        setOverview(ov); setProviders(rp.items); setWorkers(rw.items); setActivity(ra.items); setGrowth(ug.series);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load dashboard statistics.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, [period]);

  if (loading && !overview) {
    return (
      <div className="ad-page">
        <div className="ad-skel-header" />
        <div className="ad-stat-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="ad-skel-card" />)}</div>
        <div className="ad-skel-block" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ad-error-state">
        <p className="ad-error-title">Unable to load provider statistics.</p>
        <p>{error}</p>
        <button className="ad-btn-primary" onClick={loadAll}>Try again</button>
      </div>
    );
  }

  if (!overview) return null;
  const maxGrowth = Math.max(1, ...growth.map((g) => g.count));
  const maxFunnel = Math.max(1, ...overview.onboardingFunnel.map((f) => f.completedCount));

  return (
    <div className="ad-page">
      <div className="ad-header-row">
        <div>
          <h1 className="ad-heading">{greeting()}, Admin</h1>
          <p className="ad-subheading">Here's what's happening across SolDirectory.</p>
        </div>
        <select className="ad-period-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Top stats */}
      <div className="ad-stat-grid">
        <StatCard label="Total users" value={overview.totalUsers} />
        <StatCard label="Providers" value={overview.roleDistribution.provider} />
        <StatCard label="NDIS workers" value={overview.roleDistribution.worker} />
        <StatCard label="Support coordinators" value={overview.roleDistribution.coordinator} />
        <StatCard label="Participants / families" value={overview.roleDistribution.participant} />
        <StatCard label="Pending verifications" value={overview.pendingVerifications} tone="warn" />
        <StatCard label="Active providers" value={overview.providers.active} />
        <StatCard label="Open leads" value={overview.leads.matched} />
      </div>
      <p className="ad-stat-footnote">Figures are live counts for the selected period. No comparison shown where prior-period history isn't tracked.</p>

      <div className="ad-two-col">
        {/* Role distribution */}
        <section className="ad-panel">
          <h2 className="ad-panel-title">User role distribution</h2>
          <div className="ad-bar-list">
            {Object.entries(overview.roleDistribution).map(([role, count]) => (
              <div key={role}>
                <div className="ad-bar-row"><span style={{ textTransform: 'capitalize' }}>{role}</span><span className="ad-bar-count">{count}</span></div>
                <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${(count / Math.max(1, overview.totalUsers)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* User growth */}
        <section className="ad-panel">
          <h2 className="ad-panel-title">User growth</h2>
          <div className="ad-growth-chart">
            {growth.map((g) => (
              <div key={g.date} className="ad-growth-bar-col" title={`${g.date}: ${g.count}`}>
                <div className="ad-growth-bar" style={{ height: `${(g.count / maxGrowth) * 100}%` }} />
              </div>
            ))}
          </div>
          <p className="ad-growth-caption">Daily registrations, {growth.length} days shown</p>
        </section>
      </div>

      <div className="ad-two-col">
        {/* Provider overview */}
        <section className="ad-panel">
          <h2 className="ad-panel-title">Provider overview</h2>
          <div className="ad-mini-stat-grid">
            <div><span className="ad-mini-value">{overview.providers.total}</span><span className="ad-mini-label">Total</span></div>
            <div><span className="ad-mini-value">{overview.providers.active}</span><span className="ad-mini-label">Active</span></div>
            <div><span className="ad-mini-value">{overview.providers.suspended}</span><span className="ad-mini-label">Suspended</span></div>
            <div><span className="ad-mini-value">{overview.providers.acceptingClients}</span><span className="ad-mini-label">Accepting clients</span></div>
            <div><span className="ad-mini-value">{overview.providers.atCapacity}</span><span className="ad-mini-label">At capacity</span></div>
            <div><span className="ad-mini-value">{overview.providers.incompleteOnboarding}</span><span className="ad-mini-label">Incomplete onboarding</span></div>
          </div>
        </section>

        {/* Worker overview */}
        <section className="ad-panel">
          <h2 className="ad-panel-title">Worker overview</h2>
          <div className="ad-mini-stat-grid">
            <div><span className="ad-mini-value">{overview.workers.total}</span><span className="ad-mini-label">Total</span></div>
            <div><span className="ad-mini-value">{overview.workers.approved}</span><span className="ad-mini-label">Verified</span></div>
            <div><span className="ad-mini-value">{overview.workers.awaitingReview}</span><span className="ad-mini-label">Pending verification</span></div>
            <div><span className="ad-mini-value">{overview.workers.rejected}</span><span className="ad-mini-label">Rejected</span></div>
            <div><span className="ad-mini-value">{overview.workers.published}</span><span className="ad-mini-label">Published</span></div>
          </div>
        </section>
      </div>

      {/* Verification queue */}
      <section className="ad-panel ad-verification-panel">
        <div>
          <h2 className="ad-panel-title">Verification requires attention</h2>
          <p className="ad-panel-sub">{overview.pendingVerifications} worker{overview.pendingVerifications === 1 ? '' : 's'} awaiting review.</p>
        </div>
        <Link to="/verification" className="ad-btn-primary">Open verification queue →</Link>
      </section>

      {/* Leads & shortlists */}
      <div className="ad-two-col">
        <section className="ad-panel">
          <h2 className="ad-panel-title">Leads / matching activity</h2>
          <div className="ad-mini-stat-grid">
            <div><span className="ad-mini-value">{overview.leads.total}</span><span className="ad-mini-label">Total leads</span></div>
            <div><span className="ad-mini-value">{overview.leads.matched}</span><span className="ad-mini-label">Matched (open)</span></div>
            <div><span className="ad-mini-value">{overview.leads.unlocked}</span><span className="ad-mini-label">Unlocked</span></div>
            <div><span className="ad-mini-value">{overview.leads.closed}</span><span className="ad-mini-label">Closed</span></div>
          </div>
        </section>
        <section className="ad-panel">
          <h2 className="ad-panel-title">Shortlist activity</h2>
          <div className="ad-mini-stat-grid">
            <div><span className="ad-mini-value">{overview.shortlists.total}</span><span className="ad-mini-label">Total shortlists</span></div>
          </div>
        </section>
      </div>

      {/* Onboarding funnel */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Onboarding funnel</h2>
        <div className="ad-bar-list">
          {overview.onboardingFunnel.map((f) => (
            <div key={f.step}>
              <div className="ad-bar-row"><span>{FUNNEL_LABELS[f.step] ?? f.step}</span><span className="ad-bar-count">{f.completedCount}</span></div>
              <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${(f.completedCount / maxFunnel) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* Needs attention */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Needs attention</h2>
        <div className="ad-attention-list">
          {overview.pendingVerifications > 0 && (
            <div className="ad-attention-row">
              <span>{overview.pendingVerifications} worker{overview.pendingVerifications === 1 ? '' : 's'} awaiting verification</span>
              <Link to="/verification" className="ad-attention-action">Review</Link>
            </div>
          )}
          {overview.providers.incompleteOnboarding > 0 && (
            <div className="ad-attention-row">
              <span>{overview.providers.incompleteOnboarding} provider{overview.providers.incompleteOnboarding === 1 ? '' : 's'} with incomplete onboarding</span>
              <Link to="/admin/providers" className="ad-attention-action">Review</Link>
            </div>
          )}
          {overview.providers.suspended > 0 && (
            <div className="ad-attention-row">
              <span>{overview.providers.suspended} suspended provider account{overview.providers.suspended === 1 ? '' : 's'}</span>
              <Link to="/admin/providers?status=suspended" className="ad-attention-action">Review</Link>
            </div>
          )}
          {overview.pendingVerifications === 0 && overview.providers.incompleteOnboarding === 0 && overview.providers.suspended === 0 && (
            <p className="ad-empty-note">Nothing needs attention right now.</p>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Quick actions</h2>
        <div className="ad-quick-actions">
          <Link to="/verification" className="ad-quick-action">Review verification</Link>
          <Link to="/admin/providers" className="ad-quick-action">Manage providers</Link>
          <Link to="/admin/workers" className="ad-quick-action">Manage workers</Link>
          <Link to="/admin/users" className="ad-quick-action">Coordinators & participants</Link>
        </div>
      </section>

      {/* Recently registered providers */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Recently registered providers</h2>
        {providers.length === 0 ? <p className="ad-empty-note">No providers registered yet.</p> : (
          <div className="ad-table">
            <div className="ad-table-row ad-table-head"><span>Provider</span><span>Location</span><span>Services</span><span>Status</span><span>Registered</span><span></span></div>
            {providers.map((p) => (
              <div key={p.id} className="ad-table-row">
                <span>{p.name}</span>
                <span>{p.suburbs.slice(0, 2).join(', ') || '—'}</span>
                <span>{p.services.slice(0, 2).join(', ') || '—'}</span>
                <span><span className={`ad-status-pill ad-status-pill-${p.accountStatus}`}>{p.accountStatus}</span></span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                <span><Link to={`/admin/providers/${p.id}`} className="ad-table-link">View</Link></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently registered workers */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Recently registered workers</h2>
        {workers.length === 0 ? <p className="ad-empty-note">No workers registered yet.</p> : (
          <div className="ad-table">
            <div className="ad-table-row ad-table-head"><span>Name</span><span>Role</span><span>Location</span><span>Verification</span><span>Registered</span><span></span></div>
            {workers.map((w) => (
              <div key={w.id} className="ad-table-row">
                <span>{w.name}</span>
                <span>{w.role || '—'}</span>
                <span>{w.suburb || '—'}</span>
                <span style={{ textTransform: 'capitalize' }}>{w.verificationStatus.replace('_', ' ')}</span>
                <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                <span><Link to={`/admin/workers/${w.id}`} className="ad-table-link">View</Link></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="ad-panel">
        <h2 className="ad-panel-title">Recent activity</h2>
        {activity.length === 0 ? <p className="ad-empty-note">No activity recorded yet.</p> : (
          <div className="ad-activity-list">
            {activity.map((a) => (
              <div key={a.id} className="ad-activity-row">
                <span>{a.summary}</span>
                <span className="ad-activity-time">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
