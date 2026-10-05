import type { MegaMenuTab } from '../api/wordpressApi';
import { slugify } from '../lib/slugify';

/**
 * Static fallback for when WordPress is unreachable — deliberately
 * kept in the EXACT SAME shape as the real /wp-json/soldirectory/v1/
 * mega-menu response (MegaMenuTab[]), not a separate/different data
 * structure. This means a WordPress outage changes WHERE the data
 * comes from, not WHAT the menu shows — the same categories and
 * links either way, per the explicit requirement that both cases
 * return the same content.
 *
 * The Service tab mirrors the real 15 categories/89 NDIS services
 * from seed-ndis-services.php exactly — once that script is run and
 * this same content exists as real WordPress posts, the only
 * difference during normal operation is where the data is fetched
 * from, not what it says.
 *
 * Slugs are computed with wpStyleSlugify() below, matching
 * WordPress's own sanitize_title() convention closely enough for
 * ordinary titles (lowercase, spaces to hyphens, punctuation
 * stripped). If any real WordPress-generated slug ends up differing
 * for an unusual title, update that one entry directly rather than
 * regenerating all of them.
 */

function wpStyleSlugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[()'"]/g, '')       // WordPress strips these rather than hyphenating them
    .replace(/&/g, '')            // ampersands are stripped, surrounding spaces then collapse below
    .replace(/[^a-z0-9]+/g, '-')  // everything else becomes a hyphen
    .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens
}

function serviceLink(title: string): { label: string; url: string } {
  return { label: title, url: `/services/${wpStyleSlugify(title)}` };
}

// The Condition tab has real, permalink-style pages: /condition/:slug/
// (see data/conditionContent.ts, which ProviderListingPage.tsx reads —
// slugify() here must match ITS slugs exactly, which is why both use
// the same lib/slugify.ts function, not wpStyleSlugify above).
function conditionLink(title: string): { label: string; url: string } {
  return { label: title, url: `/condition/${slugify(title)}/` };
}

// The Funding tab has real, permalink-style pages too: /funding/:slug/
// (see data/fundingContent.ts, which FundingTopicPage.tsx reads).
function fundingLink(title: string): { label: string; url: string } {
  return { label: title, url: `/funding/${slugify(title)}/` };
}

function languageLink(title: string): { label: string; url: string } {
  return { label: title, url: `/language/${slugify(title)}/` };
}

const SERVICE_CATEGORIES: { title: string; items: string[] }[] = [
  { title: 'Personal & Nursing Care', items: ['Personal care', 'Medication assistance', 'Overnight support', 'High-intensity personal care', 'Community nursing care'] },
  { title: 'Accommodation & Living Supports', items: ['Supported Independent Living (SIL)', 'Individualised Living Options (ILO)', 'Short Term Accommodation (STA) / respite', 'Medium Term Accommodation (MTA)', 'Group / shared living support'] },
  { title: 'Household Tasks', items: ['House cleaning and household tasks', 'Meal preparation', 'Yard maintenance and gardening', 'Tenancy and accommodation assistance', 'Household management'] },
  { title: 'Community Participation', items: ['One-to-one community access', 'Group and centre-based activities', 'Social and recreation activities', 'Cultural, religious and civic participation', 'Supported holidays and camps', 'Innovative community participation', 'Volunteering and community groups'] },
  { title: 'Transport', items: ['Transport to activities and appointments', 'Recurring transport allowance', 'Activity-based transport', 'Specialised transport'] },
  { title: 'Consumables', items: ['Continence products', 'Low-cost assistive technology', 'Home enteral nutrition (HEN)', 'Interpreting and translation', 'Assistance animal upkeep'] },
  { title: 'Support Coordination', items: ['Support Connection (Level 1)', 'Support Coordination (Level 2)', 'Specialist Support Coordination (Level 3)', 'Psychosocial Recovery Coaching'] },
  { title: 'Capacity Building — Daily Living', items: ['Housing search and matching', 'Tenancy skills and sustainment', 'Skill-building community access', 'Life transition planning and mentoring', 'Group skills development', 'Skill-building camps and classes'] },
  { title: 'Employment & Education Supports', items: ['School Leaver Employment Supports (SLES)', 'Employment assessment and counselling', 'Supported employment', 'Job coaching and workplace assistance', 'Higher education and training support'] },
  { title: 'Behaviour & Allied Health', items: ['Specialist Positive Behaviour Support', 'Behaviour support implementation', 'Social skills and relationship development', 'Dietitian', 'Exercise physiology', 'Personal training'] },
  { title: 'Life & Plan Skills', items: ['Transition to further education', 'Study and learning skills', 'Plan management', 'Self-management training', 'Financial and organisational skills'] },
  { title: 'Therapeutic Supports', items: ['Occupational therapy', 'Physiotherapy', 'Speech pathology', 'Psychology', 'Social work', 'Counselling', 'Podiatry', 'Music therapy and art therapy', 'Therapy assistants', 'Early Childhood Intervention'] },
  { title: 'Training & Assessments', items: ['Assistive technology assessment and training', 'Specialised driver training', 'Hearing services and audiology', 'Vision and orientation & mobility', 'Daily living and life skills development', 'Training for carers and parents', 'Assistance animal training and assessment', 'Nursing training for support workers'] },
  { title: 'Assistive Technology & Equipment', items: ['Mobility equipment', 'Personal care and safety equipment', 'Communication and information equipment', 'Vision equipment', 'Hearing equipment', 'Household task equipment', 'Recreation equipment', 'Customised prosthetics and orthotics', 'Vehicle modifications', 'AT repairs, maintenance, rental and trial', 'Assistance animals'] },
  { title: 'Home Modifications & SDA', items: ['Minor home modifications', 'Complex home modifications', 'Specialist Disability Accommodation (SDA)'] },
];

