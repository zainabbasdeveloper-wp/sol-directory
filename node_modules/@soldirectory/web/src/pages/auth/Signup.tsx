import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ACCOUNT_TYPES } from '../../data/accountTypes';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import Button from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Chip';
import type { Role } from '@soldirectory/shared-types';
import './Signup.css';

const EMAIL_RE = /.+@.+\..+/;

export default function Signup() {
  const [accountType, setAccountType] = useState<Role>('worker');
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const valid =
    form.name.trim().length > 0 &&
    EMAIL_RE.test(form.email) &&
    form.mobile.trim().length >= 8 &&
    form.password.length >= 8 &&
    terms;

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    try {
      await signup({ ...form, role: accountType });
      navigate('/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong creating your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-brand-block">
        <p className="signup-brand-name">SolDirectory</p>
        <p className="signup-brand-eyebrow">Create an account</p>
      </div>

      <h1 className="signup-heading">What are you signing up as?</h1>
      <p className="signup-paragraph">
        Accounts are free. What you register as decides what you can see:
        NDIS workers build a listing, providers manage a business profile,
        and coordinators, participants and families search the directory.
      </p>

      <div className="signup-role-grid" role="radiogroup" aria-label="Account type">
        {ACCOUNT_TYPES.map((a) => {
          const selected = accountType === a.key;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`signup-role-card ${selected ? 'signup-role-card-selected' : ''}`}
              onClick={() => setAccountType(a.key)}
            >
              <span className="signup-role-card-top">
                <span className="signup-role-card-title">{a.title}</span>
                <span className={`signup-role-dot ${selected ? 'signup-role-dot-selected' : ''}`}>
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
        <h2 className="signup-form-heading">Your login details</h2>

        <div className="signup-form-grid">
          <div className="signup-field">
            <label htmlFor="su-name" className="signup-field-label">
              Full name
            </label>
            <input id="su-name" className="signup-input" placeholder="Alex Nguyen" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-email" className="signup-field-label">
              Email
            </label>
            <input id="su-email" type="email" className="signup-input" placeholder="you@example.com.au" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-mobile" className="signup-field-label">
              Mobile
            </label>
            <input id="su-mobile" className="signup-input" placeholder="04XX XXX XXX" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
          </div>
          <div className="signup-field">
            <label htmlFor="su-password" className="signup-field-label">
              Password
            </label>
            <input id="su-password" type="password" className="signup-input" placeholder="At least 8 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
          </div>
        </div>

        <div className="signup-terms-row">
          <Checkbox
            id="su-terms"
            checked={terms}
            onChange={setTerms}
            label={
              <>
                I agree to the <a href="/terms" className="signup-link">directory terms</a> and the{' '}
                <a href="/privacy" className="signup-link">privacy policy</a>, and I consent to my
                clearances being verified against the NDIS Commission register.
              </>
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
            {loading ? 'Creating account…' : 'Create account and continue →'}
          </Button>
          <a href="/login" className="signup-existing-link">
            I already have an account
          </a>
        </div>
      </form>
    </div>
  );
}
