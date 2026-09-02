import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listLeads, unlockLead } from '../api/resources';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { isLeadUnlocked, type Lead } from '@soldirectory/shared-types';
import './Leads.css';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<{ id: string; message: string; code?: string } | null>(null);
  const navigate = useNavigate();
  const showToast = useToast();

  useEffect(() => {
    listLeads()
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => {
    if (tab === 'unlocked') return isLeadUnlocked(l);
    if (tab === 'locked') return !isLeadUnlocked(l);
    return true;
  });

  async function handleUnlock(lead: Lead) {
    setUnlockingId(lead.id);
    setQuotaError(null);
    try {
      const updated = await unlockLead(lead.id);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
      showToast('Lead unlocked. Contact details are now visible.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PLAN_REQUIRED') {
        navigate('/plans');
        return;
      }
      if (err instanceof ApiError) {
        setQuotaError({ id: lead.id, message: err.message, code: err.code });
      } else {
        showToast('Could not unlock that lead.');
      }
    } finally {
      setUnlockingId(null);
    }
  }

  if (loading) return <div className="leads-page">Loading…</div>;

  return (
    <div className="leads-page">
      <div className="leads-header">
        <h1 className="page-title">Participant leads</h1>
        <div className="leads-filter-row">
          <div className="leads-tabs" role="tablist">
            {(['all', 'unlocked', 'locked'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                className={`leads-tab ${tab === t ? 'leads-tab-active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t === 'all' ? 'All leads' : t === 'unlocked' ? 'Unlocked' : 'Not yet unlocked'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="leads-grid">
        {filtered.map((lead) => {
          const unlocked = isLeadUnlocked(lead);
          const err = quotaError?.id === lead.id ? quotaError : null;
          return (
            <div key={lead.id} className={`lead-card ${unlocked ? 'lead-card-unlocked' : ''}`}>
              <span className={`pill ${unlocked ? 'pill-ok' : 'pill-flat'}`}>{unlocked ? 'Unlocked' : 'Locked'}</span>
              <h3 className="lead-need">{lead.need}</h3>
              <p className="lead-meta">
                {lead.suburb} · {lead.hoursPerWeek} · {lead.funding}
              </p>

              <div className="lead-gated-block">
                {unlocked ? (
                  <div className="lead-detail-panel">
                    <div className="lead-detail-row"><span>Contact</span><span>{lead.contactName}</span></div>
                    <div className="lead-detail-row"><span>Phone</span><span>{lead.contactPhone}</span></div>
                    <div className="lead-detail-row"><span>Budget</span><span>{lead.budget}</span></div>
                  </div>
                ) : (
                  <div className="lead-detail-panel">
                    <div className="lead-detail-row"><span>Contact</span><span>Contact hidden</span></div>
                    <div className="lead-detail-row"><span>Phone</span><span>04•• ••• •••</span></div>
                    <div className="lead-detail-row"><span>Budget</span><span>$••.••/hr</span></div>
                  </div>
                )}

                {!unlocked && (
                  <div className="lead-veil">
                    {err ? (
                      <p className="lead-veil-error" role="alert">
                        {err.message} {err.code === 'QUOTA_EXHAUSTED' && <a href="/plans">Upgrade to Scale</a>}
                      </p>
                    ) : (
                      <button className="lead-unlock-btn" disabled={unlockingId === lead.id} onClick={() => handleUnlock(lead)}>
                        {unlockingId === lead.id ? 'Unlocking…' : 'Unlock this lead'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
