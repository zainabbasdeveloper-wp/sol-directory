import { useEffect, useMemo, useRef, useState } from 'react';
import { useMatchModal } from '../context/MatchModalContext';
import { listActiveServices, type ActiveService } from '../api/serviceCatalogue';
import { ApiError } from '../api/client';
import { searchPlaces, lookupPostcode, formatPlace, placeSearchEnabled, type PlaceSuggestion } from '../lib/places';
import './MatchingWizard.css';

/**
 * "Get matched" wizard — one question per screen, modelled on the Carevo
 * flow: who → where → what → how soon → funding → (plan management) →
 * contact details. Design rules this component follows:
 *
 *  - Every step says where you are ("Step 3 of 9 · Support needed") and,
 *    on desktop, the sidebar lists the whole journey plus what happens next.
 *  - The Back / Continue bar is pinned to the bottom of the popup and only
 *    the question area scrolls, so Continue is never below the fold no
 *    matter how many options a step has or how small the screen is.
 *  - The popup sizes itself to the viewport (full-screen on phones).
 *  - Option cards are compact rows in a grid, so most steps fit without
 *    scrolling at all.
 */

interface MatchFormData {
  // Display text of the chosen place, e.g. "Bankstown, NSW 2200". This is
  // also all that exists when the family types a place without picking a
  // suggestion (the API then falls back to it as the suburb).
  location: string;
  // Structured parts, set only when a suggestion is picked — these are
  // what let the API match by real suburb name and by distance.
  suburb: string;
  state: string;
  postcode: string;
  lat: string;
  lng: string;
  service: string;
  careFor: string;
  timeframe: string;
  funding: string;
  planManagement: string;
  email: string;
  phone: string;
  name: string;
  additionalDetails: string;
}

// Matches the API's "neutral service" value (matching.service.ts).
const SERVICE_NOT_SURE = 'Not sure yet';

const EMPTY_FORM: MatchFormData = {
  location: '', suburb: '', state: '', postcode: '', lat: '', lng: '',
  // Not asked as its own step for now — sent as-is so matching still gets a value.
  service: SERVICE_NOT_SURE, careFor: '', timeframe: '', funding: '', planManagement: '',
  email: '', phone: '', name: '', additionalDetails: '',
};

// v2: the step order changed, so an older saved draft's step index would
// point at the wrong question. Old drafts are simply discarded.
const DRAFT_STORAGE_KEY = 'mw_draft_v2';
const LEGACY_DRAFT_KEY = 'mw_draft';

type StepId = 'careFor' | 'location' | 'service' | 'timeframe' | 'funding' | 'planManagement' | 'email' | 'phone' | 'name' | 'additionalDetails';
type Phase = 'wizard' | 'review' | 'success';

const STEP_LABELS: Record<StepId, string> = {
  careFor: 'Who it’s for', location: 'Location', service: 'Support needed', timeframe: 'Timing', funding: 'Funding',
  planManagement: 'Plan management', email: 'Email', phone: 'Phone', name: 'Your name', additionalDetails: 'Anything else',
};

function getSteps(funding: string): StepId[] {
  // "service" is not asked as its own step for now (see EMPTY_FORM).
  const base: StepId[] = ['careFor', 'location', 'timeframe', 'funding'];
  if (funding === 'NDIS') base.push('planManagement');
  return [...base, 'email', 'phone', 'name', 'additionalDetails'];
}

// `value` is what's stored and sent to the API (matching and existing
// records depend on these exact strings); `label` is what people read.
interface Option { value: string; label: string; icon: JSX.Element }

