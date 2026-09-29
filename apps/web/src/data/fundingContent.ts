import { slugify } from '../lib/slugify';

/**
 * Real, general-information content for the 25 funding topics shown in
 * the mega menu's "Funding" tab (see staticMegaMenuFallback.ts, which
 * links each one to /funding/:slug).
 *
 * Unlike conditions, most of these topics have no matching Provider
 * field at all — "Home Care Packages" or "DVA Home Care" describe a
 * funding SCHEME, not something a provider tags on their profile.
 * Only the 3 NDIS plan-management-style topics map to a real,
 * filterable field (Provider.acceptedFunding — the exact same
 * 'Plan-managed' / 'Self-managed' / 'NDIA-managed' values Lead.funding
 * uses). `fundingFilter` is set ONLY for those 3; every other page
 * honestly has no provider filter and says so, rather than pretending
 * to filter on something SolDirectory doesn't actually track.
 *
 * General information only, not financial or funding advice — every
 * page says so. Program names, thresholds and processes described here
 * change over time (especially aged care, which has had recent reform);
 * always confirm current detail with the relevant official body
 * (Services Australia, the NDIS, My Aged Care, DVA) before relying on it.
 */

export interface FundingContent {
  slug: string;
  name: string;
  categoryGroup: string;
  summary: string;
  /** Only set for the 3 topics that map to Provider.acceptedFunding's real enum values. */
  fundingFilter?: 'NDIA-managed' | 'Plan-managed' | 'Self-managed';
}

export interface FundingCategoryGroup {
  title: string;
  items: FundingContent[];
}

const ndisPlans: FundingContent[] = [
  {
    slug: 'agency-managed', name: 'Agency Managed', categoryGroup: 'NDIS Plans', fundingFilter: 'NDIA-managed',
    summary: 'Agency managed (also called NDIA-managed) means the National Disability Insurance Agency pays providers directly, on the participant’s behalf, once a provider has submitted a claim through the NDIA’s own payment system. It’s the option with the least paperwork for the participant, but it comes with a real trade-off: agency-managed funding can only be used with providers registered with the NDIS Commission — unregistered providers, and some flexible or informal support arrangements, aren’t available under this option. It’s a common starting choice for a first plan, and it can be changed later if a participant’s circumstances or preferences change. Whether agency management, plan management or self-management suits someone best depends on how much administrative involvement they want and how much flexibility in choosing providers matters to them — there’s no single right answer for everyone.',
  },
  {
    slug: 'plan-managed', name: 'Plan Managed', categoryGroup: 'NDIS Plans', fundingFilter: 'Plan-managed',
    summary: 'Plan management means a participant engages a separate plan manager — a funded NDIS support in its own right — who pays providers on the participant’s behalf and keeps track of the budget. It’s often described as a middle option: less hands-on than self-management, since the plan manager handles invoicing and record-keeping, but with more provider choice than agency management, since plan-managed funding can be used with both NDIS-registered and unregistered providers. Because a plan manager is a distinct funded item, choosing this option doesn’t reduce the funding available for actual supports. Many participants who value flexibility but don’t want to personally manage invoices and reimbursements choose plan management specifically for that balance — it’s worth discussing directly with a plan manager or support coordinator what the day-to-day experience actually looks like.',
  },
  {
    slug: 'self-managed', name: 'Self Managed', categoryGroup: 'NDIS Plans', fundingFilter: 'Self-managed',
    summary: 'Self-management means the participant (or their nominee) pays providers directly and then claims reimbursement from the NDIA, keeping their own records of spending against their plan. It offers the most flexibility — self-managed funding can be used with any provider, registered or not, including some informal or flexible arrangements not available under other options — but it also means the most administrative responsibility: paying invoices, keeping receipts, and submitting claims correctly and on time. Self-management is a genuine skill and time commitment, not just a formality, so it suits people (or families) who specifically want that level of control and are comfortable with the admin side, or who can get support with it. A participant doesn’t have to self-manage their entire plan — it’s possible to self-manage some funding categories and use plan or agency management for others.',
  },
  {
    slug: 'plan-reviews', name: 'Plan Reviews', categoryGroup: 'NDIS Plans',
    summary: 'An NDIS plan isn’t meant to be fixed forever — plan reviews are the formal process for checking whether a plan still reflects a participant’s goals, circumstances and support needs, and adjusting the funding if not. Reviews happen on a scheduled basis (generally set when a plan is approved) and can also be requested earlier if something significant changes. Good preparation genuinely affects the outcome: gathering evidence of how current supports are being used, any new reports from allied health professionals, and being clear about what’s changed and why more (or different) funding is needed all help the NDIA make a well-informed decision. A support coordinator or plan manager can help prepare for a review, though the NDIA itself, via myplace or the NDIS contact centre, is the authoritative source on current review processes and timing.',
  },
  {
    slug: 'change-of-circumstances', name: 'Change of Circumstances', categoryGroup: 'NDIS Plans',
    summary: 'A change of circumstances report is how a participant tells the NDIA about something significant that’s changed since their plan was approved — a change in support needs, living situation, informal support (like a carer becoming unavailable), or contact details — outside of a full scheduled plan review. Reporting promptly matters because a plan that no longer reflects someone’s actual situation can mean funding that doesn’t match real needs, in either direction. Not every change requires a report — day-to-day fluctuations are normal — but a genuinely significant shift usually does. This is done directly through the NDIA (via myplace, the NDIS app, or the contact centre), and a support coordinator can help identify when a change is significant enough to report and help prepare the information needed.',
  },
  {
    slug: 'first-plan-support', name: 'First Plan Support', categoryGroup: 'NDIS Plans',
    summary: 'A first NDIS plan can be a lot to take in at once — understanding what’s actually funded, choosing a plan management option, finding providers, and setting up supports for the first time, often while still learning how the scheme works. Support coordination (itself a funded NDIS support in many first plans) exists partly for this reason — helping a new participant understand their plan, connect with providers, and get supports actually up and running rather than just approved on paper. Genuinely useful first steps include reading the plan carefully (or having someone read it with you), understanding which budget categories are flexible versus fixed to a specific support, and deciding on a plan management option before rushing to book services. The NDIS’s own “Getting started” resources and the NDIS contact centre are the authoritative source for current, participant-specific guidance.',
  },
];

