export { GUIDE_DOCS } from './guides.js';

const group = (categoryGroup, names) => names.map(([slug, name]) => ({ slug, name, categoryGroup }));

export const CONDITION_TOPICS = [
  ...group('Developmental', [
    ['autism', 'Autism'], ['adhd', 'ADHD'], ['intellectual-disability', 'Intellectual Disability'],
    ['global-developmental-delay', 'Global Developmental Delay'], ['down-syndrome', 'Down Syndrome'],
    ['fragile-x-syndrome', 'Fragile X Syndrome'], ['cerebral-palsy', 'Cerebral Palsy'],
    ['speech-language-delay', 'Speech & Language Delay'],
  ]),
  ...group('Mobility & Physical', [
    ['spinal-cord-injury', 'Spinal Cord Injury'], ['amputation-limb-loss', 'Amputation & Limb Loss'],
    ['muscular-dystrophy', 'Muscular Dystrophy'], ['multiple-sclerosis', 'Multiple Sclerosis'], ['arthritis', 'Arthritis'],
    ['spina-bifida', 'Spina Bifida'], ['chronic-pain', 'Chronic Pain'],
  ]),
  ...group('Hearing, Vision & Sensory', [
    ['deafness-hearing-loss', 'Deafness & Hearing Loss'], ['blindness-low-vision', 'Blindness & Low Vision'],
    ['deafblindness', 'Deafblindness'], ['auslan-support', 'Auslan Support'], ['sensory-processing', 'Sensory Processing'],
  ]),
  ...group('Psychosocial & Mental Health', [
    ['schizophrenia', 'Schizophrenia'], ['bipolar-disorder', 'Bipolar Disorder'], ['ptsd', 'PTSD'],
    ['anxiety-disorders', 'Anxiety Disorders'], ['depression', 'Depression'], ['eating-disorders', 'Eating Disorders'],
    ['borderline-personality-disorder', 'Borderline Personality Disorder'], ['dual-diagnosis', 'Dual Diagnosis'],
  ]),
  ...group('Chronic & Complex Medical', [
    ['epilepsy', 'Epilepsy'], ['diabetes', 'Diabetes'], ['cystic-fibrosis', 'Cystic Fibrosis'],
    ['renal-failure', 'Renal Failure'], ['cancer-care', 'Cancer Care'], ['motor-neurone-disease', 'Motor Neurone Disease'],
    ['parkinson-s-disease', "Parkinson's Disease"],
  ]),
  ...group('ABI, Stroke & Neuro Rehab', [
    ['acquired-brain-injury', 'Acquired Brain Injury'], ['stroke-recovery', 'Stroke Recovery'],
    ['traumatic-brain-injury', 'Traumatic Brain Injury'], ['huntington-s-disease', "Huntington's Disease"],
    ['neuro-physiotherapy', 'Neuro Physiotherapy'],
  ]),
];

export const FUNDING_TOPICS = [
  ...group('NDIS Plans', [
    ['agency-managed', 'Agency Managed'], ['plan-managed', 'Plan Managed'], ['self-managed', 'Self Managed'],
    ['plan-reviews', 'Plan Reviews'], ['change-of-circumstances', 'Change of Circumstances'], ['first-plan-support', 'First Plan Support'],
  ]),
  ...group('Aged Care', [
    ['home-care-packages', 'Home Care Packages'], ['commonwealth-home-support', 'Commonwealth Home Support'],
    ['support-at-home', 'Support at Home'], ['residential-fees', 'Residential Fees'],
  ]),
  ...group('Veterans', [
    ['dva-community-nursing', 'DVA Community Nursing'], ['dva-home-care', 'DVA Home Care'],
    ['veterans-home-care', "Veterans' Home Care"], ['rehabilitation-appliances', 'Rehabilitation Appliances'],
    ['open-arms-referrals', 'Open Arms Referrals'],
  ]),
  ...group('Other Funding', [
    ['private-fee-for-service', 'Private Fee for Service'], ['icare-workers-compensation', 'iCare & Workers Compensation'],
    ['private-health-insurance', 'Private Health Insurance'], ['medicare-care-plans', 'Medicare Care Plans'],
    ['state-funded-programs', 'State Funded Programs'],
  ]),
  ...group('Help With Funding', [
    ['plan-managers', 'Plan Managers'], ['bookkeeping-invoicing', 'Bookkeeping & Invoicing'],
    ['price-guide-explained', 'Price Guide Explained'], ['funding-eligibility', 'Funding Eligibility'],
    ['budget-categories', 'Budget Categories'],
  ]),
];

