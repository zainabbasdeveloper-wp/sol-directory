import { useEffect, useState } from 'react';
import './SitePreloader.css';

const MINIMUM_VISIBLE_MS = 450;
const MAXIMUM_VISIBLE_MS = 2200;
const EXIT_DURATION_MS = 280;

export default function SitePreloader() {
  const [phase, setPhase] = useState<'visible' | 'leaving' | 'hidden'>('visible');

  useEffect(() => {
    const startedAt = performance.now();
    let exitStarted = false;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;

    const beginExit = () => {
      if (exitStarted) return;
      exitStarted = true;
      const remaining = Math.max(0, MINIMUM_VISIBLE_MS - (performance.now() - startedAt));
      exitTimer = setTimeout(() => {
        setPhase('leaving');
        hiddenTimer = setTimeout(() => setPhase('hidden'), EXIT_DURATION_MS);
      }, remaining);
    };

    if (document.readyState === 'complete') beginExit();
    else window.addEventListener('load', beginExit, { once: true });

    const fallbackTimer = setTimeout(beginExit, MAXIMUM_VISIBLE_MS);
    return () => {
      window.removeEventListener('load', beginExit);
      clearTimeout(fallbackTimer);
      if (exitTimer) clearTimeout(exitTimer);
      if (hiddenTimer) clearTimeout(hiddenTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`site-preloader${phase === 'leaving' ? ' site-preloader--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading SolDirectory"
    >
      <div className="site-preloader__content">
        <img
          className="site-preloader__logo"
          src="/images/sol-directory-logo-black-transparent-v2.png"
          alt=""
          aria-hidden="true"
        />
        <div className="site-preloader__track" aria-hidden="true">
          <span />
        </div>
        <span className="visually-hidden">Loading SolDirectory</span>
      </div>
    </div>
  );
}