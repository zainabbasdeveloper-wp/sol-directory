import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { forgotPassword, resetPassword } from '../../api/resources';
import './Login.css';

const MIN_PASSWORD_LENGTH = 8; // matches the API's own check in auth.controller.ts

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-page">
      <div className="auth-header">
        <Link to="/" className="auth-header-logo"><img src="/images/sol-directory-horizontal-black.png" alt="Sol Directory by Sol Business Consultant" /></Link>
        <Link to="/login" className="auth-header-back">Back to sign in →</Link>
      </div>
      <div style={{ maxWidth: 440, margin: '64px auto', padding: '0 20px' }}>{children}</div>
    </div>
  );
}

const muted = { color: 'var(--color-text-muted, #5A6B84)' } as const;
const errorStyle = { color: '#8C2F1E', fontSize: 13.5, margin: '0 0 16px' } as const;

/** Step 1 — ask for the reset link. */
export function ForgotPassword() {
  // Arriving from a "Claim your listing" email link (?claim=1&email=…): an
  // imported provider has an account but no known password, and this page is
  // how they set one. The email is pre-filled; nothing is granted until they
  // click the secure link we send to that address.
  const [params] = useSearchParams();
  const isClaim = params.get('claim') === '1';
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/.+@.+\..+/.test(email)) { setError('Please enter a valid email address.'); return; }
    setState('sending');
    try {
      await forgotPassword(email.trim());
      // Same outcome whether or not the account exists — the API
      // deliberately doesn't reveal that, and neither do we.
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>{isClaim ? 'Claim your listing' : 'Reset your password'}</h1>
      {state === 'sent' ? (
        <>
          <p style={{ ...muted, marginBottom: 20 }}>
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in one hour.
          </p>
          <p style={muted}>Nothing arrived? Check your spam folder, or <button type="button" className="login-link" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => setState('idle')}>try a different email</button>.</p>
        </>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <p style={{ ...muted, marginBottom: 20 }}>
            {isClaim
              ? 'Your organisation already has a free listing on SolDirectory. Confirm the email below and we will send you a secure link to set a password and take control of it.'
              : 'Enter the email you signed up with and we’ll send you a link to choose a new password.'}
          </p>
          <label htmlFor="fp-email" className="login-field-label">Email</label>
          <input id="fp-email" type="email" autoComplete="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          {error && <p role="alert" style={{ ...errorStyle, marginTop: 12 }}>{error}</p>}
          <button type="submit" className="btn-gradient" style={{ marginTop: 16, width: '100%' }} disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : isClaim ? 'Email me a secure link' : 'Send reset link'}
          </button>
        </form>
      )}
    </Shell>
  );
}

/** Step 2 — the page the emailed link lands on (/reset-password?token=…&email=…). */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirm) { setError('The two passwords don’t match.'); return; }
    setState('saving');
    try {
      await resetPassword({ email, token, newPassword: password });
      setState('done');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (!token || !email) {
    return (
      <Shell>
        <h1 style={{ fontSize: 26, marginBottom: 10 }}>This reset link is incomplete</h1>
        <p style={{ ...muted, marginBottom: 16 }}>Please use the link from your email, or request a new one.</p>
        <Link to="/forgot-password" className="login-link login-link-strong">Request a new link →</Link>
      </Shell>
    );
  }

  if (state === 'done') {
    return (
      <Shell>
        <h1 style={{ fontSize: 26, marginBottom: 10, color: '#177C4B' }}>✓ Password updated</h1>
        <p style={{ ...muted, marginBottom: 20 }}>You can now sign in with your new password.</p>
        <Link to="/login" className="btn-gradient" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>Sign in</Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ fontSize: 26, marginBottom: 10 }}>Choose a new password</h1>
      <p style={{ ...muted, marginBottom: 20 }}>For <strong>{email}</strong></p>
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="rp-password" className="login-field-label">New password</label>
        <input id="rp-password" type="password" autoComplete="new-password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label htmlFor="rp-confirm" className="login-field-label" style={{ marginTop: 14 }}>Confirm new password</label>
        <input id="rp-confirm" type="password" autoComplete="new-password" className="login-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p role="alert" style={{ ...errorStyle, marginTop: 12 }}>{error}</p>}
        <button type="submit" className="btn-gradient" style={{ marginTop: 16, width: '100%' }} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </Shell>
  );
}