export const LANGUAGE_TOPICS = [
  ...group('Most Requested', [
    ['arabic', 'Arabic'], ['mandarin', 'Mandarin'], ['cantonese', 'Cantonese'], ['vietnamese', 'Vietnamese'],
    ['greek', 'Greek'], ['italian', 'Italian'], ['hindi', 'Hindi'], ['punjabi', 'Punjabi'],
  ]),
  ...group('Middle East & Africa', [
    ['assyrian', 'Assyrian'], ['persian-farsi', 'Persian (Farsi)'], ['dari', 'Dari'], ['turkish', 'Turkish'],
    ['somali', 'Somali'], ['swahili', 'Swahili'], ['amharic', 'Amharic'],
  ]),
  ...group('First Nations', [
    ['aboriginal-torres-strait-islander-services', 'Aboriginal & Torres Strait Islander Services'],
    ['kriol', 'Kriol'], ['yolngu-matha', 'Yolngu Matha'], ['pitjantjatjara', 'Pitjantjatjara'],
  ]),
  ...group('Europe', [
    ['spanish', 'Spanish'], ['portuguese', 'Portuguese'], ['polish', 'Polish'], ['croatian', 'Croatian'],
    ['serbian', 'Serbian'], ['russian', 'Russian'], ['macedonian', 'Macedonian'], ['german', 'German'],
  ]),
  ...group('Asia Pacific', [
    ['tagalog', 'Tagalog'], ['indonesian', 'Indonesian'], ['korean', 'Korean'], ['japanese', 'Japanese'],
    ['nepali', 'Nepali'], ['tamil', 'Tamil'], ['thai', 'Thai'], ['khmer', 'Khmer'],
  ]),
  ...group('Access & Interpreting', [
    ['auslan', 'Auslan'], ['deafblind-interpreters', 'Deafblind Interpreters'],
    ['tis-national-bookings', 'TIS National Bookings'], ['easy-read-materials', 'Easy Read Materials'],
    ['translated-documents', 'Translated Documents'],
  ]),
];

const CONDITION_GUIDES = {
  'Developmental': 'Good planning considers communication, sensory needs, learning, daily routines, family context and participation across home, education, work and community life.',
  'Mobility & Physical': 'Good planning considers movement, fatigue, pain, transfers, equipment, the physical environment and how support can preserve choice and independence.',
  'Hearing, Vision & Sensory': 'Good planning starts with the person’s preferred communication, accessible information, sensory environment, assistive technology and right to direct assistance.',
  'Psychosocial & Mental Health': 'Good planning is recovery-oriented and trauma-aware, respects privacy and choice, and coordinates functional support with clinical mental health care when consent is given.',
  'Chronic & Complex Medical': 'Good planning separates clinical treatment from daily functional support, uses current person-specific health plans and makes responsibility for escalation and after-hours care clear.',
  'ABI, Stroke & Neuro Rehab': 'Good planning considers cognition, communication, movement, fatigue, behaviour and meaningful daily participation, with coordinated rehabilitation and support that can change over time.',
};

const FUNDING_GUIDES = {
  'NDIS Plans': 'Use the participant’s current plan and current NDIA guidance. Confirm the relevant budget, management arrangement, provider-registration requirements, price limits and written service terms before support begins.',
  'Aged Care': 'Use the person’s current assessment and My Aged Care guidance. Confirm the program, approved services, provider availability, personal contributions, recurring fees and exit terms in writing.',
  'Veterans': 'DVA eligibility depends on card type, accepted conditions, assessed need and the particular program. Confirm referrals, prior approval, contracted-provider requirements and possible contributions directly with DVA.',
  'Other Funding': 'Check the exact insurer, scheme, policy or private arrangement. Obtain written confirmation of eligibility, referral and provider requirements, total fees, expected benefits and likely out-of-pocket costs.',
  'Help With Funding': 'Define the administrative or funding question, choose a service with the right role and authority, agree consent and record access, and check decisions against the current plan and official guidance.',
};

