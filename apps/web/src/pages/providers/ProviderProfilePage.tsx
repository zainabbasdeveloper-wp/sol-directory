import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getProviderBySlug, getShortlistStatus, addToShortlist, removeFromShortlist,
  requestProviderContact, isLoggedIn, type FullProviderProfile,
} from '../../api/providerResources';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import ProviderMap from '../../components/ProviderMap';
import NotFound from '../wordpress/NotFound';
import './ProviderProfilePage.css';

/**
 * Full provider profile at /providers/{slug} — a real page, not a
 * modal, per the spec's explicit ask. Every section here corresponds
 * to a field that actually exists on Provider; sections the spec's
 * own mockup suggested (logo, languages, team/qualifications,
 * reviews, opening hours, website) are deliberately absent because
 * none of those fields exist on this model. Adding them would be
 * exactly the fabrication the spec forbids.
 */
export default function ProviderProfilePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const showToast = useToast();

  const [provider, setProvider] = useState<FullProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [shortlisted, setShortlisted] = useState(false);
  const [shortlistBusy, setShortlistBusy] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getProviderBySlug(slug)
      .then((p) => {
        setProvider(p);
        if (isLoggedIn()) getShortlistStatus(p.id).then((r) => setShortlisted(r.shortlisted)).catch(() => {});
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : 'Unable to load this provider.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  async function toggleShortlist() {
    if (!provider) return;
    if (!isLoggedIn()) { setShowLoginPrompt(true); return; }
    setShortlistBusy(true);
    const prev = shortlisted;
    try {
      if (prev) { await removeFromShortlist(provider.id); setShortlisted(false); showToast('Removed from your shortlist.'); }
      else { await addToShortlist(provider.id); setShortlisted(true); showToast('✓ Added to your shortlist'); }
    } catch (err) {
      setShortlisted(prev);
      showToast(err instanceof ApiError ? err.message : 'Could not update your shortlist.');
    } finally {
      setShortlistBusy(false);
    }
  }

  async function sendCallback() {
    if (!provider) return;
    if (!isLoggedIn()) { setShowLoginPrompt(true); return; }
    try {
      await requestProviderContact(provider.id);
      setCallbackSent(true);
      showToast('Request sent. The provider will be notified.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not send that request.');
    }
  }

  if (loading) {
    return (
      <div className="pp-page">
        <div className="pp-skel-title" />
        <div className="pp-skel-block" />
      </div>
    );
  }
  if (notFound) return <NotFound />;
  if (error) return <p style={{ textAlign: 'center', padding: 60, color: '#B4232F' }}>{error}</p>;
  if (!provider) return null;

  return (
    <div className="pp-page">
      <div className="pp-header">
        <div>
          <h1 className="pp-name">{provider.name}</h1>
          {provider.intakeStatus === 'Open to referrals' && <span className="pp-status-pill">Taking new clients</span>}
        </div>
        <div className="pp-header-actions">
          <button className="pp-btn-primary" onClick={sendCallback} disabled={callbackSent}>
            {callbackSent ? '✓ Request sent' : 'Request a callback'}
          </button>
          <button className={`pp-btn-secondary ${shortlisted ? 'pp-btn-secondary-active' : ''}`} onClick={toggleShortlist} disabled={shortlistBusy}>
            {shortlistBusy ? 'Saving…' : shortlisted ? '✓ Shortlisted' : '☆ Add to shortlist'}
          </button>
        </div>
      </div>

      {provider.abn && (
        <section className="pp-section">
          <h2>About</h2>
          <p>ABN {provider.abn} · {provider.legalEntityName}</p>
          <p className="pp-muted">Member since {new Date(provider.memberSince).toLocaleDateString()}</p>
        </section>
      )}

      {provider.registrationGroups.length > 0 && (
        <section className="pp-section">
          <h2>Services</h2>
          <div className="pp-chip-row">{provider.registrationGroups.map((s) => <span key={s} className="pp-chip">{s}</span>)}</div>
        </section>
      )}

      {provider.serviceSuburbs.length > 0 && (
        <section className="pp-section">
          <h2>Areas we serve</h2>
          <div className="pp-chip-row">{provider.serviceSuburbs.map((s) => <span key={s} className="pp-chip">{s}</span>)}</div>
          {provider.travelRadiusKm && <p className="pp-muted">{provider.travelRadiusKm}km travel radius</p>}
        </section>
      )}

      {(provider.weeklyCapacityHours || provider.rosterSize || provider.afterHoursCover) && (
        <section className="pp-section">
          <h2>Availability</h2>
          {provider.weeklyCapacityHours && <p>{provider.weeklyCapacityHours} hours/week capacity</p>}
          {provider.rosterSize && <p>Roster of {provider.rosterSize}</p>}
          {provider.afterHoursCover && <p>After-hours: {provider.afterHoursCover}</p>}
        </section>
      )}

      {provider.acceptedFunding.length > 0 && (
        <section className="pp-section">
          <h2>Funding</h2>
          <div className="pp-chip-row">{provider.acceptedFunding.map((f) => <span key={f} className="pp-chip">{f}</span>)}</div>
        </section>
      )}

      {provider.conditionExperience.length > 0 && (
        <section className="pp-section">
          <h2>Experience with</h2>
          <div className="pp-chip-row">{provider.conditionExperience.map((c) => <span key={c} className="pp-chip">{c}</span>)}</div>
        </section>
      )}

      {provider.location && (
        <section className="pp-section">
          <h2>Where we operate</h2>
          <ProviderMap providers={[{ id: provider.id, name: provider.name, location: provider.location }]} />
        </section>
      )}

      {provider.contactEmail && (
        <section className="pp-section">
          <h2>Contact</h2>
          <p>{provider.contactEmail}</p>
        </section>
      )}

      {provider.relatedProviders.length > 0 && (
        <section className="pp-section">
          <h2>Related providers</h2>
          <div className="pp-related-grid">
            {provider.relatedProviders.map((r) => (
              <Link key={r.slug} to={`/providers/${r.slug}`} className="pp-related-card">
                <strong>{r.name}</strong>
                <span className="pp-muted">{r.suburbs.slice(0, 2).join(', ')}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showLoginPrompt && (
        <div className="pp-login-overlay" onClick={() => setShowLoginPrompt(false)}>
          <div className="pp-login-card" onClick={(e) => e.stopPropagation()}>
            <h3>Sign in to continue</h3>
            <p>Create a free account or sign in to shortlist providers and request callbacks.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="pp-btn-primary" onClick={() => navigate(`/login?returnTo=/providers/${slug}`)}>Sign in</button>
              <button className="pp-btn-secondary" onClick={() => navigate(`/signup?returnTo=/providers/${slug}`)}>Create account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
