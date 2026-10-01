import type { RegisterListingDoc } from '../models/RegisterListing.js';
import RegisterListing from '../models/RegisterListing.js';
import { safeRegisterName } from './registerNormalise.js';

// Mirrors an imported/unclaimed RegisterListing to WordPress as its OWN
// post type ('register_listing' — see apps/cms's post-types.php),
// deliberately separate from 'provider'. These are public-register facts,
// not a real signed-up business: mixing them into the same wp-admin list
// as real Providers would make it impossible for a content admin to tell
// "accepting enquiries" from "just on the public register" at a glance,
// which is the exact conflation the rest of this app goes out of its way
// to avoid. Mongo remains the source of truth — this is read-only in
// wp-admin (no featured-image/logo webhook back, unlike 'provider').
//
// Same auth/env story as wordpressSync.service.ts: WordPress Application
// Passwords, WORDPRESS_URL/WORDPRESS_APP_USER/WORDPRESS_APP_PASSWORD.
const WP_URL = process.env.WORDPRESS_URL;
const WP_APP_USER = process.env.WORDPRESS_APP_USER;
const WP_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

function authHeader(): string {
  return 'Basic ' + Buffer.from(`${WP_APP_USER}:${WP_APP_PASSWORD}`).toString('base64');
}

export function isConfigured(): boolean {
  if (!WP_URL || !WP_APP_USER || !WP_APP_PASSWORD) {
    console.warn('[RegisterWordPressSync] WORDPRESS_URL/WORDPRESS_APP_USER/WORDPRESS_APP_PASSWORD not fully configured — skipping sync.');
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

function buildMetaPayload(listing: RegisterListingDoc) {
  const first = listing.areas[0];
  return {
    mongo_id: String(listing._id),
    register_type: listing.type,
    mongo_slug: listing.slug,
    claim_status: listing.claimStatus,
    website: listing.website ?? '',
    states: listing.states.join(', '),
    area_count: listing.areaCount,
    primary_suburb: first ? `${first.suburb}, ${first.state}` : '',
    services_json: JSON.stringify(listing.services ?? []),
    logo_url: listing.logoUrl ?? '',
  };
}

/**
 * Pushes (creates or updates) a register listing's WordPress mirror post.
 * Never throws — same reliability contract as syncProviderToWordPress:
 * a WordPress outage must never break an import, a claim decision, or the
 * bulk backfill script.
 */
export async function syncRegisterListingToWordPress(listing: RegisterListingDoc): Promise<void> {
  if (!isConfigured()) return;

  try {
    const payload = {
      title: safeRegisterName(listing.name, listing.slug),
      // Draft = still just an imported/unclaimed register fact; Publish =
      // a real business has claimed it. Mirrors the same draft/publish
      // convention already used for 'provider', so it reads the same way
      // in wp-admin's default post list.
      status: listing.claimStatus === 'claimed' ? 'publish' : 'draft',
      meta: buildMetaPayload(listing),
    };

    const result = listing.wpPostId
      ? await wpFetch(`/wp-json/wp/v2/register-listings/${listing.wpPostId}`, { method: 'POST', body: JSON.stringify(payload) })
      : await wpFetch('/wp-json/wp/v2/register-listings', { method: 'POST', body: JSON.stringify(payload) });

    if (!listing.wpPostId && result?.id) {
      await RegisterListing.updateOne({ _id: listing._id }, { $set: { wpPostId: result.id } });
    }
  } catch (err) {
    console.error(`[RegisterWordPressSync] Failed to sync register listing ${listing._id}:`, err);
  }
}
