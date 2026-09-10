import { useEffect } from 'react';
import type { WPContentBase } from '../../api/wordpressApi';
import './WordPressTemplate.css';

interface Props {
  loading: boolean;
  error: string;
  content: WPContentBase | null;
  /** Extra content rendered above the main body — e.g. LocationTemplate's provider list, ServiceTemplate's related services. */
  children?: React.ReactNode;
}

/**
 * One shared template for every WordPress content type (Page,
 * Service, Location, Guide) — per item 18's explicit instruction not
 * to build near-identical components per content type. Each content
 * type's page component is a thin wrapper: fetch its own data, pass
 * it here.
 */
export default function WordPressTemplate({ loading, error, content, children }: Props) {
  // SEO (item 20) — updates document head directly since this app
  // has no SSR/meta-framework (plain Vite SPA) to hook a <Head>
  // component into. This only affects the current tab's title/meta,
  // not what search-engine crawlers see pre-render — real SEO for
  // dynamic content in a client-rendered SPA needs prerendering or
  // SSR, which this project doesn't have. Stated honestly rather
  // than pretending this is complete SEO.
  useEffect(() => {
    if (!content) return;
    document.title = content.seo.title || content.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', content.seo.description);
  }, [content]);

  if (loading) {
    return (
      <div className="wp-template-page">
        <div className="wp-skel-title" />
        <div className="wp-skel-image" />
        <div className="wp-skel-line" />
        <div className="wp-skel-line" style={{ width: '80%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="wp-template-page wp-template-error">
        <p>Unable to load this page.</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted, #5A6B84)' }}>{error}</p>
      </div>
    );
  }

  if (!content) return null; // caller renders NotFound instead

  return (
    <div className="wp-template-page">
      {content.featuredImage ? (
        <img
          src={content.featuredImage.url}
          alt={content.featuredImage.alt}
          className="wp-template-hero-image"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : null}
      <h1 className="wp-template-title">{content.title}</h1>
      {children}
      {/*
        WordPress's own save-time sanitization (wp_kses for non-admin
        roles) is the trust boundary here, same as any normal
        WordPress theme rendering the_content(). If editors with
        unfiltered_html capability (admins, by default) author this
        content, that's the same trust level as any WP site. For a
        public-facing app where content-injection risk needs a
        second layer regardless of author trust, add DOMPurify here
        — not included by default to avoid adding a dependency this
        round without discussing it first.
      */}
      <div className="wp-template-content" dangerouslySetInnerHTML={{ __html: content.contentHtml }} />
    </div>
  );
}
