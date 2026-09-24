import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../api/client';
import { deleteMyLogo, fetchMyLogoUrl, getMyListing, uploadMyLogo, type MyListing } from '../../api/profilesApi';
import { toJpeg } from '../../lib/imageJpeg';
import '../workers/MyWorkerProfile.css';

/** /provider/listing — how the provider's public page looks, why it might not be showing, and their logo. */
export default function MyListingPage() {
  const showToast = useToast();
  const [me, setMe] = useState<MyListing | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getMyListing().then(setMe).catch((e) => setError(e instanceof ApiError ? e.message : 'Unable to load your listing.'));
  }, []);

  // The owner's own upload, fetched with their login so it previews before the page is live.
  const hasUpload = me?.hasUploadedLogo ?? false;
  useEffect(() => {
    if (!hasUpload) { setLogo(null); return; }
    let url: string | null = null;
    let alive = true;
    fetchMyLogoUrl().then((u) => { url = u; if (alive) setLogo(u); else if (u) URL.revokeObjectURL(u); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [hasUpload]);

  if (error && !me) return <div className="mwp"><p role="alert">{error}</p></div>;
  if (!me) return <div className="mwp"><p>Loading…</p></div>;

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please choose an image file.'); return; }
    setBusy(true);
    try {
      setMe(await uploadMyLogo(await toJpeg(file, 'contain', 512)));
      showToast('Logo updated.');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not use that image.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    try { setMe(await deleteMyLogo()); } catch (err) { showToast(err instanceof ApiError ? err.message : 'Could not remove your logo.'); } finally { setBusy(false); }
  }

  return (
    <div className="mwp">
      <h1 className="page-title">My public listing</h1>
      <p className="mwp-intro">
        This is the page people see when they find your business in the directory. Business details and supports are edited in{' '}
        <Link to="/onboarding">onboarding</Link>.
      </p>

      <section className="mwp-card mwp-public">
        <h2>Your page</h2>
        <p className="mwp-status" role="status">
          {me.live ? <>Your page is live: <Link to={`/directory/${me.slug}`}>view it</Link>.</> : 'Your page isn’t showing publicly right now.'}
        </p>
        {me.issues.length > 0 && <ul className="mwp-issues">{me.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
        <p className="mwp-hint">{me.supportCount} {me.supportCount === 1 ? 'support' : 'supports'} listed · {me.areaCount} service {me.areaCount === 1 ? 'area' : 'areas'}</p>
      </section>

      <section className="mwp-card" style={{ marginTop: 18 }}>
        <h2>Logo</h2>
        <div className="mwp-photo">
          <Avatar src={logo ?? me.logoUrl} name={me.name || 'Your business'} size="lg" shape="square" />
          <div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <button type="button" className="mwp-btn" disabled={busy} onClick={() => fileRef.current?.click()}>{me.hasUploadedLogo ? 'Change logo' : 'Upload a logo'}</button>
            {me.hasUploadedLogo && <button type="button" className="mwp-link" disabled={busy} onClick={remove}>Remove</button>}
            <p className="mwp-hint">
              Your own logo, not a stock image. It’s scaled down and shown on a white background. Without one, your initials are shown.
              {me.logoManagedElsewhere && ' A logo already set by SolDirectory is currently shown instead of this one.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
