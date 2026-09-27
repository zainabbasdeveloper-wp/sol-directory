/**
 * Turns raw register rows (one per provider x service-area suburb, as
 * found in the scraped files) into clean, factual RegisterListing data.
 *
 * The scraped files mix genuine register facts with the scraping
 * source's own page copy — "Drawn from the real enquiries X has taken
 * through <source>", "Languages spoken", "37 providers", headings, and
 * long sentences that name a provider. None of that is register data and
 * some of it makes claims about someone else's platform, so it must never
 * reach this site. That's why services are handled with an ALLOWLIST
 * (LISTED_SERVICES): a value is kept only if it's a recognised support
 * name; everything else — including condition tags and language lists,
 * which the register doesn't publish — is dropped rather than guessed at.
 */

export const REGISTER_TYPES = ['ndis', 'aged_care'] as const;
export type RegisterType = (typeof REGISTER_TYPES)[number];

export const STATE_CODES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;
export type StateCode = (typeof STATE_CODES)[number];

export const STATE_NAMES: Record<StateCode, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Australian Capital Territory', NT: 'Northern Territory',
};

/** Canonical support categories — the first eight match the Home page tiles / directory ?service= values exactly. */
export const REGISTER_SUPPORT_CATEGORIES = [
  'Support coordination',
  'Plan management',
  'Personal care',
  'Domestic assistance',
  'Transport',
  'Therapy services',
  'Nursing',
  'Housing (SDA & SIL)',
  'Community access',
  'Respite care',
  'Behaviour support',
  'Employment & education support',
  'Life skills',
  'Assistive technology & equipment',
  'Home modifications',
  'Dementia care',
  'Palliative care',
  'Residential aged care',
  'Support workers',
] as const;
export type SupportCategory = (typeof REGISTER_SUPPORT_CATEGORIES)[number];

