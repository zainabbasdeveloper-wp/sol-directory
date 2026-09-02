import { useNavigate } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import PhotoSlot from '../../components/PhotoSlot';
import './Home.css';

export default function ForProviders() {
  const navigate = useNavigate();

  return (
    <>
      <PublicHeader />

      <section className="providers-cta-section" style={{ paddingTop: 'clamp(56px, 7vw, 100px)' }}>
        <div>
          <span className="eyebrow">
            <span className="eyebrow-rule" />
            For providers
          </span>
          <h1 className="section-heading">List your service where families are already looking</h1>
          <p className="section-copy">
            One flat monthly fee, no cost per enquiry and no bidding for position. Update
            capacity in the portal and you drop out of results the moment your books
            close.
          </p>
          <div className="providers-cta-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=provider')}>
              List your business
            </button>
            <button className="link-btn" onClick={() => navigate('/signup?type=provider')}>
              See listing rates →
            </button>
          </div>
        </div>
        <div className="providers-photo-wrap">
          <div className="providers-photo">
            <PhotoSlot src="/images/providers.jpg" alt="A provider at their desk" variant="meeting" />
          </div>
          <div className="providers-steps-card">
            <span className="providers-steps-label">Listing, in three steps</span>
            <div className="providers-steps">
              <div className="providers-step">
                <span className="providers-step-num">1</span>
                <p>Send your registration number and service areas. We check the register.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">2</span>
                <p>Write your profile, or send a service brochure and we will draft it.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">3</span>
                <p>Confirm capacity each Monday. Enquiries reach you by email or SMS.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
