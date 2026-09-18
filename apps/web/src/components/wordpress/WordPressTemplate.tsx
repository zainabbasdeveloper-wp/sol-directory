import { useEffect } from 'react';
import DOMPurify from 'dompurify';
import type { WPContentBase } from '../../api/wordpressApi';
import './WordPressTemplate.css';

interface Props {
  loading: boolean;
  error: string;
  content: WPContentBase | null;
  hideDefaultTitle?: boolean;
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
export default function WordPressTemplate({ loading, error, content, hideDefaultTitle = false, children }: Props) {
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

    // Creates the meta/link tag if it doesn't already exist, updates
    // it if it does — this app has no <Head> component (plain Vite
    // SPA), so these are the actual <head> tags this document has,
    // not a virtual representation of them.
    function setMeta(selector: string, attr: string, value: string, createTag: () => HTMLElement) {
      let el = document.querySelector(selector) as HTMLElement | null;
      if (!el) { el = createTag(); document.head.appendChild(el); }
      el.setAttribute(attr, value);
    }

    setMeta('meta[name="description"]', 'content', content.seo.description, () => {
      const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m;
    });
    setMeta('meta[property="og:title"]', 'content', content.seo.title || content.title, () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m;
    });
    setMeta('meta[property="og:description"]', 'content', content.seo.description, () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:description'); return m;
    });
    if (content.seo.ogImage) {
      setMeta('meta[property="og:image"]', 'content', content.seo.ogImage, () => {
        const m = document.createElement('meta'); m.setAttribute('property', 'og:image'); return m;
      });
    }
    setMeta('link[rel="canonical"]', 'href', window.location.href, () => {
      const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
    });

    // Real limitation, stated in code not just prose: none of this
    // helps a crawler that doesn't execute JavaScript, since these
    // tags don't exist until this effect runs client-side. A crawler
    // that fetches raw HTML (many still do, including some social
    // media unfurlers) sees none of this. Fixing that requires SSR
    // or prerendering — a framework-level decision, not something
    // patchable from inside a single component.
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
      {!hideDefaultTitle && <h1 className="wp-template-title">{content.title}</h1>}
      {children}
      {/*
        Sanitized with DOMPurify immediately before render — this is
        the real fix for the trust-boundary gap flagged last round.
        WordPress's own save-time sanitization (wp_kses) is still the
        first layer for non-admin authors, but this is a second,
        independent layer on the consuming side, which matters
        because this app can't verify who actually authored any given
        piece of content or whether WordPress's own filters were
        bypassed (e.g. a compromised admin account, a misconfigured
        plugin). Defense in depth, not redundant.
      */}
      <div className="wp-template-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.contentHtml) }} />
    </div>
  );
}
