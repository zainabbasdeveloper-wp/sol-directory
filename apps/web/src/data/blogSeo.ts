/**
 * Search-friendly, durable copy for the blog. Nothing here states a date, price or rule that can change:
 * it explains what the journal covers, answers common questions in general terms, and points to the
 * pages on this site (and the official sources) where the current detail lives.
 */
export interface BlogTopic {
  title: string;
  text: string;
  to: string;
  cta: string;
}

export const BLOG_TOPICS: BlogTopic[] = [
  {
    title: 'NDIS plan and budget changes',
    text: 'What a change to support budgets, categories or plan reviews can mean, and the questions worth asking your planner, plan manager or support coordinator.',
    to: '/guides/plan-management-basics',
    cta: 'NDIS plan management basics',
  },
  {
    title: 'NDIS price guide and pricing arrangements',
    text: 'How price limits, travel charges and claiming rules work in plain English, and where to confirm the current figures before you agree a price.',
    to: '/guides/ndis-price-guide',
    cta: 'Understanding the NDIS price guide',
  },
  {
    title: 'Choosing an NDIS or aged care provider',
    text: 'What to compare, what to ask and what to get in writing before support starts, whether you manage your own funds or use a plan manager.',
    to: '/guides/choosing-a-provider',
    cta: 'How to choose a provider',
  },
  {
    title: 'Provider responsibilities and claims',
    text: 'Changes that affect registered and unregistered providers, from claiming and record keeping to worker screening and complaints handling.',
    to: '/providers',
    cta: 'For NDIS providers',
  },
  {
    title: 'Aged care support and funding',
    text: 'How aged care programs differ from the NDIS, how people move between systems, and where to find providers on the My Aged Care register.',
    to: '/guides/aged-care-support',
    cta: 'Aged care support guide',
  },
  {
    title: 'Finding support near you',
    text: 'Search NDIS and aged care providers by suburb, state, support type, condition or language, then compare listings before you make contact.',
    to: '/locations',
    cta: 'Browse providers by location',
  },
];

export interface BlogFaq { q: string; a: string }

export const BLOG_FAQS: BlogFaq[] = [
  {
    q: 'Where can I find the latest NDIS changes?',
    a: 'The National Disability Insurance Agency (NDIA) publishes official announcements on the NDIS website, and the NDIS Quality and Safeguards Commission publishes updates for providers. Our articles summarise changes that matter to participants, families and providers, and link to the official notice so you can read the original.',
  },
  {
    q: 'Do NDIS changes apply to my plan straight away?',
    a: 'Not always. Some changes apply when a plan is created, reassessed or renewed, and others apply to everyone from a set date. Check the official notice for how and when a change applies, and ask your NDIA contact, local area coordinator, plan manager or support coordinator how it affects your own plan.',
  },
  {
    q: 'Who can explain how a change affects my supports?',
    a: 'Your plan manager or support coordinator can usually explain how a change applies to the supports you use. The NDIA can confirm what applies to your plan. Independent advocacy services can also help you prepare questions or request a review of a decision.',
  },
  {
    q: 'What is the difference between a plan manager and a support coordinator?',
    a: 'A plan manager looks after the money side: paying invoices, tracking budgets and keeping records. A support coordinator helps you understand your plan, connect with providers and make the most of your supports. They are separate supports with separate budgets, and some people use both.',
  },
  {
    q: 'Are these articles professional or personal advice?',
    a: 'No. They are general information written to help you ask better questions. Rules, prices and eligibility can change, so confirm anything that affects a decision with the NDIA, the NDIS Commission, My Aged Care or another responsible agency.',
  },
  {
    q: 'How do I find an NDIS provider after reading an update?',
    a: 'Use the provider finder to search by suburb, support type or language, or submit one free request and let suitable providers respond. Listings from the public NDIS and My Aged Care registers are included, but they show what the registers publish, not who has capacity right now.',
  },
];

/** Where to read next, by article topic. Falls back to the general guides. */
const RELATED_BY_CATEGORY: Record<string, { label: string; to: string }[]> = {
  'Plan changes': [
    { label: 'NDIS plan management basics', to: '/guides/plan-management-basics' },
    { label: 'Understanding the NDIS price guide', to: '/guides/ndis-price-guide' },
    { label: 'NDIS funding explained', to: '/funding' },
    { label: 'Find a support coordinator', to: '/services' },
  ],
  'Provider updates': [
    { label: 'Understanding the NDIS price guide', to: '/guides/ndis-price-guide' },
    { label: 'How to choose a provider', to: '/guides/choosing-a-provider' },
    { label: 'List your business on SolDirectory', to: '/providers' },
    { label: 'Plan management basics', to: '/guides/plan-management-basics' },
  ],
  'Service notices': [
    { label: 'All practical guides', to: '/guides' },
    { label: 'NDIS funding explained', to: '/funding' },
    { label: 'Find an NDIS provider', to: '/find-a-provider' },
    { label: 'Browse providers by location', to: '/locations' },
  ],
};

const DEFAULT_RELATED = [
  { label: 'Practical guides', to: '/guides' },
  { label: 'Find an NDIS provider', to: '/find-a-provider' },
  { label: 'NDIS funding explained', to: '/funding' },
  { label: 'Browse providers by location', to: '/locations' },
];

export function relatedLinksFor(categoryNames: string[]): { label: string; to: string }[] {
  for (const name of categoryNames) if (RELATED_BY_CATEGORY[name]) return RELATED_BY_CATEGORY[name];
  return DEFAULT_RELATED;
}
