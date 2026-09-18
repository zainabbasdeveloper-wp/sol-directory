import type { ProviderDoc } from '../models/Provider.js';
import Provider from '../models/Provider.js';

// Mongo is the source of truth for provider data — this pushes a
// display MIRROR to a WordPress 'provider' post on every onboarding
// save, admin status change, and scraper import. It never blocks or
// throws into its caller (same reliability principle as
// geocoding.service.ts/email.service.ts): a WordPress outage must
// never break onboarding, an admin action, or a bulk import.
//
// Auth: WordPress Application Passwords (core WP feature since 5.6,
// no extra plugin needed) — create a user in wp-admin, generate an
// application password under that user's profile, set
// WORDPRESS_APP_USER/WORDPRESS_APP_PASSWORD below. This satisfies
// WordPress's own is_user_logged_in() check (apps/cms's rest-api.php),
// which is what currently blocks all unauthenticated writes.
const WP_URL = process.env.WORDPRESS_URL; // e.g. http://46.250.242.208:8080
const WP_APP_USER = process.env.WORDPRESS_APP_USER;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

// service_category/funding_category/condition_category/language_category
// are shared with the 'service' CPT (apps/cms's post-types.php);
// age_group_category is provider-only. Keys match ProviderDoc fields.
const TAXONOMY_REST_BASE: Record<string, string> = {
  registrationGroups: 'service-categories',
  acceptedFunding: 'funding-categories',
  conditionExperience: 'condition-categories',
  languages: 'language-categories',
  ageGroups: 'age-group-categories',
};

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${WP_APP_USER}:${WP_APP_PASSWORD}`).toString('base64');
}

function isConfigured(): boolean {
  if (!WP_URL || !WP_APP_USER || !WP_APP_PASSWORD) {
    console.warn('[WordPressSync] WORDPRESS_URL/WORDPRESS_APP_USER/WORDPRESS_APP_PASSWORD not fully configured — skipping sync.');
    return false;
  }
  return true;
}

async function wpFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${WP_URL!.replace(/\/$/, '')}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: authHeader(), 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`WordPress ${init.method ?? 'GET'} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

// Finds an existing term by exact name, or creates one — taxonomy
// terms are shared vocabulary (e.g. "Personal Care" as a
// service-categories term), so providers must reuse the same term a
// Service post would use rather than creating near-duplicates.
async function findOrCreateTerm(restBase: string, name: string): Promise<number | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  try {
    const existing = await wpFetch(`/wp-json/wp/v2/${restBase}?search=${encodeURIComponent(trimmed)}&per_page=100`);
    const exact = Array.isArray(existing) ? existing.find((t: any) => t.name.toLowerCase() === trimmed.toLowerCase()) : null;
    if (exact) return exact.id;

    const created = await wpFetch(`/wp-json/wp/v2/${restBase}`, { method: 'POST', body: JSON.stringify({ name: trimmed }) });
    return created?.id ?? null;
  } catch (err) {
    console.error(`[WordPressSync] Could not resolve term "${trimmed}" in ${restBase}:`, err);
    return null;
  }
}

async function resolveTaxonomyIds(provider: ProviderDoc): Promise<Record<string, number[]>> {
  const result: Record<string, number[]> = {};
  for (const [field, restBase] of Object.entries(TAXONOMY_REST_BASE)) {
    const values = (provider as any)[field] as string[] | undefined;
    if (!values?.length) continue;
    const ids = await Promise.all(values.map((v) => findOrCreateTerm(restBase, v)));
    result[field] = ids.filter((id): id is number => id !== null);
  }
  return result;
}

// service_category / funding_category / condition_category /
// language_category / age_group_category are the WP taxonomy slugs
// the WP REST API expects as top-level keys on a provider post.
const TAXONOMY_SLUG: Record<string, string> = {
  registrationGroups: 'service_category',
  acceptedFunding: 'funding_category',
  conditionExperience: 'condition_category',
  languages: 'language_category',
  ageGroups: 'age_group_category',
};

function buildMetaPayload(provider: ProviderDoc) {
  const addr = provider.businessAddress;
  const coords = provider.location?.coordinates;
  return {
    mongo_id: String(provider._id),
    mongo_slug: provider.slug ?? '',
    legal_entity_name: provider.legalEntityName ?? '',
    abn: provider.abn ?? '',
    contact_email: provider.intakeEmail ?? '',
    address: addr?.address ?? '',
    suburb: addr?.suburb ?? '',
    state: addr?.state ?? '',
    postcode: addr?.postcode ?? '',
    latitude: coords?.[1] ?? null,
    longitude: coords?.[0] ?? null,
    service_suburbs_json: JSON.stringify(provider.serviceSuburbs ?? []),
    travel_radius_km: provider.travelRadiusKm ?? null,
    intake_status: provider.intakeStatus ?? '',
    weekly_capacity_hours: provider.weeklyCapacityHours ?? null,
    roster_size: provider.rosterSize ?? null,
    after_hours_cover: provider.afterHoursCover ?? '',
  };
}

/**
 * Pushes (creates or updates) a provider's WordPress mirror post.
 * Fire-and-forget from every call site — never throws, never blocks
 * the operation that triggered it.
 */
export async function syncProviderToWordPress(providerId: string): Promise<void> {
  if (!isConfigured()) return;

  try {
    const provider = await Provider.findById(providerId);
    if (!provider) return;

    // A provider with no real name yet (freshly signed up, onboarding
    // not started) has nothing meaningful to mirror — wait for the
    // 'org' step instead of creating an empty WP post.
    const title = provider.tradingName || provider.legalEntityName;
    if (!title) return;

    const taxonomyIds = await resolveTaxonomyIds(provider);
    const taxonomyPayload = Object.fromEntries(
      Object.entries(taxonomyIds).map(([field, ids]) => [TAXONOMY_SLUG[field], ids])
    );

    const payload = {
      title,
      status: provider.accountStatus === 'active' ? 'publish' : 'draft',
      meta: buildMetaPayload(provider),
      ...taxonomyPayload,
    };

    const result = provider.wpPostId
      ? await wpFetch(`/wp-json/wp/v2/providers/${provider.wpPostId}`, { method: 'POST', body: JSON.stringify(payload) })
      : await wpFetch('/wp-json/wp/v2/providers', { method: 'POST', body: JSON.stringify(payload) });

    if (!provider.wpPostId && result?.id) {
      provider.wpPostId = result.id;
      await provider.save();
    }
  } catch (err) {
    console.error(`[WordPressSync] Failed to sync provider ${providerId}:`, err);
  }
}

/**
 * The reverse (logo-only) direction — called from the WordPress
 * webhook when a 'provider' post is saved. Fetches the post's featured
 * image and writes it onto the matching Mongo record.
 */
export async function pullProviderLogoFromWordPress(wpPostId: number): Promise<void> {
  if (!isConfigured()) return;

  try {
    const post = await wpFetch(`/wp-json/wp/v2/providers/${wpPostId}?_embed=wp:featuredmedia`);
    const logoUrl: string | null = post?._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null;

    const provider = await Provider.findOne({ wpPostId });
    if (!provider) return; // a post that didn't originate from a sync — nothing to update

    if (provider.logoUrl !== logoUrl) {
      provider.logoUrl = logoUrl ?? undefined;
      await provider.save();
    }
  } catch (err) {
    console.error(`[WordPressSync] Failed to pull logo for WP post ${wpPostId}:`, err);
  }
}