const CARE_FOR_OPTIONS: Option[] = [
  { value: 'Myself', label: 'Myself', icon: <IconPerson /> },
  { value: 'Family member', label: 'Family Member', icon: <IconFamily /> },
  { value: 'A client I support', label: 'A Client I Support', icon: <IconClipboard /> },
  { value: 'Someone else', label: 'Someone Else', icon: <IconPersonPlus /> },
];
const TIMEFRAME_OPTIONS: Option[] = [
  { value: 'Immediately', label: 'Immediately', icon: <IconBolt /> },
  { value: 'Within a week', label: 'Within a Week', icon: <IconCalendar /> },
  { value: 'Within a month', label: 'Within a Month', icon: <IconCalendarRange /> },
  { value: 'Just researching', label: 'Just Researching', icon: <IconSearch /> },
];
const FUNDING_OPTIONS: Option[] = [
  { value: 'NDIS', label: 'NDIS', icon: <IconSupport /> },
  { value: 'Aged Care', label: 'Aged Care', icon: <IconHome /> },
  { value: 'Privately funded', label: 'Privately Funded', icon: <IconWallet /> },
  { value: 'DVA / Veterans', label: 'DVA / Veterans', icon: <IconShield /> },
  { value: 'Still applying', label: 'Still Applying', icon: <IconHelp /> },
  { value: 'Not sure', label: 'Not Sure', icon: <IconHelp /> },
];
const PLAN_OPTIONS: Option[] = [
  { value: 'Plan managed', label: 'Plan Managed', icon: <IconClipboard /> },
  { value: 'Self-managed', label: 'Self-Managed', icon: <IconPerson /> },
  { value: 'NDIA managed', label: 'NDIA Managed', icon: <IconShield /> },
  { value: 'Not sure', label: 'Not Sure', icon: <IconHelp /> },
];

const EMAIL_RE = /.+@.+\..+/;

const NEXT_STEPS = [
  'We compare your request with provider service areas, funding arrangements and confirmed capacity.',
  'Relevant providers may be notified and may contact you directly.',
  'You can compare providers, verify their credentials and decide whether to enter a service agreement.',
];

