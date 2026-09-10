import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getWordPressPage, type WPContentBase } from '../../api/wordpressApi';
import { isReservedPath } from '../../lib/reservedRoutes';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';

/**
 * The actual catch-all (item 3/5): any path that didn't match a
 * real application route AND isn't reserved gets treated as a
 * potential WordPress Page slug. This is what makes
 * "create a WordPress page, it just works at /that-slug" true
 * without any React code changes per page.
 */
export default function WordPressCatchAllPage() {
  const location = useLocation();
  const [content, setContent] = useState<WPContentBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isReservedPath(location.pathname)) {
      // Should be unreachable in practice — React Router's own route
      // declarations already take priority over this catch-all — but
      // this is the explicit defense-in-depth check item 25 asked for.
      setNotFound(true);
      setLoading(false);
      return;
    }

    const slug = location.pathname.replace(/^\/+|\/+$/g, '');
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);
    getWordPressPage(slug)
      .then((page) => {
        if (!page) setNotFound(true);
        else setContent(page);
      })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [location.pathname]);

  if (!loading && !error && notFound) return <NotFound />;

  return <WordPressTemplate loading={loading} error={error} content={content} />;
}
