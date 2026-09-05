import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProviderProfile, requestProviderContact, getShortlistStatus,
  addToShortlist, removeFromShortlist, isLoggedIn, type ProviderRow,
} from '../api/providerResources';
import { ApiError } from '../api/client';
import { useToast } from './ui/Toast';
import './ProviderDetailModal.css';

interface Props {
  providerId: string;
  onClose: () => void;
  // Called after a successful add/remove so any list showing this
  // provider (a search results grid, a saved-providers page) can
  // update without a full page reload.
  onShortlistChange?: (providerId: string, shortlisted: boolean) => void;
}

export default function ProviderDetailModal({ providerId, onClose, onShortlistChange }: Props) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shortlisted, setShortlisted] = useState(false);
  const [shortlistBusy, setShortlistBusy] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setError('');
    getProviderProfile(providerId)
      .then(setProvider)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load this provider.'))
      .finally(() => setLoading(false));

    // Shortlist status is always fetched fresh from the server here
    // — there is no client-side cache of it to go stale across
    // logout/login or across different users on the same browser.
    if (isLoggedIn()) {
      getShortlistStatus(providerId).then((r) => setShortlisted(r.shortlisted)).catch(() => {});
    }
  }, [providerId]);

  async function toggleShortlist() {
    if (!isLoggedIn()) { setShowLoginPrompt(true); return; }
    setShortlistBusy(true);
    const prev = shortlisted;
    try {
      if (prev) {
        await removeFromShortlist(providerId);
        setShortlisted(false);
        onShortlistChange?.(providerId, false);
        showToast('Provider removed from your shortlist.');
      } else {
        await addToShortlist(providerId);
        setShortlisted(true);
        onShortlistChange?.(providerId, true);
        showToast('✓ Provider added to your shortlist');
      }
    } catch (err) {
      setShortlisted(prev); // roll back on failure
      showToast(err instanceof ApiError ? err.message : 'Could not update your shortlist. Please try again.');
    } finally {
      setShortlistBusy(false);
    }
  }

  async function sendCallbackRequest() {
    if (!isLoggedIn()) { setShowLoginPrompt(true); return; }
    try {
      await requestProviderContact(providerId);
      setCallbackSent(true);
      showToast('Request sent. The provider will be notified.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not send that request.');
    }
  }

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="pdm-close" onClick={onClose} aria-label="Close">✕</button>

        {loading && <p className="pdm-loading">Loading…</p>}
        {error && <p className="pdm-error" role="alert">{error}</p>}

        {provider && (
          <>
            <p className="pdm-eyebrow">{provider.abn ? `ABN ${provider.abn}` : 'Provider'}</p>
            <h2 className="pdm-title">{provider.tradingName || provider.legalEntityName || 'Provider'}</h2>

            {provider.serviceSuburbs.length > 0 && (
              <p className="pdm-area">{provider.serviceSuburbs.join(', ')}{provider.travelRadiusKm ? ` · ${provider.travelRadiusKm}km radius` : ''}</p>
            )}

            {provider.registrationGroups.length > 0 && (
              <div className="pdm-chip-row">
                {provider.registrationGroups.map((g) => <span key={g} className="pdm-chip">{g}</span>)}
              </div>
            )}

            <dl className="pdm-dl">
              <dt>Status</dt>
              <dd>{provider.intakeStatus || 'Not stated'}</dd>
              {provider.weeklyCapacityHours ? (<><dt>Weekly capacity</dt><dd>{provider.weeklyCapacityHours} hours</dd></>) : null}
            </dl>

            <div className="pdm-actions">
              <button className="pdm-btn-primary" onClick={sendCallbackRequest} disabled={callbackSent}>
                {callbackSent ? '✓ Request sent' : 'Request a call back'}
              </button>
              <button
                className={`pdm-btn-secondary ${shortlisted ? 'pdm-btn-secondary-active' : ''}`}
                onClick={toggleShortlist}
                disabled={shortlistBusy}
              >
                {shortlistBusy ? 'Saving…' : shortlisted ? '✓ Added to shortlist' : '☆ Add to shortlist'}
              </button>
            </div>
            {shortlisted && !shortlistBusy && (
              <button className="pdm-remove-link" onClick={toggleShortlist}>Remove from shortlist</button>
            )}
          </>
        )}
      </div>

      {showLoginPrompt && (
        <div className="pdm-login-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="pdm-login-card" onClick={(e) => e.stopPropagation()}>
            <h3>Sign in to save providers</h3>
            <p>Create a free account or sign in to keep your shortlist available across devices.</p>
            <div className="pdm-login-actions">
              <button className="pdm-btn-primary" onClick={() => navigate('/login?returnTo=/find-providers')}>Sign in</button>
              <button className="pdm-btn-secondary" onClick={() => navigate('/signup?returnTo=/find-providers')}>Create account</button>
            </div>
            <button className="pdm-login-cancel" onClick={() => setShowLoginPrompt(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
