// Explicit reserved-path-prefix list, derived from the real routes
// declared in AppRoutes.tsx — not a guessed list. The WordPress
// content resolver checks this BEFORE ever attempting a WordPress
// lookup, as a defense-in-depth safeguard: React Router's own route
// declaration order already means an exact application route always
// wins over the catch-all, but this stops the resolver from even
// trying a network request for a reserved path, and protects against
// a future refactor accidentally reordering routes.
//
// If you add a new top-level route to AppRoutes.tsx, add its prefix
// here too.
export const RESERVED_PATH_PREFIXES = [
  '/directory',
  // /services and /locations are reserved as prefixes because both
  // already have real app routes at multiple shapes: the exact
  // marketing pages (/services, /locations), the existing two-segment
  // ServiceLocationPage route (/services/:serviceSlug/:suburb), AND
  // the new single-segment CPT routes this round adds
  // (/services/:slug, /locations/:slug). All of those are explicit
  // routes in AppRoutes.tsx — the generic catch-all Page resolver
  // below should never attempt to handle anything under these
  // prefixes at all, explicit route or not.
  '/services',
  '/locations',
  '/providers',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/confirm-capacity',
  '/privacy',
  '/terms',
  '/provider-agreement',
  '/lead-disclaimer',
  '/guides',
  '/dashboard',
  '/leads',
  '/plans',
  '/onboarding',
  '/verification',
  '/admin',
  '/find-providers',
  '/saved-providers',
];

export function isReservedPath(pathname: string): boolean {
  return RESERVED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
