import { useEffect, useState } from 'react';
import {
  listMemberPlans, setPlanStatus, changePlanTier, getPlanHistory,
  type MemberPlanRow, type PlanStatus, type PlanTier, type PlanHistoryEntry,
} from '../../api/adminPlansResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';
import './AdminMemberPlans.css';

const STATUS_OPTIONS: PlanStatus[] = ['active', 'trial', 'expired', 'cancelled', 'suspended'];
const PLAN_OPTIONS: PlanTier[] = ['starter', 'growth', 'pro'];

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="mp-stat-card">
      <p className="mp-stat-value">{value}</p>
      <p className="mp-stat-label">{label}</p>
    </div>
  );
}

export default function AdminMemberPlans() {
  const [data, setData] = useState<Awaited<ReturnType<typeof listMemberPlans>> | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all');
  const [planFilter, setPlanFilter] = useState<PlanTier | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<{ id: string; name: string; history: PlanHistoryEntry[] } | null>(null);
  const showToast = useToast();

  function load() {
    setLoading(true);
    listMemberPlans(statusFilter === 'all' ? undefined : statusFilter, planFilter === 'all' ? undefined : planFilter)
      .then(setData)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load member plans.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter, planFilter]);

  async function handleStatusChange(row: MemberPlanRow, status: PlanStatus) {
    setUpdatingId(row.id);
    try {
      await setPlanStatus(row.id, status);
      showToast(`${row.name}'s plan set to ${status}.`);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update plan status.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePlanChange(row: MemberPlanRow, plan: PlanTier) {
    setUpdatingId(row.id);
    try {
      await changePlanTier(row.id, plan);
      showToast(`${row.name} moved to the ${plan} plan.`);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not change plan.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function openHistory(row: MemberPlanRow) {
    try {
      const res = await getPlanHistory(row.id);
      setHistoryFor({ id: row.id, name: res.name, history: res.history });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not load plan history.');
    }
  }

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Member Plans</h1>
      </div>

      {loading && !data ? (
        <p>Loading…</p>
      ) : data ? (
        <>
          <div className="mp-stat-grid">
            <StatCard label="Total members" value={data.totalMembers} />
            <StatCard label="Active" value={data.counts.active} />
            <StatCard label="Trial" value={data.counts.trial} />
            <StatCard label="Expired" value={data.counts.expired} />
            <StatCard label="Cancelled" value={data.counts.cancelled} />
            <StatCard label="Expiring soon" value={data.expiringSoon} />
          </div>

          <div className="admin-providers-filter-group" style={{ alignItems: 'flex-start', marginBottom: 20 }}>
            <div className="admin-providers-filter">
              <button className={`admin-filter-pill ${statusFilter === 'all' ? 'admin-filter-pill-active' : ''}`} onClick={() => setStatusFilter('all')}>All statuses</button>
              {STATUS_OPTIONS.map((s) => (
                <button key={s} className={`admin-filter-pill ${statusFilter === s ? 'admin-filter-pill-active' : ''}`} onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>
            <div className="admin-providers-filter">
              <button className={`admin-filter-pill ${planFilter === 'all' ? 'admin-filter-pill-active' : ''}`} onClick={() => setPlanFilter('all')}>All plans</button>
              {PLAN_OPTIONS.map((p) => (
                <button key={p} className={`admin-filter-pill ${planFilter === p ? 'admin-filter-pill-active' : ''}`} onClick={() => setPlanFilter(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
              ))}
            </div>
          </div>

          <div className="admin-providers-table">
            <div className="admin-providers-row admin-providers-row-head" style={{ gridTemplateColumns: '1.6fr 1.2fr 0.8fr 0.9fr 1fr 1fr 1.4fr' }}>
              <span>Member</span><span>Owner</span><span>Plan</span><span>Status</span><span>Started</span><span>Expiry</span><span></span>
            </div>
            {data.items.map((row) => (
              <div key={row.id} className="admin-providers-row" style={{ gridTemplateColumns: '1.6fr 1.2fr 0.8fr 0.9fr 1fr 1fr 1.4fr' }}>
                <span>{row.name}</span>
                <span>{row.ownerName ?? '—'}<span className="admin-providers-owner-email">{row.ownerEmail ?? ''}</span></span>
                <span>
                  <select className="mp-inline-select" value={row.plan} disabled={updatingId === row.id} onChange={(e) => handlePlanChange(row, e.target.value as PlanTier)}>
                    {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </span>
                <span><span className={`mp-status-pill mp-status-pill-${row.planStatus}`}>{row.planStatus}</span></span>
                <span>{new Date(row.planStartedAt).toLocaleDateString()}</span>
                <span>{row.planExpiresAt ? new Date(row.planExpiresAt).toLocaleDateString() : '—'}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <select
                    className="mp-inline-select"
                    value=""
                    disabled={updatingId === row.id}
                    onChange={(e) => { if (e.target.value) handleStatusChange(row, e.target.value as PlanStatus); e.target.value = ''; }}
                  >
                    <option value="">Set status…</option>
                    {STATUS_OPTIONS.filter((s) => s !== row.planStatus).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="mp-history-link" onClick={() => openHistory(row)}>History</button>
                </span>
              </div>
            ))}
            {data.items.length === 0 && <p className="admin-providers-empty">No members match this filter.</p>}
          </div>
        </>
      ) : null}

      {historyFor && (
        <div className="mp-history-overlay" onClick={() => setHistoryFor(null)}>
          <div className="mp-history-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="mp-history-title">{historyFor.name} — plan history</h2>
            {historyFor.history.length === 0 ? (
              <p className="admin-providers-empty">No history recorded yet.</p>
            ) : (
              <ul className="mp-history-list">
                {historyFor.history.map((h, i) => (
                  <li key={i}>
                    <span style={{ textTransform: 'capitalize' }}>{h.plan} · {h.planStatus}</span>
                    <span className="mp-history-date">{new Date(h.changedAt).toLocaleString()} · {h.changedBy}</span>
                  </li>
                ))}
              </ul>
            )}
            <button className="admin-toggle-btn admin-toggle-btn-suspend" onClick={() => setHistoryFor(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
