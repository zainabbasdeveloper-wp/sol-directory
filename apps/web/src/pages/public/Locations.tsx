import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { LOCATION_GROUPS } from '../../data/providers';
import { STATES } from '../../lib/registerMeta';
import { listPublicAreas, type CountRow } from '../../api/profilesApi';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, stateGroupCount } from '../../lib/statsCounts';
import { applySeoTags } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Directory.css';
import './Home.css';
import './register/register.css';

export default function Locations() {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();
  const stats = useSiteStats();
  // Suburbs where real providers say they work, from live data (none shown if there are none yet).
  const [areas, setAreas] = useState<CountRow[]>([]);
  useEffect(() => {
    listPublicAreas().then((r) => setAreas(r.items.slice(0, 36))).catch(() => {});
    applySeoTags({
      title: 'Find NDIS and aged care providers by location | SolDirectory',
      description: 'Browse providers by Australian state, city and suburb. Search current SolDirectory profiles or reference public NDIS and aged care register listings.',
      canonicalUrl: `${window.location.origin}/locations`,
    });
  }, []);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header directory-page-header--locations">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            Cities, suburbs and regions
          </span>
          <h1 className="section-heading section-heading-light">Find providers near you</h1>
          <p className="directory-page-subtitle">
            Select a city to open the provider directory, then search by suburb or
            postcode.
          </p>
        </div>
      </div>

      <main className="directory-section directory-content-page">
        <section className="directory-intro" aria-labelledby="locations-intro-heading">
          <span className="directory-section-label">Search around daily life</span>
          <h2 id="locations-intro-heading">Start with the suburb where support is needed</h2>
          <p>
            Providers may work from a nearby suburb and travel across a wider service area. Search the exact suburb first, then broaden
            to the nearest city or state if you need more options.
          </p>
        </section>

        <div className="locations-grid">
          {LOCATION_GROUPS.map((g) => (
            <div className="location-hub-card" key={g.state}>
              <h3 className="location-state">{g.state}</h3>
              {providerCountLabel(stateGroupCount(stats, g.states)) && (
                <p className="location-count">{providerCountLabel(stateGroupCount(stats, g.states))}</p>
              )}
              <div className="location-places">
                {g.places.map((place) => (
                  <button key={place} className="location-link" onClick={() => navigate(`/find-a-provider?suburb=${encodeURIComponent(place)}`)}>
                    {place}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {areas.length > 0 && (
          <section className="directory-list-section" aria-labelledby="active-areas-heading">
            <span className="directory-section-label">Live provider profiles</span>
            <h2 className="reg-h2" id="active-areas-heading">Areas with providers on SolDirectory</h2>
            <p className="reg-lede">These links come from service areas entered on current provider profiles. Counts show profiles listing each area, not guaranteed availability.</p>
            <ul className="reg-linkgrid">
              {areas.map((a) => (
                <li key={a.slug}><Link to={`/directory/in/${a.slug}`}>{a.name}<span>{a.count}</span></Link></li>
              ))}
            </ul>
          </section>
        )}

        <section className="directory-guidance" aria-labelledby="location-search-heading">
          <div className="directory-section-heading"><span className="directory-section-label">A more useful location search</span><h2 id="location-search-heading">What to confirm before choosing by distance</h2></div>
          <ol className="directory-guidance-grid">
            <li><span>01</span><h3>Actual service area</h3><p>A provider’s office may be nearby while its workers cover different suburbs. Confirm the address where support will happen.</p></li>
            <li><span>02</span><h3>Travel and scheduling</h3><p>Ask about travel charges, minimum shifts, appointment windows and whether the same worker can attend regularly.</p></li>
            <li><span>03</span><h3>Remote or mobile options</h3><p>Some planning and therapy supports may be delivered remotely or by mobile teams. Confirm whether that suits the person’s needs.</p></li>
          </ol>
        </section>

        <section className="directory-list-section" aria-labelledby="register-state-heading">
          <span className="directory-section-label">Broader reference search</span>
          <h2 className="reg-h2" id="register-state-heading">Browse the public registers by state</h2>
          <p className="reg-lede">Providers listed on the NDIS and My Aged Care registers, by state and suburb. These records broaden the search, but they do not show who has capacity right now.</p>
          <ul className="reg-linkgrid">
            {STATES.map((s) => <li key={`ndis-${s.code}`}><Link to={`/ndis-providers/${s.slug}`}>NDIS providers in {s.name}</Link></li>)}
            {STATES.map((s) => <li key={`aged-${s.code}`}><Link to={`/aged-care-providers/${s.slug}`}>Aged care providers in {s.name}</Link></li>)}
          </ul>
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
