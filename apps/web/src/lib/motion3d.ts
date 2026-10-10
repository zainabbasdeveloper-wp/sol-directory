/**
 * Small, dependency-free motion helpers for the public pages.
 *
 *  - `[data-reveal]`   rises into place the first time it scrolls into view (`--rv` staggers neighbours).
 *  - `[data-pointer]`  reports where the mouse is inside it as CSS variables (--mx/--my in %, --px/--py from -1 to 1)
 *                      and carries `.is-lit` while the mouse is over it. Nothing is moved by this script: the
 *                      stylesheet decides what the light, border glow or photograph parallax does with the numbers.
 *
 * Everything is progressive: nothing is hidden until `startMotion()` has armed the page, and the whole thing
 * stays off for people who ask their system for reduced motion. The styling lives in HomeMotion.css.
 */

const ARMED = 'motion-armed';

export function motionAllowed(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function startMotion(): () => void {
  if (!motionAllowed()) return () => {};
  const cleanups: Array<() => void> = [];

  // ---- reveal on scroll ---------------------------------------------------
  if ('IntersectionObserver' in window) {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
    );
    const seen = new WeakSet<Element>();
    const watch = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    };
    const scan = (node: ParentNode) => {
      if (node instanceof Element && node.matches('[data-reveal]')) watch(node);
      node.querySelectorAll('[data-reveal]').forEach(watch);
    };

    root.classList.add(ARMED);
    scan(document);

    // Content that arrives later (lists loaded from the API) is picked up as it is added.
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => { if (n instanceof Element) scan(n); });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    cleanups.push(() => {
      mo.disconnect();
      io.disconnect();
      root.classList.remove(ARMED);
      document.querySelectorAll('[data-reveal].is-in').forEach((el) => el.classList.remove('is-in'));
    });
  }

  // ---- where the mouse is, for lights and photograph parallax ---------------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let current: HTMLElement | null = null;
    let frame = 0;
    let cx = 0;
    let cy = 0;

    const release = () => {
      if (!current) return;
      current.classList.remove('is-lit');
      // Back to the middle, so anything following the mouse eases home.
      current.style.setProperty('--px', '0');
      current.style.setProperty('--py', '0');
      current = null;
    };
    const paint = () => {
      frame = 0;
      if (!current) return;
      const r = current.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = Math.min(1, Math.max(0, (cx - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (cy - r.top) / r.height));
      current.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      current.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      current.style.setProperty('--px', ((x - 0.5) * 2).toFixed(3));
      current.style.setProperty('--py', ((y - 0.5) * 2).toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = (e.target as Element | null)?.closest?.('[data-pointer]') as HTMLElement | null;
      if (el !== current) {
        release();
        if (el) { current = el; el.classList.add('is-lit'); }
      }
      if (!current) return;
      cx = e.clientX;
      cy = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeaveWindow = (e: MouseEvent) => { if (!e.relatedTarget) release(); };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeaveWindow);
    cleanups.push(() => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeaveWindow);
      if (frame) cancelAnimationFrame(frame);
      release();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
