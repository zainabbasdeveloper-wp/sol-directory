import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PhotoSlot from '../PhotoSlot';
import './PageHero.css';

export interface HeroCrumb { label: string; to?: string }

export interface HeroPanel {
  title: string;
  checks: string[];
  ctaLabel: string;
  onCta: () => void;
  note?: string;
}

interface Props {
  crumbs?: HeroCrumb[];
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  /** Extra line(s) under the description, e.g. a provider count. */
  stats?: ReactNode;
  /** A /images/… path. */
  image: string;
  imageAlt?: string;
  /** The white call-to-action card on the right. */
  panel?: HeroPanel;
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8.3 12.2 2.5 2.5 4.9-5" />
    </svg>
  );
}

/**
 * The full-width banner every content page opens with: a photo card across the
 * whole page, copy on the left, a white call-to-action card on the right.
 * Used by service, location, condition, funding and service-in-suburb pages so
 * they look like one site — the sidebar and content sit BELOW it, not beside it.
 */
export default function PageHero({ crumbs, eyebrow, title, description, stats, image, imageAlt = '', panel }: Props) {
  return (
    <section className="svc-hero-section">
      <div className="svc-hero-card">
        <div className="svc-hero-photo">
          <PhotoSlot src={image} alt={imageAlt} variant="care" />
        </div>
        <div className="svc-hero-overlay" />
        <div className={`svc-hero-grid${panel ? '' : ' svc-hero-grid--single'}`}>
          <div className="svc-hero-copy">
            {crumbs && crumbs.length > 0 && (
              <nav className="svc-hero-crumbs" aria-label="Breadcrumb">
                {crumbs.map((c, i) => (
                  <span key={`${c.label}-${i}`}>
                    {i > 0 && <span aria-hidden="true"> / </span>}
                    {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
                  </span>
                ))}
              </nav>
            )}
            {eyebrow && (
              <span className="svc-hero-eyebrow">
                <span className="svc-hero-eyebrow-rule" />
                {eyebrow}
              </span>
            )}
            <h1 className="svc-hero-heading">{title}</h1>
            {description && <p className="svc-hero-sub">{description}</p>}
            {stats && <div className="svc-hero-stats">{stats}</div>}
          </div>

          {panel && (
            <div className="svc-hero-panel">
              <h2 className="svc-hero-panel-title">{panel.title}</h2>
              {panel.checks.length > 0 && (
                <div className="svc-hero-checks">
                  {panel.checks.map((c) => (
                    <span key={c} className="svc-hero-check">
                      <CheckCircleIcon /> {c}
                    </span>
                  ))}
                </div>
              )}
              <button type="button" className="btn-gradient svc-hero-search-btn" onClick={panel.onCta}>
                {panel.ctaLabel}
              </button>
              {panel.note && <p className="svc-hero-panel-note">{panel.note}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** The default call-to-action card for pages that don't set their own. */
export const DEFAULT_PANEL_CHECKS = ['Free, no obligation', 'One request, providers respond', 'Public-register providers across Australia'];
