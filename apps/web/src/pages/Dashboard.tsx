import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listLeads, getPlans } from '../api/resources';
import type { Lead, PlanConfig } from '@soldirectory/shared-types';
import './Dashboard.css';

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listLeads(), getPlans()])
      .then(([l, p]) => {
        setLeads(l);
        setPlans(p);
      })
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
