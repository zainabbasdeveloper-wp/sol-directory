import './Pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

/**
 * Numbered pagination for the public directory. Shows real page numbers
 * (Page 1, 2, 3…) rather than an ever-appending "Load more" list — with
 * thousands of providers and independent workers, that keeps each page
 * load bounded instead of the results list only getting heavier the
 * longer someone browses.
 *
 * Always shows first, last, the current page and one neighbour on each
 * side, collapsing the rest into a single "…" so the control stays a
 * fixed, scannable width even with hundreds of pages.
 */
export default function Pagination({ page, totalPages, onChange, disabled }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageList(page, totalPages);

  return (
    <nav className="pg" aria-label="Search results pages">
      <button
        type="button"
        className="pg-btn pg-edge"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        <span className="pg-edge-label">Previous</span>
      </button>

      <ul className="pg-list">
        {pages.map((p, i) =>
          p === '…' ? (
            <li key={`gap-${i}`} className="pg-gap" aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={`pg-btn pg-num${p === page ? ' pg-num-active' : ''}`}
                onClick={() => onChange(p)}
                disabled={disabled}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        className="pg-btn pg-edge"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
      >
        <span className="pg-edge-label">Next</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </nav>
  );
}

/** [1, '…', 4, 5, 6, '…', 42] — first, last, current ±1, gaps collapsed. */
function pageList(current: number, total: number): (number | '…')[] {
  const spread = 1;
  const items = new Set<number>([1, total, current]);
  for (let d = 1; d <= spread; d++) {
    if (current - d >= 1) items.add(current - d);
    if (current + d <= total) items.add(current + d);
  }
  const sorted = [...items].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}
