import { useEffect, useRef, useState } from 'react';
import { useMatchModal } from '../context/MatchModalContext';
import './MatchingWizard.css';

interface MatchFormData {
  location: string;
  careFor: string;
  timeframe: string;
  funding: string;
  planManagement: string;
  email: string;
  phone: string;
  name: string;
  additionalDetails: string;
}

const EMPTY_FORM: MatchFormData = {
  location: '', careFor: '', timeframe: '', funding: '', planManagement: '',
  email: '', phone: '', name: '', additionalDetails: '',
};

type StepId = 'location' | 'careFor' | 'timeframe' | 'funding' | 'planManagement' | 'email' | 'phone' | 'name' | 'additionalDetails';
type Phase = 'wizard' | 'review' | 'success';

const STEP_LABELS: Record<StepId, string> = {
  location: 'Location', careFor: 'Care for', timeframe: 'Timing', funding: 'Funding',
  planManagement: 'Plan', email: 'Contact', phone: 'Phone', name: 'Name', additionalDetails: 'Details',
};

function getSteps(funding: string): StepId[] {
  const base: StepId[] = ['location', 'careFor', 'timeframe', 'funding'];
  if (funding === 'NDIS') base.push('planManagement');
  return [...base, 'email', 'phone', 'name', 'additionalDetails'];
}

const CARE_FOR_OPTIONS = [
  { value: 'Myself', icon: <IconPerson /> },
  { value: 'Family member', icon: <IconFamily /> },
  { value: 'A client I support', icon: <IconClipboard /> },
  { value: 'Someone else', icon: <IconPersonPlus /> },
];
const TIMEFRAME_OPTIONS = [
  { value: 'Immediately', icon: <IconBolt /> },
  { value: 'Within a week', icon: <IconCalendar /> },
  { value: 'Within a month', icon: <IconCalendarRange /> },
  { value: 'Just researching', icon: <IconSearch /> },
];
const FUNDING_OPTIONS = [
  { value: 'NDIS', icon: <IconSupport /> },
  { value: 'Aged Care', icon: <IconHome /> },
  { value: 'Privately funded', icon: <IconWallet /> },
  { value: 'DVA / Veterans', icon: <IconShield /> },
  { value: 'Still applying', icon: <IconHelp /> },
  { value: 'Not sure', icon: <IconHelp /> },
];
const PLAN_OPTIONS = [
  { value: 'Plan managed', icon: <IconClipboard /> },
  { value: 'Self-managed', icon: <IconPerson /> },
  { value: 'NDIA managed', icon: <IconShield /> },
  { value: 'Not sure', icon: <IconHelp /> },
];

const EMAIL_RE = /.+@.+\..+/;