const agedCare: FundingContent[] = [
  {
    slug: 'home-care-packages', name: 'Home Care Packages', categoryGroup: 'Aged Care',
    summary: 'Home Care Packages have historically been the main Australian Government program funding a coordinated package of in-home aged care support — personal care, domestic assistance, nursing, allied health and similar — at one of several funding levels based on assessed need, managed through an approved provider. Aged care funding in Australia has been going through significant reform in recent years, including changes to how in-home care programs are structured and named, so the specific program a person is assessed into, and its exact rules, can differ depending on when they’re assessed. The starting point for anyone exploring in-home aged care funding is an assessment through My Aged Care (1800 200 422), which is also the authoritative, current source on which program applies and what it actually covers right now.',
  },
  {
    slug: 'commonwealth-home-support', name: 'Commonwealth Home Support', categoryGroup: 'Aged Care',
    summary: 'The Commonwealth Home Support Programme (CHSP) is an entry-level aged care program funding lower-level, often occasional support — things like domestic assistance, transport, home maintenance, or social support — for older people who are still largely independent but benefit from some help to stay living at home safely. It’s generally simpler to access than higher-level packaged care and doesn’t involve the same individual budget structure, instead funding specific services directly through CHSP providers. As with all Australian aged care programs at the moment, the structure and even the name of entry-level home support funding is subject to ongoing reform, so it’s worth confirming current detail with My Aged Care (1800 200 422) rather than assuming what applied previously still applies exactly the same way today.',
  },
  {
    slug: 'support-at-home', name: 'Support at Home', categoryGroup: 'Aged Care',
    summary: 'Support at Home refers to the Australian Government’s reformed approach to funding in-home aged care, intended to bring together and simplify what were previously separate programs (like Home Care Packages) into a more consistent system with clearer, needs-based funding classifications. Because this reflects a genuinely significant, relatively recent change to how aged care funding works, the practical detail — exact funding levels, what’s included, and how existing recipients transition across — is exactly the kind of thing that’s important to confirm directly and currently with My Aged Care (1800 200 422) rather than relying on a general description, including this one. An aged care assessment through My Aged Care remains the starting point regardless of which specific program structure is current.',
  },
  {
    slug: 'residential-fees', name: 'Residential Fees', categoryGroup: 'Aged Care',
    summary: 'Residential aged care (moving into an aged care home) involves several distinct types of fees, generally including a basic daily fee, a means-tested care fee based on an assessment of income and assets, and accommodation costs (which can be paid as a lump sum, a daily payment, or a combination) — plus, depending on the facility, optional extra service fees. How much someone actually pays depends heavily on their individual financial assessment through Services Australia or the Department of Veterans’ Affairs, so a general description can only explain the categories of fees, not what a specific person will pay. Getting an accurate, personal picture of likely residential costs generally starts with an aged care assessment and a means assessment, and My Aged Care (1800 200 422) is the right starting point for both.',
  },
];

