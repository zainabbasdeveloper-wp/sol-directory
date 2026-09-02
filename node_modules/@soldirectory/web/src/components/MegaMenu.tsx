import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEGA_CATS, MEGA } from '../data/megaMenu';
import { slugify } from '../data/slugHelpers';
import './MegaMenu.css';

export default function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('service');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideDelayed() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleLinkClick(label: string) {
    setOpen(false);
    // Every mega menu entry — service, condition, funding, coordinator
    // or language — opens the same rich template page, themed around
    // whatever was clicked. Default suburb is Sydney since the menu
    // itself carries no location context; the real example (Nursing →
    // Bankstown) still gets its exact populated content, see
    // ServiceLocationPage.tsx.
    const suburb = label === 'Nursing' ? 'bankstown' : 'sydney';
    navigate(`/services/${slugify(label)}/${suburb}`);
  }

  const columns = MEGA[tab] ?? [];

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
              {MEGA_CATS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  aria-selected={tab === c.key}
                  className={`mega-rail-item ${tab === c.key ? 'mega-rail-item-active' : ''}`}
                  onMouseEnter={() => setTab(c.key)}
                  onClick={() => setTab(c.key)}
                >
                  <span className="mega-rail-text">
                    <span className="mega-rail-title">{c.title}</span>
                    <span className="mega-rail-desc">{c.desc}</span>
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
                {columns.map((col, ci) => (
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
                              onClick={(e) => {
                                e.preventDefault();
                                handleLinkClick(label);
                              }}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
