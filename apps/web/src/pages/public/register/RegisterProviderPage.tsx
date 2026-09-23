import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../PublicLayout';
import { getRegisterListing, submitClaimRequest, type RegisterListing } from '../../../api/registerApi';
import { ApiError } from '../../../api/client';
import { absoluteUrl, areaLabel, registerPath, stateByCode, type RegisterKind } from '../../../lib/registerMeta';
import { applySeoTags, setJsonLd } from '../../../lib/seo';
import RegisterCard from './RegisterCard';
import { Breadcrumbs, GetMatchedCta, VerifyNote, formatCount, trimTo } from './RegisterParts';
import '../Home.css';
import '../Directory.css';
import './register.css';

/** /ndis-providers/{slug} — one listing, written from its real register data only. */
export default function RegisterProviderPage({ kind, slug }: { kind: RegisterKind; slug: string }) {
  const [listing, setListing] = useState<RegisterListing | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setListing(null);
    getRegisterListing(kind.type, slug)
      .then((l) => { if (alive) { setListing(l); setStatus('ready'); } })
      .catch((err) => { if (alive) setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error'); });
    return () => { alive = false; };
  }, [kind.type, slug]);

  const areasByState = useMemo(() => {
    const groups = new Map<string, RegisterListing['areas']>();
    for (const a of listing?.areas ?? []) groups.set(a.state, [...(groups.get(a.state) ?? []), a]);
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [listing]);

  // Thin = nothing beyond a name: keep it out of search results (it stays
  // reachable, and it's left out of the sitemap too).
  const thin = !!listing && listing.services.length === 0;
  const first = listing?.areas[0];
  const path = registerPath(kind, slug);

  useEffect(() => {
    if (status === 'loading') return;
    if (!listing) {
      applySeoTags({ title: `Provider not found | SolDirectory`, description: 'This listing could not be found.', noindex: true });
      return;
    }
    const where = first ? `${first.suburb}, ${first.state}` : 'Australia';
    const shown = listing.areas.slice(0, 2).map(areaLabel);
    const extra = listing.areaCount - shown.length;
    applySeoTags({
      title: `${trimTo(listing.name, 44)} | ${kind.label} provider in ${where}`,
      description: trimTo(
        `${listing.name} is ${kind.listedAs}${shown.length ? ` for ${shown.join(' and ')}${extra > 0 ? ` and ${extra} more area${extra === 1 ? '' : 's'}` : ''}` : ''}. See the supports listed, where it operates and how to check its current status.`,
        158
      ),
      canonicalUrl: absoluteUrl(path),
      noindex: thin,
    });
    setJsonLd('register-provider', {
      '@type': 'Organization',
      name: listing.name,
      url: listing.website ?? undefined,
      areaServed: listing.states.map((s) => ({ '@type': 'AdministrativeArea', name: stateByCode(s)?.name ?? s })),
    });
    setJsonLd('register-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: `${kind.label} providers`, item: absoluteUrl(registerPath(kind)) },
        { '@type': 'ListItem', position: 3, name: listing.name, item: absoluteUrl(path) },
      ],
    });
    return () => { setJsonLd('register-provider', null); setJsonLd('register-breadcrumbs', null); };
  }, [status, listing, kind, first, path, thin]);

  if (status === 'loading') {
    return (<><PublicHeader /><main className="reg-page"><p className="dir-results-head">Loading…</p></main><PublicFooter /></>);
  }
  if (!listing) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty" role={status === 'error' ? 'alert' : undefined}>
            <h1>{status === 'missing' ? 'We couldn’t find that provider' : 'We couldn’t load this listing'}</h1>
            <p>{status === 'missing' ? 'The link may be out of date.' : 'Please try again shortly.'}</p>
            <Link className="btn-tint" to={registerPath(kind)}>Browse {kind.label} providers</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const where = first ? `${first.suburb}, ${first.state}` : 'your area';
  const host = listing.website ? listing.website.replace(/^https?:\/\//, '') : '';

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: `${kind.label} providers`, to: registerPath(kind) }, { label: listing.name }]} />

        <div className="reg-detail-head">
          <h1>{listing.name}</h1>
          <span className="reg-badge">Listed on the {kind.label} register</span>
          {listing.claimStatus !== 'claimed' && <span className="reg-badge reg-badge-muted">Not yet claimed by this business</span>}
        </div>
        <p className="reg-lede">
          {listing.name} is {kind.listedAs}
          {listing.areas.length > 0 && <> for {listing.areas.slice(0, 3).map(areaLabel).join(', ')}{listing.areaCount > 3 ? ` and ${formatCount(listing.areaCount - 3)} more area${listing.areaCount - 3 === 1 ? '' : 's'}` : ''}</>}.
        </p>

        <dl className="reg-glance">
          <div><dt>Register</dt><dd>{kind.label} provider register</dd></div>
          <div><dt>{listing.states.length === 1 ? 'State' : 'States'}</dt><dd>{listing.states.map((s) => stateByCode(s)?.name ?? s).join(', ')}</dd></div>
          <div><dt>Areas listed</dt><dd>{formatCount(listing.areaCount)}</dd></div>
          <div>
            <dt>Website</dt>
            <dd>{listing.website ? <a href={listing.website} target="_blank" rel="nofollow noopener noreferrer">{host}</a> : 'Not listed'}</dd>
          </div>
        </dl>

        {listing.services.length > 0 && (
          <>
            <h2 className="reg-h2">Supports listed</h2>
            <ul className="reg-services">{listing.services.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}

        {areasByState.length > 0 && (
          <>
            <h2 className="reg-h2">Where {listing.name} is listed</h2>
            {areasByState.map(([code, areas]) => (
              <div key={code} className="reg-area-group">
                <h3>{stateByCode(code)?.name ?? code}</h3>
                <ul className="reg-areas">
                  {areas.map((a) => (
                    <li key={`${a.state}-${a.suburbSlug}`}><Link to={registerPath(kind, a.state.toLowerCase(), a.suburbSlug)}>{a.suburb}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
            {listing.areaCount > listing.areas.length && <p className="reg-lede">Showing {formatCount(listing.areas.length)} of {formatCount(listing.areaCount)} areas.</p>}
          </>
        )}

        <h2 className="reg-h2">Before you engage a provider</h2>
        <ul className="reg-checklist">
          <li>Confirm the provider’s current status on <a href={kind.officialUrl} target="_blank" rel="noopener noreferrer">{kind.officialName}</a>.</li>
          <li>Ask whether they have capacity to start, and when. This listing doesn’t say.</li>
          <li>Ask how they screen and train their workers, and what they charge — see our <Link to="/guides/choosing-a-provider">guide to choosing a provider</Link>.</li>
        </ul>
        <VerifyNote kind={kind} />

        <GetMatchedCta
          title={`Need support in ${where}?`}
          body="We match you with providers who have recently confirmed they have capacity to take on new people. It’s free and there’s no obligation."
        />

        {listing.related.length > 0 && (
          <>
            <h2 className="reg-h2">Other providers listed in {where}</h2>
            <ul className="dir-grid">{listing.related.map((r) => <RegisterCard key={`${r.type}-${r.slug}`} item={r} />)}</ul>
          </>
        )}

        {listing.claimStatus !== 'claimed' && <ClaimBox kind={kind} listing={listing} />}
      </main>
      <PublicFooter />
    </>
  );
}

function ClaimBox({ kind, listing }: { kind: RegisterKind; listing: RegisterListing }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState('sending');
    setError('');
    try {
      await submitClaimRequest(kind.type, listing.slug, {
        name: String(f.get('name') ?? ''),
        email: String(f.get('email') ?? ''),
        phone: String(f.get('phone') ?? ''),
        role: String(f.get('role') ?? ''),
        message: String(f.get('message') ?? ''),
        website_url: String(f.get('website_url') ?? ''),
      });
      setState('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We couldn’t send that just now. Please try again.');
      setState('idle');
    }
  }

  return (
    <section className="reg-claim" aria-labelledby="claim-heading">
      <h2 id="claim-heading">Is this your business?</h2>
      <p>
        Claim this listing to keep your details up to date and receive enquiries from people looking for support. We’ll check your request against
        your business’s own website or ABN before anything changes, so it can take a few days.
      </p>
      {state === 'done' ? (
        <p className="reg-form-ok" role="status">Thanks — we’ve got your request and will be in touch by email.</p>
      ) : (
        <form className="reg-form" onSubmit={onSubmit}>
          <div className="row">
            <label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name" /></label>
            <label>Your email<input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
          </div>
          <div className="row">
            <label>
              Your role
              <select name="role" required defaultValue="">
                <option value="" disabled>Choose…</option>
                <option value="owner">Owner</option>
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff member</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Phone <small>(optional)</small><input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label>
          </div>
          <label>Anything we should know? <small>(optional)</small><textarea name="message" rows={3} maxLength={1000} /></label>
          <div className="hp" aria-hidden="true"><label>Leave this empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label></div>
          {error && <p className="reg-form-error" role="alert">{error}</p>}
          <div><button type="submit" className="btn-gradient" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Request to claim this listing'}</button></div>
        </form>
      )}
    </section>
  );
}
