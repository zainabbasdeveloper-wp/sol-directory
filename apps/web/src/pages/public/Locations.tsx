import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { LOCATION_GROUPS } from '../../data/providers';
import { STATES } from '../../lib/registerMeta';
import { listPublicAreas, type CountRow } from '../../api/profilesApi';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, stateGroupCount } from '../../lib/statsCounts';
import './Directory.css';
import './Home.css';
import './register/register.css';

export default function Locations() {
  const navigate = useNavigate();
  const stats = useSiteStats();
  // Suburbs where real providers say they work, from live data (none shown if there are none yet).
  const [areas, setAreas] = useState<CountRow[]>([]);
  useEffect(() => { listPublicAreas().then((r) => setAreas(r.items.slice(0, 36))).catch(() => {}); }, []);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
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

      <section className="directory-section">
        <div className="locations-grid">
          {LOCATION_GROUPS.map((g) => (
            <div key={g.state}>
              <h3 className="location-state">{g.state}</h3>
              {providerCountLabel(stateGroupCount(stats, g.states)) && (
                <p className="location-count">{providerCountLabel(stateGroupCount(stats, g.states))}</p>
              )}
              <div className="location-places">
                {g.places.map((place) => (
                  <button key={place} className="location-link" onClick={() => navigate(`/directory?suburb=${encodeURIComponent(place)}`)}>
                    {place}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {areas.length > 0 && (
          <>
            <h2 className="reg-h2">Areas with providers on SolDirectory</h2>
            <ul className="reg-linkgrid">
              {areas.map((a) => (
                <li key={a.slug}><Link to={`/directory/in/${a.slug}`}>{a.name}<span>{a.count}</span></Link></li>
              ))}
            </ul>
          </>
        )}

        <h2 className="reg-h2">Browse the public registers by state</h2>
        <p className="reg-lede">
          Providers listed on the NDIS and My Aged Care registers, by state and suburb. These are register listings — they don’t show
          who has capacity right now.
        </p>
        <ul className="reg-linkgrid">
          {STATES.map((s) => (
            <li key={`ndis-${s.code}`}><Link to={`/ndis-providers/${s.slug}`}>NDIS providers in {s.name}</Link></li>
          ))}
          {STATES.map((s) => (
            <li key={`aged-${s.code}`}><Link to={`/aged-care-providers/${s.slug}`}>Aged care providers in {s.name}</Link></li>
          ))}
        </ul>
      </section>

      <PublicFooter />
    </>
  );
}