const veterans: FundingContent[] = [
  {
    slug: 'dva-community-nursing', name: 'DVA Community Nursing', categoryGroup: 'Veterans',
    summary: 'DVA Community Nursing funds in-home clinical nursing care for eligible veterans and war widows/widowers holding a DVA Gold Card, or a White Card for accepted conditions — covering things like medication management, wound care and other clinical support delivered at home by a DVA-contracted nursing provider. It’s a clinical service, distinct from broader home-support programs, and is generally arranged through a referral (commonly from a GP) rather than something a veteran organises directly with a nursing provider unprompted. Eligibility and referral pathways are specific to DVA’s own systems, so the Department of Veterans’ Affairs (1800 VETERAN / 1800 838 372) is the authoritative source for confirming eligibility and how to access this program for a specific person’s situation.',
  },
  {
    slug: 'dva-home-care', name: 'DVA Home Care', categoryGroup: 'Veterans',
    summary: 'Beyond clinical nursing, DVA also funds broader home-care support for eligible veterans and war widows/widowers — help with domestic tasks, personal care and home maintenance — generally accessed through an assessed program for Gold Card holders, with some support also available to eligible White Card holders for accepted conditions. As with other DVA programs, eligibility depends on card type and assessed need, and the practical process for arranging services runs through DVA’s own systems rather than a general aged-care pathway. Veterans and their families exploring home care support should contact DVA directly (1800 VETERAN / 1800 838 372) to confirm current eligibility and get connected with an appropriate assessment, since DVA entitlements are specific to the individual’s service history and card type.',
  },
  {
    slug: 'veterans-home-care', name: "Veterans' Home Care", categoryGroup: 'Veterans',
    summary: 'Veterans’ Home Care (VHC) is DVA’s program for lighter, entry-level home support for eligible veterans and war widows/widowers — things like domestic assistance, personal care, respite and home/garden maintenance — generally for those who need some help to stay safely and independently at home but not the more intensive support covered by other DVA or aged care programs. Like DVA’s other programs, it’s assessed and coordinated through DVA’s own systems, with services delivered by contracted providers. Because eligibility criteria and the exact scope of what’s funded are specific to DVA policy and can change, veterans and their families should confirm current detail directly with DVA (1800 VETERAN / 1800 838 372) rather than assuming general aged-care program rules apply the same way.',
  },
  {
    slug: 'rehabilitation-appliances', name: 'Rehabilitation Appliances', categoryGroup: 'Veterans',
    summary: 'The Rehabilitation Appliances Program (RAP) is how DVA funds aids and equipment for eligible veterans — things like mobility aids, continence products, home modifications and other equipment that supports independence and quality of life, related to an accepted condition or assessed need. Access is generally through a health professional’s assessment and recommendation (such as an occupational therapist), submitted through DVA’s own approval process, rather than a veteran purchasing equipment independently and seeking reimbursement after the fact. Because RAP eligibility ties to specific accepted conditions and DVA’s own item schedules, which can change, the Department of Veterans’ Affairs (1800 VETERAN / 1800 838 372) is the right source for confirming what’s currently available and how to start an assessment for a specific person’s needs.',
  },
  {
    slug: 'open-arms-referrals', name: 'Open Arms Referrals', categoryGroup: 'Veterans',
    summary: 'Open Arms – Veterans & Families Counselling is DVA’s free, confidential mental health and counselling service for current and former Australian Defence Force members and their families, regardless of how long someone served or their discharge status. It offers individual, couples, family and group counselling, along with crisis support, and referrals into Open Arms can come from a GP, DVA, or a person reaching out directly themselves — a formal referral isn’t always required to get started. This is a specific, dedicated veteran and family service, distinct from general mental health or disability services, and Open Arms itself (1800 011 046, 24/7) is the right first contact for anyone eligible who wants to access it or simply find out whether they qualify.',
  },
];

