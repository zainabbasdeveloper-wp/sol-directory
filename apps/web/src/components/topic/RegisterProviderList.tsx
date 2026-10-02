import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProviderMap from '../ProviderMap';
import RegisterCard from '../../pages/public/register/RegisterCard';
import { searchRegister, type RegisterListItem } from '../../api/registerApi';
import { KIND_BY_TYPE, STATES, registerPath, type RegisterType } from '../../lib/registerMeta';
import '../../pages/wordpress/WordPressCPTPage.css';

const fmt = (n: number) => n.toLocaleString('en-AU');
const PAGE = 12;

interface Props {
  type: RegisterType;
  /** Omit to list every provider on the register (no support-category filter). */
  category?: string;
  states: Record<string, number>;
  total: number;
  heading?: string;
}

/**
 * Browsable list of the public-register providers for a register (and
 * optionally one support category), with a state filter, a map and "show
 * more". Shared by the service pages (ServiceRegisterBlock) and the
 * condition / funding pages (TopicRegisterProviders) so a provider card
 * looks and behaves the same everywhere.
 */
export default function RegisterProviderList({ type, category, states, total, heading }: Props) {
  const kind = KIND_BY_TYPE[type];
  const [state, setState] = useState('');
  const [items, setItems] = useState<RegisterListItem[]>([]);
  const [count, setCount] = useState(total);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const stateRows = STATES.filter((s) => states[s.code]).sort((a, b) => states[b.code] - states[a.code]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    searchRegister({ type, category, state: state || undefined, page, limit: PAGE })
      .then((r) => { if (!alive) return; setCount(r.total); setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); })
      .catch(() => { if (alive) setFailed(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [type, category, state, page]);

  const pick = (code: string) => { setItems([]); setPage(1); setState(code); };
  const stateName = STATES.find((s) => s.code === state)?.name;
  const label = category ? category.toLowerCase() : `${kind.label} register`;

  return (
    <div className="wp-cpt-plist">
      <h3 className="wp-cpt-h3">{heading ?? (category ? `Providers listing ${category.toLowerCase()}` : `Providers on the ${kind.label} register`)}</h3>
      <div className="wp-cpt-chips" role="group" aria-label="Filter by state or territory">
        <button type="button" className={`wp-cpt-chip${state === '' ? ' is-on' : ''}`} aria-pressed={state === ''} onClick={() => pick('')}>All ({fmt(total)})</button>
        {stateRows.map((s) => (
          <button key={s.code} type="button" className={`wp-cpt-chip${state === s.code ? ' is-on' : ''}`} aria-pressed={state === s.code} onClick={() => pick(s.code)}>{s.code} ({fmt(states[s.code])})</button>
        ))}
      </div>
      {failed && <p className="wp-cpt-table-note" role="alert">We couldn’t load the list just now. Please try again shortly.</p>}
      {items.length > 0 && (
        <ProviderMap
          providers={items.map((p) => ({
            id: p.slug,
            name: p.name,
            location: p.location,
            category: p.supportCategories[0] ?? null,
            suburb: p.areas[0] ? `${p.areas[0].suburb}, ${p.areas[0].state}` : null,
            href: registerPath(kind, p.slug),
          }))}
        />
      )}
      <ul className="dir-grid" aria-busy={loading}>
        {items.map((p) => <RegisterCard key={p.slug} item={p} matchedCategory={category} />)}
      </ul>
      {!loading && !failed && items.length === 0 && <p className="wp-cpt-table-note">No listings{stateName ? ` in ${stateName}` : ''} yet.</p>}
      <div className="wp-cpt-plist-foot">
        {items.length < count && <button type="button" className="btn-tint" disabled={loading} onClick={() => setPage((n) => n + 1)}>{loading ? 'Loading…' : `Show more (${fmt(count - items.length)} left)`}</button>}
        <Link className="wp-cpt-card-link" to={`${registerPath(kind, state ? STATES.find((s) => s.code === state)?.slug : undefined)}${category ? `?category=${encodeURIComponent(category)}` : ''}`}>
          Search all {stateName ? `${stateName} ` : ''}{label} providers with filters →
        </Link>
      </div>
      <p className="wp-cpt-table-note">Listed A–Z, not ranked. A register listing shows what the public register says, not who has capacity or the quality of their service.</p>
    </div>
  );
}