const FUNDING_DETAILS = {
  'NDIS Plans': {
    steps: ['Read the current plan and identify the relevant budget, management type and plan dates.', 'Confirm how the proposed support fits with the NDIA, planner, plan manager or support coordinator.', 'Compare providers on service fit, registration where required, availability, complete rates and written terms.', 'Monitor invoices and budget use, and raise changed circumstances or likely budget pressure early.'],
    records: ['The current NDIS plan and implementation notes', 'Service agreements, quotes and cancellation terms', 'Invoices, budget statements and payment records', 'Assessments, reports and evidence relevant to plan decisions'],
    providerQuestions: ['Can you work with this plan-management arrangement, and must you be registered for this support?', 'Which support item or budget do you expect to use, and why?', 'What are your rates for sessions, travel, reports, cancellations and non-face-to-face work?', 'How will you report progress, spending or concerns before the budget runs short?', 'What happens if the NDIA rejects a claim or an invoice is disputed?'],
    pitfalls: ['Assuming a funded category covers every service', 'Using an outdated price limit or support-item description', 'Starting without written rates and cancellation terms', 'Waiting until the plan is nearly exhausted before reviewing spending'],
    sources: [{ label: 'NDIS: Using your plan', href: 'https://www.ndis.gov.au/participants/using-your-plan' }, { label: 'NDIS pricing arrangements', href: 'https://www.ndis.gov.au/providers/pricing-arrangements' }],
  },
  'Aged Care': {
    steps: ['Contact My Aged Care or review the person’s current assessment, approval and support plan.', 'Confirm which current program applies, what services are approved and whether a waiting period applies.', 'Ask providers for availability, inclusions, contributions, management charges and exit terms in writing.', 'Review services and costs when needs, income, living arrangements or program rules change.'],
    records: ['My Aged Care reference number and assessment outcome', 'Support plan, approval notices and provider agreement', 'Current fee schedule, budget statements and invoices', 'Health, safety and communication information shared with consent'],
    providerQuestions: ['Are you approved to deliver the current program and required services?', 'What fees, contributions, management charges, travel or establishment costs apply?', 'When can support start, and what happens if needs increase or a regular worker is absent?', 'How are service changes, complaints and moving to another provider handled?', 'Which costs are government funded and which remain the person’s responsibility?'],
    pitfalls: ['Relying on an old program name or fee description', 'Comparing headline prices without all recurring charges', 'Assuming approval means immediate provider capacity', 'Signing before understanding suspension, change and exit terms'],
    sources: [{ label: 'My Aged Care', href: 'https://www.myagedcare.gov.au/' }, { label: 'Aged care costs and fees', href: 'https://www.myagedcare.gov.au/how-much-will-i-pay' }],
  },
  Veterans: {
    steps: ['Check the veteran’s card coverage and whether the need relates to an accepted condition.', 'Confirm assessment, referral and prior-approval requirements with DVA or the treating practitioner.', 'Use a DVA-contracted or otherwise eligible provider where the program requires one.', 'Confirm any contribution, service limit and review date before support begins.'],
    records: ['DVA card details and accepted-condition information', 'Referral, assessment or prior-approval documents', 'Treatment or support plan and relevant clinical instructions', 'Provider quotes, service records and DVA correspondence'],
    providerQuestions: ['Are you authorised or contracted for this DVA program?', 'Is a referral or prior approval required before the first service?', 'Will you bill DVA directly, and could the veteran have an out-of-pocket cost?', 'How do you coordinate with treating professionals or a DVA case manager?', 'What happens if DVA changes or declines the approval?'],
    pitfalls: ['Assuming every card covers the same services', 'Booking before referral or approval requirements are met', 'Using a provider that cannot bill the relevant DVA program', 'Treating disability registration as proof of DVA eligibility'],
    sources: [{ label: 'DVA health and support services', href: 'https://www.dva.gov.au/get-support/health-support' }, { label: 'DVA contact information', href: 'https://www.dva.gov.au/about-us/contact-us' }],
  },
  'Other Funding': {
    steps: ['Identify the exact insurer, scheme, policy, claim or private-payment arrangement.', 'Confirm eligibility, referral, approval, provider and service requirements with the payer.', 'Obtain a written quote showing the full fee, expected benefit and likely gap.', 'Keep invoices and outcome records, and recheck cover before an approval period ends.'],
    records: ['Policy, membership or claim details', 'Referral, approval or case-manager correspondence', 'Written quote and explanation of likely gaps', 'Invoices, receipts and benefit statements'],
    providerQuestions: ['Do you bill this scheme directly, or must the person pay and claim?', 'Is a referral, approval number or case-manager authority required?', 'What is the total fee and likely out-of-pocket amount?', 'Are there annual limits, waiting periods, approved-provider rules or session caps?', 'What happens if the claim is delayed, reduced or declined?'],
    pitfalls: ['Assuming a service is covered because it was covered before', 'Confusing a rebate with full payment', 'Starting before required written approval', 'Failing to check annual limits, waiting periods or provider eligibility'],
    sources: [{ label: 'Services Australia health care and payments', href: 'https://www.servicesaustralia.gov.au/health-care' }, { label: 'Private Health Insurance Ombudsman', href: 'https://www.ombudsman.gov.au/complaints/private-health-insurance-complaints' }],
  },
  'Help With Funding': {
    steps: ['Define the funding question or administrative problem that needs to be solved.', 'Choose a service with the appropriate role, authority and current scheme knowledge.', 'Agree record access, consent boundaries, fees, deliverables and review points in writing.', 'Check decisions against the current plan, budget and official program guidance.'],
    records: ['Current plan, budget or funding approval', 'Service agreement and authority or consent settings', 'Invoices, statements and reconciliations', 'Written advice, decisions and follow-up actions'],
    providerQuestions: ['What is your role, and which decisions remain with the person or funding body?', 'What qualifications, registration or relevant scheme experience do you have?', 'How are fees calculated and reported against the available budget?', 'Do you receive referral fees or offer other services that create a conflict?', 'How can records be accessed, errors corrected or the service changed?'],
    pitfalls: ['Giving broad authority without clear consent limits', 'Confusing administration with personal financial or legal advice', 'Ignoring conflicts where one organisation controls several services', 'Relying on verbal advice without checking current official guidance'],
    sources: [{ label: 'NDIS: Managing your plan', href: 'https://www.ndis.gov.au/participants/using-your-plan/managing-your-plan' }, { label: 'NDIS Commission participant resources', href: 'https://www.ndiscommission.gov.au/participants' }],
  },
};

