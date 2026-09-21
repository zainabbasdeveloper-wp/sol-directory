import { useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import { useSiteStats } from '../../hooks/useSiteStats';
import { providerCountLabel, serviceCount } from '../../lib/statsCounts';
import './Directory.css';
import './Home.css';

// `name` must match the service names providers register under (the
// directory's ?service= filter and the live provider counts key off it).
const ALL_SERVICES = [
  { name: 'Support coordination', body: 'Coordinators who help participants understand their plan, connect with providers and put their supports in place.' },
  { name: 'Personal care', body: 'Assistance with personal hygiene, dressing, medication and daily living.' },
  { name: 'Therapy services', body: 'Occupational therapy, physiotherapy, speech pathology and other allied health supports.' },
  { name: 'Domestic assistance', body: 'Assistance with cleaning, laundry, meal preparation and household tasks.' },
  { name: 'Nursing', body: 'In-home clinical nursing, wound care and complex health supports.' },
  { name: 'Transport', body: 'Accessible transport to appointments, work, study and community activities.' },
  { name: 'Housing (SDA & SIL)', body: 'Supported Independent Living (SIL) and Specialist Disability Accommodation (SDA).' },
  { name: 'Plan management', body: 'Payment of provider invoices and clear budget reporting for plan-managed participants.' },
];

export default function Services() {
  const navigate = useNavigate();
  // Real provider counts from the database. A support with no listed
  // providers yet simply shows no count.
  const stats = useSiteStats();

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            Browse by support
          </span>
          <h1 className="section-heading section-heading-light">Supports available through SolDirectory</h1>
          <p className="directory-page-subtitle">
            Select a support to see the providers who offer it. Providers who have
            confirmed their availability recently are shown.
          </p>
        </div>
      </div>

      <section className="directory-section">
        <div className="services-grid">
          {ALL_SERVICES.map((s) => (
            <button
              key={s.name}
              type="button"
              className="service-card"
              onClick={() => navigate(`/directory?service=${encodeURIComponent(s.name)}`)}
            >
              <h3 className="service-title">{s.name}</h3>
              <p className="service-body">{s.body}</p>
              <span className="service-count">{providerCountLabel(serviceCount(stats, s.name)) ?? 'View providers'} →</span>
            </button>
          ))}
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
