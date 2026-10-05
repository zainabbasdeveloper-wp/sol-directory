import type { ConditionContent } from './conditionContent';

export interface ConditionEditorial {
  planning: string[];
  access: string[];
  safeguards: string[];
  sources: { label: string; href: string }[];
}

const NDIS_ACCESS = { label: 'NDIS access and eligibility', href: 'https://www.ndis.gov.au/applying-access-ndis' };
const NDIS_SUPPORTS = { label: 'NDIS supports and services', href: 'https://www.ndis.gov.au/participants/using-your-plan/managing-your-plan/supports-funded-ndis' };
const MY_AGED_CARE = { label: 'My Aged Care assessments', href: 'https://www.myagedcare.gov.au/assessment' };
const HEALTHDIRECT = { label: 'Healthdirect health information', href: 'https://www.healthdirect.gov.au/' };

const GROUPS: Record<string, ConditionEditorial> = {
  Developmental: {
    planning: [
      'Start with the person’s communication, sensory, learning and daily-living strengths as well as the activities where support is needed.',
      'Set goals around participation in ordinary routines such as home, education, work, relationships and community life, not only clinic-based skills.',
      'Agree how family, carers, educators and providers will share information with consent and use consistent strategies.',
      'Review supports at major transitions and whenever communication, behaviour, health, education or living arrangements change.',
    ],
    access: [
      'Children may access early childhood, health and education pathways as well as disability supports. The responsible system depends on whether the need is clinical treatment, education support or disability-related functional assistance.',
      'NDIS access is based on current eligibility rules and functional impact, not a diagnosis name by itself. Evidence should explain how the person’s day-to-day activities and participation are affected.',
      'Ask providers whether reports, assessments, travel and collaboration time are funded or charged separately before work begins.',
    ],
    safeguards: ['Use the person’s preferred communication method and seek assent as well as formal consent where appropriate.', 'Confirm worker screening, child-safe practices and supervision for anyone working with children or vulnerable people.', 'Avoid providers promising a cure or guaranteed developmental outcome.', 'Ensure restrictive practices, if ever proposed, follow current legal and NDIS Commission requirements.'],
    sources: [NDIS_ACCESS, NDIS_SUPPORTS, { label: 'NDIS early childhood approach', href: 'https://www.ndis.gov.au/understanding/families-and-carers/early-childhood-approach' }],
  },
  'Mobility & Physical': {
    planning: [
      'Describe how mobility, fatigue, pain, transfers and the physical environment affect activities at home and in the community.',
      'Identify equipment, transfer, pressure-care or falls risks that require assessment by an appropriately qualified practitioner.',
      'Coordinate personal support, therapy, equipment and home modifications so recommendations work together.',
      'Plan for changes over time, including maintenance, repairs, reassessment and backup when essential equipment is unavailable.',
    ],
    access: ['Health services remain responsible for diagnosis and clinical treatment, while disability or aged care programs may fund ongoing functional support when their criteria are met.', 'Equipment and modification funding generally requires assessment, evidence and approval before purchase. Do not assume an item can be reimbursed after it is ordered.', 'Confirm ownership, maintenance, warranties, trials, returns and emergency repair arrangements in writing.'],
    safeguards: ['Use current manual-handling and transfer instructions specific to the person and equipment.', 'Confirm practitioner qualifications for assessments and complex equipment recommendations.', 'Do not change mobility equipment, pressure settings or exercise programs without appropriate review.', 'Document falls, skin concerns, pain changes or reduced function and escalate them to the relevant clinician.'],
    sources: [NDIS_ACCESS, NDIS_SUPPORTS, HEALTHDIRECT],
  },
  'Hearing, Vision & Sensory': {
    planning: ['Record the person’s preferred language, communication method, sensory environment and assistive technology.', 'Check physical and digital accessibility before appointments, activities or information are provided.', 'Allow the person to choose interpreters, communication partners and the level of assistance they want.', 'Review technology, communication and environmental strategies when settings or sensory needs change.'],
    access: ['Audiology, ophthalmology and other clinical assessment usually sit within health pathways, while disability funding may support functional communication, equipment or participation where criteria are met.', 'Interpreter and communication support requirements vary by setting and funding arrangement. Confirm who is responsible for booking and payment in advance.', 'Trials and specialist assessment are important before committing funding to high-cost assistive technology.'],
    safeguards: ['Use qualified interpreters for significant medical, legal or financial communication rather than relying on family.', 'Ask before touching a person, mobility aid, assistance animal or communication device.', 'Provide information in the person’s accessible format and allow enough processing time.', 'Have a backup communication method for emergencies and technology failure.'],
    sources: [NDIS_ACCESS, NDIS_SUPPORTS, { label: 'Australian Government accessibility resources', href: 'https://www.accesshub.gov.au/' }],
  },
  'Psychosocial & Mental Health': {
    planning: ['Ask the person what recovery, safety and participation mean to them, and which approaches or language they find helpful.', 'Document preferred contacts, early warning signs and what should happen during a period of increased distress.', 'Coordinate disability support with the treating mental health team while respecting consent and privacy.', 'Use flexible goals that can adapt to changing energy, concentration, sleep and confidence.'],
    access: ['Clinical mental health treatment remains a health-system responsibility. Psychosocial disability support focuses on the ongoing functional impact and participation needs of an eligible person.', 'NDIS eligibility is not automatic for a diagnosis. Evidence should describe likely permanence, treatment history and functional impact under current requirements.', 'Medicare, state mental health services, community organisations, DVA and private health may provide other pathways depending on the person’s circumstances.'],
    safeguards: ['Choose trauma-aware, recovery-oriented support that respects the person’s choices and avoids stigma.', 'Agree privacy and information-sharing boundaries before providers contact clinicians or family.', 'Do not use a directory or support worker as a substitute for urgent clinical or crisis care.', 'For immediate danger call 000; Lifeline is available on 13 11 14 for 24-hour crisis support.'],
    sources: [NDIS_ACCESS, { label: 'Head to Health mental health services', href: 'https://www.headtohealth.gov.au/' }, { label: 'Lifeline crisis support', href: 'https://www.lifeline.org.au/' }],
  },
  'Chronic & Complex Medical': {
    planning: ['Begin with current clinical plans, medication information, treating-team contacts and the exact tasks required.', 'Separate clinical treatment from disability, aged care and daily-living support so responsibility is clear.', 'Identify tasks requiring a nurse, delegation, individual worker training or competency assessment.', 'Plan escalation, after-hours support, supplies and backup arrangements before essential care begins.'],
    access: ['The health system generally funds diagnosis and acute treatment. Other programs may fund ongoing care or functional support according to their current criteria.', 'NDIS, aged care and DVA pathways use different evidence, referral and approval processes. Confirm the responsible program for each task.', 'A provider listing nursing or personal care does not prove competency for a particular complex procedure.'],
    safeguards: ['Use current person-specific clinical plans and never rely only on generic training.', 'Verify professional registration and clinical governance where nursing or allied health care is involved.', 'Confirm infection control, medication, incident and emergency procedures.', 'Escalate deterioration or unexpected symptoms to the treating team or emergency services rather than waiting for a routine review.'],
    sources: [NDIS_SUPPORTS, MY_AGED_CARE, HEALTHDIRECT],
  },
  'ABI, Stroke & Neuro Rehab': {
    planning: ['Describe changes in cognition, communication, movement, behaviour, fatigue and everyday decision-making without assuming they affect every person in the same way.', 'Build goals around meaningful routines and participation, with enough time for rest, processing and consistent practice.', 'Coordinate rehabilitation, personal support, equipment, family education and community participation.', 'Review risk and support strategies as recovery, insight, living arrangements or informal support changes.'],
    access: ['Hospital and health services usually lead acute treatment and rehabilitation. Longer-term disability, community and aged care pathways depend on age, functional impact and program eligibility.', 'Ask who is responsible for therapy, equipment, home modifications and support-worker implementation so gaps are not hidden between systems.', 'Reports should explain functional needs and progress in everyday settings, not only clinical test results.'],
    safeguards: ['Use communication and decision-support strategies suited to the individual person.', 'Confirm competency for swallowing, transfers, seizures, medication or behaviours of concern where relevant.', 'Balance safety planning with dignity, choice and the least restrictive approach.', 'Keep emergency and escalation information current and available to the workers who need it.'],
    sources: [NDIS_ACCESS, NDIS_SUPPORTS, { label: 'Stroke Foundation Australia', href: 'https://strokefoundation.org.au/' }],
  },
};

export function conditionEditorialFor(condition: ConditionContent): ConditionEditorial {
  return GROUPS[condition.categoryGroup];
}