const FUNDING_LONGFORM = {
  'NDIS Plans': {
    deepDive: [
      'An NDIS plan sets out funded supports and how budgets are managed, but it does not operate as a list of prepaid services. Each purchase still needs to relate to the participant’s disability support needs, goals and current NDIS rules. Read the full plan, including plan dates, stated supports and management arrangements. When wording is unclear, seek clarification from the NDIA, a plan manager or another appropriately qualified person before entering a long service commitment.',
      'Estimate the cost across the remaining plan period rather than checking only whether one invoice can be paid. Include regular sessions, travel, public-holiday rates, reports, non-face-to-face work and cancellation exposure. Other providers may draw from the same flexible budget, so an apparent balance can overstate what is genuinely uncommitted. Review statements and future bookings together, especially after rates, frequency or circumstances change.',
      'Management type affects who pays claims and which providers can generally be used; it does not change the purpose of the funded support. NDIA-managed budgets generally require registered providers, while plan-managed and self-managed budgets may provide broader provider choice subject to the rules for the support. Some higher-risk supports have specific registration or delivery requirements regardless of general provider choice. Confirm the rule for the exact support rather than relying on a provider’s broad registration statement.',
      'Keep decisions and changes traceable. Service agreements should identify supports, rates, extra charges, schedules, review points and exit terms. Match invoices to attendance and agreed work, and query unfamiliar support items or duplicate charges promptly. If needs, living arrangements or informal support change materially, record what has happened and contact the NDIA through the appropriate pathway. Reallocating spending informally cannot replace a funding decision when the current plan no longer meets the situation.',
    ],
    reviewChecklist: ['Check the plan dates, management type and relevant budget.', 'Identify stated, quoted or registration-dependent supports.', 'Forecast committed services through the remaining plan period.', 'Reconcile invoices with attendance and written rates.', 'Review goals, outcomes and service frequency at agreed intervals.', 'Report material changes through the appropriate NDIA pathway.'],
  },
  'Aged Care': {
    deepDive: [
      'Aged care begins with the person’s current needs, preferences and official assessment rather than with a provider package. Review the My Aged Care record, approval and support plan, and check which program or pathway applies today. Program names and arrangements can change during reform. An approval establishes eligibility for particular support but may not guarantee immediate allocation, a preferred provider or every service the person would like to purchase.',
      'Compare the whole financial arrangement. Ask for the current fee schedule, personal contributions, care or package management charges, travel, cancellation rules, equipment costs and any privately paid services. Determine how much funding remains available for direct care after recurring charges. Written estimates should explain what happens when service frequency changes, a worker is absent, the person enters hospital or the agreement is paused or ended.',
      'Care planning should include the older person directly and record goals, routines, communication, cultural preferences, health instructions, risks and emergency contacts. Consent should specify who can receive information and make decisions. Ask how the provider supervises workers, updates instructions, responds to incidents and reviews changing needs. Public registration or approval supports verification but does not prove local capacity, continuity or compatibility with the person.',
      'Review support after falls, hospital visits, medication changes, carer stress, cognitive changes or reduced ability to manage daily activities. Tell the provider and My Aged Care when the assessment or service plan may no longer reflect the situation. Keep care plans, statements, invoices and important correspondence. Ordinary concerns can begin with the provider, while unresolved quality and safety matters may be raised with the Aged Care Quality and Safety Commission. Immediate danger requires an emergency response.',
    ],
    reviewChecklist: ['Confirm the current assessment, approval and program.', 'Compare direct-care value after all recurring charges.', 'Record consent, communication and cultural requirements.', 'Check worker continuity and after-hours arrangements.', 'Review services after health or living circumstances change.', 'Keep final statements and records when changing providers.'],
  },
  Veterans: {
    deepDive: [
      'DVA support depends on the veteran’s circumstances, card, accepted conditions and the rules of the particular treatment or support program. A Gold Card, White Card or other eligibility pathway does not produce the same coverage in every situation. Check whether the proposed service relates to accepted conditions, whether a treating practitioner must make a referral and whether DVA approval is needed before the first appointment or purchase.',
      'Provider eligibility also varies. Some services must be delivered by a DVA-contracted or appropriately recognised provider using DVA billing arrangements. Ask the provider to confirm its authority for the exact program, not simply its experience with veterans or registration under another scheme. Confirm whether it bills DVA directly, what information it submits, whether limits or treatment cycles apply and whether the veteran could face a contribution or non-covered charge.',
      'Coordinate information carefully where a GP, specialist, allied health practitioner, hospital, rehabilitation provider or DVA case manager is involved. Agree who receives reports and who is responsible for renewals or further approvals. Share health and claim information only with appropriate consent. Keep referrals, approval numbers, treatment plans, attendance records, invoices and DVA correspondence together so a delayed or rejected account can be investigated without interrupting necessary care.',
      'Review the arrangement before a referral, approval period or treatment cycle expires. If needs change, ask whether reassessment or a revised treatment plan is required rather than assuming the existing authority expands automatically. Query unexpected private fees before paying them. Complaints about service quality should follow the relevant provider and DVA pathway, while urgent clinical or safety issues need the appropriate health or emergency response. Current DVA guidance takes priority over general directory information.',
    ],
    reviewChecklist: ['Check card coverage and accepted-condition relevance.', 'Confirm referral and prior-approval requirements.', 'Verify the provider for the exact DVA program.', 'Record approval numbers, limits and review dates.', 'Clarify direct billing and possible personal costs.', 'Coordinate renewals before current authority expires.'],
  },
  'Other Funding': {
    deepDive: [
      'Medicare, private health insurance, workers compensation, motor accident schemes, state programs and private payment each use different rules. Begin by identifying the exact payer, policy, claim or program rather than asking whether a service is funded in general. Check eligibility, waiting periods, referral requirements, approved-provider rules, annual or episode limits and whether authorisation must be issued before treatment begins.',
      'A benefit is not necessarily full payment. Obtain a written quote showing the provider’s total fee, expected rebate or scheme payment and likely out-of-pocket amount. Ask whether the provider bills directly or whether the person pays first and claims later. Confirm how travel, reports, equipment, cancellations and services beyond an approved limit are handled. Recheck the estimate when a new calendar year, policy year, claim stage or approval period begins.',
      'Where an insurer or case manager is involved, clarify the scope of their authority and obtain important decisions in writing. A referral may support clinical access without guaranteeing payment, while a provider’s recognition by one payer may not apply to another product or scheme. Keep the policy or claim details, referrals, approvals, quotes, invoices, receipts and benefit statements. Compare each payment with the promised benefit and query discrepancies promptly.',
      'Private payment can provide choice but should still use clear service terms and safeguards. Confirm qualifications, insurance, complete fees, privacy, complaint processes and cancellation or exit conditions. Avoid committing to a long program based only on an expected future reimbursement. If a claim is delayed or declined, ask for the reason and applicable review pathway. Significant legal, compensation or financial decisions may require advice from a suitably qualified professional rather than a service provider.',
    ],
    reviewChecklist: ['Name the exact policy, scheme, claim or private arrangement.', 'Check referrals, waiting periods and prior approval.', 'Obtain the total fee, expected benefit and gap.', 'Confirm provider recognition with the payer.', 'Keep receipts and reconcile benefit statements.', 'Recheck limits when an approval or policy period changes.'],
  },
  'Help With Funding': {
    deepDive: [
      'Funding administration services can help with invoices, budgets, records or navigating a program, but their authority has limits. Define the exact problem before choosing support: it may involve understanding a plan, reconciling an invoice, preparing evidence, locating an official decision or coordinating providers. Ask the service to explain what it can do, which decisions remain with the person or funding body and when legal, financial, clinical or advocacy expertise is needed instead.',
      'Agree on consent and access before sharing records. Specify which plans, portals, invoices or reports the service can view, what actions it may take and who can receive information. Broad access should not be the default when a narrower permission is enough. Ask how records are stored, how errors are corrected and how access ends. Keep copies of authorities, advice, decisions and work completed so the person is not dependent on one organisation for their own information.',
      'Understand fees and conflicts of interest. Ask whether charges come from a funded budget, are paid privately or are linked to another service. Find out whether the organisation also provides plan management, support coordination, direct supports or provider referrals, and how competing interests are disclosed and managed. Recommendations should be based on the person’s requirements and choices, not on referral benefits or pressure to keep several services within one business.',
      'Review outcomes rather than continuing administration indefinitely. Useful support should leave budgets, invoices, records and next actions clearer. Set review points, request reconciliations and confirm unresolved items in writing. Verify important interpretations against current official guidance because program rules can change. If advice appears outside the service’s competence or an error could affect substantial funding, seek clarification from the funding body or an appropriately qualified independent professional.',
    ],
    reviewChecklist: ['Define the question and expected deliverable.', 'Confirm role boundaries and relevant experience.', 'Limit consent and system access to what is necessary.', 'Record fees and possible conflicts of interest.', 'Keep written advice, reconciliations and decisions.', 'Review whether the service is resolving the original problem.'],
  },
};

