/**
 * Which independent workers belong on a service page.
 *
 * Workers pick their supports from the admin-managed catalogue (Service
 * collection), which is a shorter list than the ~90 service pages in
 * WordPress. So a page is matched two ways, most specific first:
 *   1. the page's own title, or a catalogue name it clearly is ("Meal
 *      preparation" pages -> workers who list "Meal preparation");
 *   2. failing that, the page's register category (a "Physiotherapy" page ->
 *      workers who list "Therapy assistant").
 * The caller is told which of the two matched so the page can say so honestly.
 */

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Page title looks like -> catalogue names a worker would have picked. Only where the worker's name really is that service:
// "Therapy assistant" is not physiotherapy, so therapy pages match through their category instead (and say so).
const TITLE_ALIASES: [RegExp, string[]][] = [
  [/meal/i, ['Meal preparation']],
  [/overnight/i, ['Overnight support']],
  [/behaviour/i, ['Behaviour support']],
  [/nurs/i, ['Nursing']],
  [/transport/i, ['Transport']],
  [/personal care|high-intensity/i, ['Personal care']],
  [/domestic|cleaning|household/i, ['Domestic assistance']],
  [/social|community|participation|recreation|activities/i, ['Community access', 'Social support']],
];

// Register category -> catalogue names.
const CATEGORY_NAMES: Record<string, string[]> = {
  'Personal care': ['Personal care', 'Overnight support'],
  'Domestic assistance': ['Domestic assistance', 'Meal preparation'],
  'Community access': ['Community access', 'Social support'],
  Transport: ['Transport'],
  'Behaviour support': ['Behaviour support'],
  'Therapy services': ['Therapy assistant'],
  Nursing: ['Nursing'],
};

const exact = (names: string[]) => names.map((n) => new RegExp(`^\\s*${escapeRegex(n)}\\s*$`, 'i'));

export interface WorkerServiceMatch {
  /** 'service' = the page's own service; 'category' = the wider category it falls under. */
  level: 'service' | 'category';
  names: string[];
  patterns: RegExp[];
}

/** Ordered candidate matches for a page: try the first, fall back to the next when it finds nobody. */
export function workerServiceCandidates(title: string, category?: string): WorkerServiceMatch[] {
  const specific = new Set<string>([title.trim()]);
  for (const [re, names] of TITLE_ALIASES) if (re.test(title)) names.forEach((n) => specific.add(n));
  const out: WorkerServiceMatch[] = [{ level: 'service', names: [...specific], patterns: exact([...specific]) }];

  const wide = new Set<string>();
  if (category) {
    wide.add(category);
    (CATEGORY_NAMES[category] ?? []).forEach((n) => wide.add(n));
  }
  const widerOnly = [...wide].filter((n) => !specific.has(n));
  if (widerOnly.length) out.push({ level: 'category', names: [...wide], patterns: exact([...wide]) });
  return out;
}
