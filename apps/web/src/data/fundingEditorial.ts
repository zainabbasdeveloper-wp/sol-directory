import type { FundingContent } from './fundingContent';

export interface FundingEditorial {
  accessHeading: string;
  accessIntro: string;
  steps: string[];
  records: string[];
  providerQuestions: string[];
  pitfalls: string[];
  faqs: { question: string; answer: string }[];
  sources: { label: string; href: string }[];
}

interface FundingGroupGuide {
  accessHeading: string;
  accessIntro: string;
  steps: string[];
  records: string[];
  providerQuestions: string[];
  pitfalls: string[];
  authority: string;
  sources: { label: string; href: string }[];
}

const GROUP_GUIDES: Record<string, FundingGroupGuide> = {
  'NDIS Plans': {
    accessHeading: 'How to use this within an NDIS plan',
    accessIntro: 'Start with the participant’s current plan and the latest NDIA guidance. The same support can be handled differently depending on the plan, management arrangement and whether a provider must be registered.',
    steps: [
      'Read the plan and identify the relevant budget, stated supports, management type and plan dates.',
      'Confirm with the NDIA, planner, plan manager or support coordinator how the proposed support fits the current plan.',
      'Compare providers on service fit, registration where required, availability, rates and written terms.',
      'Monitor invoices and budget use, and raise changed circumstances or likely budget pressure early.',
    ],
    records: ['The current NDIS plan and implementation notes', 'Service agreements, quotes and cancellation terms', 'Invoices, budget statements and payment records', 'Assessments, reports and evidence relevant to plan decisions'],
    providerQuestions: [
      'Can you work with this plan-management arrangement, and must you be NDIS registered for this support?',
      'Which support item or budget do you expect to use, and what evidence supports that approach?',
      'What are your rates for sessions, travel, reports, cancellations and non-face-to-face work?',
      'How will you report progress, spending or concerns before the plan or budget runs short?',
      'What happens if the NDIA rejects a claim or the participant disputes an invoice?',
    ],
    pitfalls: ['Assuming a funded category automatically covers every service', 'Using an outdated price limit or support-item description', 'Starting without written rates and cancellation terms', 'Waiting until the plan is nearly exhausted before reviewing spending'],
    authority: 'the NDIA',
    sources: [
      { label: 'NDIS: Using your plan', href: 'https://www.ndis.gov.au/participants/using-your-plan' },
      { label: 'NDIS pricing arrangements', href: 'https://www.ndis.gov.au/providers/pricing-arrangements' },
    ],
  },
  'Aged Care': {
    accessHeading: 'How to check the current aged care pathway',
    accessIntro: 'Australian aged care programs and contribution rules have changed over time. My Aged Care and the person’s current assessment or service agreement are the authoritative starting points.',
    steps: [
      'Contact My Aged Care or review the person’s current assessment, approval and support plan.',
      'Confirm which current program applies, what services are approved and whether a waiting period applies.',
      'Ask providers for current availability, inclusions, contributions, package management and exit terms in writing.',
      'Review services and costs when needs, income, living arrangements or program rules change.',
    ],
    records: ['My Aged Care reference number and assessment outcome', 'Support plan, approval notices and provider agreement', 'Current fee schedule, budget statements and invoices', 'Health, safety and communication information the provider needs with consent'],
    providerQuestions: [
      'Are you approved to deliver the current program and the specific services required?',
      'What fees, contributions, management charges, travel or establishment costs apply?',
      'When can support start, and what happens if needs increase or a regular worker is absent?',
      'How are unspent funds, service changes, complaints and moving to another provider handled?',
      'Which costs are government funded and which remain the person’s responsibility?',
    ],
    pitfalls: ['Relying on an old program name or superseded fee description', 'Comparing headline prices without checking all recurring charges', 'Assuming approval means a provider has immediate capacity', 'Signing before understanding change, suspension and exit terms'],
    authority: 'My Aged Care',
    sources: [
      { label: 'My Aged Care', href: 'https://www.myagedcare.gov.au/' },
      { label: 'Aged care costs and fees', href: 'https://www.myagedcare.gov.au/how-much-will-i-pay' },
    ],
  },
  Veterans: {
    accessHeading: 'How to confirm a DVA pathway',
    accessIntro: 'DVA eligibility depends on the person, card type, accepted conditions, assessed needs and the rules of the particular program. Confirm the pathway before arranging services privately.',
    steps: [
      'Check the veteran’s Gold or White Card coverage and whether the need relates to an accepted condition.',
      'Contact DVA or the treating practitioner to confirm assessment, referral and prior-approval requirements.',
      'Use a DVA-contracted or otherwise eligible provider where the program requires one.',
      'Confirm any contribution, service limit and review date before support begins.',
    ],
    records: ['DVA card details and accepted-condition information', 'Referral, assessment or prior-approval documents', 'Treatment or support plan and relevant clinical instructions', 'Provider quotes, service records and correspondence with DVA'],
    providerQuestions: [
      'Are you authorised or contracted for this DVA program?',
      'Do you need a referral or prior approval before the first service?',
      'Will you bill DVA directly, and could the veteran have any out-of-pocket cost?',
      'How do you coordinate with the GP, specialist, hospital or DVA case manager?',
      'What happens if DVA changes or declines the approval?',
    ],
    pitfalls: ['Assuming every Gold or White Card covers the same services', 'Booking before referral or approval requirements are met', 'Using a provider that cannot bill the relevant DVA program', 'Treating general disability registration as proof of DVA eligibility'],
    authority: 'the Department of Veterans’ Affairs',
    sources: [
      { label: 'DVA health and support services', href: 'https://www.dva.gov.au/get-support/health-support' },
      { label: 'DVA contact information', href: 'https://www.dva.gov.au/about-us/contact-us' },
    ],
  },
  'Other Funding': {
    accessHeading: 'How to confirm cover before booking',
    accessIntro: 'These arrangements are governed by different insurers, schemes, policies or private contracts. Written confirmation from the responsible payer is more reliable than a provider’s general statement that funding may be available.',
    steps: [
      'Identify the exact insurer, scheme, policy, claim or private-payment arrangement involved.',
      'Confirm eligibility, referral, approval, provider and service requirements with the responsible payer.',
      'Obtain a written quote showing the full fee, expected benefit or scheme payment and likely gap.',
      'Keep invoices and outcome records, and recheck cover before services continue beyond an approval period.',
    ],
    records: ['Policy, membership or claim details', 'Referral, approval or case-manager correspondence', 'Written quote and explanation of likely gaps', 'Invoices, receipts and benefit statements'],
    providerQuestions: [
      'Do you bill this scheme or insurer directly, or must I pay and claim?',
      'Is a referral, approval number or case-manager authority required?',
      'What is the total fee and the likely out-of-pocket amount?',
      'Are there annual limits, waiting periods, approved-provider rules or session caps?',
      'What happens if the claim is delayed, reduced or declined?',
    ],
    pitfalls: ['Assuming a service is covered because a similar service was covered before', 'Confusing a rebate with full payment', 'Starting before written approval where prior approval is required', 'Failing to check annual limits, waiting periods or provider eligibility'],
    authority: 'the responsible insurer, scheme or program',
    sources: [
      { label: 'Services Australia health care and payments', href: 'https://www.servicesaustralia.gov.au/health-care' },
      { label: 'Private Health Insurance Ombudsman', href: 'https://www.ombudsman.gov.au/complaints/private-health-insurance-complaints' },
    ],
  },
  'Help With Funding': {
    accessHeading: 'How to use funding support responsibly',
    accessIntro: 'Advice, administration and coordination can make funding easier to use, but responsibility and decision-making should remain clear. Ask what the service does, what it cannot decide, and how conflicts are managed.',
    steps: [
      'Define the funding question or administrative problem that needs to be solved.',
      'Choose a person or service with the appropriate role, authority and scheme knowledge.',
      'Agree access to records, consent boundaries, fees, deliverables and review points in writing.',
      'Check decisions against the current plan, budget and official program guidance.',
    ],
    records: ['Current plan, budget or funding approval', 'Service agreement and authority or consent settings', 'Invoices, statements and reconciliations', 'Written advice, decisions and follow-up actions'],
    providerQuestions: [
      'What is your role, and which decisions remain with me or the funding body?',
      'What qualifications, registration or relevant scheme experience do you have?',
      'How are fees calculated and reported against the available budget?',
      'Do you receive referral fees or offer other services that create a conflict?',
      'How can I access my records, correct an error or move to another provider?',
    ],
    pitfalls: ['Giving broad authority without clear consent limits', 'Confusing administration with personal financial or legal advice', 'Ignoring conflicts where one organisation controls several services', 'Relying on verbal advice without checking current official guidance'],
    authority: 'the relevant funding body',
    sources: [
      { label: 'NDIS: Managing your plan', href: 'https://www.ndis.gov.au/participants/using-your-plan/managing-your-plan' },
      { label: 'NDIS Commission participant resources', href: 'https://www.ndiscommission.gov.au/participants' },
    ],
  },
};

