import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONSENT_OPEN_EVENT, setConsent, useConsent } from '../lib/consent';
import './CookieConsent.css';

/**
 * The first-visit privacy notice. A card in the corner (never a wall over the page): short wording, two clear buttons,
 * and a "customise" panel. It reappears from the footer's "Cookie settings" link, and the form shows a note when saving
 * progress is switched off.
 */
export default function CookieConsent() {
  const consent = useConsent();
  const [forcedOpen, setForcedOpen] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [saveProgress, setSaveProgress] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const visible = consent === null || forcedOpen;

  useEffect(() => {
    const open = () => { setSaveProgress(!!consent?.saveProgress); setCustomise(true); setForcedOpen(true); };
    window.addEventListener(CONSENT_OPEN_EVENT, open);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, open);
  }, [consent]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && forcedOpen) setForcedOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, forcedOpen]);

  useEffect(() => { if (forcedOpen) cardRef.current?.focus(); }, [forcedOpen]);

  if (!visible) return null;

  function choose(save: boolean) {
    setConsent({ saveProgress: save });
    setForcedOpen(false);
    setCustomise(false);
  }

  return (
    <div className="cc" role="dialog" aria-modal="false" aria-labelledby="cc-title" aria-describedby="cc-text" ref={cardRef} tabIndex={-1}>
      <div className="cc-head">
        <span className="cc-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-4-4 1 1 0 0 0-1-1Z" /><circle cx="9" cy="11" r="1" fill="currentColor" /><circle cx="14" cy="15" r="1" fill="currentColor" /><circle cx="8.5" cy="15.5" r=".8" fill="currentColor" /></svg>
        </span>
        <h2 id="cc-title">Your privacy, your choice</h2>
        {forcedOpen && <button type="button" className="cc-x" aria-label="Close" onClick={() => setForcedOpen(false)}>✕</button>}
      </div>

      <p id="cc-text" className="cc-text">
        We use a small amount of your browser’s storage to keep you signed in and, if you let us, to remember where you got to in a
        request so you can finish it later. We do not use advertising cookies.{' '}
        <Link to="/privacy">Read our privacy policy</Link>.
      </p>

      {customise && (
        <div className="cc-options">
          <div className="cc-option">
            <div>
              <strong>Essential</strong>
              <span>Keeps you signed in, remembers this choice and protects forms. Always on.</span>
            </div>
            <span className="cc-always">Always on</span>
          </div>
          <label className="cc-option cc-option-toggle">
            <div>
              <strong>Saved progress</strong>
              <span>
                Remembers your answers in the “Get matched” form on this device, and keeps an unfinished request on our server for up
                to 30 days, so you can pick it up again. Switch off and nothing is saved until you press send.
              </span>
            </div>
            <input type="checkbox" role="switch" checked={saveProgress} onChange={(e) => setSaveProgress(e.target.checked)} aria-label="Saved progress" />
            <span className="cc-switch" aria-hidden="true" />
          </label>
          <p className="cc-fine">Maps: when you open a map, your browser loads map tiles from Mapbox.</p>
        </div>
      )}

      <div className="cc-actions">
        {customise ? (
          <>
            <button type="button" className="cc-btn cc-btn-primary" onClick={() => choose(saveProgress)}>Save my choices</button>
            <button type="button" className="cc-btn" onClick={() => { setCustomise(false); }}>Back</button>
          </>
        ) : (
          <>
            <button type="button" className="cc-btn cc-btn-primary" onClick={() => choose(true)}>Accept all</button>
            <button type="button" className="cc-btn" onClick={() => choose(false)}>Essential only</button>
            <button type="button" className="cc-link" onClick={() => { setSaveProgress(!!consent?.saveProgress); setCustomise(true); }}>Customise</button>
          </>
        )}
      </div>
    </div>
  );
}