// [raw value as scraped (case-insensitive), label to display, canonical category or null].
// A null category still lists the service on the provider page; it just
// doesn't feed the category filter.
const LISTED_SERVICES: [string, string, SupportCategory | null][] = [
  // General support types
  ['Support workers', 'Support workers', 'Support workers'],
  ['Personal care', 'Personal care', 'Personal care'],
  ['Daily Personal Activities', 'Daily personal activities', 'Personal care'],
  ['High Intensity Daily Personal Activities', 'High intensity daily personal activities', 'Personal care'],
  ['Social support', 'Social support', 'Community access'],
  ['Transport', 'Transport', 'Transport'],
  ['Assistance with travel/transport arrangements', 'Assistance with travel/transport arrangements', 'Transport'],
  ['Cleaning', 'Cleaning', 'Domestic assistance'],
  ['Household tasks', 'Household tasks', 'Domestic assistance'],
  ['Domestic Assistance', 'Domestic assistance', 'Domestic assistance'],
  ['Home Maintenance', 'Home maintenance', 'Domestic assistance'],
  ['Gardening', 'Gardening', 'Domestic assistance'],
  ['Meal Services', 'Meal services', 'Domestic assistance'],
  ['Meals', 'Meals', 'Domestic assistance'],
  ['Respite care', 'Respite care', 'Respite care'],
  ['Community Respite', 'Community respite', 'Respite care'],
  ['Home Community Respite', 'Home and community respite', 'Respite care'],
  ['Life Skills', 'Life skills', 'Life skills'],
  ['Development of daily living and life skills', 'Development of daily living and life skills', 'Life skills'],
  ['Support coordination', 'Support coordination', 'Support coordination'],
  ['Assistance in Coordinating or Managing Life Stages, Transitions and Supports', 'Coordinating or managing life stages, transitions and supports', 'Support coordination'],
  ['Plan management', 'Plan management', 'Plan management'],
  ['Nursing', 'Nursing', 'Nursing'],
  ['Nursing Care', 'Nursing care', 'Nursing'],
  ['Community nursing care for high needs', 'Community nursing care for high needs', 'Nursing'],
  ['SIL', 'Supported Independent Living (SIL)', 'Housing (SDA & SIL)'],
  ['SDA', 'Specialist Disability Accommodation (SDA)', 'Housing (SDA & SIL)'],
  ['Specialist Disability Accommodation', 'Specialist Disability Accommodation (SDA)', 'Housing (SDA & SIL)'],
  // Deliberately no category: it appears on aged-care listings too, where "SIL/SDA" (NDIS terms) would be wrong.
  ['Accommodation support', 'Accommodation support', null],
  ['Accommodation/Tenancy Assistance', 'Accommodation and tenancy assistance', null],
  ['Assistance with daily life tasks in a group or shared living arrangement', 'Daily life tasks in a group or shared living arrangement', 'Housing (SDA & SIL)'],
  ['Participation in community/social and civic activities', 'Participation in community, social and civic activities', 'Community access'],
  ['Group and Centre Based Activities', 'Group and centre based activities', 'Community access'],
  ['Innovative Community Participation', 'Innovative community participation', 'Community access'],
  ['Behaviour support', 'Behaviour support', 'Behaviour support'],
  ['Specialist Behaviour Support', 'Specialist behaviour support', 'Behaviour support'],
  ['Employment Support', 'Employment support', 'Employment & education support'],
  ['Assistance to access and/or maintain employment and/or education', 'Assistance to access or maintain employment or education', 'Employment & education support'],
  ['Specialised Supported Employment', 'Specialised supported employment', 'Employment & education support'],
  ['Home modifications', 'Home modifications', 'Home modifications'],
  ['Home Adjustments', 'Home adjustments', 'Home modifications'],
  ['Vehicle Modifications', 'Vehicle modifications', 'Home modifications'],
  ['Dementia Care', 'Dementia care', 'Dementia care'],
  ['Palliative Care', 'Palliative care', 'Palliative care'],
  // Therapy / allied health
  ['Therapy', 'Therapy', 'Therapy services'],
  ['Allied health', 'Allied health', 'Therapy services'],
  ['Therapeutic Supports', 'Therapeutic supports', 'Therapy services'],
  ['Therapeutic Services', 'Therapeutic services', 'Therapy services'],
  ['Early Childhood Intervention', 'Early childhood intervention', 'Therapy services'],
  ['Early Childhood Supports', 'Early childhood supports', 'Therapy services'],
  ['Physiotherapy', 'Physiotherapy', 'Therapy services'],
  ['Occupational therapy', 'Occupational therapy', 'Therapy services'],
  ['Psychology', 'Psychology', 'Therapy services'],
  ['Exercise physiology', 'Exercise physiology', 'Therapy services'],
  ['Exercise Physiology and Physical Wellbeing Activities', 'Exercise physiology and physical wellbeing activities', 'Therapy services'],
  ['Speech pathology', 'Speech pathology', 'Therapy services'],
  ['Podiatry', 'Podiatry', 'Therapy services'],
  ['Dietetics', 'Dietetics', 'Therapy services'],
  ['Psychosocial recovery coaching', 'Psychosocial recovery coaching', 'Therapy services'],
  ['Music therapy', 'Music therapy', 'Therapy services'],
  ['Art therapy', 'Art therapy', 'Therapy services'],
  ['Counselling', 'Counselling', 'Therapy services'],
  ['Chiropractic', 'Chiropractic', 'Therapy services'],
  ['Osteopathy', 'Osteopathy', 'Therapy services'],
  ['Audiology', 'Audiology', 'Therapy services'],
  ['Optometry', 'Optometry', 'Therapy services'],
  ['Massage Therapy', 'Massage therapy', 'Therapy services'],
  // Equipment
  ['Equipment', 'Equipment', 'Assistive technology & equipment'],
  ['Communication Equipment', 'Communication equipment', 'Assistive technology & equipment'],
  ['Communication and Information Equipment', 'Communication and information equipment', 'Assistive technology & equipment'],
  ['Personal Mobility Equipment', 'Personal mobility equipment', 'Assistive technology & equipment'],
  ['Assistive Technology', 'Assistive technology', 'Assistive technology & equipment'],
  ['Assistive Products for Personal Care and Safety', 'Assistive products for personal care and safety', 'Assistive technology & equipment'],
  ['Assistive Products for Household Tasks', 'Assistive products for household tasks', 'Assistive technology & equipment'],
  ['Assistive Equipment for Recreation', 'Assistive equipment for recreation', 'Assistive technology & equipment'],
  ['Vision Equipment', 'Vision equipment', 'Assistive technology & equipment'],
  ['Prosthetics Orthotics', 'Prosthetics and orthotics', 'Assistive technology & equipment'],
  ['Assistance Animals', 'Assistance animals', 'Assistive technology & equipment'],
  // Aged care residential
  ['Residential Accommodation', 'Residential accommodation', 'Residential aged care'],
  ['Residential Care', 'Residential care', 'Residential aged care'],
  ['Residential Everyday', 'Residential everyday living', 'Residential aged care'],
  ['Residential Non Clinical', 'Residential non-clinical care', 'Residential aged care'],
  ['Residential Clinical', 'Residential clinical care', 'Residential aged care'],
];

