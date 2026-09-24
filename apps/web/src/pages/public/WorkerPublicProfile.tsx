import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import { Breadcrumbs, trimTo } from './register/RegisterParts';
import { getPublicWorker, workerPhotoUrl, type PublicWorker } from '../../api/profilesApi';
import { ApiError } from '../../api/client';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const chips = (items: string[], plain = true) => (
  <ul className="pp-chips">{items.map((i) => <li key={i} className={`pp-chip${plain ? ' pp-chip-plain' : ''}`}>{i}</li>)}</ul>
);

/** /independent-workers/:slug — a worker's opt-in public profile. First name + initial only; no contact details. */
export default function WorkerPublicProfile() {
  const { slug = '' } = useParams();
  const [w, setW] = useState<PublicWorker | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    getPublicWorker(slug.toLowerCase())
      .then((r) => { if (alive) { setW(r); setStatus('ok'); } })
      .catch((e) => { if (alive) setStatus(e instanceof ApiError && e.status === 404 ? 'missing' : 'error'); });
    window.scrollTo(0, 0);
    return () => { alive = false; };
  }, [slug]);

  const name = w ? `${w.firstName} ${w.lastInitial ? `${w.lastInitial}.` : ''}`.trim() : '';
  const where = w ? [w.suburb, w.state].filter(Boolean).join(', ') : '';

  useEffect(() => {
    if (status === 'loading') return;
    if (!w) {
      applySeoTags({ title: 'Worker not found | SolDirectory', description: 'This profile could not be found.', noindex: true });
      return;
    }
    const path = `/independent-workers/${w.slug}`;
    const offers = w.services.slice(0, 3).join(', ');
    applySeoTags({
      title: `${name}${w.role ? `, ${trimTo(w.role, 30)}` : ''} | Independent worker${where ? ` in ${where}` : ''}`,
      description: trimTo(`${name} is an independent ${w.role ? w.role.toLowerCase() : 'support worker'}${where ? ` in ${where}` : ''}${offers ? ` offering ${offers}` : ''}. See supports, languages and availability.`, 158),
      canonicalUrl: `${window.location.origin}${path}`,
      ogImage: workerPhotoUrl(w) ? `${window.location.origin}${workerPhotoUrl(w)}` : undefined,
    });
    setJsonLd('worker-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Independent workers', item: `${window.location.origin}/independent-workers/find` },
        { '@type': 'ListItem', position: 3, name, item: `${window.location.origin}${path}` },
      ],
    });
    return () => setJsonLd('worker-breadcrumbs', null);
  }, [w, status, name, where]);

  if (status === 'loading') {
    return (<><PublicHeader /><main className="reg-page"><p className="dir-results-head">Loading…</p></main><PublicFooter /></>);
  }
  if (!w) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty">
            <h1>{status === 'missing' ? 'We couldn’t find that profile' : 'We couldn’t load this profile'}</h1>
            <p>{status === 'missing' ? 'The worker may have made their profile private.' : 'Please try again in a moment.'}</p>
            <Link className="btn-gradient" to="/independent-workers/find">Browse independent workers</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Independent workers', to: '/independent-workers/find' }, { label: name }]} />

        <div className="pp-head">
          <Avatar src={workerPhotoUrl(w)} name={name} size="lg" />
          <div className="pp-head-text">
            <h1>{name}</h1>
            <p className="pp-sub">
              {w.role && <span>{w.role}</span>}
              {where && <span>{where}</span>}
              {w.rating !== null && <span>★ {w.rating.toFixed(1)} ({w.reviewCount})</span>}
            </p>
          </div>
        </div>

        <div className="pp-layout">
          <div className="pp-main">
            {w.bio && (<><h2 className="reg-h2">About</h2><p className="pp-lede">{w.bio}</p></>)}

            {w.services.length > 0 && (<><h2 className="reg-h2">Supports offered</h2>{chips(w.services, false)}</>)}
            {w.conditionExperience.length > 0 && (<><h2 className="reg-h2">Experience supporting</h2>{chips(w.conditionExperience)}</>)}
            {w.languages.length > 0 && (<><h2 className="reg-h2">Languages</h2>{chips(w.languages)}</>)}

            <dl className="pp-facts">
              {w.yearsExperience && <div><dt>Experience</dt><dd>{w.yearsExperience}</dd></div>}
              {w.hourlyRate && <div><dt>Indicative rate</dt><dd>about ${w.hourlyRate}/hr</dd></div>}
              <div><dt>Own transport</dt><dd>{w.hasCar ? 'Yes' : 'Not listed'}</dd></div>
              {w.availableDays.length > 0 && <div><dt>Available</dt><dd>{w.availableDays.join(', ')}</dd></div>}
            </dl>
            {w.availabilityNote && <p className="pp-lede" style={{ marginTop: 14 }}>{w.availabilityNote}</p>}

            <p className="reg-note">
              <strong>Check before you engage.</strong> This profile was written by the worker. Confirm their checks, qualifications,
              insurance and whether the arrangement is employment or independent contracting before work starts. SolDirectory does not
              employ or supervise independent workers.
            </p>
          </div>

          <aside className="pp-aside" aria-label="Contact">
            <h2>Want to contact {w.firstName}?</h2>
            <p>Contact details aren’t shown publicly. Authorised organisations can request contact through their SolDirectory account.</p>
            <Link className="btn-gradient" to="/login">Organisation sign in</Link>
            <Link className="pp-aside-alt" to="/independent-workers/find">← Back to all workers</Link>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