export function fundingEditorialFor(topic: FundingContent): FundingEditorial {
  const guide = GROUP_GUIDES[topic.categoryGroup];
  const lower = topic.name.toLowerCase();
  return {
    ...guide,
    faqs: [
      {
        question: `Who can confirm whether ${lower} applies to me?`,
        answer: `Eligibility and individual coverage should be confirmed with ${guide.authority}. A provider can explain its services and billing, but it cannot make a binding funding decision on behalf of the responsible body.`,
      },
      {
        question: `Does a provider listing prove it accepts ${lower}?`,
        answer: 'No. A directory or public-register listing describes a provider and the supports it lists. Confirm the exact funding arrangement, approval and current availability directly before booking.',
      },
      {
        question: 'What costs should I confirm before services begin?',
        answer: 'Ask for the service rate, travel, cancellations, reports, administration, equipment or consumables, and any gap or personal contribution in writing. Check which costs the funding body will actually pay.',
      },
      {
        question: 'What if the rules or my circumstances change?',
        answer: `Recheck the current guidance with ${guide.authority}, tell relevant providers promptly and update written agreements or approvals before relying on the changed arrangement.`,
      },
      {
        question: 'Is this page personal financial or funding advice?',
        answer: 'No. It is general information for preparing questions and comparing options. Use current official guidance and seek qualified advice where a decision has legal, financial or clinical consequences.',
      },
    ],
  };
}