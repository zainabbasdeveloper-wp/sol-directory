/**
 * Shared constants for the public-register pages (/ndis-providers/… and
 * /aged-care-providers/…). Mirrors the API's registerNormalise.ts —
 * keep MIN_INDEXABLE in step with MIN_SUBURB_LISTINGS there.
 */
export type RegisterType = 'ndis' | 'aged_care';

export interface RegisterKind {
  type: RegisterType;
  /** URL prefix, no leading slash. */
  path: 'ndis-providers' | 'aged-care-providers';
  /** "NDIS" / "aged care" — reads naturally in "{label} providers in …". */
  label: string;
  /** Sentence-case name of the register the listings come from. */
  register: string;
  /** The official place to confirm a provider's current status. */
  officialUrl: string;
  officialName: string;
  /** How a listed business is described — deliberately "listed", not "registered": we only know what the register showed when it was imported. */
  listedAs: string;
}

export const REGISTER_KINDS: Record<RegisterKind['path'], RegisterKind> = {
  'ndis-providers': {
    type: 'ndis',
    path: 'ndis-providers',
    label: 'NDIS',
    register: 'NDIS Commission register of registered providers',
    officialUrl: 'https://www.ndiscommission.gov.au/provider-registration/find-registered-provider',
    officialName: 'NDIS Commission’s “Find a registered provider”',
    listedAs: 'listed as an NDIS registered provider',
  },
  'aged-care-providers': {
    type: 'aged_care',
    path: 'aged-care-providers',
    label: 'Aged care',
    register: 'My Aged Care provider register',
    officialUrl: 'https://www.myagedcare.gov.au/find-a-provider',
    officialName: 'My Aged Care “Find a provider”',
    listedAs: 'listed as an approved aged care provider',
  },
};

export const KIND_BY_TYPE: Record<RegisterType, RegisterKind> = {
  ndis: REGISTER_KINDS['ndis-providers'],
  aged_care: REGISTER_KINDS['aged-care-providers'],
};

export const STATES = [
  { code: 'NSW', slug: 'nsw', name: 'New South Wales' },
  { code: 'VIC', slug: 'vic', name: 'Victoria' },
  { code: 'QLD', slug: 'qld', name: 'Queensland' },
  { code: 'WA', slug: 'wa', name: 'Western Australia' },
  { code: 'SA', slug: 'sa', name: 'South Australia' },
  { code: 'TAS', slug: 'tas', name: 'Tasmania' },
  { code: 'ACT', slug: 'act', name: 'Australian Capital Territory' },
  { code: 'NT', slug: 'nt', name: 'Northern Territory' },
] as const;

export const stateBySlug = (slug: string | undefined) => STATES.find((s) => s.slug === (slug ?? '').toLowerCase());
export const stateByCode = (code: string) => STATES.find((s) => s.code === code.toUpperCase());

/** A suburb/state page with fewer real listings than this is kept out of search results. */
export const MIN_INDEXABLE = 3;

export const registerPath = (kind: RegisterKind, ...parts: (string | undefined)[]) =>
  `/${[kind.path, ...parts.filter(Boolean)].join('/')}`;

export const areaLabel = (a: { suburb: string; state: string }) => `${a.suburb}, ${a.state}`;

export const absoluteUrl = (path: string) => `${window.location.origin}${path}`;

/** Mirrors the API's REGISTER_SUPPORT_CATEGORIES (registerNormalise.ts) — the only values ?category= accepts. */
export const SUPPORT_CATEGORIES = [
  'Support coordination', 'Plan management', 'Personal care', 'Domestic assistance', 'Transport', 'Therapy services', 'Nursing',
  'Housing (SDA & SIL)', 'Community access', 'Respite care', 'Behaviour support', 'Employment & education support', 'Life skills',
  'Assistive technology & equipment', 'Home modifications', 'Dementia care', 'Palliative care', 'Residential aged care', 'Support workers',
] as const;

// Service-page names that aren't spelled exactly like a register category.
const CATEGORY_ALIASES: [RegExp, (typeof SUPPORT_CATEGORIES)[number]][] = [
  [/plan management/i, 'Plan management'],
  [/support coordination/i, 'Support coordination'],
  [/community access|social/i, 'Community access'],
  [/allied health|therap|physio|occupational|speech|psycholog/i, 'Therapy services'],
  [/assistive|equipment/i, 'Assistive technology & equipment'],
  [/employment/i, 'Employment & education support'],
  [/\b(sda|sil)\b|accommodation|housing/i, 'Housing (SDA & SIL)'],
  [/domestic|cleaning|household/i, 'Domestic assistance'],
];

/** The register category a service page corresponds to, or undefined when there's no honest match. */
export function categoryForService(serviceName: string): (typeof SUPPORT_CATEGORIES)[number] | undefined {
  const exact = SUPPORT_CATEGORIES.find((c) => c.toLowerCase() === serviceName.trim().toLowerCase());
  if (exact) return exact;
  return CATEGORY_ALIASES.find(([re]) => re.test(serviceName))?.[1];
}
