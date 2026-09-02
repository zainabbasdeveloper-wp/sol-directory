// Fixture data extracted verbatim from SolDirectory Workers.dc.html

export const REJECT_REASONS = [
  'Document is not legible',
  'Name does not match the account',
  'Certificate has already expired',
  'Wrong document type supplied',
  'Issuing body could not be confirmed'
];

export const VERIFY_QUEUE = [
  { id: 'v1', name: 'Amara Tesfaye', role: 'Support worker', suburb: 'Bankstown', submitted: '2 hours ago', priority: 'Awaiting review',
    docs: [
      { key: 'd1', name: 'NDIS Worker Check', body: 'NSW Office of the Children\'s Guardian', number: 'NDISWC-448 291', expiry: '13 September 2026', days: 17 },
      { key: 'd2', name: 'Police check', body: 'AFP National Police Check', number: 'AFP-2025-88214', expiry: '2 March 2028', days: 552 },
      { key: 'd3', name: 'First aid and CPR', body: 'St John Ambulance', number: 'HLTAID011', expiry: '19 June 2027', days: 296 }
    ],
    trail: [
      { when: '27 Aug 2026, 9:14am', what: 'Documents submitted by worker', who: 'Amara Tesfaye' },
      { when: '27 Aug 2026, 9:15am', what: 'Automated check matched the Commission register', who: 'System' }
    ] },
  { id: 'v2', name: 'Joel Rankin', role: 'Registered nurse', suburb: 'Parramatta', submitted: '5 hours ago', priority: 'Awaiting review',
    docs: [
      { key: 'd1', name: 'NDIS Worker Check', body: 'NSW Office of the Children\'s Guardian', number: 'NDISWC-501 773', expiry: '2 February 2029', days: 890 },
      { key: 'd2', name: 'AHPRA registration', body: 'Nursing and Midwifery Board', number: 'NMW0012449817', expiry: '31 May 2027', days: 277 },
      { key: 'd3', name: 'Professional indemnity', body: 'Guild Insurance', number: 'PI-77-3390', expiry: '14 September 2026', days: 18 }
    ],
    trail: [{ when: '27 Aug 2026, 6:02am', what: 'Documents submitted by worker', who: 'Joel Rankin' }] },
  { id: 'v3', name: 'Priya Sundaram', role: 'Allied health assistant', suburb: 'Auburn', submitted: 'Yesterday', priority: 'Expiring soon',
    docs: [
      { key: 'd1', name: 'NDIS Worker Check', body: 'NSW Office of the Children\'s Guardian', number: 'NDISWC-390 118', expiry: '8 September 2026', days: 12 },
      { key: 'd2', name: 'Working with Children Check', body: 'Office of the Children\'s Guardian', number: 'WWC1882274E', expiry: '4 April 2027', days: 220 }
    ],
    trail: [
      { when: '26 Aug 2026, 4:41pm', what: 'Renewal requested — Worker Check inside 30 days', who: 'System' },
      { when: '26 Aug 2026, 5:20pm', what: 'Replacement Worker Check uploaded', who: 'Priya Sundaram' }
    ] },
  { id: 'v4', name: 'Daniel Okafor', role: 'Support worker', suburb: 'Liverpool', submitted: '2 days ago', priority: 'Awaiting review',
    docs: [
      { key: 'd1', name: 'NDIS Worker Check', body: 'NSW Office of the Children\'s Guardian', number: 'Not supplied', expiry: 'Not supplied', days: null },
      { key: 'd2', name: 'Driver licence', body: 'Service NSW', number: '••• 442', expiry: '11 November 2029', days: 1172 }
    ],
    trail: [{ when: '25 Aug 2026, 11:08am', what: 'Documents submitted by worker', who: 'Daniel Okafor' }] },
  { id: 'v5', name: 'Hana Kowalski', role: 'Behaviour support practitioner', suburb: 'Marrickville', submitted: '3 days ago', priority: 'Awaiting review',
    docs: [
      { key: 'd1', name: 'NDIS Worker Check', body: 'NSW Office of the Children\'s Guardian', number: 'NDISWC-118 664', expiry: '22 July 2030', days: 1425 },
      { key: 'd2', name: 'Practitioner suitability', body: 'NDIS Quality and Safeguards Commission', number: 'BSP-2024-4471', expiry: '30 June 2027', days: 307 }
    ],
    trail: [{ when: '24 Aug 2026, 2:33pm', what: 'Documents submitted by worker', who: 'Hana Kowalski' }] }
];

