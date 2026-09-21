// Generic, service-agnostic fallback content for the service + suburb pages
// (ServiceLocationPage). Nothing here is a statistic or a claim about a
// specific place — page-specific data (demand, suburb facts, language stats,
// response times, ...) is only ever shown when an editor authors it in
// WordPress. Removed: fabricated providers, demand percentages, suburb facts,
// language counts and glance tables that used to render for every suburb.

// Generic, service-agnostic guidance shown on every service page until an
// editor authors page-specific content in WordPress. (These used to be
// nursing-specific and were shown for every service.)
export const COMPARE = [
  { title: 'Registration and qualifications', body: 'Check that the provider, and the worker who will attend, hold the registration and qualifications the support requires.', ask: 'Who will deliver my supports, and what registration and qualifications do they hold?' },
  { title: 'Worker screening and safeguards', body: 'Providers delivering NDIS supports are responsible for the screening of their workers and for how incidents and complaints are handled.', ask: 'How do you screen your workers, and how do you handle incidents or complaints?' },
  { title: 'Availability and continuity', body: 'A directory listing does not prove current capacity. Ask about start dates, rostering and cover when a regular worker is unavailable.', ask: 'When could you start, and what happens if my regular worker is away?' },
  { title: 'Pricing and funding', body: 'Rates and what is included can differ between providers. Ask for a written service agreement before supports begin.', ask: 'What are your rates, what is included, and do you accept my funding type?' },
];

export const REGULATORS = [
  { name: 'NDIS Quality & Safeguards Commission', phone: '1800 035 544', site: 'ndiscommission.gov.au' },
  { name: 'Aged Care Quality & Safety Commission', phone: '1800 951 822', site: 'agedcarequality.gov.au' }
];

export const POLICIES = ['Statement of Rights', 'Complaints Policy', 'Privacy Policy'];

// Generic answers that are true for every service and location. (The
// previous version was a nursing-in-Bankstown script, with invented response
// times and prices, and was shown for every service and suburb.)
export const FAQ = [
  { q: 'How does SolDirectory work?', a: 'SolDirectory is a directory and referral service. You can search for providers, or send one free request. Providers who cover your area and offer the support you need are notified and contact you directly.' },
  { q: 'Does it cost anything to use?', a: 'No. It is free for participants, families and coordinators. Providers pay a subscription, and payment does not change where a provider appears in the directory.' },
  { q: 'How do I know a provider is registered?', a: 'Providers supply their own registration details. Before you engage a provider, confirm their registration with them directly or on the NDIS Commission’s public provider register.' },
  { q: 'Which funding types can I use?', a: 'Providers list the funding types they accept, such as NDIS, aged care, private and DVA. When you send a request you choose how the supports are funded so that we can match you with providers who accept it. Confirm details with the provider.' },
  { q: 'How quickly will a provider respond?', a: 'Providers are notified as soon as you send a request. Response times vary between providers, so we do not publish an estimate here. We report response times only when enough real enquiries have been answered to make the figure accurate.' },
  { q: 'Does SolDirectory provide the supports?', a: 'No. SolDirectory does not deliver supports, does not recommend or endorse providers, and does not take a commission on your services.' },
];