export function conditionShellEditorial(topic) {
  return {
    overview: CONDITION_GUIDES[topic.categoryGroup],
    checks: [
      `Ask what direct experience the provider and allocated worker have supporting people with ${topic.name.toLowerCase()}.`,
      'Confirm qualifications, screening, supervision, insurance and any person-specific training required for the support.',
      'Discuss communication, culture, routines, goals, risks and how the support will be reviewed when needs change.',
      'Confirm rates, travel, cancellations, reports, funding and the written service agreement before support starts.',
    ],
    faq: [
      { question: `Does SolDirectory verify experience with ${topic.name.toLowerCase()}?`, answer: 'No. Providers write their own profiles. Ask the provider directly about relevant experience, staff and training.' },
      { question: 'Is this medical advice?', answer: 'No. This is general information for comparing support. Speak with a qualified health professional about diagnosis or treatment.' },
      { question: 'Does a diagnosis guarantee funding?', answer: 'No. Funding programs apply their own eligibility and evidence requirements, including functional impact and the type of support requested.' },
    ],
  };
}

export function fundingShellEditorial(topic) {
  const detail = FUNDING_DETAILS[topic.categoryGroup];
  const longform = FUNDING_LONGFORM[topic.categoryGroup];
  return {
    overview: FUNDING_GUIDES[topic.categoryGroup],
    checks: [
      `Confirm with the responsible funding body whether ${topic.name.toLowerCase()} applies to the person and proposed support.`,
      'Ask the provider to explain its role, approval requirements, billing process and full fees in writing.',
      'Check travel, cancellations, reports, administration, equipment, personal contributions and possible gaps.',
      'Keep approvals, service agreements, invoices and statements, and review them when circumstances or program rules change.',
    ],
    ...detail,
    ...longform,
    faq: [
      { question: `Does a provider listing prove it accepts ${topic.name.toLowerCase()}?`, answer: 'No. Confirm the exact funding arrangement and current availability directly with the provider before booking.' },
      { question: 'Who makes the funding decision?', answer: 'The responsible government body, insurer, scheme or policy administrator applies its current eligibility and payment rules.' },
      { question: 'Which costs should be confirmed?', answer: 'Ask about service rates, travel, cancellations, reports, administration, equipment, possible gaps and personal contributions. Get the complete arrangement in writing.' },
      { question: 'What if circumstances or program rules change?', answer: 'Contact the responsible funding body, update relevant providers promptly and revise approvals or service agreements before relying on a changed arrangement.' },
      { question: 'Is this personal funding advice?', answer: 'No. This is general information for preparing questions and comparing providers. Check current official guidance and seek qualified advice where needed.' },
    ],
  };
}

