import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RequestProgress from './RequestProgress';
import { listMyRequests, type TrackedRequest } from '../api/requestsApi';
import { useMatchModal } from '../context/MatchModalContext';
import './MyRequests.css';

const STAGE_LABEL: Record<number, string> = { 1: 'Received', 2: 'Sent to providers', 3: 'A provider has looked', 4: 'A provider has taken it up' };

/** "My requests" on a signed-in person's dashboard: every request saved to their account and how far it has got. */
export default function MyRequests() {
  const { openMatchModal } = useMatchModal();
  const [items, setItems] = useState<TrackedRequest[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => listMyRequests().then((r) => { if (alive) { setItems(r.items); setError(''); } }).catch(() => { if (alive && !items) setError('We could not load your requests just now.'); });
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mr" aria-labelledby="mr-heading">
      <div className="mr-head">
        <div>
          <h2 id="mr-heading">My requests</h2>
          <p>Follow each request: who received it, who has looked at it and who has taken it up.</p>
        </div>
        <button type="button" className="sd-btn sd-btn-primary" onClick={() => openMatchModal()}>New request</button>
      </div>

      {error && <p className="mr-empty" role="alert">{error}</p>}
      {!error && items === null && <div className="mr-skel" aria-busy="true" />}
      {items && items.length === 0 && (
        <div className="mr-empty">
          <strong>No requests saved yet.</strong>
          <span>When you send a request while signed in, it appears here. If you sent one earlier, open the “Follow your request” link in its confirmation email and choose “Save to my dashboard”.</span>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mr-list">
          {items.map((r) => (
            <li key={r.id} className="mr-item">
              <div className="mr-item-top">
                <div className="mr-item-title">
                  <strong>{r.requestedProvider ? `Request for ${r.requestedProvider}` : r.need}</strong>
                  <span>{[r.suburb, r.state].filter(Boolean).join(', ')} · ref {r.reference} · {new Date(r.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <span className={`mr-stage mr-stage-${r.stage}`}>{STAGE_LABEL[r.stage]}</span>
              </div>
              <RequestProgress request={r} compact />
              <div className="mr-item-actions">
                <button type="button" className="mr-link" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide details' : 'Show details'}</button>
                <Link className="mr-link" to={r.searchUrl.replace(window.location.origin, '')}>Compare providers →</Link>
              </div>
              {open === r.id && <div className="mr-details"><RequestProgress request={r} />{r.note && <p className="mr-note">{r.note}</p>}</div>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
