import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWorkerReviews, moderateWorkerReview, type AdminReview, type AdminReviewList, type ReviewStatus } from '../../api/adminReviews';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import { Stars } from '../../components/reviews/WorkerReviews';
import './AdminProviders.css';
import './AdminClaims.css';

const FILTERS: { id: ReviewStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'To review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Moderation queue for worker reviews. Nothing a provider writes appears
 * publicly or counts toward a rating until it's approved here.
 */
export default function AdminWorkerReviews() {
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminReviewList | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const showToast = useToast();

  function load() {
    setLoading(true);
    listWorkerReviews(filter, page)
      .then(setData)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load reviews.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter, page]);

  async function decide(r: AdminReview, status: ReviewStatus) {
    setBusyId(r.id);
    try {
      await moderateWorkerReview(r.id, status, notes[r.id]);
      showToast(status === 'approved' ? 'Review approved and published.' : status === 'rejected' ? 'Review rejected.' : 'Moved back to review.');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this review.');
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Worker reviews</h1>
        <div className="admin-providers-filter">
          {FILTERS.map((f) => (
            <button key={f.id} className={`admin-filter-pill ${filter === f.id ? 'admin-filter-pill-active' : ''}`} onClick={() => { setFilter(f.id); setPage(1); }}>
              {f.label}{f.id !== 'all' && data?.counts[f.id] ? ` (${data.counts[f.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <p className="claims-note">
        Approve reviews that are factual and about the worker’s work. Reject anything abusive, off-topic, or that names people receiving
        support or includes contact details. Approving publishes the review with the reviewer’s business name and updates the worker’s rating.
      </p>

      {loading && !data ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-providers-empty">{filter === 'pending' ? 'No reviews waiting for a decision.' : 'Nothing here.'}</p>
      ) : (
        <div className="claims-list">
          {items.map((r) => (
            <article key={r.id} className="claims-card">
              <div className="claims-card-main">
                <h2 className="claims-listing">
                  <Link to={`/workers/${r.workerId}`} target="_blank" rel="noopener">{r.workerName}</Link>
                  {r.workerPlace && <span className="claims-type">{r.workerPlace}</span>}
                </h2>
                <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                  <Stars value={r.rating} /> <strong>{r.rating}/5</strong> <span className="claims-role">from {r.reviewerName}</span>
                </p>
                <p className="claims-message" style={{ marginTop: 10 }}>{r.text}</p>
                <dl className="claims-facts"><div><dt>Written</dt><dd>{fmtDate(r.createdAt)}</dd></div></dl>
                {r.moderationNote && <p className="claims-role" style={{ marginTop: 8 }}>Note: {r.moderationNote}</p>}
                {r.status !== 'approved' && (
                  <input
                    className="claims-note-input"
                    placeholder="Optional note for our records (not shown publicly)"
                    maxLength={300}
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  />
                )}
              </div>
              <div className="claims-actions">
                <span className={`claims-status claims-status-${r.status === 'pending' ? 'new' : r.status}`}>{r.status === 'pending' ? 'To review' : r.status}</span>
                {r.status !== 'approved' && <button className="admin-toggle-btn admin-toggle-btn-activate" disabled={busyId === r.id} onClick={() => decide(r, 'approved')}>Approve</button>}
                {r.status !== 'rejected' && <button className="admin-toggle-btn admin-toggle-btn-suspend" disabled={busyId === r.id} onClick={() => decide(r, 'rejected')}>Reject</button>}
                {r.status !== 'pending' && <button className="claims-undo" disabled={busyId === r.id} onClick={() => decide(r, 'pending')}>Move back to review</button>}
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
    </div>
  );
}
