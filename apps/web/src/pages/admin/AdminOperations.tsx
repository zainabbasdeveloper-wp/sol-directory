import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendTestAdminEmail, type JobHealth } from '../../api/adminDashboardResources';
import { useOperations } from '../../hooks/useOperations';
import { timeAgo, pct } from './adminFormat';
import { ApiError } from '../../api/client';
import DailyBarChart from '../../components/charts/DailyBarChart';
import './AdminDashboard.css';
import './AdminOperations.css';

const HEALTH_LABEL: Record<JobHealth, string> = {
  ok: 'On time', running: 'Running now', failed: 'Failed', overdue: 'Overdue', never_run: 'Never run',
};

function uptime(seconds: number): string {
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Coverage({ label, n, total }: { label: string; n: number; total: number }) {
  return (
    <div>
      <div className="ad-bar-row"><span>{label}</span><span className="ad-bar-count">{n.toLocaleString()} <span className="ao-dim">({pct(n, total)}%)</span></span></div>
      <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${pct(n, total)}%` }} /></div>
    </div>
  );
}

export default function AdminOperations() {
  const { data, error, refreshing, reload: load } = useOperations(30_000);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState('');

  async function testAlert() {
    setTesting(true);
    setTestMsg(null);
    try {
      const r = await sendTestAdminEmail();
      setTestMsg({ ok: true, text: `Test alert sent to ${r.to}. Check that inbox (and spam).` });
      load();
    } catch (err) {
      setTestMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not send the test alert.' });
    } finally {
      setTesting(false);
    }
  }

  function copyCron(name: string, cron: string, command: string) {
    const line = `${cron} cd /var/www/soldirectory && ${command} >> /var/log/${name}.log 2>&1`;
    navigator.clipboard?.writeText(line).then(() => { setCopied(name); setTimeout(() => setCopied(''), 2000); }).catch(() => {});
  }

  if (error && !data) return <div className="ad-page"><section className="ad-panel"><p className="ad-empty-note">{error}</p></section></div>;
  if (!data) return <div className="ad-page"><div className="ad-skel-block" /></div>;

  const { system, jobs, enquiries, email, automation, directory, alerts } = data;
  const pipe = enquiries.pipeline;
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const checks: { label: string; ok: boolean; hint: string }[] = [
    { label: 'Database', ok: system.database, hint: system.database ? 'Connected' : 'Down' },
    { label: 'Email sending', ok: system.email, hint: system.email ? 'Configured' : 'Not configured' },
    { label: 'Admin alerts', ok: system.adminAlerts, hint: system.adminAlerts ? 'Address set' : 'No address' },
    { label: 'Sender identity', ok: system.senderIdentity, hint: system.senderIdentity ? 'In email footers' : 'Missing' },
    { label: 'Payments', ok: system.payments, hint: system.payments ? 'Stripe on' : 'Off' },
    { label: 'Maps', ok: system.maps, hint: system.maps ? 'Mapbox on' : 'Off' },
    { label: 'SMS', ok: system.sms, hint: system.sms ? 'Twilio on' : 'Off (optional)' },
    { label: 'Provider-area emails', ok: system.registerLeadEmails, hint: system.registerLeadEmails ? 'Switched on' : 'Switched off' },
  ];

  return (
    <div className="ad-page ao-wrap">
      <div className="ao-toolbar">
        <div>
          <h1 className="ad-heading">Operations</h1>
          <p className="ad-subheading">System health, scheduled jobs and automatic emails — refreshes every 30 seconds.</p>
        </div>
        <div className="ao-toolbar-right">
          <span className="ao-dim">Updated {timeAgo(data.generatedAt)} · server up {uptime(system.uptimeSeconds)}</span>
          <button type="button" className="ao-btn" onClick={load} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <button type="button" className="ao-btn" onClick={testAlert} disabled={testing || !system.email}>{testing ? 'Sending…' : 'Send test alert'}</button>
        </div>
      </div>
      {testMsg && <p className={`ao-note ${testMsg.ok ? 'ao-note-ok' : 'ao-note-bad'}`} role="status">{testMsg.text}</p>}

      {/* Alerts */}
      <section className={`ad-panel ao-alerts ${critical > 0 ? 'ao-alerts-critical' : ''}`}>
        {alerts.length === 0 ? (
          <p className="ao-allgood"><span className="ao-dot ao-dot-ok" /> Everything is running normally. Nothing needs your attention.</p>
        ) : (
          <>
            <h3 className="ao-subtitle">Needs attention ({alerts.length})</h3>
            <ul className="ao-alert-list">
              {alerts.map((a, i) => (
                <li key={i} className={`ao-alert ao-alert-${a.severity}`}>
                  <span className="ao-alert-text">{a.message}</span>
                  {a.link && <Link to={a.link} className="ad-attention-action">{a.linkLabel ?? 'Open'}</Link>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* System checks */}
      <div className="ao-checks">
        {checks.map((c) => (
          <div key={c.label} className="ao-check">
            <span className={`ao-dot ${c.ok ? 'ao-dot-ok' : 'ao-dot-off'}`} />
            <div><p className="ao-check-label">{c.label}</p><p className="ao-check-hint">{c.hint}</p></div>
          </div>
        ))}
      </div>

      <div className="ad-two-col">
        {/* Enquiries */}
        <section className="ad-panel">
          <h3 className="ad-panel-title">Enquiries — last 14 days</h3>
          <DailyBarChart dates={enquiries.daily.map((d) => d.date)} series={[{ label: 'Enquiries', values: enquiries.daily.map((d) => d.count), color: '#1769E0' }]} noun="enquiries" />
          <p className="ao-subtitle ao-gap">Last 30 days: what happened to them</p>
          <div className="ad-bar-list">
            {[
              { label: 'Submitted', n: pipe.submitted },
              { label: 'Matched to providers', n: pipe.matched },
              { label: 'Opened by a provider', n: pipe.viewed },
              { label: 'Answered by a provider', n: pipe.responded },
            ].map((r) => (
              <div key={r.label}>
                <div className="ad-bar-row"><span>{r.label}</span><span className="ad-bar-count">{r.n} <span className="ao-dim">({pct(r.n, pipe.submitted)}%)</span></span></div>
                <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${pct(r.n, pipe.submitted)}%` }} /></div>
              </div>
            ))}
          </div>
          {pipe.unmatched > 0 && <p className="ao-note ao-note-bad">{pipe.unmatched} enquir{pipe.unmatched === 1 ? 'y' : 'ies'} matched nobody — worth a personal follow-up.</p>}
        </section>

        {/* Email */}
        <section className="ad-panel">
          <h3 className="ad-panel-title">Email delivery — last 14 days</h3>
          <DailyBarChart
            dates={email.daily.map((d) => d.date)}
            series={[
              { label: 'Sent', values: email.daily.map((d) => d.sent), color: '#1F9D63' },
              { label: 'Failed', values: email.daily.map((d) => d.failed), color: '#D64545' },
            ]}
            noun="emails"
          />
          <div className="ad-mini-stat-grid ao-gap">
            <div><span className="ad-mini-value">{email.last24h.sent}</span><span className="ad-mini-label">Sent, last 24h</span></div>
            <div><span className="ad-mini-value">{email.last7d.sent}</span><span className="ad-mini-label">Sent, last 7 days</span></div>
            <div><span className={`ad-mini-value ${email.last7d.failed > 0 ? 'ao-bad' : ''}`}>{email.last7d.failed}</span><span className="ad-mini-label">Failed, last 7 days</span></div>
          </div>
          {email.recentFailures.length > 0 && (
            <ul className="ao-fail-list">
              {email.recentFailures.map((f, i) => (
                <li key={i}><strong>{f.subject}</strong> to {f.to} <span className="ao-dim">· {timeAgo(f.at)}</span>{f.error && <span className="ao-fail-error">{f.error}</span>}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Scheduled jobs */}
      <section className="ad-panel">
        <h3 className="ad-panel-title">Scheduled jobs (cron)</h3>
        <p className="ad-panel-sub ao-gap-sm">Each job reports back here every time it runs. If a job is overdue or never run, its line is missing from the server's crontab — copy it with the button.</p>
        <div className="ao-jobs">
          {jobs.map((j) => (
            <div key={j.name} className="ao-job">
              <div className="ao-job-main">
                <div className="ao-job-head">
                  <span className={`ao-pill ao-pill-${j.health}`}>{HEALTH_LABEL[j.health]}</span>
                  <strong>{j.label}</strong>
                </div>
                <p className="ao-job-desc">{j.description}</p>
                <p className="ao-job-meta">
                  <span>{j.schedule}</span>
                  <span>Last run: {timeAgo(j.lastRunAt)}{j.lastDurationMs != null ? ` (${(j.lastDurationMs / 1000).toFixed(1)}s)` : ''}</span>
                </p>
                {j.lastSummary && <p className="ao-job-summary">{j.lastSummary}</p>}
                {j.lastError && <p className="ao-job-summary ao-bad">{j.lastError}</p>}
              </div>
              <div className="ao-job-side">
                <div className="ao-history" title="Most recent runs, oldest to newest">
                  {[...j.history].reverse().map((h, i) => <span key={i} className={`ao-hist ao-hist-${h.status}`} title={`${new Date(h.at).toLocaleString()} — ${h.status}`} />)}
                  {j.history.length === 0 && <span className="ao-dim">No runs yet</span>}
                </div>
                <button type="button" className="ao-btn ao-btn-small" onClick={() => copyCron(j.name, j.cron, j.command)}>
                  {copied === j.name ? 'Copied ✓' : 'Copy cron line'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ad-two-col">
        {/* Automations */}
        <section className="ad-panel">
          <h3 className="ad-panel-title">Automatic emails — last 7 days</h3>
          <div className="ao-auto">
            {[
              { n: automation.last7d.searcherViewed, label: 'Told a searcher a provider looked at their request' },
              { n: automation.last7d.searcherResponded, label: 'Told a searcher a provider took it up' },
              { n: automation.last7d.weeklyMatches, label: 'Weekly "your matches" emails' },
              { n: automation.last7d.providerReminders, label: 'Reminders to providers with unopened enquiries' },
              { n: automation.last7d.registerNotices, label: 'New-enquiry notices to nearby directory providers' },
            ].map((r) => (
              <div key={r.label} className="ao-auto-row"><span className="ao-auto-n">{r.n}</span><span>{r.label}</span></div>
            ))}
          </div>
          {!automation.registerLeadEmailsOn && <p className="ao-note">Notices to nearby directory providers are switched off (<code>REGISTER_LEAD_EMAILS</code>).</p>}
        </section>

        {/* Directory */}
        <section className="ad-panel">
          <h3 className="ad-panel-title">Directory health</h3>
          <div className="ad-mini-stat-grid ao-gap-sm">
            <div><span className="ad-mini-value">{directory.total.toLocaleString()}</span><span className="ad-mini-label">Listings</span></div>
            <div><span className="ad-mini-value">{directory.notifiable.toLocaleString()}</span><span className="ad-mini-label">Can be emailed</span></div>
            <div><span className="ad-mini-value">{directory.claims.claimed.toLocaleString()}</span><span className="ad-mini-label">Claimed by owners</span></div>
          </div>
          <div className="ad-bar-list">
            <Coverage label="Have a website" n={directory.withWebsite} total={directory.total} />
            <Coverage label="Have a phone" n={directory.withPhone} total={directory.total} />
            <Coverage label="Have an email" n={directory.withEmail} total={directory.total} />
            <Coverage label="Email matches own website" n={directory.verifiedEmails} total={directory.total} />
            <Coverage label="Languages recorded" n={directory.withLanguages} total={directory.total} />
          </div>
          {directory.pendingClaims > 0 && <p className="ao-note"><Link to="/admin/claims" className="ad-table-link">{directory.pendingClaims} claim{directory.pendingClaims === 1 ? '' : 's'} waiting for review →</Link></p>}
        </section>
      </div>

      {/* Latest enquiries */}
      <section className="ad-panel">
        <h3 className="ad-panel-title">Latest enquiries</h3>
        {enquiries.recent.length === 0 ? <p className="ad-empty-note">No enquiries yet.</p> : (
          <div className="ad-table">
            <div className="ad-table-row ad-table-head ao-enq-row"><span>Reference</span><span>Looking for</span><span>Where</span><span>Providers matched</span><span>Progress</span><span>Received</span></div>
            {enquiries.recent.map((e) => (
              <div key={e.id} className="ad-table-row ao-enq-row">
                <span className="ao-mono">{e.ref}</span>
                <span>{e.need}</span>
                <span>{e.location}</span>
                <span className={e.matched === 0 ? 'ao-bad' : ''}>{e.matched === 0 ? 'None' : e.matched}</span>
                <span>
                  <span className={`ao-pill ${e.responded ? 'ao-pill-ok' : e.viewed ? 'ao-pill-running' : e.matched === 0 ? 'ao-pill-failed' : 'ao-pill-overdue'}`}>
                    {e.responded ? 'Answered' : e.viewed ? 'Opened' : e.matched === 0 ? 'No match' : 'Waiting'}
                  </span>
                </span>
                <span className="ao-dim">{timeAgo(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
