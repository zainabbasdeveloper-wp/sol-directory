import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoSlot from '../../components/PhotoSlot';
import { applySeoTags } from '../../lib/seo';
import { PublicFooter, PublicHeader } from './PublicLayout';
import './Home.css';
import './IndependentWorkers.css';

const PROFILE_DETAILS = [
  ['Services and experience', 'Describe the supports you deliver, relevant experience and the participant groups you work with.'],
  ['Location and availability', 'List your suburb, service area, preferred schedule and current availability.'],
  ['Languages and transport', 'Record languages spoken and whether you can travel or provide transport where appropriate.'],
  ['Rates and contact preferences', 'Publish an indicative hourly rate and manage how eligible organisations contact you.'],
];

const FAQS = [
  {
    question: 'Who can create an independent worker profile?',
    answer: 'Support workers, nurses and allied health assistants who work independently can register. You are responsible for holding the checks, qualifications, insurance and registrations required for the supports you offer.',
  },
  {
    question: 'Does SolDirectory employ independent workers?',
    answer: 'No. SolDirectory is an independent directory and connection service. It does not employ workers, set employment conditions, supervise support delivery or act as a registered NDIS provider.',
  },
  {
    question: 'Does a profile guarantee work?',
    answer: 'No. A profile makes your information searchable to eligible organisations using the worker directory. Contact, engagement and ongoing work depend on each organisation’s requirements and your suitability and availability.',
  },
  {
    question: 'What should I confirm before accepting work?',
    answer: 'Confirm the support requirements, role expectations, location, schedule, rate, insurance arrangements, service agreement and whether the engagement is employment or independent contracting. Obtain professional advice if you are unsure.',
  },
  {
    question: 'Can participants use this page to hire a worker directly?',
    answer: 'This page is for worker registration. Access to worker profiles is currently available to authorised organisations through the worker directory. Participants and representatives can use the public provider directory or submit a provider enquiry request.',
  },
];

export default function IndependentWorkers() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    applySeoTags({
      title: 'Independent Support Workers | SolDirectory',
      description: 'Create an independent worker profile with your services, experience, location and availability so eligible organisations can find and contact you.',
    });
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <PublicHeader />
      <main>
        <section className="iw-hero">
          <div className="iw-hero-copy">
            <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Independent workers</span>
            <h1>Create a professional profile for independent support work</h1>
            <p>
              Present your services, experience, location and availability in one profile.
              Eligible provider organisations can search the worker directory and contact you about suitable opportunities.
            </p>
            <div className="iw-actions">
              <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=worker')}>Create a worker profile</button>
              <button className="btn-outline-light btn-lg" onClick={() => navigate('/login')}>Worker login</button>
              <button className="btn-outline-light btn-lg" onClick={() => navigate('/independent-workers/find')}>Browse worker profiles</button>
            </div>
            <p className="iw-hero-note">Creating an account does not guarantee work or an engagement.</p>
          </div>
          <div className="iw-hero-image">
            <PhotoSlot src="/images/providers.jpg" alt="An independent support worker assisting a person" variant="care" />
          </div>
        </section>

        <section className="iw-intro">
          <div>
            <span className="eyebrow"><span className="eyebrow-rule" />A clear professional profile</span>
            <h2 className="section-heading">Help organisations understand how you can contribute</h2>
          </div>
          <p className="section-copy">
            Independent workers can maintain structured information about their work preferences and professional background.
            Organisations remain responsible for their own recruitment, screening and engagement decisions.
          </p>
        </section>

        <section className="iw-profile-section">
          <div className="iw-profile-inner">
            <div className="iw-section-heading">
              <span className="eyebrow"><span className="eyebrow-rule" />Your profile</span>
              <h2 className="section-heading">Information organisations can review</h2>
            </div>
            <div className="iw-detail-grid">
              {PROFILE_DETAILS.map(([title, body], index) => (
                <article className="iw-detail" key={title}>
                  <span className="iw-detail-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="iw-process" id="how-it-works">
          <div className="iw-process-copy">
            <span className="eyebrow"><span className="eyebrow-rule" />How it works</span>
            <h2 className="section-heading">From registration to professional contact</h2>
            <p className="section-copy">
              SolDirectory provides the profile and search tools. Any engagement is arranged directly between you and the organisation contacting you.
            </p>
          </div>
          <ol className="iw-steps">
            <li><span>1</span><div><h3>Create your account</h3><p>Register as an Independent Worker using your name, email address and mobile number.</p></div></li>
            <li><span>2</span><div><h3>Complete your profile</h3><p>Add your services, experience, location, languages, availability and indicative rate.</p></div></li>
            <li><span>3</span><div><h3>Keep information current</h3><p>Update availability and professional details whenever your circumstances change.</p></div></li>
            <li><span>4</span><div><h3>Assess each opportunity</h3><p>Discuss requirements directly and complete your own suitability, safety and contractual checks before accepting work.</p></div></li>
          </ol>
        </section>

        <section className="iw-safeguards">
          <div className="iw-safeguards-inner">
            <div>
              <span className="eyebrow"><span className="eyebrow-rule" />Professional responsibilities</span>
              <h2 className="section-heading">Checks and arrangements remain important</h2>
            </div>
            <div className="iw-safeguard-copy">
              <p>Depending on the role and supports delivered, you may need an NDIS Worker Screening Check, Working with Children Check, professional registration, first aid training, insurance or other evidence.</p>
              <p>Your profile does not replace verification. Organisations should confirm credentials directly, and both parties should document the scope of work, rates, cancellations, privacy, incidents and complaints before support begins.</p>
              <p>SolDirectory does not endorse individual workers or determine whether a worker is suitable for a particular person or role.</p>
            </div>
          </div>
        </section>

        <section className="iw-faq">
          <h2 className="section-heading">Independent worker questions</h2>
          <div className="iw-faq-list">
            {FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <div className="iw-faq-item" key={item.question}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenFaq(open ? null : index)}>
                    {item.question}<span aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <p>{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="iw-cta">
          <div>
            <h2>Create your Independent Worker profile</h2>
            <p>Register your professional details and make your profile available in the worker directory.</p>
          </div>
          <button className="btn-gradient btn-lg" onClick={() => navigate('/signup?type=worker')}>Register as an Independent Worker</button>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
