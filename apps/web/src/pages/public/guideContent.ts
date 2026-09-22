/**
 * Guide page copy (developer brief: footer "Guides" links — NDIS price
 * guide, choosing a provider, plan management basics, aged care support).
 *
 * Written to reflect how the NDIS and the Australian aged care system
 * actually work, using the terminology the NDIA, NDIS Quality and
 * Safeguards Commission and My Aged Care use. Dollar figures and support
 * names change with each NDIS Pricing Arrangements and Price Limits
 * release (1 July) and with aged care reform milestones, so this content
 * deliberately does not quote figures that go stale — it explains the
 * concepts and always points readers to the official source for current
 * numbers. Update GUIDE_REVIEWED to true only once content has been
 * checked against the current NDIS Pricing Arrangements and Price Limits
 * and My Aged Care guidance.
 */
export const GUIDE_REVIEWED = false;

export interface GuideSection { heading: string; body: string[]; list?: string[] }
export interface GuideDoc {
  slug: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  officialLink: { label: string; href: string };
}

export const GUIDE_DOCS: Record<string, GuideDoc> = {
  'ndis-price-guide': {
    slug: 'ndis-price-guide',
    title: 'Understanding the NDIS Price Guide',
    summary:
      'What the NDIS Pricing Arrangements and Price Limits actually do, and how they affect what you pay for supports.',
    sections: [
      {
        heading: 'What it is',
        body: [
          'The NDIS Pricing Arrangements and Price Limits (often still called the "NDIS Price Guide") is published by the National Disability Insurance Agency (NDIA). It sets the maximum amount a registered provider can charge for many supports funded under a participant\u2019s plan, and explains the rules providers must follow — such as how travel, cancellations and reports are charged.',
          'It is reviewed and republished each year, usually from 1 July, and can also be updated during the year. Because the limits and support item numbers change, this page explains the concepts rather than quoting figures that would go out of date.',
        ],
      },
      {
        heading: 'When price limits apply',
        body: [
          'Price limits are a hard cap for supports paid through NDIA-managed and plan-managed funding — providers cannot charge more than the listed limit for those items.',
          'If you are self-managed, you are not bound by the price limits and can agree on a different rate with a provider. Many self-managed participants still use the price limits as a fair, independent benchmark when negotiating.',
        ],
      },
      {
        heading: 'What is usually included',
        body: [
          'Most support items are grouped under Core supports, Capacity Building supports and Capital supports, matching the budget categories in an NDIS plan.',
          'The pricing arrangements also cover things families are often surprised by: provider travel time and mileage, non-face-to-face time (like writing a report), short-notice cancellation charges, and higher rates for supports delivered on weekends, evenings or public holidays.',
        ],
      },
      {
        heading: 'Registered vs non-registered providers',
        body: [
          'Registered providers have been audited by the NDIS Quality and Safeguards Commission against the NDIS Practice Standards and must generally charge within the price limits for NDIA-managed and plan-managed funding.',
          'Non-registered providers can only be paid from plan-managed or self-managed funding, and can set their own fees — always confirm this in writing before support starts.',
        ],
      },
      {
        heading: 'Getting a quote',
        body: [
          'For higher-cost or complex supports (for example, home modifications, assistive technology or Supported Independent Living), providers are expected to give a written quote before work begins, so you can see exactly what is being charged and compare it against the current price limits.',
        ],
      },
    ],
    officialLink: { label: 'NDIS Pricing Arrangements and Price Limits (ndis.gov.au)', href: 'https://www.ndis.gov.au/providers/pricing-arrangements' },
  },

  'choosing-a-provider': {
    slug: 'choosing-a-provider',
    title: 'How to choose an NDIS or aged care provider',
    summary: 'A practical checklist for comparing providers before you commit to a service agreement.',
    sections: [
      {
        heading: 'Start with your plan',
        body: [
          'Check how your funding is managed. NDIA-managed funding can only be used with NDIS-registered providers. Plan-managed and self-managed funding can be used with registered or non-registered providers, which gives you a wider choice.',
        ],
      },
      {
        heading: 'Questions worth asking every provider',
        body: [],
        list: [
          'Are you registered with the NDIS Quality and Safeguards Commission, and for which registration groups?',
          'Do your staff hold a current NDIS Worker Screening Check (or Working with Children/Aged Care equivalent)?',
          'Do you have experience supporting people with similar needs, disability, age or cultural background to mine?',
          'What are your current wait times and do you have capacity to start soon?',
          'What are your fees, and do they sit within the current NDIS price limits (if relevant)?',
          'What is your cancellation and short-notice policy?',
          'How do you communicate — phone, email, an app — and how quickly do you respond?',
          'What happens if I am unhappy with the service, and how do I make a complaint?',
        ],
      },
      {
        heading: 'Before you sign a service agreement',
        body: [
          'A service agreement should clearly set out the supports being provided, how often, the cost, the notice period for changes or cancellations, and how either party can end the agreement. Read it fully and ask for anything unclear to be explained before you sign.',
        ],
      },
      {
        heading: 'Your rights as a participant',
        body: [
          'You can change providers at any time if a service is not meeting your needs — you are never locked in. If you have a concern about safety, conduct or quality that a provider will not resolve, you can contact the NDIS Quality and Safeguards Commission directly.',
        ],
      },
    ],
    officialLink: { label: 'NDIS Quality and Safeguards Commission — making a complaint', href: 'https://www.ndiscommission.gov.au/about/complaints' },
  },

  'plan-management-basics': {
    slug: 'plan-management-basics',
    title: 'NDIS plan management basics',
    summary: 'The three ways an NDIS plan can be managed, and how each one affects which providers you can use.',
    sections: [
      {
        heading: 'The three options',
        body: [],
        list: [
          'Self-managed — you pay providers directly and claim the cost back from the NDIA yourself. You have the most flexibility, including using non-registered providers and negotiating your own rates, but you take on the record-keeping and claiming.',
          'Plan-managed — a registered plan manager pays your providers\u2019 invoices and handles claiming with the NDIA on your behalf. You can still use registered or non-registered providers, without the admin of self-management.',
          'NDIA-managed (agency-managed) — the NDIA pays providers directly through the myplace portal. You can only use NDIS-registered providers, and price limits always apply.',
        ],
      },
      {
        heading: 'You can mix and match',
        body: [
          'A plan does not have to use one option for everything — it is common to have some budgets self-managed, some plan-managed and some NDIA-managed, depending on what suits each type of support.',
        ],
      },
      {
        heading: 'Plan management is a funded support',
        body: [
          'If you choose plan management, its cost is funded separately in your plan (under Improved Life Choices) — it does not reduce your other support budgets.',
        ],
      },
      {
        heading: 'Choosing what is right for you',
        body: [
          'If you want maximum choice of provider and are comfortable with paperwork, self-management may suit. If you want that same flexibility without doing the claiming yourself, plan management is a popular middle ground. If you would prefer everything handled automatically and are comfortable using only registered providers, NDIA-managed is the simplest to run day-to-day.',
        ],
      },
    ],
    officialLink: { label: 'NDIS — managing your plan (ndis.gov.au)', href: 'https://www.ndis.gov.au/participants/using-your-plan/managing-your-plan' },
  },

  'aged-care-support': {
    slug: 'aged-care-support',
    title: 'Understanding aged care support in Australia',
    summary: 'How to start the aged care system, from your first call to My Aged Care through to choosing a provider.',
    sections: [
      {
        heading: 'My Aged Care is the starting point',
        body: [
          'My Aged Care is the Australian Government\u2019s single entry point for aged care services. Whether you need a small amount of help around the home or full-time residential care, the process starts with a call or an online registration through My Aged Care.',
        ],
      },
      {
        heading: 'Types of support',
        body: [],
        list: [
          'Commonwealth Home Support Programme (CHSP) — entry-level support at home, such as domestic assistance, transport, meals and social support, for people who need a lower level of help.',
          'Home Care Packages (HCP) — a coordinated package of care and services at home for people with higher or more complex needs, delivered by an approved provider you choose.',
          'Residential aged care — full-time care in an aged care home for people who can no longer be supported safely at home.',
          'Short-Term Restorative Care and respite care — time-limited support to help someone regain independence after a health setback, or to give carers a break.',
        ],
      },
      {
        heading: 'The assessment process',
        body: [
          'After you contact My Aged Care, an assessor will discuss your situation and needs. A lower-level assessment (Regional Assessment Service) is usually used for CHSP, while a comprehensive assessment is used for Home Care Packages and residential care. The outcome determines what you are approved for and, for packages, which level.',
        ],
      },
      {
        heading: 'Costs',
        body: [
          'Most aged care services involve a personal contribution alongside government funding — for example, a basic daily fee and, for some people, an income-tested care fee. What you pay depends on your income and assets and the type of care, so it is worth getting an estimate from My Aged Care or a financial adviser before support starts.',
        ],
      },
      {
        heading: 'The aged care system is changing',
        body: [
          'The Australian Government has been progressively reforming aged care, including changes to how home care is funded and delivered. Because these reforms are rolled out in stages, always check My Aged Care for the arrangements that currently apply to you rather than relying on past information.',
        ],
      },
    ],
    officialLink: { label: 'My Aged Care (myagedcare.gov.au)', href: 'https://www.myagedcare.gov.au' },
  },
};
