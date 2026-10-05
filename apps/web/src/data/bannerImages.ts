import manifest from './bannerManifest.json';

/**
 * Picks the banner photo for a page from its title or slug, so "Personal care" gets a personal-care
 * photo and "Plan management" gets a paperwork one. Topics are listed most specific first and the first
 * keyword hit wins.
 *
 * A topic only gets its own photo once `npm run images:fetch-banners -w apps/web` has downloaded it
 * (that script lists what it fetched in bannerManifest.json). Until then the topic falls back to the
 * general photos that already ship with the site, so nothing ever points at a missing file.
 */
interface Topic {
  id: string;
  keywords: string[];
}

export const BANNER_TOPICS: Topic[] = [
  { id: 'personal-care', keywords: ['personal care', 'personal-care', 'daily living', 'daily-living', 'in-home', 'in home', 'home care', 'domestic', 'nursing', 'showering', 'meal'] },
  { id: 'community', keywords: ['community', 'social', 'recreation', 'participation', 'activities', 'sport'] },
  { id: 'therapy', keywords: ['therapy', 'therapies', 'occupational', 'physio', 'speech', 'allied health', 'psycholog', 'behaviour', 'dietitian', 'podiatr', 'exercise'] },
  { id: 'support-coordination', keywords: ['support coordination', 'support-coordination', 'coordinator', 'plan review', 'plan-review', 'getting started', 'navigating'] },
  { id: 'plan-management', keywords: ['plan management', 'plan-management', 'plan manager', 'self-managed', 'self managed', 'funding', 'budget', 'invoice', 'core supports', 'capacity building', 'capital supports', 'participant'] },
  { id: 'transport', keywords: ['transport', 'travel', 'vehicle', 'driving'] },
  { id: 'housing', keywords: ['accommodation', 'housing', 'sda', 'independent living', 'respite', 'home modification', 'supported independent'] },
  { id: 'employment', keywords: ['employment', 'jobs', 'school leaver', 'career', 'training', 'education'] },
  { id: 'mental-health', keywords: ['mental health', 'mental-health', 'psychosocial', 'anxiety', 'depression', 'wellbeing'] },
  { id: 'autism-children', keywords: ['autism', 'child', 'early intervention', 'early-intervention', 'kids', 'adhd'] },
  { id: 'assistive-technology', keywords: ['assistive', 'technology', 'equipment', 'wheelchair', 'mobility', 'aids'] },
  { id: 'older-people', keywords: ['aged', 'older', 'senior', 'elderly', 'dementia'] },
  { id: 'multicultural', keywords: ['language', 'multicultural', 'interpreter', 'culturally', 'cald', 'first nations', 'aboriginal'] },
];

const SECTION_TOPICS: Record<string, string> = {
  locations: 'locations',
  guides: 'guides',
  funding: 'plan-management',
  conditions: 'general',
};

/** Photos that already ship with the site — the fallback when a topic has none of its own yet. */
export const GENERAL_BANNERS = {
  default: '/images/providers.jpg',
  locations: '/images/front-view-smiley-girl-woman-indoors-hero.jpg',
  guides: '/images/reviews.jpg',
  services: '/images/six-checks-on-every-provider.jpg',
} as const;

const available = new Set<string>(manifest.available);

// A keyword matches at the start of a word, so "physio" matches "physiotherapy" but "sda" never matches "wisdom".
const matchesWord = (haystack: string, keyword: string) =>
  (` ${haystack}`).includes(` ${keyword.replace(/-/g, ' ')}`);

const bannerPath = (id: string) => `/images/banners/${id}.jpg`;

interface Hint {
  /** Page title, heading, or slug — whichever says most about the page. */
  text?: string;
  /** Broad section: services, locations, guides, funding, conditions. */
  section?: string;
}

export function bannerFor({ text = '', section = '' }: Hint): string {
  const haystack = text.toLowerCase().replace(/[-_/]+/g, ' ');

  for (const topic of BANNER_TOPICS) {
    if (available.has(topic.id) && topic.keywords.some((k) => matchesWord(haystack, k))) {
      return bannerPath(topic.id);
    }
  }

  const sectionTopic = SECTION_TOPICS[section];
  if (sectionTopic && available.has(sectionTopic)) return bannerPath(sectionTopic);
  if (section === 'locations') return GENERAL_BANNERS.locations;
  if (section === 'guides') return GENERAL_BANNERS.guides;
  if (section === 'services') return GENERAL_BANNERS.services;
  return available.has('general') ? bannerPath('general') : GENERAL_BANNERS.default;
}
