export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function unslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Covers the suburbs currently linkable from the Locations page and
// the Bankstown example. Falls back to 'Australia' for anything else
// — a real implementation would resolve this from a suburb/postcode
// database, not a hardcoded map.
export const STATE_BY_SUBURB: Record<string, string> = {
  sydney: 'New South Wales',
  newcastle: 'New South Wales',
  wollongong: 'New South Wales',
  parramatta: 'New South Wales',
  bankstown: 'New South Wales',
  melbourne: 'Victoria',
  geelong: 'Victoria',
  ballarat: 'Victoria',
  dandenong: 'Victoria',
  brisbane: 'Queensland',
  'gold-coast': 'Queensland',
  townsville: 'Queensland',
  cairns: 'Queensland',
  perth: 'Western Australia',
  adelaide: 'South Australia',
  hobart: 'Tasmania',
  canberra: 'Australian Capital Territory',
  darwin: 'Northern Territory',
};

export function stateForSuburb(suburbSlug: string): string {
  return STATE_BY_SUBURB[suburbSlug] ?? 'Australia';
}

export const STATE_ABBR: Record<string, string> = {
  'New South Wales': 'NSW',
  Victoria: 'VIC',
  Queensland: 'QLD',
  'Western Australia': 'WA',
  'South Australia': 'SA',
  Tasmania: 'TAS',
  'Australian Capital Territory': 'ACT',
  'Northern Territory': 'NT',
};
