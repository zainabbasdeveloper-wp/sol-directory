import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategoryCounts, type CategoryCounts } from '../../api/registerApi';
import { KIND_BY_TYPE, STATES, categoryForService, registerPath, type RegisterType } from '../../lib/registerMeta';

const AGED_CARE_CATEGORIES = ['Dementia care', 'Palliative care', 'Residential aged care'];
const fmt = (n: number) => n.toLocaleString('en-AU');

/**
 * "Listed on the public register" block for a WordPress service page.
 *
 * The service pages' own copy comes from WordPress. This adds what only the
 * application knows: how many providers on the public register list this kind
 * of support, and where. Real numbers only - the block renders nothing when
 * the service doesn't fit a register category or nobody lists it - and it
 * says plainly that a register listing isn't a statement of availability.
 */
export default function ServiceRegisterBlock({ serviceName }: { serviceName: string }) {
  const category = categoryForService(serviceName);
  const type: RegisterType = category && AGED_CARE_CATEGORIES.includes(category) ? 'aged_care' : 'ndis';
  const [data, setData] = useState<CategoryCounts | null>(null);

  useEffect(() => {
    if (!category) return;
    let alive = true;
    setData(null);
    getCategoryCounts(type, category).then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [type, category]);

  if (!category || !data || data.total === 0) return null;
  const kind = KIND_BY_TYPE[type];
  const withCounts = STATES.filter((s) => data.states[s.code]);
  const broader = category.toLowerCase() !== serviceName.trim().toLowerCase();

  return (
    <section id="wp-cpt-register" className="wp-cpt-section">
      <h2>Providers on the {kind.label} register</h2>
      <p>
        {fmt(data.total)} {kind.label} {data.total === 1 ? 'provider lists' : 'providers list'} {category.toLowerCase()} supports on the {kind.register}.
        {broader && <> “{serviceName}” falls under this wider category, so not every one of them offers it.</>}{' '}
        A register listing shows what the register says, not who has capacity, so check availability with the provider — or use
        “Get matched” to reach providers who have confirmed they can start.
      </p>
      <div className="wp-cpt-provider-grid">
        {withCounts.map((s) => (
          <Link key={s.code} className="wp-cpt-provider-card" to={`${registerPath(kind, s.slug)}?category=${encodeURIComponent(category)}`}>
            {s.name} · {fmt(data.states[s.code])}
          </Link>
        ))}
      </div>
    </section>
  );
}
