/**
 * Australian suburb / postcode search on Mapbox's public geocoding API.
 * Shared by the "Get matched" wizard and the public directory so both
 * behave identically (same suggestions, same "Suburb  STATE" labelling).
 *
 * Uses the PUBLIC token only (VITE_MAPBOX_ACCESS_TOKEN, a `pk.` token —
 * never the secret one). With no token configured every function resolves
 * to an empty result, so callers degrade to a plain text input.
 */
export interface PlaceSuggestion {
  id: string;
  suburb: string;
  state: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
}

export const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
export const placeSearchEnabled = !!MAPBOX_TOKEN;

const STATE_CODES: Record<string, string> = {
  'new south wales': 'NSW', victoria: 'VIC', queensland: 'QLD', 'south australia': 'SA', 'western australia': 'WA',
  tasmania: 'TAS', 'northern territory': 'NT', 'australian capital territory': 'ACT',
};

// One Mapbox v6 feature -> a suggestion row. Suburbs come back as
// `locality` features and carry no postcode; a postcode search returns a
// `postcode` feature (which does).
function toSuggestion(f: any): PlaceSuggestion | null {
  const p = f?.properties ?? {};
  const ctx = p.context ?? {};
  const isPostcode = p.feature_type === 'postcode';
  const postcode: string = isPostcode ? String(p.name ?? '') : String(ctx.postcode?.name ?? '');
  const suburb: string = isPostcode
    ? String(ctx.locality?.name ?? ctx.place?.name ?? '')
    : String(p.name ?? '');
  const regionName = String(ctx.region?.name ?? '');
  const state: string = String(ctx.region?.region_code ?? '') || STATE_CODES[regionName.toLowerCase()] || regionName;
  if (!suburb && !postcode) return null;
  const c = f?.geometry?.coordinates ?? [];
  return {
    id: String(p.mapbox_id ?? f.id ?? `${suburb}-${postcode}-${state}`),
    suburb: suburb || postcode,
    state,
    postcode,
    lng: typeof c[0] === 'number' ? c[0] : null,
    lat: typeof c[1] === 'number' ? c[1] : null,
  };
}

/** Up to 10 de-duplicated suburb/postcode matches. Never throws. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (!MAPBOX_TOKEN || q.length < 2) return [];
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&country=au&language=en&types=locality,place,postcode,neighborhood&autocomplete=true&limit=10&access_token=${MAPBOX_TOKEN}`;
    const data = await fetch(url, { signal }).then((r) => r.json());
    const seen = new Set<string>();
    const items: PlaceSuggestion[] = [];
    for (const f of data.features ?? []) {
      const s = toSuggestion(f);
      if (!s) continue;
      const key = `${s.suburb.toLowerCase()}|${s.postcode}|${s.state}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(s);
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Postcode for a point — looked up once for the suburb actually picked,
 * rather than for every row on every keystroke.
 */
export async function lookupPostcode(lng: number, lat: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=postcode&country=au&access_token=${MAPBOX_TOKEN}`;
    const data = await fetch(url).then((r) => r.json());
    const pc = String(data.features?.[0]?.properties?.name ?? '');
    return /^\d{4}$/.test(pc) ? pc : null;
  } catch {
    return null;
  }
}

/** "Bankstown, NSW 2200" — the text shown once a place is chosen. */
export function formatPlace(s: Pick<PlaceSuggestion, 'suburb' | 'state' | 'postcode'>): string {
  return [s.suburb, [s.state, s.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}
