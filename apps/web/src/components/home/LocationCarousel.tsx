import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import manifest from '../../data/bannerManifest.json';
import { STATE_INFO } from '../../data/locationInfo';
import { STATES } from '../../lib/registerMeta';
import './LocationCarousel.css';

interface Slide {
  key: string;
  code: string;
  name: string;
  capital: string;
  slug: string;
  src: string;
}

const AUTOPLAY_MS = 5600;
/** How many cards either side of the centre are drawn in 3D; the rest wait out of sight. */
const REACH = 2;

const variants = (manifest as { variants?: Record<string, number> }).variants ?? {};

/** Every state skyline we have, interleaved so neighbouring cards are always different places. */
function buildSlides(): Slide[] {
  const perState = STATE_INFO.map((info) => {
    const meta = STATES.find((s) => s.code === info.code)!;
    const id = `locations-${info.code.toLowerCase()}`;
    const count = Math.max(1, variants[id] ?? 1);
    return Array.from({ length: count }, (_, i): Slide => ({
      key: `${info.code}-${i + 1}`,
      code: info.code,
      name: meta.name,
      capital: info.capital,
      slug: meta.slug,
      src: `/images/banners/${id}${i === 0 ? '' : `-${i + 1}`}.jpg`,
    }));
  });
  const out: Slide[] = [];
  const longest = Math.max(...perState.map((p) => p.length));
  for (let i = 0; i < longest; i++) for (const list of perState) if (list[i]) out.push(list[i]);
  return out;
}

/** Shortest signed distance around the loop, so the carousel wraps without a long swing back. */
function offsetOf(index: number, active: number, total: number): number {
  let d = index - active;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

export default function LocationCarousel({ counts }: { counts: Record<string, number> }) {
  const slides = useMemo(buildSlides, []);
  const total = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; id: number } | null>(null);

  const go = useCallback((delta: number) => setActive((i) => (i + delta + total) % total), [total]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Plays only while on screen, with the tab visible and nobody hovering or focused inside.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    const id = setInterval(() => { if (!document.hidden) go(1); }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [reduced, paused, inView, go]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }
  function onPointerDown(e: React.PointerEvent) { drag.current = { x: e.clientX, id: e.pointerId }; }
  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.x;
    drag.current = null;
    if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
  }

  const current = slides[active];
  const stateCodes = STATE_INFO.map((s) => s.code);

  return (
    <section className="lc" aria-labelledby="lc-heading">
      <div className="lc-bg" aria-hidden="true" />
      <div className="lc-inner">
        <header className="lc-head">
          <span className="eyebrow"><span className="eyebrow-rule" />Around Australia</span>
          <h2 id="lc-heading" className="section-heading">Find support in every state and territory</h2>
          <p className="lc-sub">
            From the capital cities to regional centres, explore providers listed on the public NDIS and aged care registers, state by state.
          </p>
        </header>
      </div>

      <div
        ref={stageRef}
        className="lc-stage"
        role="region"
        aria-roledescription="carousel"
        aria-label="Australian states and territories"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
      >
        <ul className="lc-track">
          {slides.map((s, i) => {
            const d = offsetOf(i, active, total);
            const abs = Math.abs(d);
            const isActive = d === 0;
            const count = counts[s.code];
            return (
              <li
                key={s.key}
                className={`lc-slide${isActive ? ' is-active' : ''}${abs <= REACH ? '' : ' is-far'}`}
                style={{ '--d': d, '--abs': abs, zIndex: 100 - abs } as React.CSSProperties}
                aria-hidden={!isActive}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${total}: ${s.name}`}
              >
                <div className="lc-card">
                  <span className="lc-img-wrap">
                    {/* Pictures far from the centre are not even requested until they come near. */}
                    <img className="lc-img" src={abs <= REACH + 1 ? s.src : undefined} alt="" draggable={false} decoding="async" />
                  </span>
                  <span className="lc-shade" aria-hidden="true" />
                  <span className="lc-tag">{s.code}</span>

                  <div className="lc-overlay">
                    <span className="lc-overlay-eyebrow">Capital: {s.capital}</span>
                    <h3>{s.name}</h3>
                    {count ? <p>{count.toLocaleString('en-AU')} NDIS register listings</p> : null}
                    <Link className="lc-cta" to={`/ndis-providers/${s.slug}`} tabIndex={isActive ? 0 : -1}>
                      Browse {s.name} providers <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  {!isActive && (
                    <button type="button" className="lc-hit" tabIndex={-1} onClick={() => setActive(i)} aria-label={`Show ${s.name}`} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button type="button" className="lc-arrow lc-arrow-prev" onClick={() => go(-1)} aria-label="Previous place">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <button type="button" className="lc-arrow lc-arrow-next" onClick={() => go(1)} aria-label="Next place">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>

      <div className="lc-inner">
        <div className="lc-dots" role="group" aria-label="Choose a state or territory">
          {stateCodes.map((code) => {
            const idx = slides.findIndex((s) => s.code === code);
            const on = current.code === code;
            return (
              <button key={code} type="button" className={`lc-dot${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={STATES.find((s) => s.code === code)?.name} onClick={() => setActive(idx)}>
                <span>{code}</span>
              </button>
            );
          })}
        </div>
        <p className="lc-hint" aria-live="polite">{current.name} · picture {active + 1} of {total}</p>
      </div>
    </section>
  );
}
