import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClaims, setClaimStatus, type AdminClaim, type AdminClaimList, type ClaimStatus } from '../../api/adminClaims';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import './AdminProviders.css';
import './AdminClaims.css';

const FILTERS: { id: ClaimStatus | 'all'; label: string }[] = [
  { id: 'new', label: 'To review' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const listingPath = (c: AdminClaim) => `/${c.type === 'ndis' ? 'ndis-providers' : 'aged-care-providers'}/${c.slug}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Review queue for "this is my business" requests on public-register
 * listings. A reviewer compares the person's details with the listing's
 * own website / the official register, then marks the request verified
 * or rejected. Verifying records the decision (and marks the listing
 * claimed); it doesn't create an account — the business signs up as
 * usual.
 */
export default function AdminClaims() {
  const [filter, setFilter] = useState<ClaimStatus | 'all'>('new');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminClaimList | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const showToast = useToast();

  function load() {
    setLoading(true);
    listClaims(filter, page)
      .then(setData)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load claim requests.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter, page]);

  async function decide(c: AdminClaim, status: ClaimStatus) {
    setBusyId(c.id);
    try {
      await setClaimStatus(c.id, status);
      showToast(status === 'verified' ? `${c.listingName} marked as claimed.` : status === 'rejected' ? 'Request rejected.' : 'Moved back to review.');
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this request.');
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Listing claims</h1>
        <div className="admin-providers-filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`admin-filter-pill ${filter === f.id ? 'admin-filter-pill-active' : ''}`}
              onClick={() => { setFilter(f.id); setPage(1); }}
            >
              {f.label}
              {f.id !== 'all' && data?.counts[f.id] ? ` (${data.counts[f.id]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <p className="claims-note">
        Check each request against the business’s own website or the official register before verifying. Verifying marks the
        listing as claimed; it does not create an account.
      </p>

      {loading && !data ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-providers-empty">{filter === 'new' ? 'No claim requests waiting for review.' : 'Nothing here.'}</p>
      ) : (
        <div className="claims-list">
          {items.map((c) => (
            <article key={c.id} className="claims-card">
              <div className="claims-card-main">
                <h2 className="claims-listing">
                  <Link to={listingPath(c)} target="_blank" rel="noopener">{c.listingName}</Link>
                  <span className="claims-type">{c.type === 'ndis' ? 'NDIS' : 'Aged care'}{c.states.length ? ` · ${c.states.join(', ')}` : ''}</span>
                </h2>
                {c.website && (
                  <a className="claims-website" href={c.website} target="_blank" rel="noopener noreferrer nofollow">{c.website.replace(/^https?:\/\//, '')}</a>
                )}
                <dl className="claims-facts">
                  <div><dt>From</dt><dd>{c.name} <span className="claims-role">({c.role})</span></dd></div>
                  <div><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>
                  {c.phone && <div><dt>Phone</dt><dd>{c.phone}</dd></div>}
                  <div><dt>Sent</dt><dd>{fmtDate(c.createdAt)}</dd></div>
                </dl>
                {c.message && <p className="claims-message">“{c.message}”</p>}
              </div>
              <div className="claims-actions">
                <span className={`claims-status claims-status-${c.status}`}>{c.status === 'new' ? 'To review' : c.status}</span>
                {c.status !== 'verified' && (
                  <button className="admin-toggle-btn admin-toggle-btn-activate" disabled={busyId === c.id} onClick={() => decide(c, 'verified')}>Verify</button>
                )}
                {c.status !== 'rejected' && (
                  <button className="admin-toggle-btn admin-toggle-btn-suspend" disabled={busyId === c.id} onClick={() => decide(c, 'rejected')}>Reject</button>
                )}
                {c.status !== 'new' && (
                  <button className="claims-undo" disabled={busyId === c.id} onClick={() => decide(c, 'new')}>Move back to review</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} disabled={loading} />
    </div>
  );
}
