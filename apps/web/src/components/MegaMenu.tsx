import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEGA_CATS, MEGA } from '../data/megaMenu';
import { slugify } from '../data/slugHelpers';
import { getMegaMenuTabs, type MegaMenuTab } from '../api/wordpressApi';
import { useMatchModal } from '../context/MatchModalContext';
import { decodeHtmlEntities } from '../lib/decodeHtmlEntities';
import './MegaMenu.css';

/**
 * Real, dedicated WordPress-managed mega menu (replaces the earlier
 * taxonomy-based approach per the explicit architecture request).
 * getMegaMenuTabs() returning null means "couldn't reach WordPress or
 * genuinely has zero tabs configured" — in that case, and ONLY in
 * that case, this falls back to the original static MEGA/MEGA_CATS
 * data, so a CMS outage degrades gracefully instead of breaking the
 * header entirely (per the spec's explicit fallback requirement).
 * Once WordPress data loads successfully, it's the source of truth
 * for both the rail (tabs) and each tab's columns — not just the
 * columns like the previous version.
 */
export default function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('service');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();

  const [wpTabs, setWpTabs] = useState<MegaMenuTab[] | null>(null);

  useEffect(() => {
    getMegaMenuTabs()
      .then((tabs) => {
        if (tabs && tabs.length > 0) {
          setWpTabs(tabs);
          setTab(tabs[0].key);
        }
        // tabs === null or [] -> stay on static fallback, which is
        // already the initial state (wpTabs starts null).
      })
      .catch(() => {}); // network failure -> stays on static fallback
  }, []);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideDelayed() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  // Real admin-controlled URL, opened exactly as configured — no
  // more guessing a destination from the link's label text.
  function handleRealLinkClick(url: string | undefined, openInNewTab: boolean | undefined) {
    setOpen(false);
    if (!url) return;
    if (openInNewTab) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    if (/^https?:\/\//.test(url)) { window.location.href = url; return; }
    navigate(url);
  }

  function handleStaticLinkClick(label: string) {
    setOpen(false);
    const suburb = label === 'Nursing' ? 'bankstown' : 'sydney';
    navigate(`/services/${slugify(label)}/${suburb}`);
  }

  function handleCtaClick(cta: MegaMenuTab['cta']) {
    setOpen(false);
    if (!cta) return;
    if (cta.action === 'get_matched' || cta.action === 'find_providers') { openMatchModal(); return; }
    if (cta.url) navigate(cta.url);
  }

  const usingWordPress = wpTabs !== null;
  const rail = usingWordPress
    ? wpTabs.map((t) => ({ key: t.key, title: t.label, desc: t.description ?? '' }))
    : MEGA_CATS;

  const activeWpTab = usingWordPress ? wpTabs.find((t) => t.key === tab) : undefined;
  const columns = usingWordPress ? (activeWpTab?.columns ?? []) : (MEGA[tab] ?? []);

  return (
    <div className="mega-root" onMouseEnter={show} onMouseLeave={hideDelayed}>
      <button
        type="button"
        className="mega-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Services
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 240ms cubic-bezier(.2,.8,.25,1)' }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mega-panel-wrap">
          <div className="mega-panel" role="navigation" aria-label="Services navigation">
            <div className="mega-rail">
              <p className="mega-rail-heading">What are you looking for?</p>
              {rail.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-selected={tab === c.key}
                  className={`mega-rail-item ${tab === c.key ? 'mega-rail-item-active' : ''}`}
                  onMouseEnter={() => setTab(c.key)}
                  onClick={() => setTab(c.key)}
                >
                  <span className="mega-rail-text">
                    <span className="mega-rail-title">{decodeHtmlEntities(c.title)}</span>
                    <span className="mega-rail-desc">{decodeHtmlEntities(c.desc)}</span>
                  </span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mega-rail-arrow">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="mega-columns-wrap">
              <div className="mega-columns" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
                {usingWordPress
                  ? (columns as { title: string; links: any[] }[]).map((col, ci) => (
                      <div key={ci} className="mega-column">
                        <div className="mega-group">
                          <h3 className="mega-group-title">{decodeHtmlEntities(col.title)}</h3>
                          <div className="mega-group-rule" />
                          <div className="mega-group-links">
                            {col.links.map((link) => (
                              <a
                                key={link.label}
                                href={link.url || '#'}
                                className="mega-link"
                                onClick={(e) => { e.preventDefault(); handleRealLinkClick(link.url, link.open_in_new_tab); }}
                                title={link.description || undefined}
                              >
                                {decodeHtmlEntities(link.label)}
                                {link.badge && <span className="mega-link-badge">{decodeHtmlEntities(link.badge)}</span>}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  : (columns as { title: string; links: string[] }[][]).map((col, ci) => (
                      <div key={ci} className="mega-column">
                        {col.map((g) => (
                          <div key={g.title} className="mega-group">
                            <h3 className="mega-group-title">{g.title}</h3>
                            <div className="mega-group-rule" />
                            <div className="mega-group-links">
                              {g.links.map((label) => (
                                <a
                                  key={label}
                                  href="#directory"
                                  className="mega-link"
                                  onClick={(e) => { e.preventDefault(); handleStaticLinkClick(label); }}
                                >
                                  {label}
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
              </div>

              {usingWordPress && activeWpTab?.cta?.label && (
                <div className="mega-tab-cta">
                  <button className="btn-gradient" onClick={() => handleCtaClick(activeWpTab.cta)}>
                    {decodeHtmlEntities(activeWpTab.cta.label)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
