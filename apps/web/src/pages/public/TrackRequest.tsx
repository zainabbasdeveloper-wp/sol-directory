import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PublicFooter, PublicHeader } from './PublicLayout';
import RequestProgress from '../../components/RequestProgress';
import { attachRequest, getTrackedRequest, type TrackedRequest } from '../../api/requestsApi';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useMatchModal } from '../../context/MatchModalContext';
import { applySeoTags } from '../../lib/seo';
import './TrackRequest.css';

/** /track/:id?t=… — the page behind "Follow your request" in the emails. No login needed; the link itself is the key. */
export default function TrackRequest() {
  const { id = '' } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const { user } = useAuth();
  const { openMatchModal } = useMatchModal();
  const [request, setRequest] = useState<TrackedRequest | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'done' | 'taken'>('idle');

  useEffect(() => {
    applySeoTags({ title: 'Follow your request | SolDirectory', description: 'See who has received and opened your request.', noindex: true });
    let alive = true;
    const load = () => getTrackedRequest(id, token)
      .then((r) => { if (alive) { setRequest(r); setError(''); } })
      .catch((err) => { if (alive && !request) setError(err instanceof ApiError ? err.message : 'We could not load this request.'); });
    load();
    // Keeps itself current while the page is open.
    const t = setInterval(() => { if (!document.hidden) load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function saveToAccount() {
    setSaved('saving');
    try {
      await attachRequest(id, token);
      setSaved('done');
    } catch (err) {
      setSaved(err instanceof ApiError && err.status === 409 ? 'taken' : 'idle');
    }
  }

  return (
    <>
      <PublicHeader />
      <main className="trk-page">
        <div className="trk-wrap">
          {error ? (
            <div className="trk-card trk-error" role="alert">
              <h1>We couldn’t open that request</h1>
              <p>{error}</p>
              <Link className="sd-btn sd-btn-primary" to="/find-a-provider">Find a provider</Link>
            </div>
          ) : !request ? (
            <div className="trk-card" aria-busy="true"><div className="trk-skel" style={{ width: '40%', height: 26 }} /><div className="trk-skel" style={{ height: 14, marginTop: 18 }} /><div className="trk-skel" style={{ height: 14, marginTop: 10, width: '80%' }} /></div>
          ) : (
            <>
              <header className="trk-head">
                <span className="trk-eyebrow">Your request · reference {request.reference}</span>
                <h1>{request.requestedProvider ? `Your request for ${request.requestedProvider}` : `Your request for ${request.need.toLowerCase()}`}</h1>
                <p>
                  {[request.suburb, request.state].filter(Boolean).join(', ')}
                  {request.careFor ? ` · for ${request.careFor.toLowerCase()}` : ''}
                  {request.timeframe ? ` · ${request.timeframe.toLowerCase()}` : ''}
                  {' · sent '}{new Date(request.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
                </p>
              </header>

              <section className="trk-card" aria-label="Progress">
                <RequestProgress request={request} />
                {request.note && <p className="trk-note">{request.note}</p>}
              </section>

              <div className="trk-actions">
                <Link className="sd-btn sd-btn-primary sd-btn-lg" to={request.searchUrl.replace(window.location.origin, '') || '/find-a-provider'}>Compare providers near you</Link>
                <button type="button" className="sd-btn sd-btn-outline sd-btn-lg" onClick={() => openMatchModal()}>Get matched, free</button>
              </div>

              <section className="trk-card trk-save">
                {user ? (
                  saved === 'done' ? (
                    <p><strong>Saved.</strong> You can follow this request from your dashboard. <Link to="/dashboard">Open dashboard →</Link></p>
                  ) : saved === 'taken' ? (
                    <p>This request is already saved to another account.</p>
                  ) : (
                    <>
                      <div><strong>Keep it with your account</strong><span>Follow this request from your dashboard, along with any others.</span></div>
                      <button type="button" className="sd-btn sd-btn-outline" onClick={saveToAccount} disabled={saved === 'saving'}>{saved === 'saving' ? 'Saving…' : 'Save to my dashboard'}</button>
                    </>
                  )
                ) : (
                  <>
                    <div><strong>Want to follow it from a dashboard?</strong><span>Create a free account or log in, then open this link again to save it.</span></div>
                    <Link className="sd-btn sd-btn-outline" to={`/login?returnTo=${encodeURIComponent(`/track/${id}?t=${token}`)}`}>Log in</Link>
                  </>
                )}
              </section>

              <p className="trk-foot">Providers decide for themselves whether and how quickly to follow up. We never give a provider your contact details unless they take your request up.</p>
            </>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