export const PLANS = [
  { key: 'starter', name: 'Starter', price: '$0', per: '/month', quota: 0,
    tagline: 'Stay listed and searchable. Lead briefs arrive as headlines only.',
    features: ['Public provider listing', 'Search the worker directory', 'Contact requests to workers', 'Lead headlines, no contact details'] },
  { key: 'growth', name: 'Growth', price: '$249', per: '/month', quota: 15, popular: true,
    tagline: 'Fifteen participant leads a month, matched to your registration groups and suburbs.',
    features: ['15 lead unlocks per month', 'Full brief, budget and contact details', 'Matched to your service areas', 'Three team seats', 'Response time reporting'] },
  { key: 'scale', name: 'Scale', price: '$649', per: '/month', quota: Infinity,
    tagline: 'Unlimited leads, priority placement and exports for larger intake teams.',
    features: ['Unlimited lead unlocks', 'Priority placement in participant search', 'CSV export and webhook feed', 'Ten team seats', 'Named account manager'] }
];

export const LEADS = [
  { id: 'l1', need: 'Weekday personal care, 2 hours each morning', where: 'Bankstown, 4 km', hours: '10 hrs/week', funding: 'Plan-managed', posted: '2 hours ago', budget: '$68.50/hr, core supports', name: 'Marise T. (mother)', phone: '0412 88• •••', note: 'Son is 19, moving from school-leaver supports into a day program. Needs morning personal care and a lift to the program four days a week. Prefers a male worker who speaks Arabic.' },
  { id: 'l2', need: 'Community access, Saturdays', where: 'Parramatta, 9 km', hours: '6 hrs/week', funding: 'Self-managed', posted: '5 hours ago', budget: '$62.00/hr', name: 'Dean W. (participant)', phone: '0455 21• •••', note: 'Looking for a worker to get to the gym and the library on Saturdays. Independent with transport, needs prompting and social support.' },
  { id: 'l3', need: 'Overnight support, rotating roster', where: 'Liverpool, 12 km', hours: '3 nights/week', funding: 'NDIA-managed', posted: 'Yesterday', budget: '$1,120/night, SIL', name: 'Coordinator, Westline SC', phone: '0433 07• •••', note: 'Two-participant SIL house needs overnight active cover from October. Behaviour support plan in place, restrictive practice authorisation current.' },
  { id: 'l4', need: 'Therapy assistant, home program', where: 'Blacktown, 15 km', hours: '4 hrs/week', funding: 'Plan-managed', posted: 'Yesterday', budget: '$58.00/hr', name: 'Sonia K. (participant)', phone: '0402 66• •••', note: 'Running a speech and OT home program for a 7-year-old. Fortnightly reporting to the practitioner required.' },
  { id: 'l5', need: 'Domestic assistance and meal prep', where: 'Auburn, 6 km', hours: '4 hrs/week', funding: 'Plan-managed', posted: '2 days ago', budget: '$59.10/hr', name: 'Peter A. (participant)', phone: '0421 45• •••', note: 'Post-hospital, needs help with cleaning and cooked meals twice a week. Small dog at the property.' },
  { id: 'l6', need: 'Nursing — continence and wound care', where: 'Canterbury, 8 km', hours: '2 visits/week', funding: 'NDIA-managed', posted: '3 days ago', budget: '$122.00/hr', name: 'Coordinator, Hume Health', phone: '0466 30• •••', note: 'Community nursing visits for a participant with a pressure injury. Needs a registered nurse and fortnightly reporting.' }
];