export default function MatchingWizard() {
  const { isOpen, closeMatchModal } = useMatchModal();
  const [form, setForm] = useState<MatchFormData>(EMPTY_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('wizard');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const steps = getSteps(form.funding);
  const currentStepId = steps[stepIndex];
  const hasProgress = Object.values(form).some((v) => v.trim() !== '');

  useEffect(() => {
    if (isOpen) headingRef.current?.focus();
  }, [isOpen, stepIndex, phase]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) requestClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasProgress]);

  if (!isOpen) return null;

  function set<K extends keyof MatchFormData>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError('');
  }

  function requestClose() {
    if (hasProgress && phase !== 'success') {
      setConfirmClose(true);
    } else {
      reset();
    }
  }

  function reset() {
    setForm(EMPTY_FORM);
    setStepIndex(0);
    setPhase('wizard');
    setError('');
    setConfirmClose(false);
    closeMatchModal();
  }

  function validateStep(id: StepId): string {
    const v = form[id];
    if (id === 'location' && !v.trim()) return 'Enter a suburb or postcode so we know where to look.';
    if (id === 'careFor' && !v) return 'Choose who this is for.';
    if (id === 'timeframe' && !v) return 'Choose a timeframe.';
    if (id === 'funding' && !v) return 'Choose a funding type — "Not sure" is a fine answer.';
    if (id === 'planManagement' && !v) return 'Choose an option — "Not sure" is fine.';
    if (id === 'email' && !EMAIL_RE.test(v)) return 'Enter a valid email address.';
    if (id === 'name' && !v.trim()) return 'Enter your name.';
    return '';
  }

  function goNext() {
    const err = validateStep(currentStepId);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setDirection('forward');
    if (stepIndex === steps.length - 1) {
      setPhase('review');
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function skipStep() {
    setError('');
    setDirection('forward');
    if (stepIndex === steps.length - 1) setPhase('review');
    else setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError('');
    setDirection('backward');
    if (phase === 'review') {
      setPhase('wizard');
      return;
    }
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function editField(id: StepId) {
    const idx = steps.indexOf(id);
    setStepIndex(idx === -1 ? 0 : idx);
    setPhase('wizard');
    setDirection('backward');
  }

  async function submitRequest() {
    setSubmitting(true);
    // NOTE: no real matching-request endpoint exists in the API yet —
    // this simulates success rather than fabricating a working
    // network call. Replace with a real POST once the backend has a
    // /api/match-requests resource.
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setPhase('success');
  }

  return (
    <div className="mw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="mw-modal" role="dialog" aria-modal="true" aria-label="Get matched, free">
        <button className="mw-close" onClick={requestClose} aria-label="Close">✕</button>

        {phase !== 'success' && (
          <aside className="mw-sidebar">
            <p className="mw-sidebar-eyebrow">Get matched, free</p>
            <p className="mw-sidebar-copy">
              Tell us what you need and we'll help connect you with suitable providers.
            </p>
            <div className="mw-sidebar-steps">
              {steps.map((id, i) => {
                const state = phase === 'review' ? 'done' : i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'upcoming';
                return (
                  <div key={id} className={`mw-sidebar-step mw-sidebar-step-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                    <span className="mw-sidebar-step-marker">{state === 'done' ? '✓' : i + 1}</span>
                    {STEP_LABELS[id]}
                  </div>
                );
              })}
              <div className={`mw-sidebar-step ${phase === 'review' ? 'mw-sidebar-step-active' : 'mw-sidebar-step-upcoming'}`}>
                <span className="mw-sidebar-step-marker">{steps.length + 1}</span>
                Complete
              </div>
            </div>
            <p className="mw-sidebar-reassurance">
              Your information is only shared with relevant matched providers.
            </p>
          </aside>
        )}

        <div className={`mw-content ${phase === 'success' ? 'mw-content-full' : ''}`}>
          {phase === 'wizard' && (
            <>
              <div className="mw-progress-row">
                <span>Step {stepIndex + 1} of {steps.length}</span>
                <div className="mw-progress-track">
                  <div className="mw-progress-fill" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
                </div>
              </div>

              <div key={currentStepId} className={`mw-step-body mw-anim-${direction}`}>
                <WizardStep
                  stepId={currentStepId}
                  form={form}
                  set={set}
                  headingRef={headingRef}
                  error={error}
                />
              </div>

              <div className="mw-nav-row">
                {stepIndex > 0 ? (
                  <button className="mw-back-btn" onClick={goBack}>← Back</button>
                ) : <span />}
                <div className="mw-nav-right">
                  {(currentStepId === 'phone' || currentStepId === 'additionalDetails') && (
                    <button className="mw-skip-btn" onClick={skipStep}>Skip</button>
                  )}
                  <button className="btn-gradient mw-continue-btn" onClick={goNext}>Continue →</button>
                </div>
              </div>
            </>
          )}

          {phase === 'review' && (
            <>
              <h2 ref={headingRef} tabIndex={-1} className="mw-question">Check your request</h2>
              <p className="mw-supporting">Make sure everything looks right before we send it.</p>

              <div className="mw-review-list">
                <ReviewRow label="Location" value={form.location} onEdit={() => editField('location')} />
                <ReviewRow label="Care for" value={form.careFor} onEdit={() => editField('careFor')} />
                <ReviewRow label="Timeframe" value={form.timeframe} onEdit={() => editField('timeframe')} />
                <ReviewRow label="Funding" value={form.funding} onEdit={() => editField('funding')} />
                {form.funding === 'NDIS' && (
                  <ReviewRow label="Plan management" value={form.planManagement} onEdit={() => editField('planManagement')} />
                )}
                <ReviewRow label="Email" value={form.email} onEdit={() => editField('email')} />
                <ReviewRow label="Phone" value={form.phone || '—'} onEdit={() => editField('phone')} />
                <ReviewRow label="Name" value={form.name} onEdit={() => editField('name')} />
                <ReviewRow label="Additional details" value={form.additionalDetails || '—'} onEdit={() => editField('additionalDetails')} />
              </div>

              <div className="mw-nav-row">
                <button className="mw-back-btn" onClick={goBack}>← Back</button>
                <button className="btn-gradient mw-continue-btn" onClick={submitRequest} disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send my request →'}
                </button>
              </div>
            </>
          )}

          {phase === 'success' && (
            <div className="mw-success">
              <span className="mw-success-icon"><IconCheckCircleBig /></span>
              <h2 ref={headingRef} tabIndex={-1} className="mw-question">You're all set!</h2>
              <p className="mw-supporting">Your request has been sent to matched providers.</p>
              <p className="mw-success-line">Check your email — we've sent a confirmation with a link to track your request.</p>
              <p className="mw-success-note">Not heard back within a business day? Reply to your confirmation email and we'll chase it up.</p>
              <div className="mw-success-actions">
                <button className="btn-gradient" onClick={reset}>Back to SolDirectory</button>
              </div>
            </div>
          )}
        </div>

        {confirmClose && (
          <div className="mw-confirm-overlay">
            <div className="mw-confirm-card">
              <p className="mw-confirm-title">Leave your matching request?</p>
              <p className="mw-confirm-body">Your progress will be lost.</p>
              <div className="mw-confirm-actions">
                <button className="mw-back-btn" onClick={() => setConfirmClose(false)}>Keep going</button>
                <button className="mw-leave-btn" onClick={reset}>Leave</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="mw-review-row">
      <div>
        <p className="mw-review-label">{label}</p>
        <p className="mw-review-value">{value}</p>
      </div>
      <button className="mw-edit-btn" onClick={onEdit}>Edit</button>
    </div>
  );
}

function WizardStep({
  stepId, form, set, headingRef, error,
}: {
  stepId: StepId;
  form: MatchFormData;
  set: <K extends keyof MatchFormData>(key: K, value: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement>;
  error: string;
}) {
  if (stepId === 'location') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">Where do you need care?</h2>
        <p className="mw-supporting">We'll match you with providers in your area.</p>
        <div className="mw-input-icon-wrap">
          <IconMapPin />
          <input
            className="mw-input mw-input-icon"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Search suburb or postcode"
            autoFocus
          />
        </div>
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  if (stepId === 'careFor') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">Who is the care for?</h2>
        <p className="mw-supporting">Tell us who you're looking to arrange support for.</p>
        <div className="mw-card-grid mw-card-grid-2">
          {CARE_FOR_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`mw-option-card ${form.careFor === o.value ? 'mw-option-card-selected' : ''}`}
              onClick={() => set('careFor', o.value)}
            >
              <span className="mw-option-icon">{o.icon}</span>
              {o.value}
            </button>
          ))}
        </div>
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  if (stepId === 'timeframe') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">How soon do you need care?</h2>
        <p className="mw-supporting">This helps us prioritise providers who can help within your timeframe.</p>
        <div className="mw-card-grid mw-card-grid-2">
          {TIMEFRAME_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`mw-option-card ${form.timeframe === o.value ? 'mw-option-card-selected' : ''}`}
              onClick={() => set('timeframe', o.value)}
            >
              <span className="mw-option-icon">{o.icon}</span>
              {o.value}
            </button>
          ))}
        </div>
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  if (stepId === 'funding') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">How will the care be funded?</h2>
        <p className="mw-supporting">If you're not sure yet, that's completely fine.</p>
        <div className="mw-card-grid mw-card-grid-3">
          {FUNDING_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`mw-option-card ${form.funding === o.value ? 'mw-option-card-selected' : ''}`}
              onClick={() => set('funding', o.value)}
            >
              <span className="mw-option-icon">{o.icon}</span>
              {o.value}
            </button>
          ))}
        </div>
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  if (stepId === 'planManagement') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">How is the NDIS plan managed?</h2>
        <p className="mw-supporting">Choose the option you know. You can select "Not sure" if you're unsure.</p>
        <div className="mw-card-grid mw-card-grid-2">
          {PLAN_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`mw-option-card ${form.planManagement === o.value ? 'mw-option-card-selected' : ''}`}
              onClick={() => set('planManagement', o.value)}
            >
              <span className="mw-option-icon">{o.icon}</span>
              {o.value}
            </button>
          ))}
        </div>
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  if (stepId === 'email') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">Where should matched providers contact you?</h2>
        <p className="mw-supporting">Your details are only shared with providers who may be able to help.</p>
        <input
          type="email"
          className="mw-input"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="Email address"
          autoFocus
        />
        {error && <p className="mw-error" role="alert">{error}</p>}
        <p className="mw-fine-print">
          By continuing, you agree to our <a href="/privacy">Privacy Policy</a>.
        </p>
      </>
    );
  }

  if (stepId === 'phone') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">What's the best number to reach you?</h2>
        <p className="mw-supporting">Optional. A phone number can help a provider contact you faster.</p>
        <input
          type="tel"
          className="mw-input"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="Phone number"
          autoFocus
        />
      </>
    );
  }

  if (stepId === 'name') {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="mw-question">And your name?</h2>
        <p className="mw-supporting">So providers know who they're helping.</p>
        <input
          className="mw-input"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Your name"
          autoFocus
        />
        {error && <p className="mw-error" role="alert">{error}</p>}
      </>
    );
  }

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="mw-question">Anything else we should know?</h2>
      <p className="mw-supporting">Optional. Add anything that could help us find a better match.</p>
      <textarea
        className="mw-textarea"
        value={form.additionalDetails}
        onChange={(e) => set('additionalDetails', e.target.value)}
        placeholder="Tell us anything that might help providers understand what support you're looking for…"
        rows={5}
        autoFocus
      />
    </>
  );
}

function IconPerson() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" /></svg>; }
function IconFamily() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.8-3.4 3-5 6-5s5.2 1.6 6 5M14 20c.5-2.2 1.8-3.6 3.5-4 1.7.4 3 1.8 3.5 4" strokeLinecap="round" /></svg>; }
function IconClipboard() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 12h6M9 16h4" strokeLinecap="round" /></svg>; }
function IconPersonPlus() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="10" cy="8" r="3.5" /><path d="M3 20c1-4 3.5-6 7-6M18 8v6M15 11h6" strokeLinecap="round" /></svg>; }
function IconBolt() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" /></svg>; }
function IconCalendar() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" strokeLinecap="round" /></svg>; }
function IconCalendarRange() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17M8 15h3" strokeLinecap="round" /></svg>; }
function IconSearch() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>; }
function IconSupport() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s-7-4.5-9.5-9C.6 8.3 2.2 4.5 6 4.2c2 0 3.6 1.1 4.5 2.6.9-1.5 2.5-2.6 4.5-2.6 3.8.3 5.4 4.1 3.5 7.8-2.5 4.5-6.5 9-6.5 9Z" strokeLinejoin="round" /></svg>; }
function IconHome() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11.5 12 4l8 7.5" strokeLinecap="round" /><path d="M6 10v10h12V10" /></svg>; }
function IconWallet() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M15 14h3" strokeLinecap="round" /></svg>; }
function IconShield() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6Z" strokeLinejoin="round" /></svg>; }
function IconHelp() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" strokeLinecap="round" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></svg>; }
function IconMapPin() { return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10.5" r="2.6" /></svg>; }
function IconCheckCircleBig() { return <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
