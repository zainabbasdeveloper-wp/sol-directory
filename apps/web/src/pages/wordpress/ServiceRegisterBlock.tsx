import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { getCategoryOverview, searchRegister, type CategoryOverview, type RegisterListItem } from '../../api/registerApi';
import { KIND_BY_TYPE, STATES, areaLabel, categoryForService, registerPath, type RegisterType } from '../../lib/registerMeta';

const AGED_CARE_CATEGORIES = ['Dementia care', 'Palliative care', 'Residential aged care'];
const fmt = (n: number) => n.toLocaleString('en-AU');

interface Props {
  serviceName: string;
  /** The register category set in WordPress for this service; falls back to matching the name. */
  category?: string;
}

const PAGE = 12;

/** Browsable list of the register providers that list this category, with a state filter and "show more". */
function ProviderList({ type, category, states, total }: { type: RegisterType; category: string; states: Record<string, number>; total: number }) {
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

  return (
    <div className="wp-cpt-plist">
      <h3 className="wp-cpt-h3">Providers listing {category.toLowerCase()}</h3>
      <div className="wp-cpt-chips" role="group" aria-label="Filter by state or territory">
        <button type="button" className={`wp-cpt-chip${state === '' ? ' is-on' : ''}`} aria-pressed={state === ''} onClick={() => pick('')}>All ({fmt(total)})</button>
        {stateRows.map((s) => (
          <button key={s.code} type="button" className={`wp-cpt-chip${state === s.code ? ' is-on' : ''}`} aria-pressed={state === s.code} onClick={() => pick(s.code)}>{s.code} ({fmt(states[s.code])})</button>
        ))}
      </div>
      {failed && <p className="wp-cpt-table-note" role="alert">We couldn’t load the list just now. Please try again shortly.</p>}
      <ul className="wp-cpt-cards" aria-busy={loading}>
        {items.map((p) => (
          <li key={p.slug} className="wp-cpt-card">
            <div className="wp-cpt-card-head">
              <Avatar src={p.logoUrl} name={p.name} shape="square" />
              <div>
                <h4 className="wp-cpt-card-title"><Link to={registerPath(kind, p.slug)}>{p.name}</Link></h4>
                <p className="wp-cpt-card-meta">
                  {p.areas.length > 0 ? `${p.areas.slice(0, 3).map(areaLabel).join(' · ')}${p.areaCount > 3 ? ` · +${fmt(p.areaCount - 3)} more` : ''}` : p.states.join(', ')}
                </p>
              </div>
            </div>
            {p.supportCategories.length > 0 && (
              <div className="wp-cpt-tags" aria-label="Support categories listed">
                {p.supportCategories.slice(0, 4).map((c) => <span key={c} className="wp-cpt-tag">{c}</span>)}
                {p.supportCategories.length > 4 && <span className="wp-cpt-tag">+{p.supportCategories.length - 4}</span>}
              </div>
            )}
            <Link className="wp-cpt-card-link" to={registerPath(kind, p.slug)}>View listing →</Link>
          </li>
        ))}
      </ul>
      {!loading && !failed && items.length === 0 && <p className="wp-cpt-table-note">No listings{stateName ? ` in ${stateName}` : ''} yet.</p>}
      <div className="wp-cpt-plist-foot">
        {items.length < count && <button type="button" className="btn-tint" disabled={loading} onClick={() => setPage((n) => n + 1)}>{loading ? 'Loading…' : `Show more (${fmt(count - items.length)} left)`}</button>}
        <Link className="wp-cpt-card-link" to={`${registerPath(kind, state ? STATES.find((s) => s.code === state)?.slug : undefined)}?category=${encodeURIComponent(category)}`}>
          Search all {stateName ? `${stateName} ` : ''}{category.toLowerCase()} providers with filters →
        </Link>
      </div>
      <p className="wp-cpt-table-note">Listed A–Z, not ranked. A register listing shows what the public register says, not who has capacity or the quality of their service.</p>
    </div>
  );
}

/**
 * "Listed on the public register" block for a WordPress service page:
 * how many providers list this support category, in which states, in which
 * suburbs, and which listings cover the most areas. Counts and names from the
 * imported register data only - no ranking of quality, no availability claims.
 * Renders nothing when the service fits no category or nobody lists it.
 */
export default function ServiceRegisterBlock({ serviceName, category: given }: Props) {
  const category = given || categoryForService(serviceName);
  const type: RegisterType = category && AGED_CARE_CATEGORIES.includes(category) ? 'aged_care' : 'ndis';
  const [data, setData] = useState<CategoryOverview | null>(null);

  useEffect(() => {
    if (!category) return;
    let alive = true;
    setData(null);
    getCategoryOverview(type, category).then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [type, category]);

  if (!category || !data || data.total === 0) return null;
  const kind = KIND_BY_TYPE[type];
  const rows = STATES.filter((s) => data.states[s.code]).sort((a, b) => data.states[b.code] - data.states[a.code]);
  const broader = category.toLowerCase() !== serviceName.trim().toLowerCase();
  const stateSlug = (code: string) => STATES.find((s) => s.code === code)?.slug ?? code.toLowerCase();

  return (
    <section id="wp-cpt-register" className="wp-cpt-section">
      <h2>{category} providers on the {kind.label} register</h2>
      <p>
        {fmt(data.total)} {kind.label} {data.total === 1 ? 'provider lists' : 'providers list'} {category.toLowerCase()} supports on the {kind.register}.
        {broader && <> “{serviceName}” falls under this wider category, so not every one of them offers it.</>}{' '}
        A register listing shows what the register says, not who has capacity, so check availability with the provider — or use
        “Get matched” to reach providers who have confirmed they can start.
      </p>

      <ProviderList type={type} category={category} states={data.states} total={data.total} />

      <h3 className="wp-cpt-h3">Listings by state and territory</h3>
      <table className="wp-cpt-table">
        <thead><tr><th scope="col">State or territory</th><th scope="col">Providers listing it</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.code}>
              <th scope="row"><Link to={`${registerPath(kind, s.slug)}?category=${encodeURIComponent(category)}`}>{s.name}</Link></th>
              <td>{fmt(data.states[s.code])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="wp-cpt-table-note">A provider that works in more than one state is counted in each, so the rows add up to more than the total.</p>

      {data.topSuburbs.length > 0 && (
        <>
          <h3 className="wp-cpt-h3">Suburbs with the most listings</h3>
          <div className="wp-cpt-provider-grid">
            {data.topSuburbs.slice(0, 12).map((s) => (
              <Link key={`${s.state}-${s.slug}`} className="wp-cpt-provider-card" to={`${registerPath(kind, stateSlug(s.state), s.slug)}?category=${encodeURIComponent(category)}`}>
                {s.suburb}, {s.state} · {fmt(s.count)}
              </Link>
            ))}
          </div>
        </>
      )}

      {data.widest.length > 0 && (
        <>
          <h3 className="wp-cpt-h3">Listings covering the most areas</h3>
          <ul className="wp-cpt-plain-list">
            {data.widest.slice(0, 8).map((w) => (
              <li key={w.slug}>
                <Link to={registerPath(kind, w.slug)}>{w.name}</Link> — listed for {fmt(w.areaCount)} {w.areaCount === 1 ? 'area' : 'areas'}
              </li>
            ))}
          </ul>
          <p className="wp-cpt-table-note">Ordered by how many areas each listing covers on the register, not by quality. Always confirm a provider’s current status on the official register.</p>
        </>
      )}
    </section>
  );
}
