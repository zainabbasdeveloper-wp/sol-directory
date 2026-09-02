// Extracted verbatim from SolDirectory Home (standalone).html's embedded
// script. Per the design brief: "Do not rewrite copy."

export interface Provider {
  code: string;
  name: string;
  state: string;
  area: string;
  blurb: string;
  services: string[];
  funding: string;
  response: string;
  status: string;
  languages: string;
  detail: string;
}

export const PROVIDERS: Provider[] = [
  { code: 'NDIS 4-05-2210', name: 'Wattle Grove Support', state: 'NSW', area: 'Western Sydney, Blacktown to Penrith', blurb: 'Support coordination and daily living help for participants with psychosocial and intellectual disability.', services: ['Support coordination', 'Personal care'], funding: 'NDIS · Agency, plan, self managed', response: 'Usually within 10 minutes', status: 'Taking clients', languages: 'English, Arabic, Hindi', detail: 'A twelve-person team working across Western Sydney since 2018. Coordinators hold a capped caseload of eighteen so plan reviews get attention, and daily living shifts are rostered with the same three workers wherever possible.' },
  { code: 'NDIS 4-08-1174', name: 'Northline Allied Health', state: 'VIC', area: 'Inner north Melbourne, Brunswick to Preston', blurb: 'Occupational therapy, physiotherapy and speech pathology, in clinic or at home.', services: ['Therapy services', 'Nursing'], funding: 'NDIS · Plan and self managed', response: 'Usually within 25 minutes', status: 'Short wait — 2 weeks', languages: 'English, Italian, Greek', detail: 'Assessment reports are written within ten business days and shared with your coordinator. Home visits run Tuesday to Friday; clinic appointments include a hoist-equipped treatment room and accessible parking.' },
  { code: 'NDIS 4-02-3391', name: 'Sunstate Home Care', state: 'QLD', area: 'Brisbane north, Chermside to Redcliffe', blurb: 'Personal care, domestic assistance and community access with a consistent worker roster.', services: ['Personal care', 'Domestic assistance'], funding: 'NDIS · Aged care (HCP)', response: 'Usually within 6 minutes', status: 'Taking clients', languages: 'English, Mandarin', detail: 'Shifts start from one hour, with overnight and 24/7 rosters available in Brisbane north. Aged care packages levels 1 to 4 are supported alongside NDIS plans, and the same coordinator manages both.' },
  { code: 'NDIS 4-11-0827', name: 'Kerridge Plan Partners', state: 'SA', area: 'Adelaide metropolitan, remote statewide', blurb: 'Plan management: invoices paid in two days, budgets you can read without a spreadsheet.', services: ['Plan management'], funding: 'NDIS · Plan managed', response: 'Usually within 15 minutes', status: 'Taking clients', languages: 'English', detail: 'Invoices are paid within two business days and a monthly statement shows spend against each budget category. Onboarding takes one call; no exit fees and no lock-in period.' },
  { code: 'NDIS 4-06-2044', name: 'Freemantle Access Transport', state: 'WA', area: 'Perth south and Fremantle corridor', blurb: 'Wheelchair-accessible transport for appointments, work, study and social activities.', services: ['Transport'], funding: 'NDIS · Agency and plan managed', response: 'Usually within 12 minutes', status: 'Taking clients', languages: 'English', detail: 'Nine wheelchair-accessible vehicles with restraint-trained drivers. Recurring bookings can be locked for a term; same-day requests are taken until 2pm on weekdays.' },
  { code: 'NDIS 4-03-5518', name: 'Harbourview SIL Homes', state: 'NSW', area: 'Sydney inner west and lower north shore', blurb: 'Supported independent living and short-term accommodation in six shared homes.', services: ['Housing (SDA & SIL)', 'Personal care'], funding: 'NDIS · Agency managed', response: 'Usually within 45 minutes', status: 'Two vacancies', languages: 'English, Cantonese', detail: 'Two vacancies in a four-resident home at Marrickville, both with ensuite and ceiling hoist. Vacancy tours run weekly and current residents are part of the matching conversation.' },
  { code: 'NDIS 4-09-1930', name: 'Tanami Community Nursing', state: 'NT', area: 'Darwin, Palmerston and Katherine', blurb: 'High-intensity in-home nursing including PEG, catheter and complex wound care.', services: ['Nursing', 'Personal care'], funding: 'NDIS · All funding types', response: 'Usually within 20 minutes', status: 'Taking clients', languages: 'English, Kriol', detail: 'Registered nurses on call seven days with a two-hour escalation path to the clinical lead. Remote community visits are scheduled fortnightly with travel costs quoted before the first shift.' },
  { code: 'NDIS 4-07-4462', name: 'Bellbird Domestic Services', state: 'VIC', area: 'Geelong, Bellarine and Surf Coast', blurb: 'Cleaning, laundry, meal preparation and garden maintenance on a fixed weekly slot.', services: ['Domestic assistance'], funding: 'NDIS · Plan and self managed', response: 'Usually within 8 minutes', status: 'Taking clients', languages: 'English', detail: 'The same worker keeps your slot each week, with a named backup when they are away. Deep-clean and spring-clean jobs are quoted separately and never charged against a support budget without approval.' },
  { code: 'NDIS 4-04-2871', name: 'Redgum Coordination', state: 'QLD', area: 'Gold Coast and northern Rivers', blurb: 'Support coordination and specialist coordination for participants with complex needs.', services: ['Support coordination'], funding: 'NDIS · All funding types', response: 'Usually within 30 minutes', status: 'Short wait — 3 weeks', languages: 'English, Auslan', detail: 'Two specialist support coordinators on staff for participants with housing, justice or hospital-discharge complexity. Reports for plan reviews are drafted four weeks before the review date.' },
  { code: 'NDIS 4-10-0663', name: 'Derwent Therapy Collective', state: 'TAS', area: 'Hobart, Kingston and Huon Valley', blurb: 'Speech pathology and positive behaviour support for children and young adults.', services: ['Therapy services'], funding: 'NDIS · Plan and self managed', response: 'Usually within 40 minutes', status: 'Waitlist — 6 weeks', languages: 'English', detail: 'School and early-learning visits are included at no travel charge within Hobart. Behaviour support plans are written with the family and reviewed each term rather than annually.' },
  { code: 'NDIS 4-01-7745', name: 'Capital Care Partners', state: 'ACT', area: 'Canberra and Queanbeyan', blurb: 'Personal care, community access and overnight support across the ACT.', services: ['Personal care', 'Support coordination'], funding: 'NDIS · Agency and plan managed', response: 'Usually within 9 minutes', status: 'Taking clients', languages: 'English, Spanish', detail: 'Overnight and sleepover shifts available seven nights. Every worker holds a current Working with Vulnerable People card and completes manual-handling refreshers twice a year.' },
  { code: 'NDIS 4-12-3308', name: 'Riverbend Aged & Disability', state: 'SA', area: 'Riverland and Murray Bridge', blurb: 'Regional personal care, transport and domestic help under one roster.', services: ['Personal care', 'Transport', 'Domestic assistance'], funding: 'NDIS · Aged care (HCP)', response: 'Usually within 18 minutes', status: 'Taking clients', languages: 'English', detail: 'Regional coverage across the Riverland with no travel surcharge inside a 40km radius. Aged care and NDIS supports are rostered together so one visit can cover both.' },
];