const SERVICE_LOOKUP = new Map(LISTED_SERVICES.map(([raw, label, cat]) => [raw.toLowerCase(), { label, cat }]));

export interface NormalisedServices {
  /** Display labels, deduplicated, in first-seen order. */
  labels: string[];
  categories: SupportCategory[];
  /** How many raw values were NOT on the allowlist (page copy, headings, conditions, languages…). */
  droppedCount: number;
}

export function normaliseServices(raw: unknown): NormalisedServices {
  const labels: string[] = [];
  const categories: SupportCategory[] = [];
  let droppedCount = 0;
  for (const value of Array.isArray(raw) ? raw : []) {
    if (typeof value !== 'string') { droppedCount++; continue; }
    const hit = SERVICE_LOOKUP.get(value.trim().toLowerCase());
    if (!hit) { droppedCount++; continue; }
    if (!labels.includes(hit.label)) labels.push(hit.label);
    if (hit.cat && !categories.includes(hit.cat)) categories.push(hit.cat);
  }
  return { labels, categories, droppedCount };
}

/**
 * A provider's own website, as a clean https URL. Anything that isn't a
 * plain domain (or that points back at the scraping source) is dropped.
 */
export function normaliseWebsite(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/[^\s]*)?$/i.test(cleaned)) return undefined;
  if (/carevo/i.test(cleaned)) return undefined;
  return `https://${cleaned.toLowerCase()}`;
}

export function normaliseName(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
}

export interface RegisterArea { suburb: string; suburbSlug: string; state: StateCode }

/**
 * The suburb a row describes: its display name comes from the breadcrumb
 * trail (…/State/Suburb/Provider) and its slug/state from the row itself.
 */
export function rowToArea(row: { state?: unknown; suburb_slug?: unknown; breadcrumb?: unknown }): RegisterArea | null {
  const state = typeof row.state === 'string' ? (row.state.toUpperCase() as StateCode) : undefined;
  const suburbSlug = typeof row.suburb_slug === 'string' ? row.suburb_slug.trim().toLowerCase() : '';
  if (!state || !STATE_CODES.includes(state) || !suburbSlug) return null;
  const crumbs = Array.isArray(row.breadcrumb) ? (row.breadcrumb as { name?: unknown }[]) : [];
  const nameFromCrumb = crumbs.length >= 5 && typeof crumbs[4]?.name === 'string' ? crumbs[4].name.trim() : '';
  const suburb = nameFromCrumb || suburbSlug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return { suburb, suburbSlug, state };
}

const RESERVED_SLUGS = new Set<string>(STATE_CODES.map((s) => s.toLowerCase()));
/** A provider slug must never equal a state code — /ndis-providers/nsw is the state page. */
export function safeProviderSlug(slug: string): string {
  return RESERVED_SLUGS.has(slug) ? `${slug}-provider` : slug;
}

/**
 * A suburb page is only worth indexing (and listing in the sitemap) once
 * it has at least this many real listings — below that it's a near-empty
 * page that exists only to carry a keyword. Shared by the API (sitemap,
 * hub) and mirrored in apps/web's registerMeta.ts for the noindex tag.
 */
export const MIN_SUBURB_LISTINGS = 3;

export const TYPE_LABEL: Record<RegisterType, { source: string; short: string }> = {
  ndis: { source: 'NDIS Commission register', short: 'NDIS' },
  aged_care: { source: 'My Aged Care provider register', short: 'Aged care' },
};