// The 15 real NDIS categories above are the source of truth for
// content and for /admin/services' own categorization — but showing
// all 15 as separate top-level mega-menu columns overwhelmed both
// the frontend grid (all 15 forced into one unreadable row) and the
// ACF/SCF admin UI (15 separate repeater blocks was too much for
// Add link/Add column to stay responsive). Regrouped into 4 wider
// columns here, matching the mega menu's original 4-column design —
// each column merges several of the 15 real categories' items. Each
// link keeps its original category as `group`, which the menu renders
// as a sub-heading, so the categories stay visible inside a column
// without a 3-level (Column -> Group -> Link) ACF schema.
function groupInto(title: string, indices: number[]): { title: string; items: string[] } {
  return { title, items: indices.flatMap((i) => SERVICE_CATEGORIES[i].items) };
}

/**
 * Which of the 15 real NDIS categories a service belongs to — the
 * sub-heading it's shown under inside its column. Exported because the
 * live WordPress menu returns the same flat Column -> Link shape without
 * these headings (see MegaMenu.tsx, which falls back to this map by label
 * when a link carries no `group` of its own).
 */
export const SERVICE_GROUP_BY_LABEL: ReadonlyMap<string, string> = new Map(
  SERVICE_CATEGORIES.flatMap((cat) => cat.items.map((item) => [item, cat.title] as [string, string])),
);

const SERVICE_COLUMNS_4 = [
  groupInto('Daily Living & Accommodation', [0, 1, 2]),
  groupInto('Community & Consumables', [3, 4, 5]),
  groupInto('Coordination, Skills & Employment', [6, 7, 8, 10]),
  groupInto('Therapy, Equipment & Home', [9, 11, 12, 13, 14]),
];

