import { hubHeaderStyle } from '../../data/bannerImages';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PublicFooter, PublicHeader } from './PublicLayout';
import { Breadcrumbs } from './register/RegisterParts';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import { siteConfig } from '../../config/siteConfig';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const faqs = [
  { question: 'Does SolDirectory recommend or rank providers?', answer: 'No. Search results and directory listings are not recommendations. Coordinators should confirm suitability, registration, screening, insurance, availability, pricing and service terms directly.' },
  { question: 'Can I submit an enquiry for a participant?', answer: 'Yes, where you have authority and consent to share the information. Include only what providers need to assess the request, and avoid unnecessary clinical or identifying detail.' },
  { question: 'Does a directory listing prove current capacity?', answer: 'No. Member providers confirm capacity regularly, but availability can change. Public-register listings do not indicate capacity at all. Confirm the proposed start date and roster directly.' },
  { question: 'What should I do for an immediate safety emergency?', answer: 'Do not use a directory enquiry as an emergency response. Call 000 where there is immediate danger and use the participant’s crisis, clinical or safeguarding pathways.' },
];

export default function SupportCoordinators() {
  const { hash } = useLocation();
  const { openMatchModal } = useMatchModal();

  useEffect(() => {
    applySeoTags({
      title: 'Provider referrals for support coordinators | SolDirectory',
      description: 'A practical guide for preparing referrals, comparing disability and aged care providers, checking capacity, consent, safeguards, fees and service agreements.',
      canonicalUrl: `${window.location.origin}/support-coordinators`,
    });
    setJsonLd('coordinator-page', { '@type': 'WebPage', name: 'Provider referrals for support coordinators', url: `${window.location.origin}/support-coordinators`, isPartOf: { '@type': 'WebSite', name: 'SolDirectory', url: window.location.origin } });
    setJsonLd('coordinator-faq', { '@type': 'FAQPage', mainEntity: faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) });
    return () => { setJsonLd('coordinator-page', null); setJsonLd('coordinator-faq', null); };
  }, []);

  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    else window.scrollTo(0, 0);
  }, [hash]);

  return <><PublicHeader />
    <div className="directory-page-header" style={hubHeaderStyle('support-coordination')}><div className="directory-page-header-inner"><span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Referral practice</span><h1 className="section-heading section-heading-light">Provider referrals for support coordinators</h1><p className="directory-page-subtitle">Prepare a clear request, compare providers consistently and keep the participant in control of each decision.</p></div></div>
    <main className="reg-page category-hub-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Support coordinators' }]} />
      <section className="directory-intro"><span className="directory-section-label">What SolDirectory does</span><h2>Search directly or send one provider enquiry</h2><p>SolDirectory is a directory and referral service. You can browse provider profiles and public-register records, or submit one enquiry so relevant member providers can review the support, area, funding and timeframe. SolDirectory does not deliver supports, choose a provider for the participant or replace due diligence.</p><div className="dir-empty-actions"><Link className="btn-secondary" to="/find-a-provider">Find providers</Link><button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry</button></div></section>

      <section id="referrals" className="wp-cpt-section"><h2>Prepare a referral providers can assess</h2><p>A useful referral is specific enough for a provider to decide whether it can safely meet the request, without disclosing information that is not needed. Confirm the participant or authorised representative agrees to the referral and understands which details may be shared.</p><ol className="wp-cpt-plain-list"><li>Describe the requested support in practical terms: tasks, goals, frequency, preferred days, shift length and proposed start date.</li><li>Record the service location, travel expectations and whether support also occurs at work, education, appointments or community activities.</li><li>State the funding program and management arrangement, but verify budget availability and provider-registration rules separately.</li><li>Include communication, access, cultural, gender and worker preferences that materially affect matching.</li><li>Describe relevant risks and required competencies, plans or equipment without using vague labels as a substitute for person-specific information.</li><li>Name the decision-maker and best contact pathway, and state any deadline that is real rather than aspirational.</li></ol></section>

      <section id="urgent-referrals" className="wp-cpt-section"><h2>Urgent and complex referrals</h2><p>Urgency should change escalation and planning, not lower the quality bar. A directory response is not guaranteed and is not an emergency service. Where there is immediate danger, call 000. Use established crisis, health, safeguarding and after-hours pathways rather than waiting for a provider reply.</p><p>For urgent non-emergency requests, explain the actual deadline, what happens if support is not arranged, interim supports already considered, minimum safe staffing, essential competencies, restrictive-practice or behaviour-support requirements, medication or clinical responsibilities, equipment and environmental risks. Ask providers to state clearly what they can and cannot commence by the required date.</p></section>

      <section id="provider-checks" className="wp-cpt-section"><h2>Compare providers using the same checks</h2><p>Apply a consistent comparison to every provider so familiarity, speed or presentation does not replace evidence. The participant’s preferences and right to choose remain central.</p><div className="directory-guidance-grid"><article><h3>Fit and delivery</h3><p>Confirm who will actually provide support, relevant experience, qualifications, supervision, continuity and how the service adapts when needs change.</p></article><article><h3>Capacity</h3><p>Check the realistic start date, offered roster, service area, waitlist, backup arrangements and what happens when a regular worker is unavailable.</p></article><article><h3>Safeguards</h3><p>Check applicable registration, worker screening, insurance, incident and complaint processes, clinical governance and required person-specific training.</p></article></div><p>Registration requirements vary by support, funding and management arrangement. Check the relevant official register and ask the provider for current evidence. A SolDirectory or public-register listing is not an endorsement and does not prove suitability or availability.</p></section>

      <section className="wp-cpt-section"><h2>Pricing, funding and service agreements</h2><p>Ask for the complete proposed cost in writing. Compare hourly or unit rates alongside travel, non-face-to-face work, reports, establishment fees, minimum shifts, cancellations, weekend or public-holiday rates and exit terms. Confirm that the support and claiming arrangement fit the participant’s current plan or program.</p><p>Before services begin, review the service agreement with the participant in an accessible format. It should identify the support, schedule, rates, responsibilities, consent and information-sharing arrangements, changes, cancellations, complaints, incidents, records and how either party may end the service.</p></section>

      <section className="wp-cpt-section"><h2>Consent, privacy and referral records</h2><p>Share the minimum information necessary for providers to assess the request. Record the authority or consent relied on, what was shared, with whom and for what purpose. Use secure channels for sensitive information and check whether the participant wants family, nominees, advocates or other team members involved.</p><ul className="wp-cpt-plain-list"><li>Keep the original request and any later clarification.</li><li>Record providers contacted, responses, declared conflicts and reasons options were included or excluded.</li><li>Keep written quotes, service agreements and evidence checked at the time of selection.</li><li>Document the participant’s decision and any risks, contingencies or follow-up actions.</li></ul></section>

      <section className="wp-cpt-section"><h2>After a provider responds</h2><p>A quick response is not proof of fit. Arrange a conversation in the participant’s preferred format, verify outstanding evidence and make responsibilities explicit. Agree how progress, incidents, missed shifts, complaints and changes in need will be communicated. Review early enough to correct a poor fit before it becomes a crisis.</p><p>Saved provider lists are available to signed-in coordinator and participant accounts. They are an organisational aid, not a recommendation or compliance record.</p><div className="dir-empty-actions"><Link className="btn-secondary" to="/saved-providers">Open saved providers</Link><Link className="btn-secondary" to="/signup">Create an account</Link></div></section>

      <section className="wp-cpt-section"><h2>Frequently asked questions</h2><div className="wp-cpt-faq-list">{faqs.map((faq) => <details className="wp-cpt-faq-item" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      <section className="wp-cpt-section"><h2>Official checks and guidance</h2><ul className="wp-cpt-plain-list"><li><a href="https://www.ndiscommission.gov.au/providers/provider-registers" target="_blank" rel="noopener noreferrer">NDIS Commission provider registers</a></li><li><a href="https://www.ndiscommission.gov.au/workers/worker-screening" target="_blank" rel="noopener noreferrer">NDIS worker screening</a></li><li><a href="https://www.ndis.gov.au/participants/working-providers" target="_blank" rel="noopener noreferrer">NDIS guidance on working with providers</a></li><li><a href="https://www.myagedcare.gov.au/find-a-provider" target="_blank" rel="noopener noreferrer">My Aged Care provider search</a></li></ul></section>
      <section id="contact" className="wp-cpt-cta"><h2>Contact SolDirectory</h2><p>Ask about using the directory or submit a provider enquiry. Do not send emergency requests through email or the directory.</p><div className="dir-empty-actions">{siteConfig.contactEmail && <a className="btn-secondary" href={`mailto:${siteConfig.contactEmail}`}>Email SolDirectory</a>}<button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry</button></div></section>
    </main><PublicFooter />
  </>;
}