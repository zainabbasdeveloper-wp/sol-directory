import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import './WorkerDirectory.css';

interface WorkerMasked {
  id: string;
  firstName: string;
  lastInitial: string;
  role: string;
  employer: string;
  yearsExperience: string;
  suburb: string;
  gender: string;
  hasCar: boolean;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  services: string[];
  languages: string[];
  conditionExperience: string[];
  availability: string[];
  availableDays: string[];
  availabilityNote: string;
  bio: string;
  feedback: { text: string; by: string }[];
}
interface SearchResult { items: WorkerMasked[]; page: number; limit: number; total: number; hasMore: boolean; }

// Self-contained fetch, same pattern as adminResources.ts — avoids
// depending on an existing resources.ts function whose exact
// signature isn't confirmed.
const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function searchWorkers(params: URLSearchParams): Promise<SearchResult> {
  const res = await fetch(`${API_URL}/workers?${params.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

// Options are static reference lists for the filter UI — matches the
// same pattern used elsewhere in this app (Home.tsx's SERVICES etc.),
// not fabricated from nothing.
const SUPPORT_TYPES = ['Personal care', 'Domestic assistance', 'Community access', 'Transport', 'Nursing', 'Therapy assistant', 'Overnight support', 'Behaviour support', 'Social support'];
const SUBURBS = ['Bankstown', 'Parramatta', 'Liverpool', 'Blacktown', 'Auburn', 'Lidcombe', 'Canterbury', 'Marrickville'];
const LANGUAGES = ['Arabic', 'Vietnamese', 'Mandarin', 'Cantonese', 'Greek', 'Auslan', 'Hindi', 'Spanish'];
const CONDITIONS = ['Autism', 'Dementia', 'Cerebral palsy', 'Spinal cord injury', 'Psychosocial', 'Diabetes', 'Acquired brain injury', 'Motor neurone disease'];
const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'price_asc', label: 'Lowest hourly rate' },
  { value: 'price_desc', label: 'Highest hourly rate' },
  { value: 'newest', label: 'Newest' },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="wd-stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i < Math.round(value) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path d="m12 2 3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 18.3l-6.4 3.4 1.4-7.2-5.3-5 7.2-.9Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

function WorkerCardSkeleton() {
  return (
    <div className="wd-card wd-skeleton">
      <div className="wd-skel-avatar" />
      <div className="wd-skel-line wd-skel-line-lg" />
      <div className="wd-skel-line wd-skel-line-md" />
      <div className="wd-skel-line wd-skel-line-sm" />
      <div className="wd-skel-chips">
        <div className="wd-skel-chip" /><div className="wd-skel-chip" /><div className="wd-skel-chip" />
      </div>
    </div>
  );
}

export default function WorkerDirectory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [service, setService] = useState(searchParams.get('service') ?? '');
  const [suburb, setSuburb] = useState(searchParams.get('suburb') ?? '');
  const [language, setLanguage] = useState(searchParams.get('language') ?? '');
  const [gender, setGender] = useState(searchParams.get('gender') ?? '');
  const [condition, setCondition] = useState(searchParams.get('condition') ?? '');
  const [maxRate, setMaxRate] = useState(Number(searchParams.get('maxRate')) || 150);
  const [minRating, setMinRating] = useState(Number(searchParams.get('minRating')) || 0);
  const [sort, setSort] = useState(searchParams.get('sort') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  const [items, setItems] = useState<WorkerMasked[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const skipNextUrlSync = useRef(false);

  const hasActiveFilters = !!(query || service || suburb || language || gender || condition || maxRate !== 150 || minRating > 0 || sort);

  const runSearch = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (service) params.set('service', service);
    if (suburb) params.set('suburb', suburb);
    if (language) params.set('language', language);
    if (gender) params.set('gender', gender);
    if (condition) params.set('condition', condition);
    if (maxRate !== 150) params.set('maxRate', String(maxRate));
    if (minRating > 0) params.set('minRating', String(minRating));
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '20');

    // URL stays shareable/bookmarkable/back-button-friendly.
    if (!skipNextUrlSync.current) setSearchParams(params, { replace: true });
    skipNextUrlSync.current = false;

    searchWorkers(params)
      .then((res) => { setItems(res.items); setTotal(res.total); setLimit(res.limit); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load workers.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, suburb, language, gender, condition, maxRate, minRating, sort, page]);

  // Debounce only the free-text query; every other filter re-searches immediately.
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); runSearch(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, suburb, language, gender, condition, maxRate, minRating, sort, page]);

  function resetFilters() {
    setQuery(''); setService(''); setSuburb(''); setLanguage(''); setGender('');
    setCondition(''); setMaxRate(150); setMinRating(0); setSort(''); setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filterPanel = (
    <>
      <h2 className="wd-filters-title">Filters</h2>

      <div className="wd-filter-block">
        <label className="wd-filter-label" htmlFor="wd-service">Support type</label>
        <select id="wd-service" className="wd-select" value={service} onChange={(e) => { setPage(1); setService(e.target.value); }}>
          <option value="">All supports</option>
          {SUPPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="wd-filter-block">
        <label className="wd-filter-label" htmlFor="wd-suburb">Suburb</label>
        <select id="wd-suburb" className="wd-select" value={suburb} onChange={(e) => { setPage(1); setSuburb(e.target.value); }}>
          <option value="">All suburbs</option>
          {SUBURBS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="wd-filter-block">
        <label className="wd-filter-label" htmlFor="wd-language">Language</label>
        <select id="wd-language" className="wd-select" value={language} onChange={(e) => { setPage(1); setLanguage(e.target.value); }}>
          <option value="">Any language</option>
          {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="wd-filter-block">
        <label className="wd-filter-label" htmlFor="wd-gender">Gender</label>
        <select id="wd-gender" className="wd-select" value={gender} onChange={(e) => { setPage(1); setGender(e.target.value); }}>
          <option value="">Any</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
      </div>

      <div className="wd-filter-block">
        <label className="wd-filter-label" htmlFor="wd-condition">Condition experience</label>
        <select id="wd-condition" className="wd-select" value={condition} onChange={(e) => { setPage(1); setCondition(e.target.value); }}>
          <option value="">Any experience</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="wd-filter-block">
        <div className="wd-slider-label-row">
          <label className="wd-filter-label" htmlFor="wd-rate">Maximum hourly rate</label>
          <span className="wd-slider-value">${maxRate}/hr</span>
        </div>
        <input
          id="wd-rate" type="range" min={20} max={150} value={maxRate} className="wd-slider"
          onChange={(e) => { setPage(1); setMaxRate(Number(e.target.value)); }}
          style={{ '--wd-fill': `${((maxRate - 20) / 130) * 100}%` } as React.CSSProperties}
        />
      </div>

      <div className="wd-filter-block">
        <div className="wd-slider-label-row">
          <label className="wd-filter-label" htmlFor="wd-rating">Minimum rating</label>
          <span className="wd-slider-value">{minRating > 0 ? minRating.toFixed(1) : 'Any'}</span>
        </div>
        <input
          id="wd-rating" type="range" min={0} max={5} step={0.5} value={minRating} className="wd-slider"
          onChange={(e) => { setPage(1); setMinRating(Number(e.target.value)); }}
          style={{ '--wd-fill': `${(minRating / 5) * 100}%` } as React.CSSProperties}
        />
      </div>

      <button className={`wd-reset-btn ${hasActiveFilters ? 'wd-reset-btn-active' : ''}`} disabled={!hasActiveFilters} onClick={resetFilters}>
        Reset filters
      </button>
    </>
  );

  return (
    <div className="wd-page">
      <div className="wd-intro">
        <h1 className="wd-heading">Find support workers</h1>
        <p className="wd-subheading">Browse workers by service, location, language and experience.</p>
      </div>

      <div className="wd-searchbar-row">
        <div className="wd-searchbar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="wd-search-icon">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            className="wd-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, service or keyword"
            aria-label="Search workers"
          />
          {query && (
            <button className="wd-search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
          )}
        </div>
        <button className="wd-mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>Filters</button>
      </div>

      <div className="wd-layout">
        <aside className="wd-filters-sidebar">{filterPanel}</aside>

        <div className="wd-results">
          {error ? (
            <div className="wd-error-state">
              <p className="wd-error-title">Unable to load workers</p>
              <p>Please try again.</p>
              <button className="wd-retry-btn" onClick={runSearch}>Retry</button>
            </div>
          ) : (
            <>
              <div className="wd-results-toolbar">
                <span className="wd-results-count">{loading ? 'Searching…' : `${total} worker${total === 1 ? '' : 's'} found`}</span>
                <label className="wd-sort-control">
                  <span>Sort by</span>
                  <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="wd-card-grid">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <WorkerCardSkeleton key={i} />)
                  : items.map((w) => (
                      <article
                        key={w.id}
                        className="wd-card"
                        tabIndex={0}
                        role="button"
                        onClick={() => navigate(`/workers/${w.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/workers/${w.id}`); }}
                      >
                        <div className="wd-card-top">
                          <span className="wd-avatar">{w.firstName[0]}</span>
                          <div className="wd-card-identity">
                            <h3 className="wd-name">{w.firstName} {w.lastInitial}.</h3>
                            <p className="wd-role">{w.role || 'Support worker'}</p>
                            <p className="wd-suburb">{w.suburb}</p>
                          </div>
                        </div>

                        <div className="wd-rating-row">
                          <Stars value={w.rating} />
                          <span className="wd-rating-value">{w.rating.toFixed(1)}</span>
                          <span className="wd-review-count">({w.reviewCount} reviews)</span>
                        </div>

                        <div className="wd-chip-row">
                          {w.services.slice(0, 3).map((s) => <span key={s} className="wd-chip">{s}</span>)}
                          {w.services.length > 3 && <span className="wd-chip wd-chip-more">+{w.services.length - 3} more</span>}
                        </div>

                        <div className="wd-card-footer">
                          <span className="wd-rate"><strong>${w.hourlyRate}</strong>/hr</span>
                          <span className="wd-view-link">View profile →</span>
                        </div>
                      </article>
                    ))}
              </div>

              {!loading && items.length === 0 && (
                <div className="wd-empty-state">
                  <p className="wd-empty-title">No workers found</p>
                  <p>Try removing a filter or broadening your search.</p>
                  <button className="wd-retry-btn" onClick={resetFilters}>Clear filters</button>
                </div>
              )}

              {!loading && totalPages > 1 && (
                <nav className="wd-pagination" aria-label="Pagination">
                  <button className="wd-page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
                  <span className="wd-page-indicator">Page {page} of {totalPages}</span>
                  <button className="wd-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="wd-drawer-overlay" onClick={() => setMobileFiltersOpen(false)}>
          <div className="wd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="wd-drawer-header">
              <span>Filters</span>
              <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">✕</button>
            </div>
            <div className="wd-drawer-body">{filterPanel}</div>
            <div className="wd-drawer-footer">
              <button className="wd-reset-btn wd-reset-btn-active" onClick={resetFilters}>Clear</button>
              <button className="wd-apply-btn" onClick={() => setMobileFiltersOpen(false)}>Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
