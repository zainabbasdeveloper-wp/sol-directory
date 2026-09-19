import { useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { LOCATION_GROUPS } from '../../data/providers';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, stateGroupCount } from '../../lib/statsCounts';
import './Directory.css';
import './Home.css';

export default function Locations() {
  const navigate = useNavigate();
  const stats = useSiteStats();

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
            Pick a city to jump straight to the directory, or search any suburb from
            there.
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
                  <button key={place} className="location-link" onClick={() => navigate('/directory')}>
                    {place}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
