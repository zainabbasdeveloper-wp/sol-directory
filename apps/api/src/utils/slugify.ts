import Provider from '../models/Provider.js';

// Public paths under /directory that a provider slug must never collide with.
const RESERVED_SLUGS = new Set(['in', 'for', 'conditions', 'areas', 'find', 'new']);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Guarantees uniqueness by appending -2, -3, etc. if the base slug
 * is already taken — never silently overwrites another provider's
 * slug, never throws on a collision.
 */
export async function generateUniqueProviderSlug(name: string): Promise<string> {
  let base = slugify(name) || 'provider';
  if (RESERVED_SLUGS.has(base)) base = `${base}-provider`;
  let candidate = base;
  let suffix = 2;
  while (await Provider.exists({ slug: candidate })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}
