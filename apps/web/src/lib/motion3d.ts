/**
 * Small, dependency-free motion helpers for the public pages.
 *
 *  - `[data-reveal]`  rises into place the first time it scrolls into view (`--rv` staggers neighbours).
 *  - `[data-tilt="6"]` leans towards the mouse, up to that many degrees (mouse only, never touch).
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

  // ---- tilt towards the pointer -------------------------------------------
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let current: { el: HTMLElement; rect: DOMRect; max: number } | null = null;
    let frame = 0;
    let px = 0;
    let py = 0;

    const release = () => {
      if (!current) return;
      current.el.classList.remove('is-tilting');
      current = null;
    };
    const paint = () => {
      frame = 0;
      if (!current) return;
      const { el, rect, max } = current;
      const x = Math.min(1, Math.max(0, (px - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (py - rect.top) / rect.height));
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      // The box is measured once on entry and kept, so the edge does not flicker while the element leans.
      if (current) {
        const r = current.rect;
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) release();
      }
      if (!current) {
        const el = (e.target as Element | null)?.closest?.('[data-tilt]') as HTMLElement | null;
        if (!el) return;
        current = { el, rect: el.getBoundingClientRect(), max: Number(el.dataset.tilt) || 6 };
        el.classList.add('is-tilting');
      }
      px = e.clientX;
      py = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeaveWindow = (e: MouseEvent) => { if (!e.relatedTarget) release(); };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseout', onLeaveWindow);
    window.addEventListener('scroll', release, { passive: true });
    cleanups.push(() => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onLeaveWindow);
      window.removeEventListener('scroll', release);
      if (frame) cancelAnimationFrame(frame);
      release();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
