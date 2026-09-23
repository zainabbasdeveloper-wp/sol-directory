import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import Button from '../../components/ui/Button';
import Counter from '../../components/Counter';
import { useSiteStats } from '../../hooks/useSiteStats';
import PhotoSlot from '../../components/PhotoSlot';
import type { Role } from '@soldirectory/shared-types';
import './Login.css';
import '../../styles/auth-shared.css';

// One form for everyone. The server authenticates on email + password and
// returns the account's real role, which decides where they land (below). A
// role picker used to sit here — it was purely client-side (the API never
// saw it), rejected people who picked the "wrong" chip, listed retired
// account types, and exposed the admin role on a public page.
const CONTENT = {
  eyebrow: 'Account login',
  heading: 'Log in to your account',
  subhead: 'Manage your profile, availability and referrals.',
  asideHeading: 'Connecting people with the right support.',
  asideParagraph: 'Log in to manage your listing, referrals and shortlists in one place.',
};

// Existing routes only. worker can't access /workers (excluded
// since the first RBAC pass), and coordinator/participant lost
// access to it too once the pro-plan gate was added — all three
// previously pointed there, which would have bounced them to an
// error page immediately after login.
const ROLE_DESTINATION: Record<Role, string> = {
  admin: '/verification',
  provider: '/dashboard',
  worker: '/dashboard',
  coordinator: '/find-providers',
  participant: '/find-providers',
};

const EMAIL_RE = /.+@.+\..+/;

export default function Login() {
  const stats = useSiteStats();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Already-logged-in users visiting /login get sent to their real
  // destination instead of seeing the login form again.
  useEffect(() => {
    if (!authLoading && user) navigate(ROLE_DESTINATION[user.role], { replace: true });
  }, [authLoading, user, navigate]);

  const emailValid = EMAIL_RE.test(email);
  const content = CONTENT;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const authedUser = await login(email, password);
      const returnTo = searchParams.get('returnTo');
      navigate(returnTo || ROLE_DESTINATION[authedUser.role]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong logging in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="auth-header">
        <Link to="/" className="auth-header-logo"><img src="/images/sol-directory-header-logo.png" alt="Sol Directory by Sol Business Consultant" /></Link>
        <Link to="/" className="auth-header-back">← Back to public website</Link>
      </div>

      <div className="login-shell">
        <div className="login-aside">
          <div className="login-aside-overlay" />
          <div className="login-aside-content">
            <p className="login-eyebrow">Sol Directory</p>
            <div className="login-feature-image">
              <PhotoSlot src="/images/login-hero.jpg" alt="A support worker with a participant" variant="care" />
            </div>
            <h2 className="login-aside-heading">{content.asideHeading}</h2>
            <p className="login-aside-paragraph">{content.asideParagraph}</p>
            {/* Real figures only (api /stats/public); any stat without
                real data behind it is simply not shown. */}
            {stats && (stats.providersListed > 0 || stats.suburbsCovered > 0 || stats.medianFirstReplyMinutes !== null) && (
              <div className="login-stats">
                {stats.providersListed > 0 && (
                  <div className="login-stat">
                    <span className="login-stat-value"><Counter value={stats.providersListed} /></span>
                    <span className="login-stat-label">providers listed</span>
                  </div>
                )}
                {stats.suburbsCovered > 0 && (
                  <div className="login-stat">
                    <span className="login-stat-value"><Counter value={stats.suburbsCovered} /></span>
                    <span className="login-stat-label">suburbs covered</span>
                  </div>
                )}
                {stats.medianFirstReplyMinutes !== null && (
                  <div className="login-stat">
                    <span className="login-stat-value"><Counter value={stats.medianFirstReplyMinutes} suffix=" min" /></span>
                    <span className="login-stat-label">median first reply</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-inner">
            <p className="login-form-eyebrow">{content.eyebrow}</p>
            <h1 className="login-form-heading">{content.heading}</h1>
            <p className="login-form-subhead">{content.subhead}</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="login-email" className="login-field-label">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com.au"
                className="login-input"
              />

              <label htmlFor="login-password" className="login-field-label">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
              />

              <div className="login-password-row">
                <Link to="/forgot-password" className="login-link">Forgot password</Link>
              </div>

              {error && (
                <p className="login-error" role="alert" style={{ color: '#8C2F1E', fontSize: 13.5, marginBottom: 16 }}>
                  {error}
                </p>
              )}

              <Button type="submit" size="cta" disabled={!emailValid || loading} className="login-cta">
                {loading ? 'Logging in…' : 'Log in →'}
              </Button>

              <p className="login-footer">
                No account?{' '}
                <Link to="/signup" className="login-link login-link-strong">Create one</Link>{' '}
                · <Link to="/" className="login-link login-link-strong">Back to the public site</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
