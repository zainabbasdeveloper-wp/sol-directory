import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import './AdminProviders.css';
import './AdminServices.css';

interface CheckResult { label: string; status: 'ok' | 'error' | 'unconfigured'; detail: string }

const WP_URL = (import.meta as any).env?.VITE_WORDPRESS_URL;
const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function countFromHeader(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${WP_URL}${path}`);
    if (!res.ok) return null;
    const total = res.headers.get('X-WP-Total');
    return total ? Number(total) : null;
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: CheckResult['status'] }) {
  const map = { ok: ['OK', '#177C4B', '#E4F5EC'], error: ['ERROR', '#B4232F', '#FBE7E7'], unconfigured: ['NOT CONFIGURED', '#9A6B00', '#FFF4DC'] } as const;
  const [label, color, bg] = map[status];
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '3px 9px', borderRadius: 100 }}>{label}</span>;
}

export default function AdminDiagnostics() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const results: CheckResult[] = [];

      // --- WordPress (real checks, not assumed) ---
      if (!WP_URL) {
        results.push({ label: 'WordPress connection', status: 'unconfigured', detail: 'VITE_WORDPRESS_URL is not set' });
      } else {
        try {
          const res = await fetch(`${WP_URL}/wp-json`);
          results.push(res.ok
            ? { label: 'WordPress connection', status: 'ok', detail: WP_URL }
            : { label: 'WordPress connection', status: 'error', detail: `HTTP ${res.status}` });
        } catch (err) {
          results.push({ label: 'WordPress connection', status: 'error', detail: 'Request failed — is WordPress running?' });
        }

        results.push({ label: 'GraphQL endpoint', status: 'unconfigured', detail: 'This integration uses the REST API, not WPGraphQL — see architecture note from the last round' });

        const [pages, posts, services, locations, guides, media, categories] = await Promise.all([
          countFromHeader('/wp-json/wp/v2/pages?per_page=1'),
          countFromHeader('/wp-json/wp/v2/posts?per_page=1'),
          countFromHeader('/wp-json/wp/v2/services?per_page=1'),
          countFromHeader('/wp-json/wp/v2/locations?per_page=1'),
          countFromHeader('/wp-json/wp/v2/guides?per_page=1'),
          countFromHeader('/wp-json/wp/v2/media?per_page=1'),
          countFromHeader('/wp-json/wp/v2/categories?per_page=1'),
        ]);
        results.push({ label: 'Pages available', status: pages !== null ? 'ok' : 'error', detail: pages !== null ? String(pages) : 'Could not read count' });
        results.push({ label: 'Posts available', status: posts !== null ? 'ok' : 'error', detail: posts !== null ? String(posts) : 'Could not read count' });
        results.push({ label: 'Services (CPT)', status: services !== null ? 'ok' : 'error', detail: services !== null ? String(services) : 'CPT not found — is the plugin activated?' });
        results.push({ label: 'Locations (CPT)', status: locations !== null ? 'ok' : 'error', detail: locations !== null ? String(locations) : 'CPT not found — is the plugin activated?' });
        results.push({ label: 'Guides (CPT)', status: guides !== null ? 'ok' : 'error', detail: guides !== null ? String(guides) : 'CPT not found — is the plugin activated?' });
        results.push({ label: 'Providers (CPT)', status: 'unconfigured', detail: 'Providers are application-DB entities by design, not WordPress content — see data-ownership note' });
        results.push({ label: 'Media available', status: media !== null ? 'ok' : 'error', detail: media !== null ? String(media) : 'Could not read count' });
        results.push({ label: 'Taxonomies (categories)', status: categories !== null ? 'ok' : 'error', detail: categories !== null ? String(categories) : 'Could not read count' });
      }

      // --- Map ---
      const mapsKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
      results.push({ label: 'Map configuration (frontend key)', status: mapsKey ? 'ok' : 'unconfigured', detail: mapsKey ? 'VITE_GOOGLE_MAPS_API_KEY is set' : 'VITE_GOOGLE_MAPS_API_KEY is not set' });

      // --- Backend-only checks (geocoding, email) — can't be read
      // from the browser directly, hence the API call. ---
      try {
        const res = await fetch(`${API_URL}/admin/diagnostics`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          results.push({ label: 'Geocoding configuration (backend)', status: data.geocoding.configured ? 'ok' : 'unconfigured', detail: data.geocoding.configured ? 'GOOGLE_MAPS_API_KEY is set' : 'GOOGLE_MAPS_API_KEY is not set on the API server' });
          results.push({ label: 'Email/SMTP configuration', status: data.email.configured ? 'ok' : 'unconfigured', detail: data.email.configured ? 'SMTP fully configured' : 'One or more SMTP_* env vars missing' });
        } else {
          const err = await res.json().catch(() => ({}));
          throw new ApiError(err.error ?? 'Request failed', res.status);
        }
      } catch (err) {
        results.push({ label: 'Backend diagnostics endpoint', status: 'error', detail: err instanceof ApiError ? err.message : 'Could not reach the API' });
      }

      setChecks(results);
      setLoading(false);
    }
    run();
  }, []);

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Content &amp; Integration Diagnostics</h1>
      </div>
      {loading ? (
        <p>Running checks…</p>
      ) : (
        <div className="admin-providers-table">
          <div className="admin-providers-row admin-providers-row-head" style={{ gridTemplateColumns: '1.4fr 2fr 0.8fr' }}>
            <span>Check</span><span>Detail</span><span>Status</span>
          </div>
          {checks.map((c, i) => (
            <div key={i} className="admin-providers-row" style={{ gridTemplateColumns: '1.4fr 2fr 0.8fr' }}>
              <span>{c.label}</span>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted, #5A6B84)' }}>{c.detail}</span>
              <span><StatusBadge status={c.status} /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
