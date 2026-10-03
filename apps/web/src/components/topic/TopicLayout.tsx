import type { ReactNode } from 'react';
import { PublicHeader, PublicFooter } from '../../pages/public/PublicLayout';
import { useMatchModal } from '../../context/MatchModalContext';
import PageHero, { DEFAULT_PANEL_CHECKS, type HeroCrumb } from './PageHero';
import '../../pages/wordpress/WordPressCPTPage.css';

export type TopicCrumb = HeroCrumb;
export interface TopicTocItem { id: string; label: string }

interface Props {
  crumbs: TopicCrumb[];
  eyebrow?: string;
  title: string;
  description?: string;
  /** Hero background photo (a /images/… path). */
  image?: string;
  /** Heading of the white call-to-action card in the banner. */
  panelTitle?: string;
  toc: TopicTocItem[];
  children: ReactNode;
}

/**
 * The shared page frame for content pages that aren't WordPress service pages
 * (conditions and funding topics): the full-width PageHero banner across the
 * top, then the "On this page" sidebar and content column beneath it — the same
 * structure as a service page (WordPressCPTPage) and a service-in-suburb page.
 */
export default function TopicLayout({ crumbs, eyebrow, title, description, image = '/images/providers.jpg', panelTitle = 'Find the right support', toc, children }: Props) {
  const { openMatchModal } = useMatchModal();

  return (
    <>
      <PublicHeader />
      <PageHero
        crumbs={crumbs}
        eyebrow={eyebrow}
        title={title}
        description={description}
        image={image}
        panel={{
          title: panelTitle,
          checks: DEFAULT_PANEL_CHECKS,
          ctaLabel: 'Get matched, free →',
          onCta: () => openMatchModal(),
          note: 'One minute to send, and it costs nothing.',
        }}
      />
      <div className="svc-body">
        <aside className="svc-toc">
          <p className="svc-toc-title">On this page</p>
          <div className="svc-toc-list">
            {toc.map((t) => <a key={t.id} href={`#${t.id}`} className="svc-toc-link">{t.label}</a>)}
          </div>
        </aside>

        <main className="svc-main wp-cpt-main">{children}</main>
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
