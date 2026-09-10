import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGuide, type WPGuide } from '../../api/wordpressApi';
import WordPressTemplate from '../../components/wordpress/WordPressTemplate';
import NotFound from './NotFound';

export default function WordPressGuidePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [content, setContent] = useState<WPGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getGuide(slug)
      .then((g) => { if (!g) setNotFound(true); else setContent(g); })
      .catch(() => setError('Unable to reach the content service.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!loading && !error && notFound) return <NotFound />;
  return <WordPressTemplate loading={loading} error={error} content={content} />;
}
