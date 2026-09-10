import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getService, type WPService } from '../../api/wordpressApi';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';

export default function WordPressServicePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [content, setContent] = useState<WPService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getService(slug)
      .then((s) => { if (!s) setNotFound(true); else setContent(s); })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && !error && notFound) return <NotFound />;
  return <WordPressTemplate loading={loading} error={error} content={content} />;
}