export const OB_TASKS = [
  { key: 'org', title: 'Organisation details', status: 'ABN and registration groups', subtitle: 'These fields are matched against the NDIS Commission register. Anything the register confirms shows on your listing as a fact rather than a claim.',
    fields: [
      { key: 'legal', label: 'Legal entity name', kind: 'text', val: 'Solstice Community Care Pty Ltd', span: 'all' },
      { key: 'abn', label: 'ABN', kind: 'text', val: '81 442 003 91', hint: 'Eleven digits, spaces are fine.' },
      { key: 'trading', label: 'Trading name', kind: 'text', val: 'Solstice Care' },
      { key: 'groups', label: 'Registration groups', kind: 'chips', span: 'all', options: ['Personal care', 'Community participation', 'Nursing', 'Household tasks', 'Transport', 'SIL', 'Behaviour support'] },
      { key: 'contact', label: 'Intake contact email', kind: 'text', val: 'intake@solsticecare.com.au', span: 'all', hint: 'Where unlocked leads are sent. Visible to participants only after you accept a lead.' }
    ] },
  { key: 'insurance', title: 'Insurance and registration', status: 'One document expiring', docsLabel: 'Certificates on file',
    subtitle: 'Certificates of currency are checked on upload and again thirty days before expiry. A lapsed certificate hides your listing until it is replaced.' },
  { key: 'areas', title: 'Service areas and capacity', status: 'Complete',
    subtitle: 'Leads are matched to these suburbs and to your stated weekly capacity. Narrow areas mean fewer but better matched leads.',
    fields: [
      { key: 'suburbs', label: 'Service suburbs', kind: 'chips', span: 'all', options: ['Bankstown', 'Parramatta', 'Liverpool', 'Blacktown', 'Auburn', 'Lidcombe', 'Canterbury', 'Marrickville'] },
      { key: 'radius', label: 'Travel radius', kind: 'select', options: ['10 km', '15 km', '25 km', '40 km'] },
      { key: 'capacity', label: 'Weekly capacity (hours)', kind: 'text', val: '320' },
      { key: 'intake', label: 'Intake status', kind: 'select', options: ['Open to referrals', 'Limited capacity', 'Waitlist only', 'Closed'] }
    ] },
  { key: 'team', title: 'Team and clearances', status: 'One check expiring', docsLabel: 'Worker clearances',
    subtitle: 'Every worker rostered through SolDirectory needs a current NDIS Worker Check. We notify you and the worker sixty days out.',
    fields: [
      { key: 'roster', label: 'Workers on roster', kind: 'text', val: '34' },
      { key: 'afterhours', label: 'After-hours cover', kind: 'select', options: ['On-call coordinator', 'Rostered supervisor', 'None'] }
    ] },
  { key: 'policy', title: 'Incident and complaints policy', status: 'Document missing', docsLabel: 'Policy document',
    subtitle: 'Required by the NDIS Practice Standards. Upload the current version and summarise how an incident is escalated out of hours.',
    fields: [{ key: 'escalation', label: 'Out-of-hours escalation summary', kind: 'area', span: 'all', ph: 'Who is called, in what order, and within what time' }] },
  { key: 'billing', title: 'Subscription and leads', status: 'Choose a plan', plan: true,
    subtitle: 'Your plan controls how many participant leads you can unlock each month. You can change it at any time.' }
];

export const OB_DOCS = {
  insurance: [
    { key: 'pl', name: 'Public liability — $20m', meta: 'Allianz. Expires 19 September 2026', days: 24 },
    { key: 'pi', name: 'Professional indemnity — $10m', meta: 'Allianz. Expires 4 April 2027', days: 221 },
    { key: 'wcomp', name: 'Workers compensation', meta: 'icare NSW. Expires 30 June 2027', days: 308 }
  ],
  team: [
    { key: 'wc1', name: 'NDIS Worker Check — Amara T.', meta: 'Cleared 2021. Expires 13 September 2026', days: 18 },
    { key: 'wc2', name: 'NDIS Worker Check — Joel R.', meta: 'Cleared 2024. Expires 2 February 2029', days: 890 },
    { key: 'wc3', name: 'NDIS Worker Check — Priya S.', meta: 'Cleared 2025. Expires 8 August 2030', days: 1443 }
  ],
  policy: [
    { key: 'pol', name: 'Incident and complaints policy', meta: 'Not uploaded', days: null }
  ]
};

export const TONE = {
  ok: { bc: '#B6DBC5', bg: '#F1F9F4', fg: 'var(--ok)', dot: 'var(--ok)' },
  warn: { bc: '#E8D2A6', bg: '#FDF8EE', fg: '#8A5A16', dot: '#C98A1B' },
  bad: { bc: '#E3B7B0', bg: '#FDF3F1', fg: '#8C2F1E', dot: '#C2472C' },
  flat: { bc: 'var(--color-divider)', bg: '#ffffff', fg: 'color-mix(in srgb, var(--color-text) 60%, transparent)', dot: '#CBD5E1' }
};

export const APP_SCREENS = ['list', 'profile', 'leads', 'plans', 'onboard', 'dash', 'verify'];

