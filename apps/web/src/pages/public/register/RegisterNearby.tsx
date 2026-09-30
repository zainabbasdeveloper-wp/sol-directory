import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchRegister, type RegisterSearchResult } from '../../../api/registerApi';
import { KIND_BY_TYPE, REGISTER_KINDS, categoryForService, registerPath, stateByCode, type RegisterType } from '../../../lib/registerMeta';
import RegisterCard from './RegisterCard';
import { formatCount } from './RegisterParts';

interface Props { serviceName: string; suburbSlug: string; suburbName: string; stateAbbr: string }

/**
 * Public-register listings for a service x suburb page. These are separate
 * from active SolDirectory member profiles and must retain their source label.
 * Renders nothing when there is no matching register data.
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
      <h2 className="svc-h2" id="register-heading">{kind.label} register listings for {serviceName.toLowerCase()} in {suburbName}</h2>
      <p className="svc-p">
        {formatCount(data.total)} {kind.label} {data.total === 1 ? 'listing includes' : 'listings include'} {category?.toLowerCase() ?? serviceName.toLowerCase()} among the supports recorded on the {kind.register} for {suburbName}. These are public-register listings, shown separately from SolDirectory member profiles. Confirm current services and availability directly with each organisation.
      </p>
      <ul className="dir-grid">{data.items.map((i) => <RegisterCard key={`${i.type}-${i.slug}`} item={i} />)}</ul>
      <p className="svc-p"><Link to={seeAll}>See all {formatCount(data.total)} {kind.label} providers listed in {suburbName} →</Link></p>
    </section>
  );
}
// Keep REGISTER_KINDS referenced so the kind table is the single source for paths.
void REGISTER_KINDS;
