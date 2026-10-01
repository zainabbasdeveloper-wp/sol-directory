const NDIS_MAIN = { label: 'NDIS supports and services', href: 'https://www.ndis.gov.au/participants/using-your-plan/managing-your-plan/supports-funded-ndis' };
const NDIS_COMMISSION = { label: 'NDIS Quality and Safeguards Commission', href: 'https://www.ndiscommission.gov.au/participants' };
const MY_AGED_CARE = { label: 'My Aged Care help at home', href: 'https://www.myagedcare.gov.au/help-at-home' };

export const SERVICE_EDITORIAL = {
  'Support coordination': {
    name: 'Support coordination',
    shortAnswer: 'Support coordination helps an NDIS participant understand and use their plan, connect with suitable services, and build the skills and relationships needed to manage supports more independently. The coordinator does not replace the participant’s decision-making and should explain choices, conflicts and fees clearly.',
    overview: [
      'Good support coordination is practical and participant-led. It starts with the goals, funded supports and informal relationships already in the participant’s life, then turns the plan into an organised set of actions. Work may include identifying suitable providers, arranging introductions, helping prepare service agreements, coordinating several services, and supporting communication when responsibilities overlap. The coordinator should help the participant understand why an option may or may not fit rather than simply choosing providers for them.',
      'The amount and complexity of coordination varies. Someone implementing a first plan may need help understanding budgets and setting up core supports. A person with changing health, housing or behavioural needs may need more active coordination between clinical services, disability supports, family and mainstream systems. Specialist support coordination is a distinct, higher-complexity support and should be delivered by someone with the expertise required for the risks and barriers involved.',
      'Independence is an important outcome. A coordinator should record decisions, make information accessible, and help the participant build confidence in tasks they want to manage themselves. Ask how progress will be reviewed, what happens when a provider is unavailable, and how the coordinator avoids conflicts when their organisation also delivers other paid supports.'
    ],
    includes: [
      'Explaining plan budgets, service categories and practical next steps in accessible language.',
      'Researching provider options and helping the participant compare service fit, availability and terms.',
      'Coordinating communication among providers, family, nominees and mainstream services with consent.',
      'Preparing for reviews by organising information about goals, barriers and how current supports are working.',
      'Building the participant’s confidence to direct providers, solve problems and manage more of the plan over time.'
    ],
    planning: [
      'Write down the outcomes that matter now, not only the names of funded support categories.',
      'Identify urgent gaps, existing providers, preferred communication methods and decisions that require consent.',
      'Agree how often the coordinator will make contact, what records will be shared and how travel or non-face-to-face work is charged.',
      'Set review points so coordination activity can reduce, change or become more specialised as needs evolve.'
    ],
    providerQuestions: [
      'What experience do you have with plans and circumstances similar to mine?',
      'How will you show me the options considered and any conflicts of interest?',
      'How do you track time, travel and non-face-to-face work against my budget?',
      'What is your approach when providers disagree or a service breaks down?',
      'How will you help me build skills rather than remain dependent on coordination?'
    ],
    funding: [
      'Support coordination must be included in the plan before NDIS funds can generally be used for it. The plan identifies the funded level or purpose, while the service agreement should explain rates, travel, reports and other billable activity.',
      'Plan management and support coordination are different roles. A plan manager processes invoices and budget records; a support coordinator helps implement the plan and connect supports. One organisation may offer both, but responsibilities and conflicts should remain clear.'
    ],
    safeguards: [
      'Confirm registration requirements for the funding arrangement and support being delivered.',
      'Ask for a written conflict-of-interest policy, particularly where the organisation offers other supports.',
      'Agree consent boundaries before information is shared with providers, family or agencies.',
      'Keep copies of plans, service agreements, reports and important decisions in a form the participant can access.'
    ],
    sources: [NDIS_MAIN, { label: 'NDIS support coordination', href: 'https://www.ndis.gov.au/participants/using-your-plan/who-can-help-start-your-plan/support-coordination' }, NDIS_COMMISSION]
  },
  'Personal care': {
    name: 'Personal care',
    shortAnswer: 'Personal care is assistance with daily personal activities such as showering, dressing, grooming, toileting, eating and moving safely. The right arrangement protects privacy and choice while providing only the level of assistance the person wants and needs.',
    overview: [
      'Personal care happens in private moments, so trust, consent and consistency matter as much as the task list. Support should follow the person’s routines, communication style, cultural preferences and goals. A provider should explain how workers are matched, how preferences about gender or language are handled, and what happens when a regular worker is absent. The person should be supported to do the parts of each activity they can and want to do, rather than having tasks automatically taken over.',
      'Needs can range from prompting and set-up through to hands-on assistance with transfers, continence, mealtime support or complex daily routines. Higher-intensity support may require workers with specific training and a current support plan prepared by an appropriately qualified practitioner. A general personal-care listing does not prove that every worker can safely deliver every task, so describe the exact activities, equipment and risks before accepting a roster.',
      'A clear service agreement should cover scheduled times, minimum shifts, travel, cancellations, worker changes and how concerns are escalated. The support plan should be available to the workers who need it, reviewed when circumstances change, and written in a way that preserves the person’s dignity and choices.'
    ],
    includes: [
      'Prompting, supervision or assistance with showering, bathing, grooming and dressing.',
      'Support with toileting, continence routines and personal hygiene in line with an agreed plan.',
      'Assistance with eating, drinking and meal-time routines where workers have the required training.',
      'Safe movement, transfers and use of mobility equipment according to current instructions.',
      'Establishing reliable morning, evening or community routines while encouraging independence.'
    ],
    planning: [
      'Describe each task, the assistance level required and anything the person prefers to do independently.',
      'Record communication needs, privacy preferences, cultural practices, equipment and current professional instructions.',
      'Identify tasks that require specific training, delegation or competency assessment before a worker attends.',
      'Plan backup arrangements for late, absent or unfamiliar workers so essential care is not missed.'
    ],
    providerQuestions: [
      'How do you match workers to personal, cultural, language and gender preferences?',
      'How do you assess and record worker competency for my specific support tasks?',
      'Will I have a regular team, and how are replacement workers introduced?',
      'How are medication, incidents, changes in health and privacy concerns documented?',
      'What are the minimum shift, cancellation, travel and public-holiday arrangements?'
    ],
    funding: [
      'NDIS funding may cover disability-related assistance with daily personal activities when it meets the plan and funding criteria. Ordinary living costs and clinical treatment are considered separately, and the exact support must align with the participant’s plan.',
      'Aged care programs may fund personal care after assessment. Fees, contributions and service availability depend on the current program and individual circumstances, so confirm them with My Aged Care and the chosen provider.'
    ],
    safeguards: [
      'Confirm worker screening, training, supervision and insurance relevant to the tasks being delivered.',
      'Use a current support plan for transfers, mealtime risks, continence, medication or complex routines.',
      'Require consent and privacy practices that explain intimate support before it begins.',
      'Know how to report missed care, injury, neglect, abuse, privacy breaches or other incidents.'
    ],
    sources: [NDIS_MAIN, NDIS_COMMISSION, MY_AGED_CARE]
  },
  'Domestic assistance': {
    name: 'Domestic assistance',
    shortAnswer: 'Domestic assistance helps a person maintain a safe and functional home through tasks such as cleaning, laundry, meal preparation and essential household routines. Funded support should relate to assessed disability or aged care needs rather than simply replacing ordinary household expenses.',
    overview: [
      'The purpose of domestic assistance is usually to make daily life safer and more manageable when disability, illness, frailty or caring circumstances limit a person’s ability to complete essential tasks. A useful arrangement begins with priorities: which tasks affect safety, nutrition, hygiene or the ability to remain at home, and which tasks the person wants to continue doing themselves. Providers should not assume a standard checklist suits every household.',
      'Service scope varies. Some workers provide routine cleaning and laundry, while meal preparation, shopping support, garden maintenance or home organisation may sit under different service categories or require separate pricing. Heavy cleaning, repairs, pest treatment and specialist hazards may be excluded. Ask the provider to define what is included, what equipment or products they bring, and what must be supplied by the household.',
      'Consistency and boundaries prevent misunderstandings. Agree rooms, tasks, frequency, access arrangements, pets, infection-control needs and how breakages or safety hazards are handled. Review the task plan if mobility, health, household composition or equipment changes. Domestic support should preserve choice and independence, not remove control over the person’s home.'
    ],
    includes: [
      'Routine cleaning of essential living areas, kitchens and bathrooms.',
      'Laundry, linen changes and basic household organisation connected with daily living.',
      'Meal preparation or support to plan simple meals when included in the service scope.',
      'Shopping or household-task assistance where this is agreed and funded.',
      'Prompts, set-up or shared task completion that helps the person retain skills and routines.'
    ],
    planning: [
      'List priority tasks and define a realistic frequency instead of relying on a vague promise to clean the home.',
      'Identify allergies, chemical sensitivities, infection risks, pets, access instructions and equipment requirements.',
      'Clarify whether the worker supplies products and whether shopping, gardening or meal preparation cost extra.',
      'Agree how keys, alarm codes, valuables, accidental damage and unattended access will be managed.'
    ],
    providerQuestions: [
      'Which household tasks are included, excluded or charged separately?',
      'Will the same worker attend, and what happens when that person is unavailable?',
      'What products and equipment do workers use, and can preferences or sensitivities be accommodated?',
      'How are property damage, safety hazards and privacy concerns reported?',
      'How do you support the person to participate in tasks when that is one of their goals?'
    ],
    funding: [
      'NDIS funding may cover household tasks that are reasonable and necessary because of disability, but it does not generally cover rent, groceries, cleaning products or ordinary costs everyone incurs. The plan and service agreement should identify the disability-related assistance being purchased.',
      'Entry-level and more intensive aged care programs may include domestic assistance after assessment. Current eligibility, personal contributions and provider availability should be confirmed through My Aged Care.'
    ],
    safeguards: [
      'Confirm screening, identity checks, insurance and supervision for workers entering the home.',
      'Use written access and key-handling arrangements, especially when the person will not be present.',
      'Document chemical sensitivities, manual-handling risks and areas workers should not access.',
      'Keep receipts and authorisation rules clear if a worker handles shopping money or household purchases.'
    ],
    sources: [NDIS_MAIN, NDIS_COMMISSION, MY_AGED_CARE]
  },
  'Therapy services': {
    name: 'Therapy services',
    shortAnswer: 'Therapy services include allied health assessment and intervention intended to improve function, communication, mobility, independence or participation. The relevant profession and approach depend on the person’s goals and clinical needs; “therapy” is not one interchangeable service.',
    overview: [
      'Occupational therapists, physiotherapists, speech pathologists, psychologists, dietitians, exercise physiologists and other practitioners have different scopes of practice. Begin with the outcome or difficulty to be addressed, then identify the profession qualified to assess it. A provider should explain who will deliver the service, their registration or professional membership, and when an assistant or therapy aide may be involved.',
      'Effective therapy usually includes more than appointments. Assessment, goal setting, practice between sessions, communication with the support team, reports and review all affect progress. Ask how recommendations will fit daily routines and who needs training to carry them out safely. Reports should be purposeful and accessible, with costs and delivery time agreed before work starts.',
      'Evidence and consent matter. The practitioner should explain proposed approaches, expected benefits, alternatives, risks and how progress will be measured. Outcomes vary and no ethical provider should guarantee a cure or fixed result. If therapy overlaps with health treatment, school, rehabilitation or aged care, clarify which system is responsible and how information will be shared.'
    ],
    includes: [
      'Assessment of function, communication, mobility, behaviour, swallowing, daily activities or other profession-specific needs.',
      'Collaborative goals and an intervention plan linked to everyday participation.',
      'Direct sessions, home programs, equipment recommendations or environmental strategies within professional scope.',
      'Training for family, carers or support workers when consented and clinically appropriate.',
      'Progress reviews and reports that explain outcomes, barriers and future recommendations.'
    ],
    planning: [
      'Define the practical change sought and gather existing assessments, plans and relevant medical information.',
      'Confirm which profession is appropriate and whether in-person, telehealth, home, clinic or community delivery fits.',
      'Ask how session time, travel, reports, case conferences and cancellations are charged.',
      'Agree how progress will be measured and when the approach will be reviewed or changed.'
    ],
    providerQuestions: [
      'Which practitioner will work with me, and what registration, qualifications and experience do they hold?',
      'What evidence supports the proposed approach, and what alternatives are available?',
      'How will goals and progress be measured in everyday life?',
      'Will assistants be involved, and how are they supervised by the qualified practitioner?',
      'What reports or non-face-to-face work are expected, and what will they cost?'
    ],
    funding: [
      'The NDIS may fund disability-related therapeutic supports that meet its funding criteria, while diagnosis, acute treatment and other health responsibilities may remain with the health system. A plan category alone does not establish that every proposed therapy is fundable.',
      'Medicare, private health, aged care, DVA or state programs may contribute in some circumstances. Confirm referrals, limits, gaps and claiming rules with the responsible program and practitioner before starting.'
    ],
    safeguards: [
      'Verify professional registration where a profession is regulated and relevant memberships for self-regulated professions.',
      'Expect informed consent, privacy, clinical records and a clear complaints process.',
      'Be cautious of guaranteed outcomes, pressure to buy large packages or claims that reject established evidence without explanation.',
      'Ensure high-risk recommendations, restrictive practices, swallowing support or complex equipment involve appropriately qualified practitioners.'
    ],
    sources: [NDIS_MAIN, NDIS_COMMISSION, { label: 'Australian Health Practitioner Regulation Agency', href: 'https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx' }]
  },
  'Transport': {
    name: 'Transport',
    shortAnswer: 'Transport support helps a person travel to activities, appointments, work, education or community participation when disability or care needs make ordinary transport options difficult. It may involve direct transport, support to use public transport, or travel delivered as part of another support.',
    overview: [
      'Start by separating the travel outcome from the transport method. Some people need a driver and accessible vehicle; others need a worker to accompany them, practise a route or manage anxiety and communication. A provider should explain whether it offers transport as a standalone service, only during another booked support, or through activity-based travel charged under specific rules.',
      'Safety and reliability are central. Confirm vehicle suitability, wheelchair restraints, transfer assistance, child restraints, driver licensing, insurance and what happens during delays or breakdowns. If a support worker uses a private vehicle, ask how that use is authorised and insured. The person should know who is collecting them, where they will wait, and how changes are communicated.',
      'Pricing can include worker time, kilometres, tolls, parking or provider travel, depending on the arrangement and funding rules. These are different charges and should be written separately. Agree cancellation rules, shared rides, waiting time and whether the worker remains during the appointment or activity.'
    ],
    includes: [
      'Travel to appointments, employment, education, shopping or community activities.',
      'Assistance entering, leaving or travelling safely in a suitable vehicle.',
      'Training and support to build confidence using public or community transport.',
      'Activity-based transport delivered during another support where permitted and agreed.',
      'Route planning and communication arrangements for regular or unfamiliar journeys.'
    ],
    planning: [
      'Record pickup and destination details, mobility equipment, transfer needs and communication preferences.',
      'Confirm whether the person travels alone, with a worker, with other passengers or with a support animal.',
      'Separate hourly support charges from kilometres, tolls, parking and waiting time.',
      'Plan late pickups, cancelled appointments, vehicle failure and urgent contact arrangements.'
    ],
    providerQuestions: [
      'Are vehicles, drivers and wheelchair restraints suitable and insured for this journey?',
      'Will transport be private or shared, and who else may be in the vehicle?',
      'How are worker time, kilometres, tolls, parking and waiting charged?',
      'Can you provide the same driver or worker for regular journeys?',
      'What is the procedure for delays, breakdowns, incidents or a missed pickup?'
    ],
    funding: [
      'NDIS transport funding and provider-delivered travel are not the same thing. A participant may receive a transport budget, purchase assistance to use transport, or pay activity-based transport associated with another support where current rules allow it.',
      'Aged care, DVA, health and community transport programs may have separate eligibility and contribution rules. Confirm which program applies before assuming a fare or worker journey is covered.'
    ],
    safeguards: [
      'Confirm driver licensing, vehicle registration, insurance and any required worker screening.',
      'Check accessible-vehicle and restraint procedures for wheelchairs or other mobility equipment.',
      'Use clear pickup identity and consent arrangements for children or people at risk.',
      'Document incident response, emergency contacts and medication or health needs relevant during travel.'
    ],
    sources: [NDIS_MAIN, NDIS_COMMISSION, MY_AGED_CARE]
  },
  'Housing (SDA & SIL)': {
    name: 'Housing (SDA & SIL)',
    shortAnswer: 'Specialist Disability Accommodation (SDA) and Supported Independent Living (SIL) are different. SDA concerns eligible specialist housing; SIL concerns paid assistance with daily life, usually in a shared or individual home. A person may receive one without the other.',
    overview: [
      'Housing decisions have long-term effects, so separating the property, tenancy and support arrangements is essential. SDA funding relates to the dwelling for eligible participants with very high support needs or extreme functional impairment. SIL is the rostered support delivered in the home. The SDA provider, SIL provider and tenancy manager may be different organisations, and each agreement should clearly state its role.',
      'Choice should not disappear because services are bundled. Ask whether the person can change the support provider while remaining in the home, how vacancies are managed, and what happens if housemates or support arrangements do not work. Understand rent, utilities, food and other ordinary living costs separately from funded disability supports.',
      'A good exploration process considers location, accessibility, compatibility, overnight needs, staffing, privacy, transport and connection to community. Visit more than once where possible, review agreements independently, and avoid pressure to accept a vacancy before the person understands alternatives and exit arrangements.'
    ],
    includes: [
      'Exploring housing goals, accessibility needs, preferred location and living arrangements.',
      'SDA dwellings designed to an enrolled design category for eligible participants.',
      'SIL assistance with personal care, household routines, community participation and overnight needs as rostered.',
      'Individualised living supports or other home-and-living options where those better fit the person.',
      'Coordination among housing, tenancy, support and informal networks while keeping responsibilities distinct.'
    ],
    planning: [
      'List non-negotiable accessibility, location, privacy, communication and overnight support requirements.',
      'Separate rent, tenancy, SDA payments, SIL supports, utilities, food and personal expenses.',
      'Review compatibility and choice when sharing, including routines, visitors, pets, culture and communication.',
      'Obtain independent help to understand service agreements, tenancy terms, vacancies and exit clauses.'
    ],
    providerQuestions: [
      'Are you the housing provider, support provider, tenancy manager, or more than one of these?',
      'Can I change my SIL provider without losing the home?',
      'How were roster, staffing ratios and shared-support assumptions calculated?',
      'How are housemate compatibility, vacancies, incidents and complaints managed?',
      'What costs are paid from NDIS funding and what must I pay personally?'
    ],
    funding: [
      'SDA must be specifically included in an eligible participant’s plan and is paid for the enrolled dwelling. SIL is separately considered and funded according to support needs. Rent and ordinary living costs remain personal expenses.',
      'Home and living decisions can also involve individualised living options, personal care, home modifications or mainstream housing. Current NDIA guidance and the participant’s plan should guide which pathway is relevant.'
    ],
    safeguards: [
      'Check SDA dwelling enrolment and the registration status relevant to each provider’s role.',
      'Seek independent advice where housing and support agreements create pressure or conflicts of interest.',
      'Confirm emergency, overnight, medication, evacuation and incident procedures for the actual home.',
      'Ensure the person understands complaints, advocacy, tenancy rights and how to leave an unsuitable arrangement.'
    ],
    sources: [{ label: 'NDIS home and living', href: 'https://www.ndis.gov.au/participants/home-and-living' }, { label: 'NDIS Specialist Disability Accommodation', href: 'https://www.ndis.gov.au/providers/housing-and-living-supports-and-services/specialist-disability-accommodation' }, NDIS_COMMISSION]
  },
  'Nursing': {
    name: 'Nursing',
    shortAnswer: 'Community nursing provides clinical care in a person’s home or community, such as wound, continence, medication or complex health support. The required clinician, delegation and funding pathway depend on the task, clinical risk and whether the need belongs to disability, aged care or the health system.',
    overview: [
      'Nursing is not interchangeable with general support work. A registered or enrolled nurse should assess clinical needs within their scope, develop or follow a current care plan, and determine which tasks require a nurse and which may be delegated to a trained worker. The provider should explain clinical governance, supervision and how competency is assessed for the individual person and task.',
      'Continuity is important for wound care, continence, diabetes, enteral feeding, respiratory support, medication and other complex routines. Ask how records are maintained, changes are escalated to the treating team, supplies are managed and after-hours concerns are handled. A directory category alone does not demonstrate that a provider has the right nurse or competency for a particular procedure.',
      'Funding responsibilities can overlap. The health system is generally responsible for diagnosis and acute clinical treatment, while the NDIS may fund disability-related nursing supports that meet its criteria. Aged care and DVA have their own pathways. Clarify who prescribed or requested the care, who reviews it, and which program is paying before service begins.'
    ],
    includes: [
      'Clinical assessment, care planning and review within the nurse’s professional scope.',
      'Wound, continence, catheter, medication, diabetes or other community nursing support where appropriate.',
      'Training and competency assessment for support workers when delegation is lawful and clinically suitable.',
      'Communication with treating practitioners and escalation when health status changes.',
      'Clinical records, infection control and management of equipment or consumables connected with care.'
    ],
    planning: [
      'Provide current clinical plans, medication information, practitioner contacts and relevant discharge instructions.',
      'Identify the exact tasks, frequency, timing, supplies, equipment and after-hours risks.',
      'Clarify which tasks require a nurse and which may be delegated, including supervision and reassessment.',
      'Agree what constitutes an emergency, who is contacted and when hospital or primary care is required.'
    ],
    providerQuestions: [
      'Which nurse will assess and deliver the care, and what registration and experience do they hold?',
      'How do you govern delegation, worker training and competency for my specific clinical tasks?',
      'Who reviews the care plan and communicates with my treating team?',
      'How are urgent changes, missed visits, infection concerns and after-hours issues handled?',
      'Which supplies, reports, travel and non-face-to-face activities are included in the quote?'
    ],
    funding: [
      'NDIS funding may cover disability-related community nursing when it meets current criteria, but acute treatment and broader health-system responsibilities are not shifted to the NDIS simply because care occurs at home.',
      'Aged care and DVA programs may fund community nursing after assessment or referral. Confirm eligibility, contributions, referrals and the responsible clinical provider through the relevant official program.'
    ],
    safeguards: [
      'Verify nurse registration on the public Ahpra register and confirm the practitioner’s scope and experience.',
      'Require current clinical plans, consent, records, infection-control processes and medication governance.',
      'Ensure delegated high-intensity tasks have individual training, competency assessment and clinical oversight.',
      'Know the escalation pathway for deterioration, medication error, missed care, injury or reportable incident.'
    ],
    sources: [NDIS_MAIN, NDIS_COMMISSION, { label: 'Nursing and Midwifery Board of Australia', href: 'https://www.nursingmidwiferyboard.gov.au/' }, MY_AGED_CARE]
  },
  'Plan management': {
    name: 'Plan management',
    shortAnswer: 'A plan manager pays provider invoices, claims from the NDIS and helps a participant monitor a plan-managed budget. Plan management provides financial administration and information; it does not choose supports for the participant or guarantee that every invoice is an appropriate use of funding.',
    overview: [
      'Plan management offers access to registered and unregistered providers while moving much of the invoice and claiming administration to a registered plan manager. The participant still directs their supports and remains responsible for using funds in line with the plan. A plan manager should provide understandable budget information, identify unusual or incomplete invoices, and explain what it can and cannot decide.',
      'Service quality depends on systems and communication. Ask how invoices are checked, how quickly valid invoices are processed, how the participant approves disputed charges, and how budget reports are accessed. Alerts should help identify overspending or unexpected use early, but forecasts are only as accurate as invoices and service bookings supplied to the plan manager.',
      'Plan managers hold sensitive financial and support information. Privacy, cyber security, complaint handling and continuity during system outages matter. The participant should be able to change plan manager under the service agreement and obtain usable records and current balances without unnecessary delay.'
    ],
    includes: [
      'Receiving provider invoices and checking required information before processing claims.',
      'Claiming through the NDIA system and paying providers from available plan-managed funds.',
      'Providing statements, category balances and spending information in an accessible format.',
      'Raising duplicate, incomplete, unusual or out-of-budget invoices for clarification.',
      'Helping participants and providers understand plan-management administration and invoice requirements.'
    ],
    planning: [
      'Choose how invoices are approved and who may discuss claims on the participant’s behalf.',
      'List existing providers, recurring bookings and expected large expenses to support useful forecasting.',
      'Agree report frequency, low-budget alerts, invoice turnaround and urgent-payment procedures.',
      'Understand notice periods, record transfer and final reconciliation if changing plan manager.'
    ],
    providerQuestions: [
      'How can I view current balances, transactions and projected spending?',
      'How do you check invoices and involve me when a charge appears incorrect or unclear?',
      'What are your usual processing times, and how are urgent or overdue invoices handled?',
      'How do you protect personal and financial information and respond to a data incident?',
      'What happens to records, unpaid invoices and balances if I change plan manager?'
    ],
    funding: [
      'Plan management is included separately in an NDIS plan when approved and does not ordinarily reduce budgets for other funded supports. Current pricing arrangements govern how registered plan managers claim for the service.',
      'Plan-managed participants can generally use registered or unregistered providers, subject to the plan and current NDIS rules. Price limits and claiming requirements still apply to plan-managed supports.'
    ],
    safeguards: [
      'Confirm the organisation is registered for plan management and understand any related-provider conflicts.',
      'Use participant-controlled invoice approval and clear authority settings for nominees or coordinators.',
      'Review statements regularly and question duplicate, unfamiliar or incorrectly categorised claims promptly.',
      'Check privacy, cyber-security, complaints, business-continuity and record-transfer processes.'
    ],
    sources: [{ label: 'NDIS plan management', href: 'https://www.ndis.gov.au/participants/creating-your-plan/ways-manage-your-funding/plan-management' }, { label: 'NDIS Pricing Arrangements and Price Limits', href: 'https://www.ndis.gov.au/providers/pricing-arrangements' }, NDIS_COMMISSION]
  }
};

export function serviceEditorialFor(name) {
  return SERVICE_EDITORIAL[name];
}

export function serviceEditorialWordCount(content) {
  return [
    content.shortAnswer,
    ...content.overview,
    ...content.includes,
    ...content.planning,
    ...content.providerQuestions,
    ...content.funding,
    ...content.safeguards,
  ].join(' ').trim().split(/\s+/).filter(Boolean).length;
}
