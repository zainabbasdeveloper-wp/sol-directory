import type { RegisterType, SUPPORT_CATEGORIES } from '../lib/registerMeta';

type Category = (typeof SUPPORT_CATEGORIES)[number];

/**
 * Which part of the public provider register is worth showing on each
 * funding topic page (/funding/:slug). A funding scheme isn't something a
 * register listing carries — the registers say who is registered and for
 * what support, not which payment arrangements a business accepts — so
 * each link below is to the register or support categories a person on
 * that funding would most plausibly be looking at, and every one carries
 * its own wording saying a listing is not proof of acceptance. A topic
 * with no honest register link is simply absent (`undefined`), and its
 * page shows no provider list rather than a misleading one.
 */
export interface FundingProviderLink {
  type: RegisterType;
  categories: Category[];
  /** Also offer the whole register for `type` (no category filter). */
  includeAll?: boolean;
  intro: string;
  disclaimer: string;
}

const NDIS_NOT_FUNDING = 'A register listing shows that a business is registered with the NDIS Commission for a type of support — it does not tell you who has capacity, what they charge, or how they work with your plan. Confirm both with the provider.';
const NOT_ACCEPTANCE = 'A listing here means the business lists these supports on the public register. It does not show that it holds an arrangement for this funding — confirm that with the provider before booking.';

