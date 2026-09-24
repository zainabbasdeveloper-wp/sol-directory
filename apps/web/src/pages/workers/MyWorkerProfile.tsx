import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../api/client';
import { deleteMyPhoto, fetchMyPhotoUrl, getMyWorker, saveMyWorker, uploadMyPhoto, type MyWorkerProfile } from '../../api/profilesApi';
import { listActiveServices } from '../../api/serviceCatalogue';
import { listActiveConditions } from '../../api/conditionCatalogue';
import { toJpeg } from '../../lib/imageJpeg';
import './MyWorkerProfile.css';

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** /worker/profile — a worker builds their own profile and chooses whether it's public. */
export default function MyWorkerProfilePage() {
  const showToast = useToast();
  const [me, setMe] = useState<MyWorkerProfile | null>(null);
  const [form, setForm] = useState<MyWorkerProfile | null>(null);
  const [languages, setLanguages] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyWorker()
      .then((w) => { setMe(w); setForm(w); setLanguages(w.languages.join(', ')); })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Unable to load your profile.'));
    listActiveServices('worker').then((r) => setServices(r.items.map((s) => s.name))).catch(() => {});
    listActiveConditions().then((r) => setConditions(r.items.map((c) => c.name))).catch(() => {});
  }, []);

  // The owner's own photo, fetched with their login so it shows even before
  // the public profile is approved. Placed before the early returns (hooks).
  const [photo, setPhoto] = useState<string | null>(null);
  const hasPhoto = me?.hasPhoto ?? false;
  const photoVersion = me?.photoVersion ?? 0;
  useEffect(() => {
    if (!hasPhoto) { setPhoto(null); return; }
    let url: string | null = null;
    let alive = true;
    fetchMyPhotoUrl().then((u) => { url = u; if (alive) setPhoto(u); else if (u) URL.revokeObjectURL(u); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [hasPhoto, photoVersion]);

  if (error && !form) return <div className="mwp"><p role="alert">{error}</p></div>;
  if (!form || !me) return <div className="mwp"><p>Loading…</p></div>;

  const set = <K extends keyof MyWorkerProfile>(k: K, v: MyWorkerProfile[K]) => setForm({ ...form, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveMyWorker({
        ...form,
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        hourlyRate: form.hourlyRate === null || Number.isNaN(form.hourlyRate) ? null : form.hourlyRate,
      });
      setMe(saved);
      setForm(saved);
      setLanguages(saved.languages.join(', '));
      showToast('Profile saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please choose an image file.'); return; }
    setPhotoBusy(true);
    try {
      const saved = await uploadMyPhoto(await toJpeg(file, 'cover', 480));
      setMe(saved);
      setForm((f) => (f ? { ...f, hasPhoto: saved.hasPhoto, photoVersion: saved.photoVersion } : f));
      showToast('Photo updated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not use that photo.');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      const saved = await deleteMyPhoto();
      setMe(saved);
      setForm((f) => (f ? { ...f, hasPhoto: false } : f));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not remove your photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  const name = `${form.firstName} ${form.lastName}`.trim();
  const live = me.publicProfile && me.approved && me.publicSlug;

  return (
    <div className="mwp">
      <h1 className="page-title">My worker profile</h1>
      <p className="mwp-intro">
        Tell organisations what you offer. Your email and phone are never shown publicly. Your profile appears on the public site only if you
        turn it on below <em>and</em> SolDirectory has approved it.
      </p>

      <form onSubmit={submit} className="mwp-form">
        <section className="mwp-card">
          <h2>Photo</h2>
          <div className="mwp-photo">
            <Avatar src={photo} name={name} size="lg" />
            <div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
              <button type="button" className="mwp-btn" disabled={photoBusy} onClick={() => fileRef.current?.click()}>{me.hasPhoto ? 'Change photo' : 'Upload a photo'}</button>
              {me.hasPhoto && <button type="button" className="mwp-link" disabled={photoBusy} onClick={removePhoto}>Remove</button>}
              <p className="mwp-hint">A clear head-and-shoulders photo of you. It’s cropped to a square. If you don’t add one, your initials are shown.</p>
            </div>
          </div>
        </section>

        <section className="mwp-card">
          <h2>About you</h2>
          <div className="mwp-grid">
            <label>First name<input required maxLength={40} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></label>
            <label>Last name<input required maxLength={40} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /><span className="mwp-hint">Only your first initial is shown publicly.</span></label>
            <label>Job title<input maxLength={60} placeholder="e.g. Support worker" value={form.role} onChange={(e) => set('role', e.target.value)} /></label>
            <label>Experience<input maxLength={30} placeholder="e.g. 5 years" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} /></label>
            <label className="mwp-full">About me
              <textarea rows={5} maxLength={800} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="What you do, who you support and how you like to work." />
              <span className="mwp-hint">{form.bio.length}/800 — don’t include phone numbers, emails or addresses.</span>
            </label>
          </div>
        </section>

        <section className="mwp-card">
          <h2>Location and availability</h2>
          <div className="mwp-grid">
            <label>Suburb<input maxLength={60} value={form.suburb} onChange={(e) => set('suburb', e.target.value)} /></label>
            <label>State
              <select value={form.state} onChange={(e) => set('state', e.target.value)}>
                <option value="">Choose…</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Indicative hourly rate ($)<input type="number" min={0} max={500} step="0.5" value={form.hourlyRate ?? ''} onChange={(e) => set('hourlyRate', e.target.value === '' ? null : Number(e.target.value))} /></label>
            <label className="mwp-check"><input type="checkbox" checked={form.hasCar} onChange={(e) => set('hasCar', e.target.checked)} /> I have my own car</label>
          </div>
          <fieldset className="mwp-fieldset">
            <legend>Days available</legend>
            <div className="mwp-chips">
              {DAYS.map((d) => (
                <button key={d} type="button" aria-pressed={form.availableDays.includes(d)} className={`mwp-chip${form.availableDays.includes(d) ? ' mwp-chip-on' : ''}`} onClick={() => set('availableDays', toggle(form.availableDays, d))}>{d}</button>
              ))}
            </div>
          </fieldset>
          <label className="mwp-full-label">Availability note
            <input maxLength={300} placeholder="e.g. Mornings and weekends" value={form.availabilityNote} onChange={(e) => set('availabilityNote', e.target.value)} />
          </label>
        </section>

        <section className="mwp-card">
          <h2>Supports you offer</h2>
          <div className="mwp-chips">
            {services.map((s) => (
              <button key={s} type="button" aria-pressed={form.services.includes(s)} className={`mwp-chip${form.services.includes(s) ? ' mwp-chip-on' : ''}`} onClick={() => set('services', toggle(form.services, s))}>{s}</button>
            ))}
            {services.length === 0 && <p className="mwp-hint">No supports are available to choose yet.</p>}
          </div>

          {conditions.length > 0 && (
            <fieldset className="mwp-fieldset">
              <legend>Experience supporting (optional)</legend>
              <div className="mwp-chips">
                {conditions.map((c) => (
                  <button key={c} type="button" aria-pressed={form.conditionExperience.includes(c)} className={`mwp-chip${form.conditionExperience.includes(c) ? ' mwp-chip-on' : ''}`} onClick={() => set('conditionExperience', toggle(form.conditionExperience, c))}>{c}</button>
                ))}
              </div>
            </fieldset>
          )}

          <label className="mwp-full-label">Languages (separate with commas)
            <input value={languages} maxLength={200} placeholder="e.g. English, Arabic, Hindi" onChange={(e) => setLanguages(e.target.value)} />
          </label>
        </section>

        <section className="mwp-card mwp-public">
          <h2>Public profile</h2>
          <label className="mwp-check">
            <input type="checkbox" checked={form.publicProfile} onChange={(e) => set('publicProfile', e.target.checked)} />
            <span>
              <strong>Show my profile publicly</strong>
              <span className="mwp-hint">
                Anyone on the internet, including search engines, will be able to see your first name and last initial, photo, job title,
                suburb, supports, languages, rate and bio. Your email, phone and street address are never shown. You can turn this off at any time.
              </span>
            </span>
          </label>
          <p className="mwp-status" role="status">
            {live
              ? <>Your profile is live: <Link to={`/independent-workers/${me.publicSlug}`}>view it</Link>.</>
              : me.publicProfile
                ? 'Saved. Your profile will appear publicly once SolDirectory has approved it.'
                : 'Your profile is private.'}
          </p>
        </section>

        {error && <p className="mwp-error" role="alert">{error}</p>}
        <button className="mwp-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
      </form>
    </div>
  );
}
