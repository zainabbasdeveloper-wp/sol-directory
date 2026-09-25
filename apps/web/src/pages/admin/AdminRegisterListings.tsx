import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRegisterAdmin, getRegisterAdminSummary, type AdminRegisterItem, type AdminRegisterList, type AdminRegisterSummary } from '../../api/adminRegister';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import { SUPPORT_CATEGORIES, STATES } from '../../lib/registerMeta';
import './AdminProviders.css';
import './AdminClaims.css';

const CLAIM_FILTERS: { id: AdminRegisterItem['claimStatus'] | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'unclaimed', label: 'Unclaimed' },
  { id: 'requested', label: 'Requested' },
  { id: 'claimed', label: 'Claimed' },
];

const fmt = (n: number) => n.toLocaleString('en-AU');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { dateStyle: 'medium' });

/**
 * Admin browse of the imported directory inventory (RegisterListing) — the
 * ~26,000 facts-only listings pulled from the public NDIS/My Aged Care
 * registers, none of them a real SolDirectory account. Search, filter and
 * inspect; the claim workflow itself lives at /admin/claims.
 */
export default function AdminRegisterListings() {
  const [summary, setSummary] = useState<AdminRegisterSummary | null>(null);
  const [type, setType] = useState<'' | 'ndis' | 'aged_care'>('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [claimStatus, setClaimStatus] = useState<AdminRegisterItem['claimStatus'] | ''>('');
  const [q, setQ] = useState('');
  const [qText, setQText] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminRegisterList | null>(null);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => { getRegisterAdminSummary().then(setSummary).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    listRegisterAdmin({ type: type || undefined, state: state || undefined, category: category || undefined, claimStatus: claimStatus || undefined, q: q || undefined, page })
      .then(setData)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load the directory inventory.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, state, category, claimStatus, q, page]);

  const items = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Directory inventory</h1>
      </div>

      <p className="claims-note">
        The listings imported from the public NDIS and My Aged Care registers — facts only (name, categories, service areas, website), never an
        account, never counted toward matching. A business becomes a real SolDirectory provider only by claiming its listing at{' '}
        <Link to="/admin/claims">Listing claims</Link>.
      </p>

      {summary && (
        <p className="claims-note">
          {fmt(summary.total)} listings total — {fmt(summary.byType.ndis ?? 0)} NDIS, {fmt(summary.byType.aged_care ?? 0)} aged care.{' '}
          {fmt(summary.byClaimStatus.claimed ?? 0)} claimed, {fmt(summary.byClaimStatus.requested ?? 0)} requested,{' '}
          {fmt(summary.byClaimStatus.unclaimed ?? 0)} still unclaimed. {summary.openClaimRequests} open claim {summary.openClaimRequests === 1 ? 'request' : 'requests'} to review.
        </p>
      )}

      <div className="admin-providers-header">
        <div className="admin-providers-filter">
          {(['', 'ndis', 'aged_care'] as const).map((t) => (
            <button key={t || 'all'} className={`admin-filter-pill ${type === t ? 'admin-filter-pill-active' : ''}`} onClick={() => reset(() => setType(t))}>
              {t === '' ? 'All registers' : t === 'ndis' ? 'NDIS' : 'Aged care'}
            </button>
          ))}
        </div>
        <div className="admin-providers-filter">
          {CLAIM_FILTERS.map((f) => (
            <button
              key={f.id || 'all'}
              className={`admin-filter-pill ${claimStatus === f.id ? 'admin-filter-pill-active' : ''}`}
              onClick={() => reset(() => setClaimStatus(f.id))}
            >
              {f.label}{f.id && data?.counts[f.id] ? ` (${fmt(data.counts[f.id] ?? 0)})` : ''}
            </button>
          ))}
        </div>
      </div>

      <form className="admin-providers-header" onSubmit={(e) => { e.preventDefault(); reset(() => setQ(qText.trim())); }}>
        <input
          type="search"
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="Search by name"
          aria-label="Search listings by name"
          style={{ minWidth: 220 }}
        />
        <select value={state} onChange={(e) => reset(() => setState(e.target.value))} aria-label="Filter by state">
          <option value="">All states</option>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select value={category} onChange={(e) => reset(() => setCategory(e.target.value))} aria-label="Filter by category">
          <option value="">All categories</option>
          {SUPPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="btn-tint">Search</button>
      </form>

      {loading && !data ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="admin-providers-empty">No listings match these filters.</p>
      ) : (
        <div className="claims-list">
          {items.map((it) => (
            <article key={it.id} className="claims-card">
              <div className="claims-card-main">
                <h2 className="claims-listing">
                  <Link to={`/${it.type === 'ndis' ? 'ndis-providers' : 'aged-care-providers'}/${it.slug}`} target="_blank" rel="noopener">{it.name}</Link>
                  <span className="claims-type">
                    {it.type === 'ndis' ? 'NDIS' : 'Aged care'} · {it.states.join(', ')} · {fmt(it.areaCount)} {it.areaCount === 1 ? 'area' : 'areas'}{it.hasWebsite ? ' · has website' : ''}
                  </span>
                </h2>
                {it.supportCategories.length > 0 && (
                  <p className="claims-message">{it.supportCategories.slice(0, 5).join(', ')}{it.supportCategories.length > 5 ? ` +${it.supportCategories.length - 5} more` : ''}</p>
                )}
                <dl className="claims-facts">
                  <div><dt>Imported</dt><dd>{fmtDate(it.importedAt)}</dd></div>
                </dl>
              </div>
              <div className="claims-actions">
                <span className={`claims-status claims-status-${it.claimStatus === 'claimed' ? 'verified' : 'new'}`}>
                  {it.claimStatus === 'claimed' ? 'Claimed' : it.claimStatus === 'requested' ? 'Claim requested' : 'Unclaimed'}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={setPage} />
    </div>
  );
}
