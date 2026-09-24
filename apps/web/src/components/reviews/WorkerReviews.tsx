import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { ReviewList } from '../../api/profilesApi';
import './WorkerReviews.css';

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

/** Read-only stars with an accessible label. Half-stars are shown by width, so an average like 4.5 looks right. */
export function Stars({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span className="rv-stars" role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      <span className="rv-stars-back" aria-hidden="true">★★★★★</span>
      <span className="rv-stars-front" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

interface ListProps {
  /** Loads one page of approved reviews. */
  load: (page: number) => Promise<ReviewList>;
  /** Shown when a reviewer is signed out on a public page; omit where it doesn't apply. */
  emptyHint?: string;
  /** Re-run the load when this changes (e.g. after submitting a review). */
  refreshKey?: number;
}

/** Summary + approved reviews, newest first, with previous/next paging. */
export function ReviewList({ load, emptyHint, refreshKey = 0 }: ListProps) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewList | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    load(page).then((r) => { if (alive) setData(r); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refreshKey]);

  if (failed) return <p className="rv-empty">Reviews couldn’t be loaded just now.</p>;
  if (!data) return <p className="rv-empty">Loading reviews…</p>;

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="rv">
      {data.total === 0 ? (
        <p className="rv-empty">No reviews yet.{emptyHint ? ` ${emptyHint}` : ''}</p>
      ) : (
        <>
          <p className="rv-summary">
            <Stars value={data.average ?? 0} /> <strong>{(data.average ?? 0).toFixed(1)}</strong> from {data.total} {data.total === 1 ? 'review' : 'reviews'}
          </p>
          <ul className="rv-list">
            {data.items.map((r, i) => (
              <li key={`${r.at}-${i}`} className="rv-item">
                <div className="rv-item-head"><Stars value={r.rating} /><span className="rv-by">{r.by}</span><span className="rv-date">{monthYear(r.at)}</span></div>
                <p className="rv-text">{r.text}</p>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="rv-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
              <span>Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older →</button>
            </div>
          )}
        </>
      )}
      <p className="rv-note">
        Reviews are written by provider organisations that contacted this worker through SolDirectory and are checked by us before they appear.
        They reflect one organisation’s experience and are not a guarantee.
      </p>
    </div>
  );
}

interface FormProps {
  workerFirstName: string;
  eligible: boolean;
  mine: { rating: number; text: string; status: string } | null;
  onSubmit: (input: { rating: number; text: string; workedWith: boolean }) => Promise<void>;
}

/** For the organisation viewing a worker: write (or edit) a review, or see why they can't yet. */
export function ReviewForm({ workerFirstName, eligible, mine, onSubmit }: FormProps) {
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [text, setText] = useState(mine?.text ?? '');
  const [workedWith, setWorkedWith] = useState(!!mine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(!mine);

  useEffect(() => { if (mine) { setRating(mine.rating); setText(mine.text); setWorkedWith(true); setEditing(false); } }, [mine?.status, mine?.rating, mine?.text]);

  if (!eligible && !mine) {
    return <p className="rv-note">You can review {workerFirstName} after you’ve contacted them through SolDirectory.</p>;
  }

  if (mine && !editing) {
    return (
      <div className="rv-mine">
        <p>
          <strong>Your review</strong> — {mine.status === 'approved' ? 'published' : mine.status === 'rejected' ? 'not published' : 'waiting for our check'}.
        </p>
        <p className="rv-text">{mine.text}</p>
        <button type="button" className="rv-link" onClick={() => setEditing(true)}>Edit your review</button>
        {mine.status === 'approved' && <p className="rv-hint">Editing sends it back for checking, and it won’t count until it’s approved again.</p>}
      </div>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({ rating, text, workedWith });
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rv-form" onSubmit={submit}>
      <h3>Review {workerFirstName}</h3>
      <fieldset className="rv-rate">
        <legend>Your rating</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= rating ? 'rv-rate-on' : ''}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n} out of 5</span>
          </label>
        ))}
      </fieldset>
      <label className="rv-field">Your experience
        <textarea rows={5} minLength={20} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you work together on, and how did it go? Please keep it factual." required />
        <span className="rv-hint">{text.length}/600. Please don’t include phone numbers, emails or the names of people who receive support.</span>
      </label>
      <label className="rv-check">
        <input type="checkbox" checked={workedWith} onChange={(e) => setWorkedWith(e.target.checked)} />
        <span>I have worked with {workerFirstName}, and I understand this review is shown publicly with my business name.</span>
      </label>
      {error && <p className="rv-error" role="alert">{error}</p>}
      <div className="rv-actions">
        <button type="submit" className="rv-submit" disabled={busy || rating === 0}>{busy ? 'Sending…' : 'Send for checking'}</button>
        {mine && <button type="button" className="rv-link" onClick={() => setEditing(false)}>Cancel</button>}
      </div>
    </form>
  );
}
