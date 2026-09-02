import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import Button from '../../components/ui/Button';
import type { Role } from '@soldirectory/shared-types';
import './Login.css';

const ROLES: { key: Role; label: string }[] = [
  { key: 'worker', label: 'NDIS worker' },
  { key: 'provider', label: 'Provider' },
  { key: 'coordinator', label: 'Support coordinator' },
  { key: 'participant', label: 'Participant or family' },
  { key: 'admin', label: 'Sol admin' },
];

const EMAIL_RE = /.+@.+\..+/;

export default function Login() {
  const [role, setRole] = useState<Role>('worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const emailValid = EMAIL_RE.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'provider' ? '/dashboard' : '/workers');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong logging in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-aside">
          <div className="login-aside-overlay" />
          <div className="login-aside-content">
            <p className="login-eyebrow">Sol Directory</p>
            <div className="login-feature-image" aria-hidden="true" />
            <h2 className="login-aside-heading">The worker directory sits behind the login</h2>
            <p className="login-aside-paragraph">
              Search 2,140 screened support workers, nurses and allied health
              assistants by suburb, availability, language and clearance.
              Contact details stay private until a worker accepts your
              request.
            </p>
            <div className="login-stats">
              <div className="login-stat">
                <span className="login-stat-value">2,140</span>
                <span className="login-stat-label">workers listed</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-value">100%</span>
                <span className="login-stat-label">Worker Check verified</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-value">6 min</span>
                <span className="login-stat-label">median reply</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-inner">
            <p className="login-form-eyebrow">Worker directory</p>
            <h1 className="login-form-heading">Log in to search workers</h1>
            <p className="login-form-subhead">
              Accounts are free for providers, support coordinators,
              participants and families.
            </p>

            <form onSubmit={handleSubmit}>
              <p className="login-role-label">I am logging in as</p>
              <div className="login-role-pills" role="group" aria-label="I am logging in as">
                {ROLES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={role === r.key}
                    className={`login-role-pill ${role === r.key ? 'login-role-pill-selected' : ''}`}
                    onClick={() => setRole(r.key)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <label htmlFor="login-email" className="login-field-label">
                Work email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com.au"
                className="login-input"
              />

              <label htmlFor="login-password" className="login-field-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="login-input"
              />

              <div className="login-password-row">
                <a href="#forgot" className="login-link">
                  Forgot password
                </a>
              </div>

              {error && (
                <p className="login-error" role="alert" style={{ color: '#8C2F1E', fontSize: 13.5, marginBottom: 16 }}>
                  {error}
                </p>
              )}

              <Button type="submit" size="cta" disabled={!emailValid || loading} className="login-cta">
                {loading ? 'Logging in…' : 'Log in and search workers →'}
              </Button>

              <p className="login-footer">
                No account?{' '}
                <a href="/signup" className="login-link login-link-strong">
                  Create one
                </a>{' '}
                · <a href="/" className="login-link login-link-strong">Back to the public site</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