export function languageShellEditorial(topic) {
  return {
    overview: `Finding support connected with ${topic.name} can make it easier to explain preferences, understand choices and take part in decisions. A provider listing is only a starting point: confirm who communicates in the requested language, their level of fluency, whether an accredited interpreter is needed and how communication will work in practice.`,
    checks: [
      `Ask whether the allocated worker communicates in ${topic.name}, rather than relying on the organisation having one multilingual staff member.`,
      'Confirm spoken, signed, written and Easy Read needs separately, including preferred dialect, terminology and communication aids.',
      'Ask when a qualified independent interpreter will be used and who books and pays for that service.',
      'Check current availability, qualifications, worker screening, fees, funding, privacy and the written service agreement.',
    ],
    faq: [
      { question: `Does a listing prove that every worker speaks or uses ${topic.name}?`, answer: 'No. Providers supply their own language information. Confirm the specific worker, fluency, dialect and communication method before support begins.' },
      { question: 'Is a bilingual worker the same as an accredited interpreter?', answer: 'No. A bilingual worker may communicate directly during support, while an accredited interpreter has a separate interpreting role. Ask what is appropriate for important, technical or consent-related discussions.' },
      { question: 'Does SolDirectory assess cultural safety?', answer: 'No. Ask the provider how it works with the person’s culture, community, family relationships, privacy and decision-making preferences.' },
    ],
  };
}
