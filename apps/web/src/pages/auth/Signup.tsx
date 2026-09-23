import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { SIGNUP_ACCOUNT_TYPES, getAccountType } from '../../data/accountTypes';
import { useAuth } from '../../context/AuthContext';
import { useMatchModal } from '../../context/MatchModalContext';
import { ApiError } from '../../api/client';
import Button from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Chip';
import type { Role } from '@soldirectory/shared-types';
import './Signup.css';
import '../../styles/auth-shared.css';

const EMAIL_RE = /.+@.+\..+/;

export default function Signup() {
  const [searchParams] = useSearchParams();
  // The URL param only sets the INITIAL selection — a convenience for
  // deep-linking, e.g. /signup?role=provider. Once the page has
  // loaded, `accountType` state is the only thing that matters; the
  // URL is never re-read as a source of truth after this line.
  // Both ?role= and ?type= are accepted: every "List your business"
  // button links with ?type=provider, which this page used to ignore, so
  // providers landed on the WORKER form. A retired or unknown role (e.g.
  // an old ?role=participant link) falls back to the default.
  const urlRole = (searchParams.get('role') ?? searchParams.get('type')) as Role | null;
  const [accountType, setAccountType] = useState<Role>(
    urlRole && SIGNUP_ACCOUNT_TYPES.some((a) => a.key === urlRole) ? urlRole : 'worker'
  );
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const { openMatchModal } = useMatchModal();
  const navigate = useNavigate();

  const selected = getAccountType(accountType);

  const valid =
    form.name.trim().length > 0 &&
    EMAIL_RE.test(form.email) &&
    form.mobile.trim().length >= 8 &&
    form.password.length >= 8 &&
    terms;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function selectRole(role: Role) {
    setAccountType(role);
    // Changing role clears any error from a previous submit attempt
    // under the old role — an error about one account type shouldn't
    // linger after switching to a different one.
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      // The role sent to the backend is `accountType` — application
      // state — not anything re-read from the URL at submit time.
      const referralCode = searchParams.get('ref') || undefined;
      const authedUser = await signup({ ...form, role: accountType, referralCode });
      // Route by the role the backend actually returned, matching
      // getAccountType's real per-role destination. In practice this
      // will equal `accountType` since the backend now validates and
      // echoes it back, but the authenticated response stays the
      // source of truth rather than the pre-submit selection.
      navigate(getAccountType(authedUser.role).postSignupRoute);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong creating your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="auth-header">
        <Link to="/" className="auth-header-logo"><img src="/images/sol-directory-logo-black-transparent-v2.png" alt="Sol Directory by Sol Business Consultant" /></Link>
        <Link to="/" className="auth-header-back">← Back to public website</Link>
      </div>

      <h1 className="signup-heading">What are you signing up as?</h1>
      <p className="signup-paragraph">
        Select the account type that reflects how you will use SolDirectory.
        Independent Workers can maintain a professional profile, provider organisations can manage services and enquiries,
        and allied health professionals and support coordinators can search provider information.
        Participants, families and representatives do not need an account to <button type="button" className="signup-link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => openMatchModal()}>submit a provider enquiry</button>.
      </p>

      <div className="signup-role-grid" role="radiogroup" aria-label="Account type">
        {SIGNUP_ACCOUNT_TYPES.map((a) => {
          const isSelected = accountType === a.key;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`signup-role-card ${isSelected ? 'signup-role-card-selected' : ''}`}
              onClick={() => selectRole(a.key)}
            >
              <span className="signup-role-card-top">
                <span className="signup-role-card-title">{a.title}</span>
                <span className={`signup-role-dot ${isSelected ? 'signup-role-dot-selected' : ''}`}>
                  <span className="signup-role-dot-inner" />
                </span>
              </span>
              <span className="signup-role-card-desc">{a.desc}</span>
              <span className="signup-role-card-meta">{a.meta}</span>
            </button>
          );
        })}
      </div>

      <form className="signup-form-card" onSubmit={handleSubmit}>
        <h2 className="signup-form-heading">{selected.signupHeading}</h2>

        <div className="signup-form-grid">
          <div className="signup-field">
            <label htmlFor="su-name" className="signup-field-label">Full name</label>
            <input id="su-name" className="signup-input" placeholder="Alex Nguyen" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-email" className="signup-field-label">Email</label>
            <input id="su-email" type="email" className="signup-input" placeholder="you@example.com.au" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-mobile" className="signup-field-label">Mobile</label>
            <input id="su-mobile" className="signup-input" placeholder="04XX XXX XXX" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-password" className="signup-field-label">Password</label>
            <input id="su-password" type="password" className="signup-input" placeholder="At least 8 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
        </div>

        <div className="signup-terms-row">
          <Checkbox
            id="su-terms"
            checked={terms}
            onChange={setTerms}
            label={
              selected.showClearanceConsent ? (
                <>
                  I agree to the <a href="/terms" className="signup-link">directory terms</a> and the{' '}
                  <a href="/privacy" className="signup-link">privacy policy</a>, and I consent to my
                  registration and clearance details being reviewed for verification purposes.
                </>
              ) : (
                <>
                  I agree to the <a href="/terms" className="signup-link">directory terms</a> and the{' '}
                  <a href="/privacy" className="signup-link">privacy policy</a>.
                </>
              )
            }
          />
        </div>

        {error && (
          <p role="alert" style={{ color: '#8C2F1E', fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </p>
        )}

        <div className="signup-form-footer">
          <Button type="submit" size="cta" disabled={!valid || loading}>
            {loading ? 'Creating account…' : selected.signupCta}
          </Button>
          <Link to="/login" className="signup-existing-link">
            I already have an account
          </Link>
        </div>
      </form>
    </div>
  );
}
