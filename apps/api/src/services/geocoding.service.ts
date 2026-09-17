// Backend-only — MAPBOX_ACCESS_TOKEN here is the server-side (secret,
// sk.*) Mapbox token, never sent to the frontend. This is different
// from the browser-side VITE_MAPBOX_ACCESS_TOKEN the frontend map
// component uses, which must be a public (pk.*), domain-restricted
// token by design (that one is meant to be public; this one is not).

export interface GeocodeResult { lat: number; lng: number; formattedAddress: string }

/**
 * Converts a free-text address/suburb into coordinates via Mapbox's
 * Geocoding API (v6 forward geocoding). Returns null (not a thrown
 * error) when geocoding fails or the token isn't configured —
 * geocoding failure should never block whatever operation triggered
 * it (onboarding step save, etc.), same reliability principle as
 * EmailService.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn('[GeocodingService] MAPBOX_ACCESS_TOKEN not configured — skipping geocoding.');
    return null;
  }
  if (!address?.trim()) return null;

  try {
    // Biased to Australia (country=au) — every address this service
    // geocodes (provider business addresses, service suburbs, lead
    // locations) is an Australian NDIS/aged-care service address.
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&country=au&limit=1&access_token=${accessToken}`;
    const res = await fetch(url);
    const data = await res.json() as any;

    const feature = data?.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    if (!res.ok || !feature || !Array.isArray(coordinates) || coordinates.length !== 2) {
      console.warn(`[GeocodingService] No result for "${address}" — status: ${res.status}`);
      return null;
    }

    const [lng, lat] = coordinates;
    return {
      lat,
      lng,
      formattedAddress: feature.properties?.full_address ?? feature.properties?.name ?? address,
    };
  } catch (err) {
    console.error(`[GeocodingService] Request failed for "${address}":`, err);
    return null;
  }
}
