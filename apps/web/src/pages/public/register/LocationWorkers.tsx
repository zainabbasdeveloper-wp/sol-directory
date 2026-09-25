import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';
import { Stars } from '../../../components/reviews/WorkerReviews';
import { listPublicWorkers, workerPhotoUrl, type PublicWorkerList } from '../../../api/profilesApi';
import '../Directory.css';
import './register.css';

/**
 * Independent workers who published a profile for this suburb (or, on a state
 * page, this state). Opt-in and admin-approved only; says so plainly when there
 * are none rather than showing anyone made up.
 */
export default function LocationWorkers({ stateCode, stateName, suburbName }: { stateCode: string; stateName: string; suburbName?: string }) {
  const [data, setData] = useState<PublicWorkerList | null>(null);
  const [failed, setFailed] = useState(false);
  const where = suburbName ? `${suburbName}, ${stateCode}` : stateName;

  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    listPublicWorkers({ state: stateCode, suburb: suburbName, limit: 6 })
      .then((r) => { if (alive) setData(r); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [stateCode, suburbName]);

  if (failed || !data) return null;
  const find = `/independent-workers/find?${new URLSearchParams({ ...(suburbName ? { suburb: suburbName } : {}) }).toString()}`;

  return (
    <section aria-labelledby="loc-workers">
      <h2 className="reg-h2" id="loc-workers">Independent support workers in {where}</h2>
      {data.total === 0 ? (
        <p>
          No independent workers have published a public profile for {where} yet. Workers appear here once they have chosen to make their profile public and it has been approved.{' '}
          <Link to="/signup?role=worker">Create a worker profile</Link>
        </p>
      ) : (
        <>
          <p>{data.total.toLocaleString('en-AU')} independent {data.total === 1 ? 'worker has' : 'workers have'} published a public profile for {where}. Contact details are not shown; organisations request contact through SolDirectory.</p>
          <ul className="dir-grid">
            {data.items.map((w) => {
              const name = `${w.firstName} ${w.lastInitial ? `${w.lastInitial}.` : ''}`.trim();
              return (
                <li key={w.slug} className="dir-card">
                  <div className="dir-card-top">
                    <Avatar src={workerPhotoUrl(w)} name={name} size="md" />
                    <div className="dir-card-title">
                      <h3><Link to={`/independent-workers/${w.slug}`}>{name}</Link></h3>
                      <span className="reg-badge">{[w.role, [w.suburb, w.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                    </div>
                  </div>
                  {w.services.length > 0 && (
                    <div className="dir-tags" aria-label="Supports offered">
                      {w.services.slice(0, 4).map((s) => <span key={s} className="dir-tag">{s}</span>)}
                      {w.services.length > 4 && <span className="dir-tag dir-tag-more">+{w.services.length - 4} more</span>}
                    </div>
                  )}
                  {w.rating !== null && <p className="dir-areas"><Stars value={w.rating} /> <strong>{w.rating.toFixed(1)}</strong> ({w.reviewCount})</p>}
                  <Link className="dir-card-cta reg-card-link" to={`/independent-workers/${w.slug}`}>View profile →</Link>
                </li>
              );
            })}
          </ul>
          {data.total > data.items.length && <p><Link to={find}>See all {data.total.toLocaleString('en-AU')} workers →</Link></p>}
        </>
      )}
    </section>
  );
}
