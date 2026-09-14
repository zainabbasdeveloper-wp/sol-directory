/**
 * Configurable CPT → frontend route mapping (spec item 6). Adding a
 * new WordPress content type later means adding ONE entry here plus
 * ONE route line in AppRoutes.tsx — never a new page component, and
 * never a hardcoded `if (cptName === 'x')` anywhere in the app.
 *
 * restBase must match the rest_base set in the WordPress plugin's
 * register_post_type() call exactly (apps/cms's post-types.php).
 */
export interface CPTRouteConfig {
  /** URL path segment, e.g. 'services' → /services/:slug */
  pathPrefix: string;
  /** WordPress REST API base, e.g. /wp-json/wp/v2/{restBase} */
  restBase: string;
  /** Whether this content type should show real matching providers alongside its content (Location-style). */
  showRelatedProviders?: boolean;
}

export const CPT_ROUTES: CPTRouteConfig[] = [
  { pathPrefix: 'services', restBase: 'services' },
  { pathPrefix: 'locations', restBase: 'locations', showRelatedProviders: true },
  { pathPrefix: 'guides', restBase: 'guides' },
];
