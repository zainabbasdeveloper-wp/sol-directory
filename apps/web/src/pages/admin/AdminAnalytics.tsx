import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalytics, downloadExport, type AnalyticsData, type ExportType } from '../../api/adminDashboardResources';
import { ApiError } from '../../api/client';
import GrowthChart from '../../components/charts/GrowthChart';
import LabelBarChart from '../../components/charts/LabelBarChart';
import { pct } from './adminFormat';
import './AdminAnalytics.css';

const fmt = (n: number) => n.toLocaleString('en-AU');

const EXPORT_OPTIONS: { type: ExportType; label: string; hint: string }[] = [
  { type: 'enquiries', label: 'Enquiries', hint: 'Every request, with contact details, status and match progress' },
  { type: 'users', label: 'Users', hint: 'Name, email, role and join date' },
  { type: 'providers', label: 'Providers', hint: 'Plan, status, services and suburbs' },
  { type: 'workers', label: 'NDIS workers', hint: 'Verification, services and suburb' },
  { type: 'emails', label: 'Email log', hint: 'Every email sent or failed, with the reason' },
];

/** "Export" drop-down for the dashboard header: CSV downloads for the selected period, plus print / save as PDF. */
export function ExportMenu({ period, periodLabel }: { period: string; periodLabel: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportType | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  async function run(type: ExportType) {
    setBusy(type);
    setMessage(null);
    try {
      await downloadExport(type, period);
      setMessage({ ok: true, text: 'Download started.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not export right now.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="ax-menu ad-no-print" ref={ref}>
      <button type="button" className="ax-menu-btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
        Export
      </button>
      {open && (
        <div className="ax-menu-panel" role="menu">
          <p className="ax-menu-title">Download as CSV <span>· {periodLabel}</span></p>
          {EXPORT_OPTIONS.map((o) => (
            <button key={o.type} type="button" role="menuitem" className="ax-menu-item" disabled={busy !== null} onClick={() => run(o.type)}>
              <strong>{busy === o.type ? 'Preparing…' : o.label}</strong>
              <span>{o.hint}</span>
            </button>
          ))}
          <div className="ax-menu-sep" />
          <button type="button" role="menuitem" className="ax-menu-item" onClick={() => { setOpen(false); setTimeout(() => window.print(), 100); }}>
            <strong>Print / save as PDF</strong>
            <span>The whole dashboard, laid out for paper</span>
          </button>
          {message && <p className={`ax-menu-msg ${message.ok ? 'ax-ok' : 'ax-bad'}`} role="status">{message.text}</p>}
          <p className="ax-menu-note">Exports contain personal details. Keep them secure and delete them when you no longer need them.</p>
        </div>
      )}
    </div>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  if (before === 0 && now === 0) return <span className="ax-delta ax-flat">No change</span>;
  if (before === 0) return <span className="ax-delta ax-up">▲ New (none before)</span>;
  const change = Math.round(((now - before) / before) * 100);
  if (change === 0) return <span className="ax-delta ax-flat">▬ Same as before</span>;
  return <span className={`ax-delta ${change > 0 ? 'ax-up' : 'ax-down'}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs previous</span>;
}

function HBars({ rows, empty, color = 'var(--color-primary, #1769E0)' }: { rows: { label: string; count: number }[]; empty: string; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (rows.length === 0) return <p className="ad-empty-note">{empty}</p>;
  return (
    <div className="ad-bar-list">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="ad-bar-row"><span>{r.label}</span><span className="ad-bar-count">{fmt(r.count)} <span className="ax-dim">({pct(r.count, total)}%)</span></span></div>
          <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${(r.count / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  );
}

function minutesLabel(m: number | null): string {
  if (m === null) return '—';
  if (m < 90) return `${m} min`;
  if (m < 60 * 36) return `${Math.round(m / 60)} hr`;
  return `${Math.round(m / 1440)} days`;
}

export default function AdminAnalytics({ period, periodLabel }: { period: string; periodLabel: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => getAnalytics(period).then((d) => { if (alive) { setData(d); setError(''); } }).catch((err) => { if (alive && !data) setError(err instanceof ApiError ? err.message : 'Unable to load analytics.'); });
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  if (error && !data) return <section className="ad-panel"><p className="ad-empty-note">{error}</p></section>;
  if (!data) return <div className="ad-skel-block" />;

  const { compare, monthly, breakdowns, plans, claims, directory } = data;
  const planTotal = (plans.starter ?? 0) + (plans.growth ?? 0) + (plans.pro ?? 0);
  const claimTotal = (claims.new ?? 0) + (claims.verified ?? 0) + (claims.rejected ?? 0);
  const monthlyEnquiries = monthly.reduce((n, m) => n + m.enquiries, 0);
  const monthLabels = monthly.map((m) => new Date(`${m.month}-15T12:00:00`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }));

  return (
    <div className="ax-wrap">
      <div className="ax-heading-row">
        <div>
          <h2 className="ax-heading">Growth &amp; progress</h2>
          <p className="ad-subheading">How SolDirectory has grown, where enquiries come from and how well they are handled.</p>
        </div>
      </div>

      {/* Comparison with the previous period */}
      {compare ? (
        <div className="ax-compare">
          {[
            { label: 'Enquiries', now: compare.current.enquiries, before: compare.previous.enquiries },
            { label: 'New users', now: compare.current.users, before: compare.previous.users },
            { label: 'New providers', now: compare.current.providers, before: compare.previous.providers },
            { label: 'New NDIS workers', now: compare.current.workers, before: compare.previous.workers },
            { label: 'Emails sent', now: compare.current.emailsSent, before: compare.previous.emailsSent },
          ].map((c) => (
            <div key={c.label} className="ax-compare-card">
              <span className="ax-compare-label">{c.label}</span>
              <strong>{fmt(c.now)}</strong>
              <Delta now={c.now} before={c.before} />
              <span className="ax-dim">before: {fmt(c.before)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="ax-note">Choose a period other than “All time” to see how it compares with the one before.</p>
      )}

      <div className="ad-two-col">
        <section className="ad-panel ax-span-2">
          <h3 className="ad-panel-title">Sign-ups by month, and total users <span className="ax-dim">(last 12 months)</span></h3>
          <GrowthChart rows={monthly} />
        </section>
      </div>

      <div className="ad-two-col">
        <section className="ad-panel">
          <h3 className="ad-panel-title">Enquiries per month <span className="ax-dim">· {fmt(monthlyEnquiries)} in 12 months</span></h3>
          <LabelBarChart labels={monthLabels} values={monthly.map((m) => m.enquiries)} noun="enquiries" />
        </section>
        <section className="ad-panel">
          <h3 className="ad-panel-title">Emails sent per month</h3>
          <LabelBarChart labels={monthLabels} values={monthly.map((m) => m.emailsSent)} color="#1F9D63" noun="emails" />
        </section>
      </div>

      <div className="ad-two-col">
        <section className="ad-panel">
          <h3 className="ad-panel-title">What people ask for <span className="ax-dim">· {fmt(breakdowns.enquiriesInPeriod)} enquiries, {periodLabel.toLowerCase()}</span></h3>
          <HBars rows={breakdowns.byService} empty="No enquiries in this period." />
        </section>
        <section className="ad-panel">
          <h3 className="ad-panel-title">Where they are <span className="ax-dim">· by state</span></h3>
          <HBars rows={breakdowns.byState} empty="No enquiries in this period." color="#0B2D5C" />
        </section>
      </div>

      <div className="ad-two-col">
        <section className="ad-panel">
          <h3 className="ad-panel-title">Busiest days <span className="ax-dim">· enquiries by weekday</span></h3>
          <LabelBarChart labels={breakdowns.byWeekday.map((d) => d.label)} values={breakdowns.byWeekday.map((d) => d.count)} color="#E0A021" noun="enquiries" />
        </section>
        <section className="ad-panel">
          <h3 className="ad-panel-title">How support is funded</h3>
          <HBars rows={breakdowns.byFunding} empty="No enquiries in this period." color="#2FA7A0" />
        </section>
      </div>

      {/* Progress cards */}
      <div className="ax-progress">
        <section className="ad-panel ax-progress-card">
          <h3 className="ad-panel-title">Response speed</h3>
          <p className="ax-big">{minutesLabel(data.firstResponse.medianMinutes)}</p>
          <p className="ax-dim">Median time from an enquiry to a provider’s first reply{data.firstResponse.sample > 0 ? ` (${fmt(data.firstResponse.sample)} answered)` : ''}.</p>
          {data.waitingOverDay > 0 && <p className="ax-note ax-note-warn">{fmt(data.waitingOverDay)} enquir{data.waitingOverDay === 1 ? 'y has' : 'ies have'} waited over 24 hours.</p>}
        </section>

        <section className="ad-panel ax-progress-card">
          <h3 className="ad-panel-title">Directory claimed by owners</h3>
          <p className="ax-big">{fmt(directory.claimed)} <span className="ax-dim">of {fmt(directory.total)}</span></p>
          <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${Math.max(directory.claimed ? 1.5 : 0, (directory.claimed / Math.max(1, directory.total)) * 100)}%` }} /></div>
          <p className="ax-dim">{claimTotal > 0 ? `${fmt(claims.new ?? 0)} new, ${fmt(claims.verified ?? 0)} verified and ${fmt(claims.rejected ?? 0)} declined claim requests.` : 'No claim requests yet.'}</p>
          {(claims.new ?? 0) > 0 && <Link to="/admin/claims" className="ad-table-link">Review {fmt(claims.new ?? 0)} waiting →</Link>}
        </section>

        <section className="ad-panel ax-progress-card">
          <h3 className="ad-panel-title">Provider plans</h3>
          {planTotal === 0 ? <p className="ad-empty-note">No providers yet.</p> : (
            <>
              <div className="ax-stack" role="img" aria-label={`Starter ${plans.starter ?? 0}, Growth ${plans.growth ?? 0}, Pro ${plans.pro ?? 0}`}>
                {(plans.starter ?? 0) > 0 && <span style={{ width: `${pct(plans.starter ?? 0, planTotal)}%`, background: '#C4CEDD' }} />}
                {(plans.growth ?? 0) > 0 && <span style={{ width: `${pct(plans.growth ?? 0, planTotal)}%`, background: '#1769E0' }} />}
                {(plans.pro ?? 0) > 0 && <span style={{ width: `${pct(plans.pro ?? 0, planTotal)}%`, background: '#0B2D5C' }} />}
              </div>
              <ul className="ax-legend">
                <li><i style={{ background: '#C4CEDD' }} /> Starter <b>{fmt(plans.starter ?? 0)}</b></li>
                <li><i style={{ background: '#1769E0' }} /> Growth <b>{fmt(plans.growth ?? 0)}</b></li>
                <li><i style={{ background: '#0B2D5C' }} /> Pro <b>{fmt(plans.pro ?? 0)}</b></li>
              </ul>
              <Link to="/admin/plans" className="ad-table-link">Manage plans →</Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