const otherFunding: FundingContent[] = [
  {
    slug: 'private-fee-for-service', name: 'Private Fee for Service', categoryGroup: 'Other Funding',
    summary: 'Private fee for service simply means paying a provider directly, out of pocket, without going through the NDIS, aged care, DVA or another funded scheme — sometimes because someone doesn’t meet eligibility criteria for a funded program, sometimes to access a specific provider or service faster than a funded pathway allows, and sometimes by choice for flexibility or privacy reasons. Providers who accept private fee for service set their own rates and terms directly with the client, rather than working within a scheme’s price guide or funding rules, so costs and inclusions can vary a lot between providers — it’s worth asking for a clear, itemised quote before starting. This option sits entirely outside government funding schemes, so none of the eligibility or claims processes those schemes involve apply here.',
  },
  {
    slug: 'icare-workers-compensation', name: 'iCare & Workers Compensation', categoryGroup: 'Other Funding',
    summary: 'Workers compensation schemes (icare in NSW, and equivalent schemes in other states and territories) can fund support and rehabilitation services for people who’ve been injured at work, where the injury has led to an ongoing need for care, therapy or support. What’s funded, and for how long, depends on the specific claim, the nature and severity of the injury, and the scheme’s own case management process — it’s managed through the relevant workers compensation insurer or scheme, not a general disability or aged care pathway. Anyone navigating a workers compensation claim involving ongoing care needs generally works with a case manager from their insurer, and that’s the right first point of contact for what’s actually covered under their specific claim, since scheme rules differ by state and by claim type.',
  },
  {
    slug: 'private-health-insurance', name: 'Private Health Insurance', categoryGroup: 'Other Funding',
    summary: 'Private health insurance (extras/ancillary cover in particular) can contribute toward some allied health and support services — physiotherapy, psychology, occupational therapy and similar — up to annual limits set by the specific policy, which vary a lot between insurers and cover levels. It’s a genuinely different system to the NDIS, aged care or DVA funding: there’s no formal eligibility assessment, funding comes from a private policy the person already holds, and claims are made directly with the insurer, often on the spot via HICAPS at the time of a session. Because cover, limits and included services differ so much by policy, the specific insurer is the only reliable source for what a particular policy actually covers and what the remaining annual limit is.',
  },
  {
    slug: 'medicare-care-plans', name: 'Medicare Care Plans', categoryGroup: 'Other Funding',
    summary: 'Medicare-funded care plans — most commonly a Chronic Disease Management (CDM) plan or a GP Mental Health Treatment Plan — let a GP refer a patient for a set number of Medicare-rebated allied health sessions (such as physiotherapy, psychology, podiatry or dietetics) each calendar year, relevant to their condition. These plans are set up with a GP, who assesses whether a person meets the relevant criteria and prepares the plan and referral; the patient then books directly with an eligible allied health provider and claims the Medicare rebate. This is a Medicare-administered pathway, separate from the NDIS, aged care or DVA, and a GP is the right and only starting point for setting one up or asking whether a specific person qualifies.',
  },
  {
    slug: 'state-funded-programs', name: 'State Funded Programs', categoryGroup: 'Other Funding',
    summary: 'Beyond the major national schemes (NDIS, aged care, DVA, Medicare), state and territory governments run a range of smaller, more targeted funding programs — for things like specific equipment subsidies, transport concessions, respite grants or community program funding — that vary significantly by state and change over time as programs are introduced or wound up. Because there’s no single national list, and eligibility and application processes are set individually by each state or territory department, the right approach is checking directly with the relevant state or territory human services / disability / seniors department, or asking a support coordinator or social worker who works locally, rather than assuming a program available in one state applies the same way (or at all) in another.',
  },
];

