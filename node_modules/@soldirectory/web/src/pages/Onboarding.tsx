import { useState } from 'react';
import { saveOnboardingStep, getUploadUrl } from '../api/resources';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import './Onboarding.css';

const STEPS = [
  { key: 'org', title: 'Organisation details' },
  { key: 'insurance', title: 'Insurance and registration' },
  { key: 'areas', title: 'Service areas and capacity' },
  { key: 'team', title: 'Team and clearances' },
  { key: 'policy', title: 'Incident and complaints policy' },
  { key: 'billing', title: 'Subscription and leads' },
];

export default function Onboarding() {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(new Array(STEPS.length).fill(false));
  const [abn, setAbn] = useState('81 442 003 91');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  const step = STEPS[stepIndex];

  async function handlePolicyUpload(file: File) {
    try {
      const { uploadUrl } = await getUploadUrl('incident_policy', file.type, file.name);
      // Real implementation: `await fetch(uploadUrl, { method: 'PUT', body: file })`
      // against the signed URL. The stub storage service returns a
      // fake URL, so we don't actually PUT to it here.
      console.log('Would PUT to', uploadUrl);
      showToast('Policy document uploaded.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Upload failed.');
    }
  }

  async function saveAndContinue() {
    setError('');
    setSaving(true);
    try {
      const data = step.key === 'org' ? { abn } : {};
      await saveOnboardingStep(step.key, data);
      setDone((d) => {
        const next = [...d];
        next[stepIndex] = true;
        return next;
      });
      showToast(`${step.title} saved and sent for review.`);
      if (stepIndex < STEPS.length - 1) {
        setStepIndex(stepIndex + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      // Server validation errors (ABN digit count, missing policy
      // doc) surface here verbatim — the client doesn't re-derive them.
      setError(err instanceof ApiError ? err.message : 'Could not save this step.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding-page">
      <aside className="onboarding-rail">
        <div className="onboarding-rail-track">
          <div className="onboarding-rail-fill" style={{ width: `${(done.filter(Boolean).length / STEPS.length) * 100}%` }} />
        </div>
        {STEPS.map((t, i) => (
          <button
            key={t.key}
            className={`onboarding-rail-step ${i === stepIndex ? 'onboarding-rail-step-current' : ''}`}
            aria-current={i === stepIndex ? 'step' : undefined}
            onClick={() => setStepIndex(i)}
          >
            <span className={`onboarding-rail-circle ${done[i] ? 'onboarding-rail-circle-done' : ''}`}>
              {done[i] ? '✓' : i + 1}
            </span>
            <span className="onboarding-rail-text">
              <span className="onboarding-rail-title">{t.title}</span>
            </span>
          </button>
        ))}
      </aside>

      <div className="onboarding-panel">
        <p className="onboarding-step-eyebrow">Step {stepIndex + 1} of {STEPS.length}</p>
        <h1 className="onboarding-step-heading">{step.title}</h1>

        {error && (
          <div className="onboarding-error-panel" role="alert">
            {error}
          </div>
        )}

        {step.key === 'org' && (
          <div className="onboarding-field-grid">
            <div>
              <label htmlFor="abn" className="onboarding-field-label">ABN</label>
              <input id="abn" className="onboarding-input" value={abn} onChange={(e) => setAbn(e.target.value)} />
            </div>
          </div>
        )}

        {step.key === 'policy' && (
          <div className="onboarding-docs">
            <p className="onboarding-docs-label">Policy document</p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePolicyUpload(file);
              }}
            />
          </div>
        )}

        <div className="onboarding-footer">
          <button className="btn btn-outline btn-size-default" disabled={stepIndex === 0} onClick={() => setStepIndex((s) => Math.max(0, s - 1))}>
            Back
          </button>
          <button className="btn btn-primary btn-size-default" disabled={saving} onClick={saveAndContinue}>
            {saving ? 'Saving…' : stepIndex === STEPS.length - 1 ? 'Finish onboarding' : 'Save and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