const LINKS: Record<string, FundingProviderLink> = {
  'agency-managed': {
    type: 'ndis',
    categories: ['Support coordination', 'Personal care', 'Therapy services', 'Community access'],
    includeAll: true,
    intro: 'Agency-managed funding can only be used with providers registered with the NDIS Commission, and the NDIS provider register is where registration is published. These are the registered providers listed on it.',
    disclaimer: NDIS_NOT_FUNDING,
  },
  'plan-managed': {
    type: 'ndis',
    categories: ['Plan management', 'Support coordination', 'Personal care', 'Therapy services'],
    includeAll: true,
    intro: 'Plan-managed funding can be used with registered and unregistered providers. These are providers listed on the NDIS provider register, including those offering plan management itself.',
    disclaimer: NDIS_NOT_FUNDING,
  },
  'self-managed': {
    type: 'ndis',
    categories: ['Support coordination', 'Personal care', 'Therapy services', 'Community access'],
    includeAll: true,
    intro: 'Self-managed funding can be used with any provider, registered or not. The NDIS provider register is a good place to start looking for registered providers.',
    disclaimer: NDIS_NOT_FUNDING,
  },
  'plan-reviews': {
    type: 'ndis',
    categories: ['Support coordination'],
    intro: 'Support coordinators commonly help participants prepare for a plan review and gather evidence of how supports are being used. These are providers listing support coordination on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'change-of-circumstances': {
    type: 'ndis',
    categories: ['Support coordination'],
    intro: 'A support coordinator can help work out whether a change is significant enough to report. These are providers listing support coordination on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'first-plan-support': {
    type: 'ndis',
    categories: ['Support coordination', 'Plan management'],
    intro: 'Support coordination and plan management are the supports most often used to get a first plan up and running. These are providers listing them on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'plan-managers': {
    type: 'ndis',
    categories: ['Plan management'],
    intro: 'These are providers listing plan management on the NDIS provider register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'bookkeeping-invoicing': {
    type: 'ndis',
    categories: ['Plan management'],
    intro: 'Plan managers handle invoicing and record-keeping for participants. These are providers listing plan management on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'price-guide-explained': {
    type: 'ndis',
    categories: [],
    includeAll: true,
    intro: 'NDIS price limits apply to registered providers when they deliver many supports under agency or plan-managed funding. These are the providers listed on the NDIS register.',
    disclaimer: 'Price limits are a maximum, not a quote — providers set their own rates up to those limits. Ask for a provider’s rates in writing.',
  },
  'budget-categories': {
    type: 'ndis',
    categories: ['Support coordination', 'Personal care', 'Therapy services', 'Community access', 'Life skills'],
    includeAll: true,
    intro: 'Which budget category a support is paid from depends on the support, not the provider. These are providers on the NDIS register, grouped by the kind of support they list.',
    disclaimer: NDIS_NOT_FUNDING,
  },
  'home-care-packages': {
    type: 'aged_care',
    categories: ['Dementia care', 'Palliative care', 'Residential aged care'],
    includeAll: true,
    intro: 'These are providers on the My Aged Care provider register.',
    disclaimer: 'The register lists approved aged care providers. Which programs a provider delivers, and whether it has capacity, can only be confirmed with the provider or My Aged Care (1800 200 422).',
  },
  'commonwealth-home-support': {
    type: 'aged_care',
    categories: ['Dementia care', 'Palliative care', 'Residential aged care'],
    includeAll: true,
    intro: 'These are providers on the My Aged Care provider register.',
    disclaimer: 'The register lists approved aged care providers. Which programs a provider delivers, and whether it has capacity, can only be confirmed with the provider or My Aged Care (1800 200 422).',
  },
  'support-at-home': {
    type: 'aged_care',
    categories: ['Dementia care', 'Palliative care', 'Residential aged care'],
    includeAll: true,
    intro: 'These are providers on the My Aged Care provider register.',
    disclaimer: 'The register lists approved aged care providers. Which programs a provider delivers, and whether it has capacity, can only be confirmed with the provider or My Aged Care (1800 200 422).',
  },
  'residential-fees': {
    type: 'aged_care',
    categories: ['Residential aged care'],
    intro: 'These are providers listing residential aged care on the My Aged Care provider register.',
    disclaimer: 'Fees are set per home and per resident. Ask each provider for its current fee schedule and refundable deposit options.',
  },
  'dva-community-nursing': {
    type: 'ndis',
    categories: ['Nursing'],
    intro: 'These are providers listing nursing supports on the NDIS provider register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'dva-home-care': {
    type: 'ndis',
    categories: ['Personal care', 'Domestic assistance', 'Nursing'],
    intro: 'These are providers listing in-home support on the NDIS provider register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'veterans-home-care': {
    type: 'ndis',
    categories: ['Domestic assistance', 'Personal care', 'Respite care'],
    intro: 'These are providers listing in-home support on the NDIS provider register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'rehabilitation-appliances': {
    type: 'ndis',
    categories: ['Assistive technology & equipment', 'Home modifications'],
    intro: 'These are providers listing equipment and home modification supports on the NDIS provider register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'open-arms-referrals': {
    type: 'ndis',
    categories: ['Therapy services'],
    intro: 'Open Arms is DVA’s own counselling service. If you’d like support beyond it, these are providers listing therapy services on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'private-fee-for-service': {
    type: 'ndis',
    categories: ['Therapy services', 'Personal care', 'Domestic assistance'],
    intro: 'Anyone can pay a provider directly. These are providers listing common supports on the NDIS provider register.',
    disclaimer: 'Private fees are set by each provider and are not covered by NDIS price limits unless they are delivering an NDIS-funded support. Ask for fees in writing.',
  },
  'icare-workers-compensation': {
    type: 'ndis',
    categories: ['Therapy services', 'Personal care', 'Nursing'],
    intro: 'These are providers listing common support and rehabilitation services on the NDIS register.',
    disclaimer: NOT_ACCEPTANCE,
  },
  'private-health-insurance': {
    type: 'ndis',
    categories: ['Therapy services'],
    intro: 'Extras cover can contribute to some allied health services. These are providers listing therapy services on the NDIS register.',
    disclaimer: 'Whether a service is claimable depends on your policy and the provider’s own health-fund registration. Check both before booking.',
  },
  'medicare-care-plans': {
    type: 'ndis',
    categories: ['Therapy services'],
    intro: 'A GP care plan can refer you to allied health providers. These are providers listing therapy services on the NDIS register.',
    disclaimer: 'A Medicare rebate requires a GP referral and a provider who bills Medicare — confirm both with the provider.',
  },
};

export const fundingProviderLink = (slug: string): FundingProviderLink | undefined => LINKS[slug];
