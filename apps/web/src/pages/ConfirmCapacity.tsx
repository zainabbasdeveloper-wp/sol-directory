import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { confirmCapacityByToken } from '../api/resources';
import '../styles/auth-shared.css';

/**
 * Public landing page for the weekly capacity confirmation email link
 * (scripts/weeklyCapacityCheck.ts) — no login required, the token in
 * the URL is the credential. Deliberately NOT auto-confirmed on page
 * load: some email clients prefetch links, which would silently
 * "confirm" capacity nobody actually reviewed. Requires the explicit
 * click the brief calls "one-tap confirm".
 */
export default function ConfirmCapacity() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [providerName, setProviderName] = useState('');

  async function handleConfirm() {
    setState('loading');
    try {
      const res = await confirmCapacityByToken(token);
      setProviderName(res.providerName ?? '');
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong confirming your capacity.');
      setState('error');
    }
  }

  return (
    <div className="login-page">
      <div className="auth-header">
        <Link to="/" className="auth-header-logo">SolDirectory</Link>
        <Link to="/dashboard" className="auth-header-back">Go to dashboard →</Link>
      </div>

      <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        {!token && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>This link is missing its confirmation token</h1>
            <p style={{ color: 'var(--color-text-muted, #5A6B84)' }}>Please use the link from your confirmation email, or confirm from your dashboard instead.</p>
          </>
        )}

        {token && state === 'idle' && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Confirm you're still taking referrals</h1>
            <p style={{ color: 'var(--color-text-muted, #5A6B84)', marginBottom: 24 }}>
              One tap keeps your listing live and visible in search this week.
            </p>
            <button
              onClick={handleConfirm}
              style={{ background: 'var(--gradient-primary-cta, #1769E0)', color: '#fff', border: 0, borderRadius: 8, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Confirm my capacity
            </button>
          </>
        )}

        {state === 'loading' && <p>Confirming…</p>}

        {state === 'done' && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 12, color: '#177C4B' }}>✓ Capacity confirmed</h1>
            <p style={{ color: 'var(--color-text-muted, #5A6B84)' }}>
              Thanks{providerName ? `, ${providerName}` : ''} — your listing stays live and visible in search this week.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 12, color: '#B4232F' }}>This link is invalid or has expired</h1>
            <p style={{ color: 'var(--color-text-muted, #5A6B84)', marginBottom: 16 }}>{error}</p>
            <Link to="/dashboard" className="login-link login-link-strong">Confirm from your dashboard instead →</Link>
          </>
        )}
      </div>
    </div>
  );
}
