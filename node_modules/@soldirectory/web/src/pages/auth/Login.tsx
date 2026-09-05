import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import Button from '../../components/ui/Button';
import Counter from '../../components/Counter';
import PhotoSlot from '../../components/PhotoSlot';
import type { Role } from '@soldirectory/shared-types';
import './Login.css';
import '../../styles/auth-shared.css';

const ROLES: { key: Role; label: string }[] = [
  { key: 'worker', label: 'NDIS worker' },
  { key: 'provider', label: 'Provider' },
  { key: 'coordinator', label: 'Support coordinator' },
  { key: 'participant', label: 'Participant or family' },
  { key: 'admin', label: 'Sol admin' },
];

// Content that actually changes based on the selected role tab.
// Stats stay identical across roles per instruction — only the
// framing copy changes, not fabricated numbers.
const ROLE_CONTENT: Record<Role, { eyebrow: string; heading: string; subhead: string; asideHeading: string; asideParagraph: string }> = {
  worker: {
    eyebrow: 'Worker directory',
    heading: 'Log in to your worker account',
    subhead: 'Manage your profile, availability, clearances and opportunities.',
    asideHeading: 'Build your profile. Find the right opportunities.',
    asideParagraph: 'Manage your worker listing, availability, clearances and incoming opportunities from providers and families.',
  },
  provider: {
    eyebrow: 'Provider portal',
    heading: 'Log in to your provider account',
    subhead: 'Manage your organisation, team, services, leads and coverage.',
    asideHeading: 'Grow your care organisation from one place.',
    asideParagraph: 'Manage services, coverage areas, staff, onboarding and incoming leads.',
  },
  coordinator: {
    eyebrow: 'Coordinator portal',
    heading: 'Log in to find support',
    subhead: 'Search workers and providers, shortlist options and manage referrals.',
    asideHeading: 'Find support faster for the people you work with.',
    asideParagraph: 'Search verified providers and workers by location, availability and service.',
  },
  participant: {
    eyebrow: 'Support directory',
    heading: 'Log in to find support',
    subhead: 'Search providers, manage requests and track your matches.',
    asideHeading: 'Find the right support with less searching.',
    asideParagraph: 'Search providers and workers based on your location and support needs.',
  },
  admin: {
    eyebrow: 'Administration',
    heading: 'Log in to SolDirectory Admin',
    subhead: 'Manage users, listings, approvals and platform operations.',
    asideHeading: 'Manage the SolDirectory platform.',
    asideParagraph: 'Review accounts, provider information, directory activity and platform operations.',
  },
};

// Existing routes only — there is no per-role dashboard route yet,
// so this maps each role to the closest existing page. Worth
// revisiting once dedicated role routes exist.
const ROLE_DESTINATION: Record<Role, string> = {
  admin: '/verification',
  provider: '/dashboard',
  worker: '/workers',
  coordinator: '/workers',
  participant: '/workers',
};

const EMAIL_RE = /.+@.+\..+/;

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as Role) || 'worker';
  const [role, setRole] = useState<Role>(ROLES.some((r) => r.key === initialRole) ? initialRole : 'worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, logout, user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Already-logged-in users visiting /login get sent to their real
  // destination instead of seeing the login form again.
  useEffect(() => {
    if (!authLoading && user) navigate(ROLE_DESTINATION[user.role], { replace: true });
  }, [authLoading, user, navigate]);

  const emailValid = EMAIL_RE.test(email);
  const content = ROLE_CONTENT[role];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid || loading) return;
    setLoading(true);
    setError('');
    try {
      const authedUser = await login(email, password);
      // The selected tab must match the account's real role. A
      // mismatch used to let the person in anyway with a notice —
      // that's been reversed: this is now a hard rejection. Login
      // technically succeeded against the backend (valid
      // credentials), so we explicitly log back out rather than
      // leave an authenticated session sitting around for an account
      // type the person didn't confirm they wanted.
      if (authedUser.role !== role) {
        logout();
        setError(
          `This account is registered as ${ROLES.find((r) => r.key === authedUser.role)?.label ?? authedUser.role}. Please select the correct account type and try again.`
        );
        return;
      }
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
        <Link to="/" className="auth-header-logo">SolDirectory</Link>
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
            <div className="login-stats">
              <div className="login-stat">
                <span className="login-stat-value"><Counter value={2140} /></span>
                <span className="login-stat-label">workers listed</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-value"><Counter value={100} suffix="%" /></span>
                <span className="login-stat-label">Worker Check verified</span>
              </div>
              <div className="login-stat">
                <span className="login-stat-value"><Counter value={6} suffix=" min" /></span>
                <span className="login-stat-label">median reply</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-inner">
            <p className="login-form-eyebrow">{content.eyebrow}</p>
            <h1 className="login-form-heading">{content.heading}</h1>
            <p className="login-form-subhead">{content.subhead}</p>

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

              <label htmlFor="login-email" className="login-field-label">Work email</label>
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
                <a href="#forgot" className="login-link">Forgot password</a>
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
                <Link to={`/signup?role=${role}`} className="login-link login-link-strong">Create one</Link>{' '}
                · <Link to="/" className="login-link login-link-strong">Back to the public site</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
