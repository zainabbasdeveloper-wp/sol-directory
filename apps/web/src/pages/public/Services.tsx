import { useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import './Directory.css';
import './Home.css';

const ALL_SERVICES = [
  { name: 'Support coordination', body: 'Coordinators who help you understand a plan, choose providers and keep everything moving between reviews.', count: '412 providers' },
  { name: 'Personal care', body: 'Bathing, dressing, medication prompts and daily routines.', count: '1,038 providers' },
  { name: 'Therapy services', body: 'Occupational therapy, physio, speech and allied health.', count: '694 providers' },
  { name: 'Domestic assistance', body: 'Cleaning, laundry, meals and everyday household help.', count: '876 providers' },
  { name: 'Nursing', body: 'In-home clinical care, wound care and high-intensity supports.', count: '241 providers' },
  { name: 'Transport', body: 'Wheelchair-accessible transport for appointments, work, study and social activities.', count: '318 providers' },
  { name: 'Housing (SDA & SIL)', body: 'Supported independent living and specialist disability accommodation.', count: '207 providers' },
  { name: 'Plan management', body: 'Invoices paid fast, budgets you can actually read.', count: '126 providers' },
];

export default function Services() {
  const navigate = useNavigate();

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            What people search for
          </span>
          <h1 className="section-heading section-heading-light">Every support you can find here</h1>
          <p className="directory-page-subtitle">
            Pick a service to see providers who offer it, filtered to those confirming
            capacity this month.
          </p>
        </div>
      </div>

      <section className="directory-section">
        <div className="services-grid">
          {ALL_SERVICES.map((s) => (
            <button
              key={s.name}
              className="service-card"
              onClick={() =>
                s.name === 'Nursing'
                  ? navigate('/services/nursing/bankstown')
                  : navigate(`/directory?service=${encodeURIComponent(s.name)}`)
              }
            >
              <h3 className="service-title">{s.name}</h3>
              <p className="service-body">{s.body}</p>
              <span className="service-count">
                {s.count} {s.name === 'Nursing' && <em style={{ fontStyle: 'normal', opacity: 0.7 }}>· see Bankstown example</em>} →
              </span>
            </button>
          ))}
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
