import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveOnboardingStep, getUploadUrl } from '../api/resources';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import './Onboarding.css';

const STEPS = [
  { key: 'org', title: 'Organisation details', description: 'Basic organisation information' },
  { key: 'insurance', title: 'Insurance & registration', description: 'Compliance information' },
  { key: 'areas', title: 'Service areas & capacity', description: 'Where you work and how much you can take on' },
  { key: 'team', title: 'Team & clearances', description: 'Your roster and after-hours cover' },
  { key: 'policy', title: 'Incident & complaints policy', description: 'Required compliance document' },
  { key: 'billing', title: 'Subscription & leads', description: 'Your current plan' },
];

interface ProviderData {
  legalEntityName?: string; abn?: string; tradingName?: string;
  registrationGroups?: string[]; serviceSuburbs?: string[]; travelRadiusKm?: number;
  weeklyCapacityHours?: number; rosterSize?: number; afterHoursCover?: string;
  incidentPolicyEscalation?: string; plan?: string;
}

// Self-contained — getOnboarding didn't exist as a frontend call
// before this fix, so rather than assume an unconfirmed addition to
// api/resources.ts, this fetches directly the same way adminResources.ts does.
const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('sd_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
async function fetchOnboarding(): Promise<{ steps: { key: string; complete: boolean }[]; provider: ProviderData }> {
  const res = await fetch(`${API_URL}/onboarding`, { headers: authHeaders() });
  if (!res.ok) throw new ApiError((await res.json()).error ?? 'Request failed', res.status);
  return res.json();
}

const REGISTRATION_GROUP_OPTIONS = ['Personal care', 'Domestic assistance', 'Community access', 'Transport', 'Nursing', 'Therapy assistant', 'Overnight support', 'Behaviour support'];
const SUBURB_OPTIONS = ['Bankstown', 'Parramatta', 'Liverpool', 'Blacktown', 'Auburn', 'Lidcombe', 'Canterbury', 'Marrickville'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(new Array(STEPS.length).fill(false));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const showToast = useToast();

  // Field state — all pre-filled from real backend data on load.
  const [legalEntityName, setLegalEntityName] = useState('');
  const [abn, setAbn] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [registrationGroups, setRegistrationGroups] = useState<string[]>([]);
  const [serviceSuburbs, setServiceSuburbs] = useState<string[]>([]);
  const [travelRadiusKm, setTravelRadiusKm] = useState(20);
  const [weeklyCapacityHours, setWeeklyCapacityHours] = useState(40);
  const [rosterSize, setRosterSize] = useState(1);
  const [afterHoursCover, setAfterHoursCover] = useState('');
  const [incidentPolicyEscalation, setIncidentPolicyEscalation] = useState('');
  const [plan, setPlan] = useState('starter');
  const [policyFile, setPolicyFile] = useState<{ name: string; status: 'uploading' | 'uploaded' } | null>(null);

  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchOnboarding()
      .then((res) => {
        setDone(STEPS.map((s) => res.steps.find((rs) => rs.key === s.key)?.complete ?? false));
        const p = res.provider;
        setLegalEntityName(p.legalEntityName ?? '');
        setAbn(p.abn ?? '');
        setTradingName(p.tradingName ?? '');
        setRegistrationGroups(p.registrationGroups ?? []);
        setServiceSuburbs(p.serviceSuburbs ?? []);
        if (p.travelRadiusKm) setTravelRadiusKm(p.travelRadiusKm);
        if (p.weeklyCapacityHours) setWeeklyCapacityHours(p.weeklyCapacityHours);
        if (p.rosterSize) setRosterSize(p.rosterSize);
        setAfterHoursCover(p.afterHoursCover ?? '');
        setIncidentPolicyEscalation(p.incidentPolicyEscalation ?? '');
        setPlan(p.plan ?? 'starter');
        // First incomplete step becomes the starting point, so a
        // returning provider lands where they left off rather than
        // always back at step 1.
        const firstIncomplete = STEPS.findIndex((s) => !res.steps.find((rs) => rs.key === s.key)?.complete);
        setStepIndex(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete);
      })
      .catch((err) => setPageError(err instanceof ApiError ? err.message : 'Unable to load your onboarding progress.'))
      .finally(() => setPageLoading(false));
  }, []);

  const step = STEPS[stepIndex];
  const completedCount = done.filter(Boolean).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);
  const allComplete = completedCount === STEPS.length;

  // A step is reachable if it's already complete, is the current
  // step, or is the very next step after the last completed one —
  // no skipping ahead into steps that were never opened.
  function isStepLocked(i: number): boolean {
    if (done[i]) return false;
    const firstIncomplete = done.findIndex((d) => !d);
    return i > (firstIncomplete === -1 ? STEPS.length : firstIncomplete);
  }

  function goToStep(i: number) {
    if (isStepLocked(i)) return;
    setDirection(i > stepIndex ? 'forward' : 'backward');
    setStepIndex(i);
    setError('');
  }

  function toggleInArray(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handlePolicyUpload(file: File) {
    setPolicyFile({ name: file.name, status: 'uploading' });
    try {
      await getUploadUrl('incident_policy', file.type, file.name);
      setPolicyFile({ name: file.name, status: 'uploaded' });
      showToast('Policy document uploaded.');
    } catch (err) {
      setPolicyFile(null);
      showToast(err instanceof ApiError ? err.message : 'Upload failed.');
    }
  }

  function buildStepData(): Record<string, unknown> {
    switch (step.key) {
      case 'org': return { legalEntityName, abn, tradingName };
      case 'insurance': return { registrationGroups };
      case 'areas': return { serviceSuburbs, travelRadiusKm, weeklyCapacityHours };
      case 'team': return { rosterSize, afterHoursCover };
      case 'policy': return { incidentPolicyEscalation };
      default: return {};
    }
  }

  async function saveAndContinue() {
    setError('');
    setSaving(true);
    setJustSaved(false);
    try {
      await saveOnboardingStep(step.key, buildStepData());
      setDone((d) => { const next = [...d]; next[stepIndex] = true; return next; });
      setJustSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setJustSaved(false), 2500);
      if (stepIndex < STEPS.length - 1) {
        setDirection('forward');
        setStepIndex(stepIndex + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save your changes. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="ob-page">
        <div className="ob-skel-intro" />
        <div className="ob-layout">
          <div className="ob-skel-stepper" />
          <div className="ob-skel-panel" />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="ob-error-state">
        <p className="ob-error-title">Unable to load onboarding</p>
        <p>{pageError}</p>
        <button className="ob-retry-btn" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="ob-page">
      <div className="ob-intro">
        <h1 className="ob-intro-heading">Complete your provider profile</h1>
        <p className="ob-intro-sub">A few quick steps to get your organisation ready to receive relevant enquiries and leads.</p>
        {!allComplete && (
          <div className="ob-progress-summary">
            <span>Step {stepIndex + 1} of {STEPS.length}</span>
            <span className="ob-progress-dot" />
            <span>{progressPct}% complete</span>
          </div>
        )}
      </div>

      {allComplete ? (
        <div className="ob-complete-state">
          <span className="ob-complete-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="m7.5 12.5 3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <h2>You're all set</h2>
          <p>Your provider onboarding is complete.</p>
          <button className="ob-continue-btn" onClick={() => navigate('/dashboard')}>Go to dashboard →</button>
        </div>
      ) : (
        <div className="ob-layout">
          <aside className="ob-stepper" aria-label="Onboarding steps">
            <p className="ob-stepper-eyebrow">Onboarding</p>
            {STEPS.map((s, i) => {
              const locked = isStepLocked(i);
              const state = done[i] ? 'done' : i === stepIndex ? 'current' : locked ? 'locked' : 'upcoming';
              return (
                <button
                  key={s.key}
                  className={`ob-step ob-step-${state}`}
                  onClick={() => goToStep(i)}
                  disabled={locked}
                  aria-current={i === stepIndex ? 'step' : undefined}
                >
                  <span className="ob-step-marker-col">
                    <span className="ob-step-marker">
                      {done[i] ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12.5 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : i + 1}
                    </span>
                    {i < STEPS.length - 1 && <span className={`ob-step-connector ${done[i] ? 'ob-step-connector-done' : ''}`} />}
                  </span>
                  <span className="ob-step-text">
                    <span className="ob-step-title">{s.title}</span>
                    <span className="ob-step-desc">{s.description}</span>
                  </span>
                </button>
              );
            })}
          </aside>

          <div className="ob-mobile-progress">
            <p className="ob-mobile-step-label">Step {stepIndex + 1} of {STEPS.length}</p>
            <h2 className="ob-mobile-step-title">{step.title}</h2>
            <div className="ob-mobile-bar-track"><div className="ob-mobile-bar-fill" style={{ width: `${progressPct}%` }} /></div>
          </div>

          <div className="ob-panel">
            <div key={step.key} className={`ob-step-content ob-anim-${direction}`}>
              <p className="ob-step-eyebrow">Step {stepIndex + 1} of {STEPS.length}</p>
              <h2 className="ob-step-heading">{step.title}</h2>

              {step.key === 'org' && (
                <>
                  <p className="ob-step-intro">Tell us about your organisation so we can set up your provider profile.</p>
                  <div className="ob-field-grid">
                    <div className="ob-field ob-field-full">
                      <label className="ob-field-label" htmlFor="ob-legal-name">Legal entity name</label>
                      <input id="ob-legal-name" className="ob-input" value={legalEntityName} onChange={(e) => setLegalEntityName(e.target.value)} />
                    </div>
                    <div className="ob-field">
                      <label className="ob-field-label" htmlFor="ob-abn">ABN</label>
                      <p className="ob-field-helper">Enter your 11-digit Australian Business Number</p>
                      <input id="ob-abn" className="ob-input" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="81 442 003 91" />
                    </div>
                    <div className="ob-field">
                      <label className="ob-field-label" htmlFor="ob-trading-name">Trading name</label>
                      <p className="ob-field-helper">If different from your legal name</p>
                      <input id="ob-trading-name" className="ob-input" value={tradingName} onChange={(e) => setTradingName(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {step.key === 'insurance' && (
                <>
                  <p className="ob-step-intro">Which registration groups does your organisation hold?</p>
                  <div className="ob-chip-group">
                    {REGISTRATION_GROUP_OPTIONS.map((g) => (
                      <button key={g} type="button" className={`ob-chip ${registrationGroups.includes(g) ? 'ob-chip-selected' : ''}`} onClick={() => toggleInArray(registrationGroups, g, setRegistrationGroups)}>
                        {g}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step.key === 'areas' && (
                <>
                  <p className="ob-step-intro">Where do you work, and how much capacity do you have?</p>
                  <div className="ob-field ob-field-full">
                    <label className="ob-field-label">Service suburbs</label>
                    <div className="ob-chip-group">
                      {SUBURB_OPTIONS.map((s) => (
                        <button key={s} type="button" className={`ob-chip ${serviceSuburbs.includes(s) ? 'ob-chip-selected' : ''}`} onClick={() => toggleInArray(serviceSuburbs, s, setServiceSuburbs)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ob-field-grid">
                    <div className="ob-field">
                      <label className="ob-field-label" htmlFor="ob-radius">Travel radius (km)</label>
                      <input id="ob-radius" type="number" className="ob-input" value={travelRadiusKm} onChange={(e) => setTravelRadiusKm(Number(e.target.value))} />
                    </div>
                    <div className="ob-field">
                      <label className="ob-field-label" htmlFor="ob-capacity">Weekly capacity (hours)</label>
                      <input id="ob-capacity" type="number" className="ob-input" value={weeklyCapacityHours} onChange={(e) => setWeeklyCapacityHours(Number(e.target.value))} />
                    </div>
                  </div>
                </>
              )}

              {step.key === 'team' && (
                <>
                  <p className="ob-step-intro">Tell us about your roster and after-hours cover.</p>
                  <div className="ob-field-grid">
                    <div className="ob-field">
                      <label className="ob-field-label" htmlFor="ob-roster">Roster size</label>
                      <input id="ob-roster" type="number" className="ob-input" value={rosterSize} onChange={(e) => setRosterSize(Number(e.target.value))} />
                    </div>
                    <div className="ob-field ob-field-full">
                      <label className="ob-field-label" htmlFor="ob-afterhours">After-hours cover</label>
                      <textarea id="ob-afterhours" className="ob-textarea" value={afterHoursCover} onChange={(e) => setAfterHoursCover(e.target.value)} rows={3} placeholder="Describe how after-hours enquiries are handled" />
                    </div>
                  </div>
                </>
              )}

              {step.key === 'policy' && (
                <>
                  <p className="ob-step-intro">Upload your incident and complaints policy, and describe your escalation process.</p>
                  <div className="ob-field ob-field-full">
                    <label className="ob-field-label">Policy document</label>
                    {policyFile ? (
                      <div className="ob-upload-done">
                        <span>{policyFile.status === 'uploading' ? 'Uploading…' : `✓ ${policyFile.name}`}</span>
                        <button type="button" onClick={() => setPolicyFile(null)}>Remove</button>
                      </div>
                    ) : (
                      <label className="ob-upload-box">
                        Upload document
                        <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePolicyUpload(f); }} />
                      </label>
                    )}
                  </div>
                  <div className="ob-field ob-field-full">
                    <label className="ob-field-label" htmlFor="ob-escalation">Escalation process</label>
                    <textarea id="ob-escalation" className="ob-textarea" value={incidentPolicyEscalation} onChange={(e) => setIncidentPolicyEscalation(e.target.value)} rows={3} />
                  </div>
                </>
              )}

              {step.key === 'billing' && (
                <>
                  <p className="ob-step-intro">Your current plan determines how many leads you can unlock.</p>
                  <div className="ob-plan-card">
                    <span className="ob-plan-label">Current plan</span>
                    <span className="ob-plan-name">{plan}</span>
                    <a href="/plans" className="ob-plan-link">Manage plan →</a>
                  </div>
                </>
              )}

              {error && <p className="ob-error-inline" role="alert">{error}</p>}
            </div>

            <div className="ob-footer">
              <div>
                {stepIndex > 0 && <button className="ob-back-btn" onClick={() => goToStep(stepIndex - 1)}>← Back</button>}
              </div>
              <div className="ob-footer-right">
                {justSaved && <span className="ob-saved-indicator">✓ Saved</span>}
                <button className="ob-continue-btn" disabled={saving} onClick={saveAndContinue}>
                  {saving ? 'Saving…' : stepIndex === STEPS.length - 1 ? 'Finish onboarding →' : 'Save & continue →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