export const STATIC_MEGA_MENU_FALLBACK: MegaMenuTab[] = [
  {
    key: 'service',
    label: 'Service',
    description: 'NDIS, aged care, allied health, and more',
    columns: SERVICE_COLUMNS_4.map((cat) => ({
      title: cat.title,
      links: cat.items.map((item) => ({ ...serviceLink(item), group: SERVICE_GROUP_BY_LABEL.get(item) })),
    })),
  },
  {
    key: 'condition',
    label: 'Condition',
    description: 'Find support by diagnosis or need',
    columns: [
      { title: 'Developmental', links: ['Autism', 'ADHD', 'Intellectual Disability', 'Global Developmental Delay', 'Down Syndrome', 'Fragile X Syndrome', 'Cerebral Palsy', 'Speech & Language Delay'].map(conditionLink) },
      { title: 'Mobility & Physical', links: ['Spinal Cord Injury', 'Amputation & Limb Loss', 'Muscular Dystrophy', 'Multiple Sclerosis', 'Arthritis', 'Spina Bifida', 'Chronic Pain'].map(conditionLink) },
      { title: 'Hearing, Vision & Sensory', links: ['Deafness & Hearing Loss', 'Blindness & Low Vision', 'Deafblindness', 'Auslan Support', 'Sensory Processing'].map(conditionLink) },
      { title: 'Psychosocial & Mental Health', links: ['Schizophrenia', 'Bipolar Disorder', 'PTSD', 'Anxiety Disorders', 'Depression', 'Eating Disorders', 'Borderline Personality Disorder', 'Dual Diagnosis'].map(conditionLink) },
      { title: 'Chronic & Complex Medical', links: ['Epilepsy', 'Diabetes', 'Cystic Fibrosis', 'Renal Failure', 'Cancer Care', 'Motor Neurone Disease', "Parkinson's Disease"].map(conditionLink) },
      { title: 'ABI, Stroke & Neuro Rehab', links: ['Acquired Brain Injury', 'Stroke Recovery', 'Traumatic Brain Injury', "Huntington's Disease", 'Neuro Physiotherapy'].map(conditionLink) },
    ],
  },
  {
    key: 'funding',
    label: 'Funding',
    description: 'NDIS plans, HCP, CHSP, DVA, and private',
    columns: [
      { title: 'NDIS Plans', links: ['Agency Managed', 'Plan Managed', 'Self Managed', 'Plan Reviews', 'Change of Circumstances', 'First Plan Support'].map(fundingLink) },
      { title: 'Aged Care', links: ['Home Care Packages', 'Commonwealth Home Support', 'Support at Home', 'Residential Fees'].map(fundingLink) },
      { title: 'Veterans', links: ['DVA Community Nursing', 'DVA Home Care', "Veterans' Home Care", 'Rehabilitation Appliances', 'Open Arms Referrals'].map(fundingLink) },
      { title: 'Other Funding', links: ['Private Fee for Service', 'iCare & Workers Compensation', 'Private Health Insurance', 'Medicare Care Plans', 'State Funded Programs'].map(fundingLink) },
      { title: 'Help With Funding', links: ['Plan Managers', 'Bookkeeping & Invoicing', 'Price Guide Explained', 'Funding Eligibility', 'Budget Categories'].map(fundingLink) },
    ],
  },
  {
    key: 'coordinator',
    label: 'Support coordinator referrals',
    description: 'Referral pathways for support coordinators',
    columns: [
      { title: 'Refer and prepare', links: [
        { label: 'Coordinator referral guide', url: '/support-coordinators#referrals' },
        { label: 'Submit a provider enquiry', url: 'get_matched' },
        { label: 'Urgent and complex referrals', url: '/support-coordinators#urgent-referrals' },
      ] },
      { title: 'Search and compare', links: [
        { label: 'Find providers', url: '/find-a-provider' },
        { label: 'Provider checks', url: '/support-coordinators#provider-checks' },
        { label: 'Saved provider lists', url: '/saved-providers' },
      ] },
      { title: 'Accounts and support', links: [
        { label: 'Create a coordinator account', url: '/signup' },
        { label: 'Sign in', url: '/login' },
        { label: 'Contact SolDirectory', url: '/support-coordinators#contact' },
      ] },
    ],
  },
  {
    key: 'language',
    label: 'Language',
    description: 'Support in a language spoken at home',
    columns: [
      { title: 'Most Requested', links: ['Arabic', 'Mandarin', 'Cantonese', 'Vietnamese', 'Greek', 'Italian', 'Hindi', 'Punjabi'].map(languageLink) },
      { title: 'Middle East & Africa', links: ['Assyrian', 'Persian (Farsi)', 'Dari', 'Turkish', 'Somali', 'Swahili', 'Amharic'].map(languageLink) },
      { title: 'First Nations', links: ['Aboriginal & Torres Strait Islander Services', 'Kriol', 'Yolngu Matha', 'Pitjantjatjara'].map(languageLink) },
      { title: 'Europe', links: ['Spanish', 'Portuguese', 'Polish', 'Croatian', 'Serbian', 'Russian', 'Macedonian', 'German'].map(languageLink) },
      { title: 'Asia Pacific', links: ['Tagalog', 'Indonesian', 'Korean', 'Japanese', 'Nepali', 'Tamil', 'Thai', 'Khmer'].map(languageLink) },
      { title: 'Access & Interpreting', links: ['Auslan', 'Deafblind Interpreters', 'TIS National Bookings', 'Easy Read Materials', 'Translated Documents'].map(languageLink) },
    ],
  },
];
