import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../../pages/public/PublicLayout';
import { useMatchModal } from '../../context/MatchModalContext';
import '../../pages/wordpress/WordPressCPTPage.css';

export interface TopicCrumb { label: string; to?: string }
export interface TopicTocItem { id: string; label: string }

interface Props {
  crumbs: TopicCrumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  /** Hero background photo (a /images/… path). */
  image?: string;
  ctaLabel?: string;
  toc: TopicTocItem[];
  children: ReactNode;
}

/**
 * The shared page frame for every content page that isn't a WordPress
 * service page — condition and funding topics today. It renders the same
 * hero banner, left "On this page" sidebar and content column as a
 * service page (WordPressCPTPage) by reusing its stylesheet, so the page
 * types look like one product instead of three.
 */
export default function TopicLayout({ crumbs, eyebrow, title, description, image = '/images/providers.jpg', ctaLabel, toc, children }: Props) {
  const { openMatchModal } = useMatchModal();

  return (
    <>
      <PublicHeader />
      <div className="wp-cpt-body">
        <aside className="wp-cpt-toc">
          <p className="wp-cpt-toc-title">On this page</p>
          <div className="wp-cpt-toc-list">
            {toc.map((t) => <a key={t.id} href={`#${t.id}`} className="wp-cpt-toc-link">{t.label}</a>)}
          </div>
        </aside>

        <main className="wp-cpt-main">
          <section className="wp-cpt-hero" aria-labelledby="topic-hero-title">
            <div className="wp-cpt-hero-photo" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
            <div className="wp-cpt-hero-overlay" aria-hidden="true" />
            <div className="wp-cpt-hero-grid wp-cpt-hero-grid-single">
              <div className="wp-cpt-hero-copy">
                <nav className="wp-cpt-breadcrumb wp-cpt-breadcrumb-hero" aria-label="Breadcrumb">
                  {crumbs.map((c, i) => (
                    <span key={`${c.label}-${i}`}>
                      {i > 0 && <span aria-hidden="true"> / </span>}
                      {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                    </span>
                  ))}
                </nav>
                {eyebrow && <p className="wp-cpt-hero-eyebrow"><span className="wp-cpt-hero-rule" />{eyebrow}</p>}
                <h1 id="topic-hero-title" className="wp-cpt-hero-title">{title}</h1>
                {description && <p className="wp-cpt-hero-excerpt">{description}</p>}
                <button type="button" className="btn-gradient wp-cpt-hero-cta" onClick={() => openMatchModal()}>
                  {ctaLabel ?? 'Get matched, free →'}
                </button>
              </div>
            </div>
          </section>

          {children}
        </main>
      </div>
      <PublicFooter />
    </>
  );
}

/** First sentence(s) of a long summary, cut at a sentence end so a hero never shows a half sentence. */
export function heroExcerpt(text: string, max = 270): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.’ '));
  return lastStop > 80 ? slice.slice(0, lastStop + 1) : `${slice.replace(/\s+\S*$/, '')}…`;
}
