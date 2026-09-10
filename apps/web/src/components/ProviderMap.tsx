import { useEffect, useRef, useState } from 'react';

interface MapProvider {
  id: string;
  name: string;
  location: { lat: number; lng: number } | null;
}

interface Props {
  providers: MapProvider[];
  onMarkerClick?: (providerId: string) => void;
}

let mapsScriptPromise: Promise<void> | null = null;
function loadGoogleMapsScript(): Promise<void> {
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[ProviderMap] VITE_GOOGLE_MAPS_API_KEY is not set — map will not render.');
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
  return mapsScriptPromise;
}

export default function ProviderMap({ providers, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  // REAL BUG FIXED: mapInstance was a ref, and mutating a ref does
  // NOT cause the marker-drawing effect below to re-run. If the Maps
  // script took even a few ms to load (it always does — it's a
  // network request) and `providers` was already available on first
  // render, the marker effect ran once, saw mapInstance.current was
  // still null, and returned early — permanently, since nothing ever
  // triggered it again. This state variable is what actually makes
  // "the map became ready" a real dependency the effect reacts to.
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const google = (window as any).google;

        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: { lat: -25.2744, lng: 133.7751 },
          zoom: 4,
          disableDefaultUI: false,
        });
        setMapReady(true);
      })
      .catch(() => {
        // Already logged inside loadGoogleMapsScript.
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const google = (window as any).google;
    if (!google) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const withLocation = providers.filter((p) => p.location);
    if (withLocation.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const p of withLocation) {
      const marker = new google.maps.Marker({
        position: p.location,
        map: mapInstance.current,
        title: p.name,
      });
      if (onMarkerClick) marker.addListener('click', () => onMarkerClick(p.id));
      markersRef.current.push(marker);
      bounds.extend(p.location as any);
    }
    mapInstance.current.fitBounds(bounds);
  }, [mapReady, providers, onMarkerClick]);

  return <div ref={mapRef} style={{ width: '100%', height: 320, borderRadius: 12, border: '1px solid var(--color-border, #E8EEF7)' }} />;
}
