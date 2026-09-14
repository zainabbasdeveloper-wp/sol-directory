import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEGA_CATS, MEGA, type MegaColumn } from '../data/megaMenu';
import { slugify } from '../data/slugHelpers';
import { getServiceMegaColumnsFromPosts, getMegaColumnsForTaxonomy, type MegaGroupWithSlugs } from '../api/wordpressApi';
import { decodeHtmlEntities } from '../lib/decodeHtmlEntities';
import './MegaMenu.css';

const TAB_TAXONOMY: Record<string, string> = {
  condition: 'condition-categories',
  funding: 'funding-categories',
  coordinator: 'coordinator-categories',
  language: 'language-categories',
};

export default function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('service');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  // Service tab is real 'service' posts grouped by category (with
  // real slugs for routing) — structurally different from the other
  // 4 tabs, which are genuine two-level term hierarchies. Kept
  // separate rather than forced into one shape.
  const [wpServiceColumns, setWpServiceColumns] = useState<MegaGroupWithSlugs[][] | null>(null);
  const [wpColumns, setWpColumns] = useState<Record<string, MegaColumn[]>>({});

  useEffect(() => {
    getServiceMegaColumnsFromPosts(4)
      .then((cols) => { if (cols.length > 0) setWpServiceColumns(cols); })
      .catch(() => {});
    Object.entries(TAB_TAXONOMY).forEach(([tabKey, restBase]) => {
      getMegaColumnsForTaxonomy(restBase, 4)
        .then((cols) => { if (cols.length > 0) setWpColumns((prev) => ({ ...prev, [tabKey]: cols })); })
        .catch(() => {});
    });
  }, []);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideDelayed() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleServiceLinkClick(slug: string) {
    setOpen(false);
    navigate(`/services/${slug}`);
  }

  function handleLinkClick(label: string) {
    setOpen(false);
    // Condition/Funding/Coordinator/Language tabs still route to the
    // illustrative combo page — there's no real per-topic destination
    // page for these yet (unlike Service, which now has real
    // WordPress-backed pages at /services/:slug). Wiring these to
    // something real is the next step once those destinations exist.
    const suburb = label === 'Nursing' ? 'bankstown' : 'sydney';
    navigate(`/services/${slugify(label)}/${suburb}`);
  }

  // Normalize both real shapes (service posts with slugs, term-based
  // tabs without) plus the static fallback into one renderable shape.
  type RenderLink = { name: string; slug?: string };
  type RenderGroup = { title: string; links: RenderLink[] };

  let columns: RenderGroup[][];
  if (tab === 'service') {
    columns = wpServiceColumns ?? (MEGA.service ?? []).map((col) => col.map((g) => ({ title: g.title, links: g.links.map((l) => ({ name: l })) })));
  } else {
    const wp = wpColumns[tab];
    columns = (wp ?? (MEGA[tab] ?? [])).map((col) => col.map((g) => ({ title: g.title, links: g.links.map((l) => ({ name: l })) })));
  }

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
                        <h3 className="mega-group-title">{decodeHtmlEntities(g.title)}</h3>
                        <div className="mega-group-rule" />
                        <div className="mega-group-links">
                          {g.links.map((link) => (
                            <a
                              key={link.slug ?? link.name}
                              href="#directory"
                              className="mega-link"
                              onClick={(e) => {
                                e.preventDefault();
                                if (link.slug) handleServiceLinkClick(link.slug);
                                else handleLinkClick(link.name);
                              }}
                            >
                              {decodeHtmlEntities(link.name)}
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
