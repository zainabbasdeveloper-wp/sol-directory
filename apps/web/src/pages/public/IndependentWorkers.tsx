import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHero from '../../components/topic/PageHero';
import { bannerFor } from '../../data/bannerImages';
import { applySeoTags } from '../../lib/seo';
import { PublicFooter, PublicHeader } from './PublicLayout';
import './Home.css';
import './IndependentWorkers.css';

const PROFILE_DETAILS = [
  ['Services and experience', 'The supports you deliver, relevant experience and the participant groups you work with.'],
  ['Location and availability', 'Your suburb, service area, preferred schedule and current availability.'],
  ['Languages and transport', 'Languages spoken, and whether you can travel or provide transport where appropriate.'],
  ['Rates and contact preferences', 'An indicative hourly rate, and how eligible organisations can contact you.'],
];

const STEPS = [
  ['Create your account', 'Register as an Independent Worker with your name, email address and mobile number.'],
  ['Complete your profile', 'Add your services, experience, location, languages, availability and indicative rate.'],
  ['Keep it current', 'Update availability and professional details whenever your circumstances change.'],
  ['Assess each opportunity', 'Discuss requirements directly and complete your own suitability, safety and contractual checks.'],
];

const HERO_CHECKS = [
  'One profile for your services and availability',
  'Eligible organisations search and contact you',
  'No guarantee of work: you choose what to accept',
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
        <PageHero
          crumbs={[{ label: 'Home', to: '/' }, { label: 'Independent workers' }]}
          eyebrow="Independent workers"
          title="Create a professional profile for independent support work"
          description="Present your services, experience, location and availability in one profile. Eligible provider organisations can search the worker directory and contact you."
          image={bannerFor({ text: 'support worker personal care', section: 'services' })}
          imageAlt="An independent support worker with a person they support"
          panel={{
            title: 'Join the worker directory',
            checks: HERO_CHECKS,
            ctaLabel: 'Create a worker profile →',
            onCta: () => navigate('/signup?type=worker'),
            note: (
              <>
                Already registered? <Link to="/login">Worker login</Link> · <Link to="/independent-workers/find">Browse worker profiles</Link>
              </>
            ),
          }}
        />

        <div className="iw-wrap">
          <section className="iw-profile" aria-labelledby="iw-profile-heading">
            <div className="iw-profile-intro">
              <span className="eyebrow"><span className="eyebrow-rule" />Your profile</span>
              <h2 id="iw-profile-heading" className="iw-h2">Help organisations understand how you can contribute</h2>
              <p>
                Keep structured information about your work preferences and professional background. Organisations remain
                responsible for their own recruitment, screening and engagement decisions.
              </p>
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
          </section>

          <section className="iw-process" id="how-it-works" aria-labelledby="iw-process-heading">
            <div className="iw-process-head">
              <span className="eyebrow"><span className="eyebrow-rule" />How it works</span>
              <h2 id="iw-process-heading" className="iw-h2">From registration to professional contact</h2>
              <p>SolDirectory provides the profile and search tools. Any engagement is arranged directly between you and the organisation contacting you.</p>
            </div>
            <ol className="iw-steps">
              {STEPS.map(([title, body], index) => (
                <li key={title}>
                  <span className="iw-step-num">{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="iw-safeguards" aria-labelledby="iw-safeguards-heading">
          <div className="iw-safeguards-inner">
            <div>
              <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Professional responsibilities</span>
              <h2 id="iw-safeguards-heading" className="iw-h2">Checks and arrangements remain important</h2>
            </div>
            <ul className="iw-safeguard-list">
              <li>Depending on the role and supports delivered, you may need an NDIS Worker Screening Check, Working with Children Check, professional registration, first aid training, insurance or other evidence.</li>
              <li>Your profile does not replace verification. Organisations should confirm credentials directly, and both parties should document the scope of work, rates, cancellations, privacy, incidents and complaints before support begins.</li>
              <li>SolDirectory does not endorse individual workers or determine whether a worker is suitable for a particular person or role.</li>
            </ul>
          </div>
        </section>

        <div className="iw-wrap">
          <section className="iw-faq" aria-labelledby="iw-faq-heading">
            <div className="iw-faq-head">
              <span className="eyebrow"><span className="eyebrow-rule" />Questions</span>
              <h2 id="iw-faq-heading" className="iw-h2">Independent worker questions</h2>
              <p>Not sure whether a profile suits you? Start with the basics here.</p>
            </div>
            <div className="iw-faq-list">
              {FAQS.map((item, index) => {
                const open = openFaq === index;
                return (
                  <div className={`iw-faq-item${open ? ' is-open' : ''}`} key={item.question}>
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
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