export const SERVICES = ['All services', 'Support coordination', 'Personal care', 'Domestic assistance', 'Therapy services', 'Transport', 'Housing (SDA & SIL)', 'Nursing', 'Plan management'];
export const REGIONS = ['All states', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
export const FUNDINGS = ['Any funding', 'Agency managed', 'Plan managed', 'Self managed', 'Aged care (HCP)'];

export interface Quote {
  text: string;
  name: string;
  role: string;
  initials: string;
}

export const QUOTES: Quote[] = [
  { text: 'We rang four providers off other lists and none had a place. The three on SolDirectory all called back the same day.', name: 'Marisa T.', role: 'Support coordinator, Western Sydney', initials: 'MT' },
  { text: 'Mum needed personal care within a fortnight. I found two providers covering her suburb, spoke to both, and had a roster started the next week.', name: 'Daniel O.', role: 'Family carer, Brisbane north', initials: 'DO' },
  { text: 'The response times are the part I trust. If a profile says it replies in ten minutes, it has replied in ten minutes every time.', name: 'Priya S.', role: 'Plan manager, Adelaide', initials: 'PS' },
];

export interface LocationGroup {
  state: string;
  count: string;
  places: string[];
}

// From the design's rendered output (locationGroups) — same figures
// shown in the live Claude Design preview.
export const LOCATION_GROUPS: LocationGroup[] = [
  { state: 'New South Wales', count: '1,840 providers', places: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta'] },
  { state: 'Victoria', count: '1,510 providers', places: ['Melbourne', 'Geelong', 'Ballarat', 'Dandenong'] },
  { state: 'Queensland', count: '1,120 providers', places: ['Brisbane', 'Gold Coast', 'Townsville', 'Cairns'] },
  { state: 'Rest of Australia', count: '1,942 providers', places: ['Perth', 'Adelaide', 'Hobart', 'Canberra', 'Darwin'] },
];
