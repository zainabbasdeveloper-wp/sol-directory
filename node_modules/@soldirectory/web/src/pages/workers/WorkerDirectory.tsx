import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchWorkers } from '../../api/resources';
import { ApiError } from '../../api/client';
import type { WorkerMasked, WorkerSearchQuery } from '@soldirectory/shared-types';
import './WorkerDirectory.css';

// These option lists mirror the design's SERVICES/SUBURBS/etc
// constants. Kept local since the directory-search UI needs them
// before any API call resolves — a small, static reference list, not
// duplicated business data.
const SERVICES = ['Personal care', 'Domestic assistance', 'Community access', 'Transport', 'Nursing', 'Therapy assistant', 'Meal preparation', 'Overnight support', 'Behaviour support', 'Social support'];
const SUBURBS = ['Bankstown', 'Parramatta', 'Liverpool', 'Blacktown', 'Auburn', 'Lidcombe', 'Canterbury', 'Marrickville'];
const LANGUAGES = ['Arabic', 'Vietnamese', 'Mandarin', 'Cantonese', 'Greek', 'Auslan', 'Hindi', 'Spanish'];
const CONDITIONS = ['Autism', 'Dementia', 'Cerebral palsy', 'Spinal cord injury', 'Psychosocial', 'Diabetes', 'Acquired brain injury', 'Motor neurone disease'];

const DEFAULT_QUERY: WorkerSearchQuery = { page: 1, limit: 20 };

export default function WorkerDirectory() {
  const [query, setQuery] = useState<WorkerSearchQuery>(DEFAULT_QUERY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<WorkerMasked[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // Debounce so every keystroke in the search box doesn't fire a
    // request — the server does the actual filtering, so this is
    // purely about not hammering the API.
    const t = setTimeout(async () => {
      try {
        const res = await searchWorkers(query);
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load workers.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function set<K extends keyof WorkerSearchQuery>(key: K, value: WorkerSearchQuery[K]) {
    setQuery((q) => ({ ...q, [key]: value, page: 1 }));
  }

  return (
    <div className="directory-page">
      <div className="directory-toolbar">
        <input
          className="directory-search"
          placeholder="Search by name or service"
          value={query.q ?? ''}
          onChange={(e) => set('q', e.target.value)}
        />
        <button className="directory-filter-toggle" onClick={() => setFiltersOpen((o) => !o)}>
          {filtersOpen ? 'Hide filters' : 'Filters'}
        </button>
      </div>

      <div className="directory-layout">
        <aside className={`directory-filters ${filtersOpen ? 'directory-filters-open' : ''}`}>
          <FilterSelect label="Support type" value={query.service ?? ''} onChange={(v) => set('service', v || undefined)} options={['', ...SERVICES]} placeholder="All supports" />
          <FilterSelect label="Suburb" value={query.suburb ?? ''} onChange={(v) => set('suburb', v || undefined)} options={['', ...SUBURBS]} placeholder="All suburbs" />
          <FilterSelect label="Language" value={query.language ?? ''} onChange={(v) => set('language', v || undefined)} options={['', ...LANGUAGES]} placeholder="Any language" />
          <FilterSelect label="Gender" value={query.gender ?? ''} onChange={(v) => set('gender', v || undefined)} options={['', 'Female', 'Male']} placeholder="Any" />
          <FilterSelect label="Condition experience" value={query.condition ?? ''} onChange={(v) => set('condition', v || undefined)} options={['', ...CONDITIONS]} placeholder="Any experience" />

          <div className="filter-block">
            <label className="filter-label">Max hourly rate: ${query.maxRate ?? 150}</label>
            <input
              type="range"
              min={20}
              max={150}
              value={query.maxRate ?? 150}
              onChange={(e) => set('maxRate', Number(e.target.value))}
              className="filter-range"
            />
          </div>

          <div className="filter-block">
            <label className="filter-label">Minimum rating: {query.minRating || 'Any'}</label>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={query.minRating ?? 0}
              onChange={(e) => set('minRating', Number(e.target.value))}
              className="filter-range"
            />
          </div>

          <button className="filter-clear" onClick={() => setQuery(DEFAULT_QUERY)}>
            Clear all filters
          </button>
        </aside>

        <div className="directory-results">
          {error && <div className="directory-empty">{error}</div>}
          {!error && (
            <>
              <p className="directory-count">
                {loading ? 'Searching…' : `${total} workers match your filters`}
              </p>
              <div className="worker-card-grid">
                {items.map((w) => (
                  <button key={w.id} className="worker-card" onClick={() => navigate(`/workers/${w.id}`)}>
                    <div className="worker-card-top">
                      <span className="worker-avatar">
                        {w.firstName[0]}
                      </span>
                      <div>
                        <p className="worker-name">{w.firstName} {w.lastInitial}.</p>
                        <p className="worker-role">{w.role} · {w.suburb}</p>
                      </div>
                    </div>
                    <div className="worker-rating-row">
                      <span className="worker-rating">★ {w.rating}</span>
                      <span className="worker-reviews">({w.reviewCount})</span>
                      <span className="worker-rate">${w.hourlyRate}/hr</span>
                    </div>
                    <div className="worker-services">
                      {w.services.slice(0, 3).map((s) => (
                        <span key={s} className="worker-service-chip">{s}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              {!loading && items.length === 0 && (
                <div className="directory-empty">No workers match these filters. Try widening your search.</div>
              )}
              {total > (query.limit ?? 20) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
                  <button
                    className="filter-clear"
                    disabled={(query.page ?? 1) <= 1}
                    onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
                  >
                    ← Previous
                  </button>
                  <button
                    className="filter-clear"
                    disabled={(query.page ?? 1) * (query.limit ?? 20) >= total}
                    onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="filter-block">
      <label className="filter-label">{label}</label>
      <select className="filter-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o === '' ? placeholder : o}
          </option>
        ))}
      </select>
    </div>
  );
}