export default function MatchingWizard() {
  const { isOpen, closeMatchModal } = useMatchModal();
  const [form, setForm] = useState<MatchFormData>(EMPTY_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('wizard');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [error, setError] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [serviceOptions, setServiceOptions] = useState<ActiveService[]>([]);
  // Backend Lead._id for this in-progress enquiry, once autosaved at
  // least once (developer brief: "Save at every step, not only on
  // submit"). Persisted to localStorage below so a page refresh mid-
  // wizard doesn't lose progress, and sent with the final submit so
  // it finalizes this SAME document rather than creating a second one.
  const [draftId, setDraftId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    listActiveServices().then((res) => setServiceOptions(res.items)).catch(() => {});
  }, []);

  // Stop the page behind the popup scrolling while it's open.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  // Restore a resumable draft when the modal opens — only runs when
  // isOpen flips false->true, so it never clobbers live typing.
  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.form) {
        setForm({
          ...EMPTY_FORM,
          ...parsed.form,
          service: parsed.form.service?.trim() || SERVICE_NOT_SURE,
        });
      }
      if (parsed.draftId) setDraftId(parsed.draftId);
      if (typeof parsed.stepIndex === 'number') setStepIndex(parsed.stepIndex);
    } catch { /* corrupt/old localStorage value — just start fresh */ }
  }, [isOpen]);

  // Keeps localStorage in sync with the in-progress wizard so a
  // refresh restores instantly with no network round-trip, independent
  // of the (fire-and-forget) server autosave below.
  //
  // Only while the wizard is open AND something has been entered: this
  // effect used to run on every page load with the pristine empty form,
  // overwriting any saved draft before the wizard was ever opened — so
  // "resume after a refresh" silently never worked.
  useEffect(() => {
    if (!isOpen || phase === 'success') return;
    if (stepIndex === 0 && !Object.values(form).some((v) => v.trim() !== '')) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ form, draftId, stepIndex }));
    } catch { /* private browsing / storage full — resuming just won't work, not fatal */ }
  }, [isOpen, form, draftId, stepIndex, phase]);

  async function saveDraftToServer(currentForm: MatchFormData) {
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
      const res = await fetch(`${API_URL}/match-requests/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          ...currentForm,
          service: currentForm.service.trim() || SERVICE_NOT_SURE,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftId(data.draftId);
      }
    } catch { /* autosave is best-effort — never blocks the wizard */ }
  }

  const steps = getSteps(form.funding);
  // A resumed draft (or a funding change) can leave the index past the end.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStepId = steps[safeIndex];
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

  function patch(p: Partial<MatchFormData>) {
    setForm((f) => ({ ...f, ...p }));
    setError('');
  }

  function requestClose() {
    if (hasProgress && phase !== 'success') {
      setConfirmClose(true);
    } else {
      reset();
    }
  }

  // Closes/resets the in-memory UI only — deliberately does NOT touch
  // the persisted draft (localStorage + server), so "Leave" really can
  // be resumed later, matching the confirm dialog's own copy below.
  function reset() {
    setForm(EMPTY_FORM);
    setStepIndex(0);
    setPhase('wizard');
    setError('');
    setConfirmClose(false);
    closeMatchModal();
  }

  // Called once a real enquiry has actually been submitted — from
  // this point the draft is a finished Lead, not something to resume.
  function clearPersistedDraft() {
    setDraftId(null);
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { /* ignore */ }
  }

  function validateStep(id: StepId): string {
    const v = form[id];
    if (id === 'location' && !v.trim()) return 'Enter a suburb or postcode so we know where to look.';
    if (id === 'careFor' && !v) return 'Choose who this is for.';
    if (id === 'timeframe' && !v) return 'Choose a timeframe.';
    if (id === 'funding' && !v) return 'Choose a funding type. “Not Sure” is a fine answer.';
    if (id === 'planManagement' && !v) return 'Choose an option. “Not Sure” is fine.';
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
    saveDraftToServer(form); // fire-and-forget — never blocks moving to the next step
    if (safeIndex === steps.length - 1) {
      setPhase('review');
    } else {
      setStepIndex(safeIndex + 1);
    }
  }

  function skipStep() {
    setError('');
    setDirection('forward');
    if (safeIndex === steps.length - 1) setPhase('review');
    else setStepIndex(safeIndex + 1);
  }

  function goBack() {
    setError('');
    setDirection('backward');
    if (phase === 'review') {
      setPhase('wizard');
      return;
    }
    if (safeIndex > 0) setStepIndex(safeIndex - 1);
  }

  function editField(id: StepId) {
    const idx = steps.indexOf(id);
    setStepIndex(idx === -1 ? 0 : idx);
    setPhase('wizard');
    setDirection('backward');
  }

  async function submitRequest() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL ?? '/api';
      const res = await fetch(`${API_URL}/match-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          ...form,
          service: form.service.trim() || SERVICE_NOT_SURE,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error ?? 'Something went wrong sending your request.', res.status);
      }
      clearPersistedDraft();
      setPhase('success');
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Something went wrong sending your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isOptionalStep = currentStepId === 'phone' || currentStepId === 'additionalDetails';

  return (
    <div className="mw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }}>
      <div className="mw-modal" role="dialog" aria-modal="true" aria-labelledby="mw-heading">
        <button type="button" className="mw-close" onClick={requestClose} aria-label="Close">✕</button>

        {phase !== 'success' && (
          <aside className="mw-sidebar">
            <p className="mw-sidebar-eyebrow">Provider enquiry request</p>
            <p className="mw-sidebar-copy">
              Provide the information needed to identify providers serving your area. Submitting a request is free.
            </p>
            <ol className="mw-sidebar-steps">
              {steps.map((id, i) => {
                const state = phase === 'review' ? 'done' : i < safeIndex ? 'done' : i === safeIndex ? 'active' : 'upcoming';
                return (
                  <li key={id} className={`mw-sidebar-step mw-sidebar-step-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
                    <span className="mw-sidebar-step-marker" aria-hidden="true">{state === 'done' ? '✓' : i + 1}</span>
                    {STEP_LABELS[id]}
                  </li>
                );
              })}
              <li className={`mw-sidebar-step ${phase === 'review' ? 'mw-sidebar-step-active' : 'mw-sidebar-step-upcoming'}`}>
                <span className="mw-sidebar-step-marker" aria-hidden="true">{steps.length + 1}</span>
                Review and send
              </li>
            </ol>
            <p className="mw-sidebar-reassurance">
              Your information is used to process your request and is shared only as described in our Privacy Policy.
            </p>
          </aside>
        )}

        <div className={`mw-content ${phase === 'success' ? 'mw-content-full' : ''}`}>
          {phase === 'wizard' && (
            <form className="mw-form" noValidate onSubmit={(e) => { e.preventDefault(); goNext(); }}>
              <div className="mw-progress-row">
                <span className="mw-progress-text">
                  Step {safeIndex + 1} of {steps.length}
                  <span className="mw-progress-label"> · {STEP_LABELS[currentStepId]}</span>
                </span>
                <div className="mw-progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={safeIndex + 1}>
                  <div className="mw-progress-fill" style={{ width: `${((safeIndex + 1) / steps.length) * 100}%` }} />
                </div>
              </div>

              <div className="mw-scroll">
                <div key={currentStepId} className={`mw-step-body mw-anim-${direction}`}>
                  <WizardStep
                    stepId={currentStepId}
                    form={form}
                    set={set}
                    patch={patch}
                    headingRef={headingRef}
                    error={error}
                    serviceOptions={serviceOptions}
                  />
                </div>
              </div>

              <div className="mw-nav-row">
                {safeIndex > 0 ? (
                  <button type="button" className="mw-back-btn" onClick={goBack}>← Back</button>
                ) : <span />}
                <div className="mw-nav-right">
                  {isOptionalStep && (
                    <button type="button" className="mw-skip-btn" onClick={skipStep}>Skip</button>
                  )}
                  <button type="submit" className="btn-gradient mw-continue-btn">Continue →</button>
                </div>
              </div>
            </form>
          )}

          {phase === 'review' && (
            <div className="mw-form">
              <div className="mw-scroll">
                <h2 id="mw-heading" ref={headingRef} tabIndex={-1} className="mw-question">Check your request</h2>
                <p className="mw-supporting">Review the information below before submitting your provider enquiry request.</p>

                <div className="mw-review-list">
                  <ReviewRow label="Who the support is for" value={labelFor(CARE_FOR_OPTIONS, form.careFor)} onEdit={() => editField('careFor')} />
                  <ReviewRow label="Location" value={form.location} onEdit={() => editField('location')} />
                  <ReviewRow label="Timeframe" value={labelFor(TIMEFRAME_OPTIONS, form.timeframe)} onEdit={() => editField('timeframe')} />
                  <ReviewRow label="Funding" value={labelFor(FUNDING_OPTIONS, form.funding)} onEdit={() => editField('funding')} />
                  {form.funding === 'NDIS' && (
                    <ReviewRow label="Plan management" value={labelFor(PLAN_OPTIONS, form.planManagement)} onEdit={() => editField('planManagement')} />
                  )}
                  <ReviewRow label="Email" value={form.email} onEdit={() => editField('email')} />
                  <ReviewRow label="Phone" value={form.phone || '—'} onEdit={() => editField('phone')} />
                  <ReviewRow label="Name" value={form.name} onEdit={() => editField('name')} />
                  <ReviewRow label="Additional details" value={form.additionalDetails || '—'} onEdit={() => editField('additionalDetails')} />
                </div>

                <div className="mw-next-steps">
                  <p className="mw-next-steps-title">What happens next</p>
                  <ol>{NEXT_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
                </div>
                {submitError && <p className="mw-error" role="alert">{submitError}</p>}
              </div>

              <div className="mw-nav-row">
                <button type="button" className="mw-back-btn" onClick={goBack}>← Back</button>
                <button type="button" className="btn-gradient mw-continue-btn" onClick={submitRequest} disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send my request →'}
                </button>
              </div>
            </div>
          )}

          {phase === 'success' && (
            <div className="mw-success">
              <span className="mw-success-icon"><IconCheckCircleBig /></span>
              <h2 id="mw-heading" ref={headingRef} tabIndex={-1} className="mw-question">Thank you. Your request has been sent.</h2>
              <p className="mw-supporting">We are processing your request and identifying relevant providers.</p>
              <div className="mw-next-steps mw-next-steps-center">
                <p className="mw-next-steps-title">What happens next</p>
                <ol>{NEXT_STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
              </div>
              <p className="mw-success-line">We have emailed you a confirmation.</p>
              <div className="mw-success-actions">
                <button type="button" className="btn-gradient" onClick={reset}>Back to SolDirectory</button>
              </div>
            </div>
          )}
        </div>

        {confirmClose && (
          <div className="mw-confirm-overlay">
            <div className="mw-confirm-card" role="alertdialog" aria-labelledby="mw-confirm-title">
              <p id="mw-confirm-title" className="mw-confirm-title">Leave your matching request?</p>
              <p className="mw-confirm-body">Your progress is saved. Reopen “Get matched” at any time to continue where you left off.</p>
              <div className="mw-confirm-actions">
                <button type="button" className="mw-back-btn" onClick={() => setConfirmClose(false)}>Keep going</button>
                <button type="button" className="mw-leave-btn" onClick={reset}>Leave</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function labelFor(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="mw-review-row">
      <div>
        <p className="mw-review-label">{label}</p>
        <p className="mw-review-value">{value}</p>
      </div>
      <button type="button" className="mw-edit-btn" onClick={onEdit}>Edit</button>
    </div>
  );
}

// Live suburb/postcode search. Debounced, cancels stale requests, and
// degrades silently to a plain text input (no dropdown, no error shown)
// if the public Mapbox token isn't configured, same reliability
// principle as ProviderMap's own missing-token handling.
function LocationInput({ value, onType, onSelect }: {
  value: string;
  onType: (text: string) => void;
  onSelect: (s: PlaceSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Set right after a pick so the effect below doesn't immediately
  // re-search the text we just filled in and re-open the list.
  const justPicked = useRef(false);
  // Invalidates an in-flight postcode lookup if the person picks something
  // else or starts typing again before it returns.
  const pickToken = useRef(0);

  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return; }
    if (!placeSearchEnabled || value.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(value, controller.signal).then((items) => {
        if (controller.signal.aborted) return;
        setSuggestions(items);
        setActiveIndex(-1);
        setSearching(false);
      });
    }, 220);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(s: PlaceSuggestion) {
    justPicked.current = true;
    onSelect(s);
    setSuggestions([]);
    setOpen(false);

    // Suggestion rows only carry a postcode for postcode searches. Look
    // it up ONCE for the suburb actually chosen (one request) instead of
    // for every row on every keystroke.
    if (!s.postcode && s.lat != null && s.lng != null) {
      const token = ++pickToken.current;
      lookupPostcode(s.lng, s.lat).then((pc) => {
        if (pc && token === pickToken.current) {
          justPicked.current = true; // don't re-search the text we're about to update
          onSelect({ ...s, postcode: pc });
        }
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); pick(suggestions[activeIndex]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  }

  const showList = open && suggestions.length > 0;
  const noResults = open && !searching && placeSearchEnabled && value.trim().length >= 2 && suggestions.length === 0;

  return (
    <div className="mw-input-icon-wrap" ref={wrapRef}>
      <IconMapPin />
      <input
        className="mw-input mw-input-icon"
        value={value}
        onChange={(e) => { pickToken.current++; onType(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search suburb or postcode"
        aria-label="Suburb or postcode"
        autoComplete="off"
        autoFocus
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls="mw-location-suggestions"
        aria-activedescendant={activeIndex >= 0 ? `mw-loc-${activeIndex}` : undefined}
      />
      {showList && (
        <ul id="mw-location-suggestions" role="listbox" className="mw-suggestions">
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              id={`mw-loc-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`mw-suggestion${i === activeIndex ? ' mw-suggestion-active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
            >
              <span className="mw-suggestion-name">
                {s.suburb}{s.postcode && s.postcode !== s.suburb ? ` (${s.postcode})` : ''}
              </span>
              <span className="mw-suggestion-state">{s.state}</span>
            </li>
          ))}
        </ul>
      )}
      {noResults && <p className="mw-hint mw-hint-floating">No matching suburb found. Check the spelling, or try a postcode.</p>}
    </div>
  );
}

/** Radio-style option cards: compact rows in a responsive grid. */
function OptionGrid({ options, value, onChange, labelledBy, columns }: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  labelledBy: string;
  columns: 2 | 3;
}) {
  return (
    <div className={`mw-card-grid mw-card-grid-${columns}`} role="radiogroup" aria-labelledby={labelledBy}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`mw-option-card ${selected ? 'mw-option-card-selected' : ''}`}
            onClick={() => onChange(o.value)}
          >
            <span className="mw-option-icon" aria-hidden="true">{o.icon}</span>
            <span className="mw-option-label">{o.label}</span>
            <span className="mw-option-check" aria-hidden="true">{selected ? '✓' : ''}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Searchable list instead of a wall of cards: type to filter, or pick from
 * the most common services shown by default. Nobody scrolls through 40
 * options to find one.
 */
function ServiceStep({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: ActiveService[];
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = useMemo(
    () => (q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options),
    [options, q]
  );
  const limit = q ? 8 : 6;
  const shown = matches.slice(0, limit);
  const hidden = matches.length - shown.length;

  if (value) {
    return (
      <div className="mw-selected-chip">
        <span className="mw-selected-chip-label">Selected</span>
        <span className="mw-selected-chip-value">{value}</span>
        <button type="button" className="mw-selected-chip-change" onClick={() => onChange('')}>Change</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mw-input-icon-wrap">
        <IconSearch />
        <input
          className="mw-input mw-input-icon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search supports, e.g. personal care, physiotherapy"
          aria-label="Search supports"
          autoComplete="off"
          autoFocus
        />
      </div>

      <p className="mw-list-caption">{q ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : 'Common supports'}</p>
      <ul className="mw-service-list" role="listbox" aria-label="Supports">
        {shown.map((s) => (
          <li key={s.id}>
            <button type="button" role="option" aria-selected={false} className="mw-service-row" onClick={() => onChange(s.name)}>
              {s.name}
            </button>
          </li>
        ))}
        {options.length === 0 && <li className="mw-hint">Loading supports…</li>}
        {options.length > 0 && matches.length === 0 && <li className="mw-hint">Nothing matches “{query}”. Try a shorter word.</li>}
        <li>
          <button type="button" role="option" aria-selected={false} className="mw-service-row mw-service-row-muted" onClick={() => onChange(SERVICE_NOT_SURE)}>
            I’m not sure yet
          </button>
        </li>
      </ul>
      {hidden > 0 && <p className="mw-hint">{hidden} more. Keep typing to narrow the list.</p>}
    </div>
  );
}

function Heading({ headingRef, children }: { headingRef: React.RefObject<HTMLHeadingElement>; children: React.ReactNode }) {
  return <h2 id="mw-heading" ref={headingRef} tabIndex={-1} className="mw-question">{children}</h2>;
}

function WizardStep({
  stepId, form, set, patch, headingRef, error, serviceOptions,
}: {
  stepId: StepId;
  form: MatchFormData;
  set: <K extends keyof MatchFormData>(key: K, value: string) => void;
  patch: (p: Partial<MatchFormData>) => void;
  headingRef: React.RefObject<HTMLHeadingElement>;
  error: string;
  serviceOptions: ActiveService[];
}) {
  const err = error ? <p className="mw-error" role="alert">{error}</p> : null;

  if (stepId === 'careFor') {
    return (
      <>
        <Heading headingRef={headingRef}>Who is the care for?</Heading>
        <p className="mw-supporting">Tell us who you are arranging support for.</p>
        <OptionGrid options={CARE_FOR_OPTIONS} value={form.careFor} onChange={(v) => set('careFor', v)} labelledBy="mw-heading" columns={2} />
        {err}
      </>
    );
  }

  if (stepId === 'location') {
    return (
      <>
        <Heading headingRef={headingRef}>Where do you need care?</Heading>
        <p className="mw-supporting">We’ll match you with providers in that area.</p>
        <LocationInput
          value={form.location}
          // Typing again invalidates any earlier pick, so the structured
          // parts never disagree with what's in the box.
          onType={(text) => patch({ location: text, suburb: '', state: '', postcode: '', lat: '', lng: '' })}
          onSelect={(s) => patch({
            location: formatPlace(s),
            suburb: s.suburb, state: s.state, postcode: s.postcode,
            lat: s.lat != null ? String(s.lat) : '', lng: s.lng != null ? String(s.lng) : '',
          })}
        />
        {err}
      </>
    );
  }

  if (stepId === 'timeframe') {
    return (
      <>
        <Heading headingRef={headingRef}>How quickly do you need to find care?</Heading>
        <p className="mw-supporting">This helps us prioritise providers who can start within your timeframe.</p>
        <OptionGrid options={TIMEFRAME_OPTIONS} value={form.timeframe} onChange={(v) => set('timeframe', v)} labelledBy="mw-heading" columns={2} />
        {err}
      </>
    );
  }

  if (stepId === 'funding') {
    return (
      <>
        <Heading headingRef={headingRef}>How is their care funded?</Heading>
        <p className="mw-supporting">If you are not sure yet, that is completely fine.</p>
        <OptionGrid options={FUNDING_OPTIONS} value={form.funding} onChange={(v) => set('funding', v)} labelledBy="mw-heading" columns={3} />
        {err}
      </>
    );
  }

  if (stepId === 'planManagement') {
    return (
      <>
        <Heading headingRef={headingRef}>How is the plan managed?</Heading>
        <p className="mw-supporting">Choose how the NDIS plan is managed. Select “Not Sure” if you don’t know.</p>
        <OptionGrid options={PLAN_OPTIONS} value={form.planManagement} onChange={(v) => set('planManagement', v)} labelledBy="mw-heading" columns={2} />
        {err}
      </>
    );
  }

  if (stepId === 'email') {
    return (
      <>
        <p className="mw-eyebrow">Almost there</p>
        <Heading headingRef={headingRef}>Where should matched providers reach you?</Heading>
        <p className="mw-supporting">
          Your details are never sold. They go to your matched providers so they can arrange your support, and to the
          partners who run our platform.
        </p>
        <label htmlFor="mw-email" className="mw-field-label">Email address</label>
        <input
          id="mw-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="mw-input"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="Email address"
          autoFocus
        />
        {err}
        <p className="mw-fine-print">
          By continuing, you agree to our <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </>
    );
  }

  if (stepId === 'phone') {
    return (
      <>
        <Heading headingRef={headingRef}>What’s the best number to reach you?</Heading>
        <p className="mw-supporting">Optional. A phone number lets providers contact you faster.</p>
        <label htmlFor="mw-phone" className="mw-field-label">Phone number</label>
        <input
          id="mw-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
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
        <Heading headingRef={headingRef}>What’s your name?</Heading>
        <p className="mw-supporting">So providers know who they are speaking with.</p>
        <label htmlFor="mw-name" className="mw-field-label">Your name</label>
        <input
          id="mw-name"
          className="mw-input"
          autoComplete="name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Your name"
          autoFocus
        />
        {err}
      </>
    );
  }

  return (
    <>
      <Heading headingRef={headingRef}>Anything else providers should know?</Heading>
      <p className="mw-supporting">Optional. Add anything that would help a provider understand the support you are looking for.</p>
      <label htmlFor="mw-details" className="mw-field-label">Additional details</label>
      <textarea
        id="mw-details"
        className="mw-textarea"
        value={form.additionalDetails}
        onChange={(e) => set('additionalDetails', e.target.value)}
        placeholder="For example: preferred days and times, language spoken, or specific goals."
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
