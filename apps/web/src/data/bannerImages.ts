import type { CSSProperties } from 'react';
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
  // Funding and service pages for older people come first so "Home Care Packages" is not read as personal care.
  { id: 'older-people', keywords: ['aged care', 'home care package', 'commonwealth home', 'support at home', 'residential', 'transition care', 'aged', 'older', 'senior', 'elderly', 'dementia', 'memory', 'cognitive', 'veteran', 'dva', 'open arms'] },
  { id: 'support-coordination', keywords: ['support coordination', 'coordinator', 'referral', 'plan review', 'change of circumstances', 'first plan', 'getting started', 'navigating', 'waitlist', 'shortlist'] },
  { id: 'plan-management', keywords: ['plan management', 'plan manager', 'plan managed', 'self managed', 'agency managed', 'ndis plans', 'funding', 'budget', 'bookkeeping', 'invoice', 'price guide', 'eligibility', 'core supports', 'capacity building', 'capital supports', 'participant', 'self management', 'financial', 'private fee', 'private health', 'medicare', 'workers compensation', 'icare', 'state funded', 'other funding'] },
  { id: 'housing', keywords: ['accommodation', 'housing', 'sda', 'independent living', 'respite', 'home modification', 'home maintenance', 'supported independent', 'camps', 'overnight', 'shared living', 'living options', 'tenancy'] },
  { id: 'transport', keywords: ['transport', 'travel', 'vehicle', 'driving', 'driver', 'outings'] },
  { id: 'assistive-technology', keywords: ['assistive', 'at assessment', 'technology', 'equipment', 'wheelchair', 'mobility', 'aids', 'assistance dog', 'physical', 'spinal', 'amputation', 'limb', 'muscular', 'sclerosis', 'spina', 'arthritis', 'chronic pain', 'hearing', 'vision', 'sensory', 'deaf', 'blind', 'auslan', 'rehabilitation appliances', 'prosthetic', 'orthotic', 'assistance animal', 'communication and information'] },
  { id: 'mental-health', keywords: ['mental health', 'psychosocial', 'anxiety', 'depression', 'wellbeing', 'schizophrenia', 'bipolar', 'ptsd', 'eating disorder', 'personality', 'dual diagnosis', 'counselling'] },
  { id: 'autism-children', keywords: ['autism', 'child', 'early intervention', 'kids', 'adhd', 'developmental', 'intellectual', 'down syndrome', 'fragile', 'cerebral palsy', 'delay'] },
  { id: 'therapy', keywords: ['therapy', 'therapies', 'occupational', 'physio', 'speech', 'allied health', 'psycholog', 'behaviour', 'dietitian', 'dietetics', 'podiatr', 'exercise', 'rehabilitation', 'neuro', 'stroke', 'brain injury', 'brain', 'epilepsy', 'diabetes', 'renal', 'cystic', 'cancer', 'motor neurone', 'parkinson', 'huntington', 'chronic', 'social work', 'personal training'] },
  { id: 'personal-care', keywords: ['personal care', 'daily living', 'in home', 'home support', 'home care', 'domestic', 'nursing', 'clinical care', 'wound', 'catheter', 'peg feeding', 'palliative', 'medication', 'continence', 'showering', 'meal', 'gardening', 'shopping', 'high intensity', 'household', 'house cleaning', 'cleaning', 'enteral', 'nutrition', 'continence', 'overnight support'] },
  { id: 'community', keywords: ['community', 'social', 'recreation', 'participation', 'activities', 'sport', 'group', 'mentoring', 'volunteer'] },
  { id: 'employment', keywords: ['employment', 'jobs', 'school leaver', 'career', 'training', 'education'] },
  { id: 'multicultural', keywords: ['language', 'multicultural', 'interpreter', 'translat', 'culturally', 'cald', 'first nations', 'aboriginal', 'torres strait'] },
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
/** How many photos a topic has (<topic>.jpg, <topic>-2.jpg …); the script that downloads them records it. */
const variantCounts: Record<string, number> = (manifest as { variants?: Record<string, number> }).variants ?? {};

// A keyword matches at the start of a word, so "physio" matches "physiotherapy" but "sda" never matches "wisdom".
const matchesWord = (haystack: string, keyword: string) =>
  (` ${haystack}`).includes(` ${keyword.replace(/-/g, ' ')}`);

const hash = (text: string) => {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
};
/** A topic with several photos shows a different one per page: the page's own title decides which, so it never changes between visits. */
const bannerPath = (id: string, seed = '') => {
  const count = variantCounts[id] ?? 1;
  const n = count > 1 ? (hash(seed) % count) + 1 : 1;
  return `/images/banners/${n === 1 ? id : `${id}-${n}`}.jpg`;
};

interface Hint {
  /** Page title, heading, or slug — whichever says most about the page. */
  text?: string;
  /** Broad section: services, locations, guides, funding, conditions. */
  section?: string;
  /** State or territory code (QLD, NSW …) — lets a location page show that state's skyline when no service photo fits. */
  state?: string;
}

export function bannerFor({ text = '', section = '', state = '' }: Hint): string {
  const haystack = text.toLowerCase().replace(/[-_/]+/g, ' ');

  for (const topic of BANNER_TOPICS) {
    if (available.has(topic.id) && topic.keywords.some((k) => matchesWord(haystack, k))) {
      return bannerPath(topic.id, haystack);
    }
  }

  if (section === 'locations' && state) {
    const id = `locations-${state.toLowerCase()}`;
    if (available.has(id)) return bannerPath(id, haystack);
  }

  const sectionTopic = SECTION_TOPICS[section];
  if (sectionTopic && available.has(sectionTopic)) return bannerPath(sectionTopic, haystack);
  if (section === 'locations') return GENERAL_BANNERS.locations;
  if (section === 'guides') return GENERAL_BANNERS.guides;
  if (section === 'services') return GENERAL_BANNERS.services;
  return available.has('general') ? bannerPath('general', haystack) : GENERAL_BANNERS.default;
}

/**
 * Inline style that swaps a hub page's header photo (the `directory-page-header` band) for a topic photo.
 * Returns nothing until that topic has been downloaded, so the CSS default photo stays in place.
 */
export function hubHeaderStyle(topicId: string): CSSProperties | undefined {
  return available.has(topicId) ? ({ '--directory-header-image': `url(${bannerPath(topicId)})` } as CSSProperties) : undefined;
}
