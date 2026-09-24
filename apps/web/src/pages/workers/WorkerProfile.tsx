import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getWorkerProfile, requestContact } from '../../api/resources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { ReviewForm, ReviewList, Stars } from '../../components/reviews/WorkerReviews';
import { getWorkerReviewsForOrg, submitWorkerReview, type OrgReviewList } from '../../api/profilesApi';
import { isUnlocked, type WorkerProfile as WorkerProfileType } from '@soldirectory/shared-types';
import './WorkerProfile.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkerProfile() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<WorkerProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);
  // Review state comes from the same request that loads the list, so the form and list never disagree.
  const [rv, setRv] = useState<Pick<OrgReviewList, 'eligible' | 'mine' | 'average' | 'total'> | null>(null);
  const [rvKey, setRvKey] = useState(0);
  const showToast = useToast();

  useEffect(() => {
    if (!id) return;
    getWorkerProfile(id)
      .then(setWorker)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function sendRequest() {
    if (!id) return;
    try {
      await requestContact(id);
      setRequested(true);
      setRvKey((k) => k + 1); // contacting the worker is what unlocks reviewing them
      showToast('Request sent. You will be notified if they accept.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not send that request.');
    }
  }

  if (loading) return <div className="profile-not-found">Loading…</div>;
  if (error || !worker) {
    return (
      <div className="profile-not-found">
        <p>{error || "That worker couldn't be found."}</p>
        <Link to="/workers">Back to directory</Link>
      </div>
    );
  }

  const unlocked = isUnlocked(worker);

  return (
    <div className="profile-page">
      <div className="profile-main">
        <div className="profile-header">
          <span className="profile-avatar-lg">{worker.firstName[0]}{worker.lastInitial}</span>
          <div>
            <h1 className="profile-name">
              {worker.firstName} {worker.lastInitial}.
            </h1>
            <p className="profile-meta">
              {worker.role} · {worker.employer} · {worker.yearsExperience}
            </p>
            <p className="profile-location">
              {worker.suburb} · {worker.gender} · {worker.hasCar ? 'Has own car' : 'No car'}
            </p>
          </div>
        </div>

        <section className="profile-section">
          <h2 className="profile-section-title">About</h2>
          <p className="profile-bio">{worker.bio}</p>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">Services</h2>
          <div className="profile-chip-row">
            {worker.services.map((s) => (
              <span key={s} className="profile-chip">{s}</span>
            ))}
          </div>
        </section>

        <section className="profile-section">
          <h2 className="profile-section-title">Availability</h2>
          <div className="profile-chip-row" style={{ marginBottom: 12 }}>
            {worker.availability.map((a) => (
              <span key={a} className="profile-chip">{a}</span>
            ))}
          </div>
          <div className="availability-grid">
            {DAYS.map((d) => (
              <div key={d} className={`availability-day ${worker.availableDays.includes(d) ? 'availability-day-active' : ''}`}>
                {d}
              </div>
            ))}
          </div>
          <p className="profile-times">{worker.availabilityNote}</p>
        </section>

        {worker.conditionExperience.length > 0 && (
          <section className="profile-section">
            <h2 className="profile-section-title">Condition experience</h2>
            <div className="profile-chip-row">
              {worker.conditionExperience.map((c) => (
                <span key={c} className="profile-chip">{c}</span>
              ))}
            </div>
          </section>
        )}

        <section className="profile-section">
          <h2 className="profile-section-title">Reviews</h2>
          <ReviewList
            refreshKey={rvKey}
            load={(page) => getWorkerReviewsForOrg(id!, page).then((r) => { setRv({ eligible: r.eligible, mine: r.mine, average: r.average, total: r.total }); return r; })}
          />
          {rv && (
            <div style={{ marginTop: 16 }}>
              <ReviewForm
                key={`${rv.mine?.status ?? 'none'}-${rv.eligible}`}
                workerFirstName={worker.firstName}
                eligible={rv.eligible}
                mine={rv.mine}
                onSubmit={async (input) => {
                  await submitWorkerReview(id!, input);
                  showToast('Thanks — your review is with us for checking.');
                  setRvKey((k) => k + 1);
                }}
              />
            </div>
          )}
        </section>
      </div>

      <aside className="profile-contact-panel">
        <p className="profile-rate">${worker.hourlyRate}<span>/hr</span></p>
        {rv && rv.total > 0 && rv.average !== null && (
          <p className="profile-rating-line"><Stars value={rv.average} /> {rv.average.toFixed(1)} ({rv.total} {rv.total === 1 ? 'review' : 'reviews'})</p>
        )}

        <div className="profile-contact-card">
          <p className="profile-contact-title">Contact</p>
          <p className="profile-contact-value">
            {unlocked ? `${worker.email} · ${worker.phone}` : 'Hidden until accepted'}
          </p>

          {!requested && !unlocked && (
            <button className="profile-request-btn" onClick={sendRequest}>
              Request contact
            </button>
          )}
          {requested && !unlocked && (
            <p className="profile-request-pending">Request sent — waiting for a reply</p>
          )}
          {unlocked && (
            <p className="profile-request-accepted">Accepted. Contact details are shown above.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