const helpWithFunding: FundingContent[] = [
  {
    slug: 'plan-managers', name: 'Plan Managers', categoryGroup: 'Help With Funding',
    summary: 'A plan manager is a funded NDIS support in their own right — a service that pays providers on a participant’s behalf, tracks spending against the plan’s budget, and handles the financial admin side of using NDIS funding, freeing the participant from managing invoices and claims personally. Choosing a plan manager is a genuine decision worth some care: services can differ in responsiveness, the reporting and visibility they give participants into their own spending, and how proactively they flag budget issues before they become a problem. Since plan management is itself a funded item, engaging one doesn’t reduce funding available for other supports. A participant can generally change plan managers if the relationship isn’t working well for them — it isn’t a permanent, locked-in choice.',
  },
  {
    slug: 'bookkeeping-invoicing', name: 'Bookkeeping & Invoicing', categoryGroup: 'Help With Funding',
    summary: 'For a self-managed NDIS participant, or a provider managing their own business finances, proper bookkeeping and invoicing is genuinely important, not just administrative housekeeping — accurate records support correct NDIS claims and reimbursements, help track spending against a budget so funding doesn’t run out unexpectedly, and matter for tax and compliance purposes on the provider side. This might mean a dedicated bookkeeping service, accounting software suited to disability-sector invoicing, or (for a self-managing participant) simply a clear, consistent system for keeping receipts and claim records. Good habits set up early — consistent file-naming, prompt invoice submission, regular reconciliation — tend to save a lot of stress later compared with catching up after the fact.',
  },
  {
    slug: 'price-guide-explained', name: 'Price Guide Explained', categoryGroup: 'Help With Funding',
    summary: 'The NDIS Pricing Arrangements and Price Limits (commonly still called the "Price Guide") sets the maximum amount a registered provider can charge for many supports under agency- or plan-managed funding — organised by support item, with different price limits for different states/territories and sometimes different circumstances (like standard hours versus evenings, weekends or public holidays). Self-managed funding has more flexibility around pricing since price limits don’t apply the same way, though value for money still matters. Prices and support item numbers are updated periodically, so a specific figure quoted from memory can go stale — the NDIS’s own published Pricing Arrangements and Price Limits document, available from the NDIS website, is the authoritative and current source for any specific price limit.',
  },
  {
    slug: 'funding-eligibility', name: 'Funding Eligibility', categoryGroup: 'Help With Funding',
    summary: 'Eligibility works differently across each funding scheme — the NDIS has its own disability and age-related access criteria, aged care programs are accessed via an aged care assessment through My Aged Care, DVA entitlements depend on service history and card type, and Medicare care plans depend on a GP’s clinical assessment against specific criteria. There’s no single "am I eligible" test that covers all of them, which is a common source of confusion, especially for people whose situation could plausibly fit more than one scheme. The reliable way to find out is going directly to the relevant body’s own assessment process — the NDIS (1800 800 110), My Aged Care (1800 200 422), or DVA (1800 838 372) — rather than relying on a general description or someone else’s experience, since individual circumstances genuinely change the answer.',
  },
  {
    slug: 'budget-categories', name: 'Budget Categories', categoryGroup: 'Help With Funding',
    summary: 'An NDIS plan’s funding is generally organised into budget categories — commonly Core supports (day-to-day flexible support, often the most flexible category), Capacity Building (skill development, therapy and similar, generally support-specific), and Capital (equipment, home or vehicle modifications, generally for a specific approved item). How strictly funding is tied to a specific category, versus flexible to use across similar supports, depends on the category and the participant’s plan — Core is typically the most flexible, Capacity Building and Capital generally less so. Understanding a specific plan’s actual category breakdown and flexibility rules is something a support coordinator or plan manager can walk through in detail, and the NDIS’s own plan documents (viewable via the myplace portal or the NDIS app) are the authoritative record of what’s actually been approved.',
  },
];

export const FUNDING_CATEGORY_GROUPS: FundingCategoryGroup[] = [
  { title: 'NDIS Plans', items: ndisPlans },
  { title: 'Aged Care', items: agedCare },
  { title: 'Veterans', items: veterans },
  { title: 'Other Funding', items: otherFunding },
  { title: 'Help With Funding', items: helpWithFunding },
];

export const FUNDING_CONTENT: FundingContent[] = FUNDING_CATEGORY_GROUPS.flatMap((g) => g.items);

export const fundingBySlug = (slug: string): FundingContent | undefined =>
  FUNDING_CONTENT.find((f) => f.slug === slug.toLowerCase());

for (const f of FUNDING_CONTENT) {
  if (f.slug !== slugify(f.name)) {
    // eslint-disable-next-line no-console
    console.error(`[fundingContent] slug mismatch for "${f.name}": stored "${f.slug}", expected "${slugify(f.name)}"`);
  }
}
