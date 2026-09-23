import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchRegister, type RegisterSearchResult } from '../../../api/registerApi';
import { KIND_BY_TYPE, REGISTER_KINDS, categoryForService, registerPath, stateByCode, type RegisterType } from '../../../lib/registerMeta';
import RegisterCard from './RegisterCard';
import { formatCount } from './RegisterParts';

interface Props { serviceName: string; suburbSlug: string; suburbName: string; stateAbbr: string }

/**
 * "Also listed on the public register" block for a service x suburb page.
 * Adds real, area-specific data to a page that otherwise only shows
 * providers who have joined SolDirectory — and says plainly that these are
 * register listings, not providers who've confirmed availability. Renders
 * nothing when there's nothing real to show.
 */
export default function RegisterNearby({ serviceName, suburbSlug, suburbName, stateAbbr }: Props) {
  const state = stateByCode(stateAbbr);
  const type: RegisterType = /aged/i.test(serviceName) ? 'aged_care' : 'ndis';
  const category = type === 'ndis' ? categoryForService(serviceName) : undefined;
  const [data, setData] = useState<RegisterSearchResult | null>(null);

  useEffect(() => {
    if (!state) return;
    let alive = true;
    setData(null);
    searchRegister({ type, state: state.code, suburb: suburbSlug, category, limit: 6 })
      .then((r) => { if (alive) setData(r); })
      .catch(() => {});
    return () => { alive = false; };
  }, [type, state, suburbSlug, category]);

  if (!state || !data || data.total === 0) return null;

  const kind = KIND_BY_TYPE[type];
  const seeAll = `${registerPath(kind, state.slug, suburbSlug)}${category ? `?category=${encodeURIComponent(category)}` : ''}`;

  return (
    <section id="register" aria-labelledby="register-heading">
      <h2 className="svc-h2" id="register-heading">Also listed on the public register in {suburbName}</h2>
      <p className="svc-p">
        {formatCount(data.total)} {kind.label} {data.total === 1 ? 'provider is' : 'providers are'} listed on the {kind.register} for {suburbName}
        {category ? <>, with {category.toLowerCase()} among the supports listed</> : null}. These listings show what the register says — not who has
        capacity — so check availability directly, or use “Get matched” above to reach providers who’ve confirmed they can start.
      </p>
      <ul className="dir-grid">{data.items.map((i) => <RegisterCard key={`${i.type}-${i.slug}`} item={i} />)}</ul>
      <p className="svc-p"><Link to={seeAll}>See all {formatCount(data.total)} {kind.label} providers listed in {suburbName} →</Link></p>
    </section>
  );
}
// Keep REGISTER_KINDS referenced so the kind table is the single source for paths.
void REGISTER_KINDS;
