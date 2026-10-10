import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A reload opens the page at the top, not wherever it was scrolled to. Back/forward still restore their position.
// (A link with a #section keeps going to that section.)
try {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav?.type === 'reload' && !window.location.hash && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    // Hand restoration back once the page has settled, so later back/forward navigation behaves normally.
    window.addEventListener('load', () => {
      window.scrollTo(0, 0);
      window.setTimeout(() => { window.history.scrollRestoration = 'auto'; }, 1500);
    }, { once: true });
  }
} catch {
  /* scroll restoration control is optional */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
