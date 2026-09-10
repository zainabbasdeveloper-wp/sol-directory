import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getLocation, type WPLocation } from '../../api/wordpressApi';
import { listProviders, type ProviderRow } from '../../api/providerResources';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';

/**
 * Location content (editorial text, from WordPress) plus REAL
 * providers in that area (from the actual Provider API) — the
 * WordPress content and the application data side by side, per the
 * data-ownership split: WordPress never pretends to know which
 * providers actually operate somewhere, since providers are
 * application-DB entities, not WordPress content.
 */
export default function WordPressLocationPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [content, setContent] = useState<WPLocation | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getLocation(slug)
      .then((loc) => {
        if (!loc) { setNotFound(true); return; }
        setContent(loc);
        // Match providers by title (e.g. "Sydney") — a real provider
        // query, not fabricated results. Best-effort: if this fails,
        // the location content itself still renders.
        return listProviders({ suburb: loc.title }).then((res) => setProviders(res.items)).catch(() => {});
      })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && !error && notFound) return <NotFound />;

  return (
    <WordPressTemplate loading={loading} error={error} content={content}>
      {!loading && providers.length > 0 && (
        <div style={{ margin: '0 0 28px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Providers in this area</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {providers.slice(0, 6).map((p) => (
              <Link
                key={p.id}
                to="/find-providers"
                style={{ display: 'block', padding: 14, border: '1px solid var(--color-border, #E8EEF7)', borderRadius: 10, fontSize: 14 }}
              >
                {p.tradingName || p.legalEntityName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </WordPressTemplate>
  );
}
