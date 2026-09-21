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
          <h1 className="section-heading">List your service where participants and families are searching</h1>
          <p className="section-copy">
            Choose a monthly plan. There is no bidding for position: providers are matched
            on fit, not on payment. Confirm your capacity each week so people can see who is
            able to start.
          </p>
          <div className="providers-cta-actions">
            <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=provider')}>
              List your business
            </button>
            <button className="link-btn" onClick={() => navigate('/signup?type=provider')}>
              Create your provider account →
            </button>
          </div>
        </div>
        <div className="providers-photo-wrap">
          <div className="providers-photo">
            <PhotoSlot src="/images/providers.jpg" alt="A provider at their desk" variant="meeting" />
          </div>
          <div className="providers-steps-card">
            <span className="providers-steps-label">Listing in three steps</span>
            <div className="providers-steps">
              <div className="providers-step">
                <span className="providers-step-num">1</span>
                <p>Create your account and enter your registration details, the supports you offer and the areas you cover.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">2</span>
                <p>Complete your provider profile, including your intake details and the languages your team speaks.</p>
              </div>
              <div className="providers-step">
                <span className="providers-step-num">3</span>
                <p>Confirm your capacity each week. Matched enquiries reach you by email, and by SMS if you opt in.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}
