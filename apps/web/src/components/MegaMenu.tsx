import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMegaMenuTabs, type MegaMenuTab } from '../api/wordpressApi';
import { STATIC_MEGA_MENU_FALLBACK } from '../data/staticMegaMenuFallback';
import { useMatchModal } from '../context/MatchModalContext';
import { decodeHtmlEntities } from '../lib/decodeHtmlEntities';
import './MegaMenu.css';

/**
 * Real, dedicated WordPress-managed mega menu. The static fallback
 * (STATIC_MEGA_MENU_FALLBACK) is deliberately in the EXACT SAME
 * shape as the real /wp-json/soldirectory/v1/mega-menu response —
 * same content, same structure — so there's exactly one rendering
 * path below, not two. A WordPress outage changes WHERE the data
 * comes from, never WHAT the menu shows.
 */
export default function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(STATIC_MEGA_MENU_FALLBACK[0].key);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();

  const [tabs, setTabs] = useState<MegaMenuTab[]>(STATIC_MEGA_MENU_FALLBACK);

  useEffect(() => {
    getMegaMenuTabs()
      .then((wpTabs) => {
        // null (unreachable) or [] (genuinely zero tabs configured)
        // both keep the static fallback already in state — only a
        // real, non-empty response replaces it.
        if (wpTabs && wpTabs.length > 0) {
          setTabs(wpTabs);
          setTab(wpTabs[0].key);
        }
      })
      .catch(() => {});
  }, []);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideDelayed() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleLinkClick(url: string | undefined, openInNewTab: boolean | undefined) {
    setOpen(false);
    if (!url) return;
    if (openInNewTab) { window.open(url, '_blank', 'noopener,noreferrer'); return; }
    if (/^https?:\/\//.test(url)) { window.location.href = url; return; }
    navigate(url);
  }

  function handleCtaClick(cta: MegaMenuTab['cta']) {
    setOpen(false);
    if (!cta) return;
    if (cta.action === 'get_matched' || cta.action === 'find_providers') { openMatchModal(); return; }
    if (cta.url) navigate(cta.url);
  }

  const activeTab = tabs.find((t) => t.key === tab) ?? tabs[0];

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
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-selected={tab === t.key}
                  className={`mega-rail-item ${tab === t.key ? 'mega-rail-item-active' : ''}`}
                  onMouseEnter={() => setTab(t.key)}
                  onClick={() => setTab(t.key)}
                >
                  <span className="mega-rail-text">
                    <span className="mega-rail-title">{decodeHtmlEntities(t.label)}</span>
                    <span className="mega-rail-desc">{decodeHtmlEntities(t.description ?? '')}</span>
                  </span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mega-rail-arrow">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="mega-columns-wrap">
              <div className="mega-columns" style={{ gridTemplateColumns: `repeat(${activeTab.columns.length}, minmax(0, 1fr))` }}>
                {activeTab.columns.map((col, ci) => (
                  <div key={ci} className="mega-column">
                    <div className="mega-group">
                      <h3 className="mega-group-title">{decodeHtmlEntities(col.title)}</h3>
                      <div className="mega-group-rule" />
                      <div className="mega-group-links">
                        {col.links.filter((l) => l.active !== false).map((link) => (
                          <a
                            key={link.label}
                            href={link.url || '#'}
                            className="mega-link"
                            onClick={(e) => { e.preventDefault(); handleLinkClick(link.url, link.open_in_new_tab); }}
                            title={link.description || undefined}
                          >
                            {decodeHtmlEntities(link.label)}
                            {link.badge && <span className="mega-link-badge">{decodeHtmlEntities(link.badge)}</span>}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activeTab.cta?.label && (
                <div className="mega-tab-cta">
                  <button className="btn-gradient" onClick={() => handleCtaClick(activeTab.cta)}>
                    {decodeHtmlEntities(activeTab.cta.label)}
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
