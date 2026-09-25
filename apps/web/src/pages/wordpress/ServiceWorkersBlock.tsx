import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { Stars } from '../../components/reviews/WorkerReviews';
import { listWorkersForService, workerPhotoUrl, type ServiceWorkers } from '../../api/profilesApi';
import { STATES } from '../../lib/registerMeta';

const PAGE = 6;
const fmt = (n: number) => n.toLocaleString('en-AU');

interface Props {
  serviceName: string;
  category?: string;
}

/**
 * Independent support workers who chose to publish a profile for this service
 * (opt-in and admin-approved only). Shows real profiles or, when there are none
 * yet, says so and points to the worker sign-up: never placeholder people.
 */
export default function ServiceWorkersBlock({ serviceName, category }: Props) {
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ServiceWorkers | null>(null);
  const [items, setItems] = useState<ServiceWorkers['items']>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // The state chips and headline come from the first, unfiltered answer.
  const [base, setBase] = useState<ServiceWorkers | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    listWorkersForService({ title: serviceName, category, state: state || undefined, page, limit: PAGE })
      .then((r) => {
        if (!alive) return;
        setData(r);
        setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
        if (!state && page === 1) setBase(r);
      })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [serviceName, category, state, page]);

  if (failed && !data) return null;
  if (!base && loading) return null;

  const total = base?.allTotal ?? 0;
  const level = base?.level ?? null;
  const wide = (category ?? serviceName).toLowerCase();
  const stateRows = STATES.filter((s) => base?.states[s.code]).sort((a, b) => (base?.states[b.code] ?? 0) - (base?.states[a.code] ?? 0));
  const pick = (code: string) => { setItems([]); setPage(1); setState(code); };

  return (
    <section id="wp-cpt-workers" className="wp-cpt-section">
      <h2>Independent support workers for {serviceName.toLowerCase()}</h2>

      {total === 0 ? (
        <>
          <p>
            No independent workers have published a public profile for {serviceName.toLowerCase()} yet. Workers appear here once they have chosen to make
            their profile public and it has been approved, so this list only ever shows real people.
          </p>
          <div className="wp-cpt-plist-foot">
            <Link className="btn-gradient" to="/signup?role=worker">Create a worker profile</Link>
            <Link className="wp-cpt-card-link" to="/independent-workers">How independent workers work on SolDirectory →</Link>
          </div>
        </>
      ) : (
        <>
          <p>
            {fmt(total)} independent {total === 1 ? 'worker has' : 'workers have'} published a public profile listing{' '}
            {level === 'service' ? serviceName.toLowerCase() : `${wide} supports, the wider category ${serviceName.toLowerCase()} falls under`}.
            Contact details are not shown; organisations request contact through SolDirectory.
          </p>
          {stateRows.length > 1 && (
            <div className="wp-cpt-chips" role="group" aria-label="Filter workers by state or territory">
              <button type="button" className={`wp-cpt-chip${state === '' ? ' is-on' : ''}`} aria-pressed={state === ''} onClick={() => pick('')}>All ({fmt(total)})</button>
              {stateRows.map((s) => (
                <button key={s.code} type="button" className={`wp-cpt-chip${state === s.code ? ' is-on' : ''}`} aria-pressed={state === s.code} onClick={() => pick(s.code)}>{s.code} ({fmt(base?.states[s.code] ?? 0)})</button>
              ))}
            </div>
          )}
          <ul className="wp-cpt-cards" aria-busy={loading}>
            {items.map((w) => {
              const name = `${w.firstName} ${w.lastInitial ? `${w.lastInitial}.` : ''}`.trim();
              return (
                <li key={w.slug} className="wp-cpt-card">
                  <div className="wp-cpt-card-head">
                    <Avatar src={workerPhotoUrl(w)} name={name} size="md" />
                    <div>
                      <h4 className="wp-cpt-card-title"><Link to={`/independent-workers/${w.slug}`}>{name}</Link></h4>
                      <p className="wp-cpt-card-meta">{[w.role, [w.suburb, w.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  {w.services.length > 0 && (
                    <div className="wp-cpt-tags" aria-label="Supports offered">
                      {w.services.slice(0, 4).map((s) => <span key={s} className="wp-cpt-tag">{s}</span>)}
                      {w.services.length > 4 && <span className="wp-cpt-tag">+{w.services.length - 4}</span>}
                    </div>
                  )}
                  <p className="wp-cpt-card-meta">
                    {[w.yearsExperience && `${w.yearsExperience} experience`, w.languages.length > 0 && w.languages.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}
                  </p>
                  {w.rating !== null && <p className="wp-cpt-card-meta"><Stars value={w.rating} /> <strong>{w.rating.toFixed(1)}</strong> ({w.reviewCount} {w.reviewCount === 1 ? 'review' : 'reviews'})</p>}
                  <Link className="wp-cpt-card-link" to={`/independent-workers/${w.slug}`}>View profile →</Link>
                </li>
              );
            })}
          </ul>
          <div className="wp-cpt-plist-foot">
            {data?.hasMore && <button type="button" className="btn-tint" disabled={loading} onClick={() => setPage((n) => n + 1)}>{loading ? 'Loading…' : 'Show more workers'}</button>}
            <Link className="wp-cpt-card-link" to={`/independent-workers/find?service=${encodeURIComponent(base?.matchedNames[0] ?? serviceName)}`}>Search all independent workers →</Link>
          </div>
        </>
      )}
    </section>
  );
}
