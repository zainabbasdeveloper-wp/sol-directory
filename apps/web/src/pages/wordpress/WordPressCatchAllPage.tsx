import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getWordPressPage, type WPContentBase } from '../../api/wordpressApi';
import { isReservedPath } from '../../lib/reservedRoutes';
import { PublicHeader, PublicFooter } from '../public/PublicLayout';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';

export default function WordPressCatchAllPage() {
  const location = useLocation();
  const [content, setContent] = useState<WPContentBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isReservedPath(location.pathname)) {
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

  if (!loading && !error && notFound) {
    return (<><PublicHeader /><NotFound /><PublicFooter /></>);
  }

  return (
    <>
      <PublicHeader />
      <WordPressTemplate loading={loading} error={error} content={content} />
      <PublicFooter />
    </>
  );
}
