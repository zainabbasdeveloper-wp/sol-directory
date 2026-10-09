import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { bannerFor, hubHeaderStyle } from '../../data/bannerImages';
import { SERVICES } from '../../data/providers';
import { slugify } from '../../data/slugHelpers';
import { STATE_INFO, LOCATION_FAQS } from '../../data/locationInfo';
import { KIND_BY_TYPE, STATES, registerPath, stateByCode } from '../../lib/registerMeta';
import { listPublicAreas, type CountRow } from '../../api/profilesApi';
import { getRegisterHub, getServiceSuburbs, type RegisterHub } from '../../api/registerApi';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel } from '../../lib/statsCounts';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Directory.css';
import './Home.css';
import './register/register.css';
import './Locations.css';

const fmt = (n: number) => n.toLocaleString('en-AU');
const SEO_SERVICES = SERVICES.filter((service) => service !== 'All services');

type ServiceAreas = Record<string, { state: string; slug: string; suburb: string; count: number }[]>;

export default function Locations() {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();
  const stats = useSiteStats();
  const [areas, setAreas] = useState<CountRow[]>([]);
  const [ndis, setNdis] = useState<RegisterHub | null>(null);
  const [aged, setAged] = useState<RegisterHub | null>(null);
  const [serviceAreas, setServiceAreas] = useState<ServiceAreas>({});
  const [suburbState, setSuburbState] = useState('');
  const [suburbQuery, setSuburbQuery] = useState('');
  const [topState, setTopState] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    let alive = true;
    listPublicAreas().then((r) => { if (alive) setAreas(r.items.slice(0, 36)); }).catch(() => {});
    getRegisterHub('ndis').then((r) => { if (alive) setNdis(r); }).catch(() => {});
    getRegisterHub('aged_care').then((r) => { if (alive) setAged(r); }).catch(() => {});
    Promise.all(SEO_SERVICES.map((s) => getServiceSuburbs(s, 6).then((r) => [s, r.suburbs] as const).catch(() => [s, []] as const)))
      .then((pairs) => { if (alive) setServiceAreas(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    applySeoTags({
      title: 'Find NDIS and aged care providers by location | SolDirectory',
      description: 'Browse NDIS and aged care providers by Australian state, city and suburb. See live public-register counts, the busiest suburbs, and support by service and location.',
      canonicalUrl: `${window.location.origin}/locations`,
    });
    setJsonLd('locations-faq', {
      '@type': 'FAQPage',
      mainEntity: LOCATION_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
    return () => setJsonLd('locations-faq', null);
  }, []);

  const memberByState = stats?.providersByState ?? {};
  const ndisTotal = ndis?.total ?? 0;
  const agedTotal = aged?.total ?? 0;
  const suburbsWithListings = useMemo(() => new Set([...(ndis?.suburbs ?? []), ...(aged?.suburbs ?? [])].map((s) => `${s.state}|${s.slug}`)).size, [ndis, aged]);

  // The suburbs with the most register listings, optionally narrowed to one state.
  const topSuburbs = useMemo(
    () => (ndis?.suburbs ?? []).filter((s) => !topState || s.state === topState).slice(0, 24),
    [ndis, topState]
  );

  function search(event: FormEvent) {
    event.preventDefault();
    const q = suburbQuery.trim();
    if (q) navigate(`/find-a-provider?suburb=${encodeURIComponent(q)}`);
    else if (suburbState) navigate(`/ndis-providers/${STATES.find((s) => s.code === suburbState)?.slug}`);
  }

  const headline: { value: string; label: string }[] = [];
  if (ndisTotal > 0) headline.push({ value: fmt(ndisTotal), label: 'NDIS register listings' });
  if (agedTotal > 0) headline.push({ value: fmt(agedTotal), label: 'Aged care register listings' });
  if (suburbsWithListings > 0) headline.push({ value: fmt(suburbsWithListings), label: 'Suburbs with listings' });
  if (stats && stats.providersListed > 0) headline.push({ value: fmt(stats.providersListed), label: 'Provider profiles on SolDirectory' });

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header directory-page-header--locations" style={hubHeaderStyle('locations')}>
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Cities, suburbs and regions</span>
          <h1 className="section-heading section-heading-light">Find providers near you</h1>
          <p className="directory-page-subtitle">
            Search by suburb or postcode, or start from your state. Every count on this page comes from our live directory and the public NDIS and My Aged Care registers.
          </p>

          <form className="loc-search" onSubmit={search} role="search" aria-label="Find providers by location">
            <label className="visually-hidden" htmlFor="loc-state">State or territory</label>
            <select id="loc-state" value={suburbState} onChange={(e) => setSuburbState(e.target.value)}>
              <option value="">All states</option>
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <label className="visually-hidden" htmlFor="loc-suburb">Suburb or postcode</label>
            <input id="loc-suburb" value={suburbQuery} onChange={(e) => setSuburbQuery(e.target.value)} placeholder="Suburb or postcode, e.g. Glenroy or 3046" />
            <button type="submit" className="btn-gradient">Find providers</button>
          </form>

          {headline.length > 0 && (
            <ul className="loc-headline" aria-label="Directory at a glance">
              {headline.map((h) => <li key={h.label}><strong>{h.value}</strong><span>{h.label}</span></li>)}
            </ul>
          )}
        </div>
      </div>

      <main className="directory-section directory-content-page loc-page">
        <section className="directory-intro" aria-labelledby="locations-intro-heading">
          <span className="directory-section-label">Search around daily life</span>
          <h2 id="locations-intro-heading">Start with the suburb where support is needed</h2>
          <p>
            Providers may work from a nearby suburb and travel across a wider service area. Search the exact suburb first, then broaden
            to the nearest city or state if you need more options.
          </p>
        </section>

        {/* Every state and territory */}
        <section aria-labelledby="loc-states-heading">
          <span className="directory-section-label">Every state and territory</span>
          <h2 className="reg-h2" id="loc-states-heading">Choose where you live</h2>
          <div className="loc-state-grid">
            {STATE_INFO.map((info) => {
              const meta = stateByCode(info.code)!;
              const n = ndis?.states[info.code] ?? 0;
              const a = aged?.states[info.code] ?? 0;
              const members = memberByState[info.code] ?? 0;
              return (
                <article className="loc-state-card" key={info.code}>
                  <div className="loc-state-photo" style={{ backgroundImage: `url(${bannerFor({ text: meta.name, section: 'locations', state: info.code })})` }}>
                    <span className="loc-state-code">{info.code}</span>
                  </div>
                  <div className="loc-state-body">
                    <h3>{meta.name}</h3>
                    <p className="loc-state-capital">Capital: {info.capital}</p>
                    <dl className="loc-state-counts">
                      <div><dt>NDIS register</dt><dd>{n > 0 ? fmt(n) : '—'}</dd></div>
                      <div><dt>Aged care register</dt><dd>{a > 0 ? fmt(a) : '—'}</dd></div>
                      {members > 0 && <div><dt>Profiles</dt><dd>{fmt(members)}</dd></div>}
                    </dl>
                    <div className="loc-state-links">
                      <Link to={registerPath(KIND_BY_TYPE.ndis, meta.slug)}>NDIS providers</Link>
                      <Link to={registerPath(KIND_BY_TYPE.aged_care, meta.slug)}>Aged care providers</Link>
                      <Link to={`/find-a-provider?suburb=${encodeURIComponent(info.capital)}`}>Search {info.capital}</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Cities and regional centres */}
        <section aria-labelledby="loc-centres-heading">
          <span className="directory-section-label">Cities and regional centres</span>
          <h2 className="reg-h2" id="loc-centres-heading">Search a major centre</h2>
          <p className="reg-lede">Larger towns and cities often have more providers, and many of them travel to surrounding areas. If your town is not listed, search it by name above.</p>
          <div className="loc-centres">
            {STATE_INFO.map((info) => (
              <div key={info.code} className="loc-centre-group">
                <h3>{stateByCode(info.code)!.name}</h3>
                <div className="location-places">
                  {[info.capital, ...info.centres].map((place) => (
                    <button key={place} type="button" className="location-link" onClick={() => navigate(`/find-a-provider?suburb=${encodeURIComponent(place)}`)}>{place}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Busiest suburbs */}
        {(ndis?.suburbs.length ?? 0) > 0 && (
          <section aria-labelledby="loc-top-heading">
            <span className="directory-section-label">Where the register is busiest</span>
            <h2 className="reg-h2" id="loc-top-heading">Suburbs with the most NDIS register listings</h2>
            <p className="reg-lede">A higher count usually means more choice nearby, not better quality. Pick a state to narrow the list.</p>
            <div className="reg-filters" role="group" aria-label="Filter suburbs by state">
              <button type="button" className={`reg-chip${topState === '' ? ' is-on' : ''}`} aria-pressed={topState === ''} onClick={() => setTopState('')}>All states</button>
              {STATES.map((s) => (
                <button key={s.code} type="button" className={`reg-chip${topState === s.code ? ' is-on' : ''}`} aria-pressed={topState === s.code} onClick={() => setTopState(s.code)}>{s.code}</button>
              ))}
            </div>
            <ul className="reg-linkgrid">
              {topSuburbs.map((s) => (
                <li key={`${s.state}-${s.slug}`}>
                  <Link to={registerPath(KIND_BY_TYPE.ndis, stateByCode(s.state)?.slug, s.slug)}>{s.suburb}, {s.state}<span className="reg-count">{fmt(s.count)}</span></Link>
                </li>
              ))}
            </ul>
            {topSuburbs.length === 0 && <p className="reg-lede">No suburbs meet the minimum number of listings in that state yet.</p>}
          </section>
        )}

        {/* Service x location */}
        {SEO_SERVICES.some((s) => (serviceAreas[s] ?? []).length > 0) && (
          <section aria-labelledby="loc-services-heading">
            <span className="directory-section-label">Support by service and location</span>
            <h2 className="reg-h2" id="loc-services-heading">Find a service in a specific suburb</h2>
            <p className="reg-lede">These suburbs have the most public-register listings for each service. Open one to see providers, what to ask and nearby areas.</p>
            <div className="loc-service-grid">
              {SEO_SERVICES.map((service) => {
                const rows = serviceAreas[service] ?? [];
                if (rows.length === 0) return null;
                return (
                  <div key={service} className="loc-service-card">
                    <h3>{service}</h3>
                    <ul>
                      {rows.map((r) => (
                        <li key={`${r.state}-${r.slug}`}>
                          <Link to={`/services/${slugify(service)}/${r.state.toLowerCase()}/${r.slug}`}>{r.suburb}, {r.state}</Link>
                        </li>
                      ))}
                    </ul>
                    <Link className="loc-service-more" to={`/services/${slugify(service)}`}>About {service.toLowerCase()} →</Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {areas.length > 0 && (
          <section className="directory-list-section" aria-labelledby="active-areas-heading">
            <span className="directory-section-label">Live provider profiles</span>
            <h2 className="reg-h2" id="active-areas-heading">Areas with providers on SolDirectory</h2>
            <p className="reg-lede">These links come from service areas entered on current provider profiles. Counts show profiles listing each area, not guaranteed availability.</p>
            <ul className="reg-linkgrid">
              {areas.map((a) => (
                <li key={a.slug}><Link to={`/directory/in/${a.slug}`}>{a.name}<span className="reg-count">{a.count}</span></Link></li>
              ))}
            </ul>
          </section>
        )}

        {/* Other ways in */}
        <section aria-labelledby="loc-other-heading">
          <span className="directory-section-label">Not only where</span>
          <h2 className="reg-h2" id="loc-other-heading">Narrow by what matters to you</h2>
          <div className="loc-ways">
            <Link to="/services"><strong>By support type</strong><span>Personal care, therapy, transport, plan management and more.</span></Link>
            <Link to="/condition"><strong>By condition or disability</strong><span>Understand the supports that often apply, then find providers.</span></Link>
            <Link to="/language"><strong>By language</strong><span>Providers whose own websites say they support your language.</span></Link>
            <Link to="/funding"><strong>By funding</strong><span>NDIS, aged care, DVA and other ways support is paid for.</span></Link>
          </div>
        </section>

        <section className="directory-guidance" aria-labelledby="location-search-heading">
          <div className="directory-section-heading"><span className="directory-section-label">A more useful location search</span><h2 id="location-search-heading">What to confirm before choosing by distance</h2></div>
          <ol className="directory-guidance-grid loc-guidance-grid">
            <li><span>01</span><h3>Actual service area</h3><p>A provider’s office may be nearby while its workers cover different suburbs. Confirm the address where support will happen.</p></li>
            <li><span>02</span><h3>Travel and scheduling</h3><p>Ask about travel charges, minimum shifts, appointment windows and whether the same worker can attend regularly.</p></li>
            <li><span>03</span><h3>Remote or mobile options</h3><p>Some planning and therapy supports may be delivered remotely or by mobile teams. Confirm whether that suits the person’s needs.</p></li>
            <li><span>04</span><h3>Regional and remote areas</h3><p>Search your nearest regional centre as well as your own town. Ask how often a provider visits and what happens if a worker is unwell.</p></li>
            <li><span>05</span><h3>Language and culture</h3><p>If communication matters, ask whether a worker who speaks your language is available and whether an interpreter can be arranged.</p></li>
            <li><span>06</span><h3>Written terms</h3><p>Get price, hours, cancellation and travel terms in a service agreement before support starts, and keep a copy.</p></li>
          </ol>
        </section>

        {/* FAQ */}
        <section aria-labelledby="loc-faq-heading">
          <span className="directory-section-label">Common questions</span>
          <h2 className="reg-h2" id="loc-faq-heading">Finding providers by location</h2>
          <div className="loc-faq">
            {LOCATION_FAQS.map((f, i) => (
              <div key={f.q} className={`loc-faq-item${openFaq === i ? ' is-open' : ''}`}>
                <h3>
                  <button type="button" aria-expanded={openFaq === i} aria-controls={`loc-faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{f.q}</span><span className="loc-faq-icon" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                  </button>
                </h3>
                {openFaq === i && <p id={`loc-faq-${i}`}>{f.a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="directory-list-section" aria-labelledby="register-state-heading">
          <span className="directory-section-label">Broader reference search</span>
          <h2 className="reg-h2" id="register-state-heading">Browse the public registers by state</h2>
          <p className="reg-lede">Providers listed on the NDIS and My Aged Care registers, by state and suburb. These records broaden the search, but they do not show who has capacity right now.</p>
          <ul className="reg-linkgrid">
            {STATES.map((s) => <li key={`ndis-${s.code}`}><Link to={`/ndis-providers/${s.slug}`}>NDIS providers in {s.name}</Link></li>)}
            {STATES.map((s) => <li key={`aged-${s.code}`}><Link to={`/aged-care-providers/${s.slug}`}>Aged care providers in {s.name}</Link></li>)}
          </ul>
          <p className="loc-official">
            Confirm a provider’s current status on the official sources:{' '}
            <a href={KIND_BY_TYPE.ndis.officialUrl} target="_blank" rel="noopener noreferrer">{KIND_BY_TYPE.ndis.officialName}</a> and{' '}
            <a href={KIND_BY_TYPE.aged_care.officialUrl} target="_blank" rel="noopener noreferrer">{KIND_BY_TYPE.aged_care.officialName}</a>.
          </p>
        </section>

        <section className="directory-content-cta">
          <div><span className="directory-section-label">Need support in a specific area?</span><h2>Tell providers where support is needed</h2><p>Submit one free request with the suburb, support and preferred start time so suitable providers can assess whether they cover it.</p></div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Get matched, free</button>
        </section>
      </main>

      <PublicFooter />
    </>
  );
}
