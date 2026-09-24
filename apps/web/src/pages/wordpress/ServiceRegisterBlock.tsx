import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryOverview, type CategoryOverview } from '../../api/registerApi';
import { KIND_BY_TYPE, STATES, categoryForService, registerPath, type RegisterType } from '../../lib/registerMeta';

const AGED_CARE_CATEGORIES = ['Dementia care', 'Palliative care', 'Residential aged care'];
const fmt = (n: number) => n.toLocaleString('en-AU');

interface Props {
  serviceName: string;
  /** The register category set in WordPress for this service; falls back to matching the name. */
  category?: string;
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
