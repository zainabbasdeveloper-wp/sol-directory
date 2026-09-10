// Backend-only — GOOGLE_MAPS_API_KEY here is a server-side key
// (Geocoding API), never sent to the frontend. This is different
// from the browser-side Maps key the frontend map component uses,
// which is a separate, domain-restricted key by design (that one is
// meant to be public; this one is not).

export interface GeocodeResult { lat: number; lng: number; formattedAddress: string }

/**
 * Converts a free-text address/suburb into coordinates via Google's
 * Geocoding API. Returns null (not a thrown error) when geocoding
 * fails or the key isn't configured — geocoding failure should never
 * block whatever operation triggered it (onboarding step save, etc.),
 * same reliability principle as EmailService.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[GeocodingService] GOOGLE_MAPS_API_KEY not configured — skipping geocoding.');
    return null;
  }
  if (!address?.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as any;

    if (data.status !== 'OK' || !data.results?.[0]) {
      console.warn(`[GeocodingService] No result for "${address}" — status: ${data.status}`);
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
    };
  } catch (err) {
    console.error(`[GeocodingService] Request failed for "${address}":`, err);
    return null;
  }
}
