/** Same rule as the API's utils/slugify.ts — /directory/in/:suburb and /directory/for/:condition slugs must match on both sides. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
