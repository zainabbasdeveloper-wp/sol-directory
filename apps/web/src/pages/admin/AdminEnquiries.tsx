import { useCallback, useEffect, useState } from 'react';
import { listAdminLeads, searchSharableProviders, shareLead, type AdminLead, type LeadFilter } from '../../api/adminLeads';
import { ApiError } from '../../api/client';
import { timeAgo } from './adminFormat';
import './AdminDashboard.css';
import './AdminOperations.css';
import './AdminEnquiries.css';

const FILTERS: { value: LeadFilter; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every submitted enquiry' },
  { value: 'unmatched', label: 'Not matched', hint: 'Nobody has it yet — needs a person' },
  { value: 'named', label: 'Asked for a provider', hint: 'The person chose one provider by name' },
  { value: 'waiting', label: 'Waiting', hint: 'Over a day old with no provider having opened it' },
  { value: 'answered', label: 'Taken up', hint: 'A provider has taken it up' },
];

const STATUS_LABEL: Record<string, string> = { notified: 'Waiting', viewed: 'Opened', contacted: 'Taken up', declined: 'Declined' };

function Share({ lead, onShared }: { lead: AdminLead; onShared: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; suburbs: string[]; plan: string }[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { searchSharableProviders(q).then((r) => setResults(r.items)).catch(() => setResults([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function go(providerId: string, name: string) {
    setBusy(providerId);
    setMsg(null);
    try {
      await shareLead(lead.id, providerId);
      setMsg({ ok: true, text: `Shared with ${name}. They have been notified.` });
      onShared();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not share this enquiry.' });
    } finally {
      setBusy('');
    }
  }

  const already = new Set(lead.matches.map((m) => m.providerId));
  return (
    <div className="ae-share">
      <h4>Share with a provider</h4>
      <p>The provider is told through SolDirectory in the usual way, and the person can see it was sent.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member providers by name…" aria-label="Search providers" />
      <ul>
        {results.map((p) => (
          <li key={p.id}>
            <span><strong>{p.name}</strong>{p.suburbs.length > 0 && <small> · {p.suburbs.join(', ')}</small>} <small className="ae-plan">{p.plan}</small></span>
            <button type="button" className="ao-btn ao-btn-small" disabled={busy !== '' || already.has(p.id)} onClick={() => go(p.id, p.name)}>
              {already.has(p.id) ? 'Already has it' : busy === p.id ? 'Sharing…' : 'Share'}
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="ae-none">No matching active providers.</li>}
      </ul>
      {msg && <p className={`ae-msg ${msg.ok ? 'ae-ok' : 'ae-bad'}`} role="status">{msg.text}</p>}
    </div>
  );
}

export default function AdminEnquiries() {
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [items, setItems] = useState<AdminLead[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    listAdminLeads({ filter, q: submitted, page })
      .then((r) => { setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); setTotal(r.total); setHasMore(r.hasMore); setError(''); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load enquiries.'))
      .finally(() => setLoading(false));
  }, [filter, submitted, page, tick]);

  useEffect(load, [load]);
  useEffect(() => { setPage(1); }, [filter, submitted]);

  function copyTracking(lead: AdminLead) {
    navigator.clipboard?.writeText(lead.trackingUrl).then(() => { setCopied(lead.id); setTimeout(() => setCopied(''), 2000); }).catch(() => {});
  }
  const refresh = () => { setPage(1); setTick((n) => n + 1); };

  return (
    <div className="ad-page">
      <div className="ad-header-row">
        <div>
          <h1 className="ad-heading">Enquiries</h1>
          <p className="ad-subheading">Every request from the public, who received it and how far it got. Share any of them with a member provider.</p>
        </div>
        <form className="ae-search" onSubmit={(e) => { e.preventDefault(); setSubmitted(query.trim()); }} role="search">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, suburb, provider…" aria-label="Search enquiries" />
          <button type="submit" className="ao-btn">Search</button>
        </form>
      </div>

      <div className="ae-filters" role="group" aria-label="Filter enquiries">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={filter === f.value} className={`ae-chip${filter === f.value ? ' is-on' : ''}`} title={f.hint} onClick={() => setFilter(f.value)}>{f.label}</button>
        ))}
        <span className="ao-dim ae-total">{loading && items.length === 0 ? 'Loading…' : `${total.toLocaleString('en-AU')} enquir${total === 1 ? 'y' : 'ies'}${filter !== 'all' && filter !== 'named' ? ' (this page of results is filtered)' : ''}`}</span>
      </div>

      {error && <p className="ao-note ao-note-bad" role="alert">{error}</p>}

      <ul className="ae-list">
        {items.map((l) => {
          const progress = l.matches.some((m) => m.status === 'contacted') ? 'taken' : l.matches.some((m) => m.status === 'viewed') ? 'opened' : l.matches.length > 0 ? 'waiting' : 'none';
          return (
            <li key={l.id} className="ad-panel ae-item">
              <button type="button" className="ae-row" aria-expanded={open === l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
                <span className="ae-main">
                  <strong>{l.requestedProvider ? `Asked for ${l.requestedProvider}` : l.need}</strong>
                  <small>{[l.suburb, l.state].filter(Boolean).join(', ') || 'No location'} · ref <span className="ao-mono">{l.ref}</span> · {timeAgo(l.createdAt)}</small>
                </span>
                <span className="ae-badges">
                  {l.requestedProvider && <span className="ao-pill ao-pill-running">Named provider</span>}
                  <span className={`ao-pill ${progress === 'taken' ? 'ao-pill-ok' : progress === 'opened' ? 'ao-pill-running' : progress === 'waiting' ? 'ao-pill-overdue' : 'ao-pill-failed'}`}>
                    {progress === 'taken' ? 'Taken up' : progress === 'opened' ? 'Opened' : progress === 'waiting' ? `Waiting (${l.matches.length})` : 'Not matched'}
                  </span>
                </span>
              </button>

              {open === l.id && (
                <div className="ae-detail">
                  <div className="ae-cols">
                    <div>
                      <h4>Request</h4>
                      <dl className="ae-dl">
                        <div><dt>Support</dt><dd>{l.need}</dd></div>
                        <div><dt>For</dt><dd>{l.careFor || '—'}</dd></div>
                        <div><dt>When</dt><dd>{l.timeframe || '—'}</dd></div>
                        <div><dt>Funding</dt><dd>{l.funding || '—'}</dd></div>
                      </dl>
                      <h4>Person</h4>
                      <dl className="ae-dl">
                        <div><dt>Name</dt><dd>{l.requesterName || '—'}</dd></div>
                        <div><dt>Email</dt><dd>{l.requesterEmail ? <a href={`mailto:${l.requesterEmail}`}>{l.requesterEmail}</a> : '—'}</dd></div>
                        <div><dt>Phone</dt><dd>{l.requesterPhone ? <a href={`tel:${l.requesterPhone}`}>{l.requesterPhone}</a> : '—'}</dd></div>
                        <div><dt>Account</dt><dd>{l.hasAccount ? 'Saved to a dashboard' : 'No account linked'}</dd></div>
                      </dl>
                      <button type="button" className="ao-btn ao-btn-small" onClick={() => copyTracking(l)}>{copied === l.id ? 'Link copied ✓' : 'Copy the person’s tracking link'}</button>
                    </div>
                    <div>
                      <h4>Who has it</h4>
                      {l.matches.length === 0 ? <p className="ad-empty-note">Nobody yet.{l.requestedProvider ? ` ${l.requestedProvider} is not a member, so follow up directly if you can.` : ''}</p> : (
                        <ul className="ae-matches">
                          {l.matches.map((m) => (
                            <li key={m.providerId}>
                              <span><strong>{m.name}</strong>{m.reason && <small>{m.reason}</small>}</span>
                              <span className={`ao-pill ${m.status === 'contacted' ? 'ao-pill-ok' : m.status === 'viewed' ? 'ao-pill-running' : m.status === 'declined' ? 'ao-pill-never_run' : 'ao-pill-overdue'}`}>{STATUS_LABEL[m.status]}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Share lead={l} onShared={refresh} />
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!loading && items.length === 0 && !error && <p className="ad-empty-note">No enquiries match.</p>}
      {hasMore && <div className="ae-more"><button type="button" className="ao-btn" disabled={loading} onClick={() => setPage((p) => p + 1)}>{loading ? 'Loading…' : 'Show more'}</button></div>}
    </div>
  );
}
