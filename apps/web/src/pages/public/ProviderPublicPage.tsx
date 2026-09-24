import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import { Breadcrumbs, trimTo } from './register/RegisterParts';
import { getPublicProvider, listPublicConditions, type PublicProviderProfile } from '../../api/profilesApi';
import { slugify } from '../../lib/slugify';
import { ApiError } from '../../api/client';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const STATUS: Record<string, { label: string; tone: 'ok' | 'limited' | 'wait' | 'closed' }> = {
  'Open to referrals': { label: 'Accepting referrals', tone: 'ok' },
  'Limited capacity': { label: 'Limited capacity', tone: 'limited' },
  'Waitlist only': { label: 'Waitlist only', tone: 'wait' },
  Closed: { label: 'Not accepting referrals', tone: 'closed' },
};


const list = (items: string[]) => (
  <ul className="pp-chips">{items.map((i) => <li key={i} className="pp-chip pp-chip-plain">{i}</li>)}</ul>
);

/** /directory/:slug — a provider's public profile. Facts they entered themselves; no contact details. */
export default function ProviderPublicPage() {
  const { slug = '' } = useParams();
  const { openMatchModal } = useMatchModal();
  const [p, setP] = useState<PublicProviderProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  // Conditions that have their own page (only catalogue conditions do) - link just those.
  const [conditionSlugs, setConditionSlugs] = useState<Set<string>>(new Set());
  useEffect(() => {
    listPublicConditions().then((r) => setConditionSlugs(new Set(r.items.map((c) => c.slug)))).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    getPublicProvider(slug.toLowerCase())
      .then((r) => { if (alive) { setP(r); setStatus('ok'); } })
      .catch((e) => { if (alive) setStatus(e instanceof ApiError && e.status === 404 ? 'missing' : 'error'); });
    window.scrollTo(0, 0);
    return () => { alive = false; };
  }, [slug]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!p) {
      applySeoTags({ title: 'Provider not found | SolDirectory', description: 'This provider could not be found.', noindex: true });
      return;
    }
    const where = p.baseSuburb && p.baseState ? `${p.baseSuburb}, ${p.baseState}` : p.serviceSuburbs[0] ?? 'Australia';
    const offers = p.registrationGroups.slice(0, 3).join(', ');
    const path = `/directory/${p.slug}`;
    applySeoTags({
      title: `${trimTo(p.name, 44)} | Provider in ${where}`,
      description: trimTo(
        `${p.name}${offers ? ` offers ${offers}` : ' is listed on SolDirectory'}${p.serviceSuburbs.length ? ` and supports people in ${p.serviceSuburbs.slice(0, 3).join(', ')}` : ''}. See supports, funding accepted and service areas, then get matched for free.`,
        158
      ),
      canonicalUrl: `${window.location.origin}${path}`,
      // A profile with no supports listed says nothing worth indexing.
      noindex: p.registrationGroups.length === 0,
    });
    setJsonLd('directory-provider', {
      '@type': 'Organization',
      name: p.name,
      ...(p.logoUrl ? { logo: p.logoUrl.startsWith('/') ? `${window.location.origin}${p.logoUrl}` : p.logoUrl } : {}),
      ...(p.serviceSuburbs.length ? { areaServed: p.serviceSuburbs.slice(0, 20).map((s) => ({ '@type': 'Place', name: s })) } : {}),
    });
    setJsonLd('directory-breadcrumbs', {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Provider directory', item: `${window.location.origin}/directory` },
        { '@type': 'ListItem', position: 3, name: p.name, item: `${window.location.origin}${path}` },
      ],
    });
    return () => { setJsonLd('directory-provider', null); setJsonLd('directory-breadcrumbs', null); };
  }, [p, status]);

  if (status === 'loading') {
    return (<><PublicHeader /><main className="reg-page"><p className="dir-results-head">Loading…</p></main><PublicFooter /></>);
  }
  if (!p) {
    return (
      <>
        <PublicHeader />
        <main className="reg-page">
          <div className="dir-empty">
            <h1>{status === 'missing' ? 'We couldn’t find that provider' : 'We couldn’t load this profile'}</h1>
            <p>{status === 'missing' ? 'It may have been removed or paused.' : 'Please try again in a moment.'}</p>
            <Link className="btn-gradient" to="/directory">Browse the provider directory</Link>
          </div>
        </main>
        <PublicFooter />
      </>
    );
  }

  const st = STATUS[p.intakeStatus];
  const base = p.baseSuburb && p.baseState ? `${p.baseSuburb}, ${p.baseState}` : null;

  return (
    <>
      <PublicHeader />
      <main className="reg-page">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Provider directory', to: '/directory' }, { label: p.name }]} />

        <div className="pp-head">
          <Avatar src={p.logoUrl} name={p.name} size="lg" shape="square" />
          <div className="pp-head-text">
            <h1>{p.name}</h1>
            <p className="pp-sub">
              {st && <span className={`dir-status dir-status-${st.tone}`}>{st.label}</span>}
              {base && <span>Based in {base}</span>}
              {p.serviceSuburbs.length > 0 && <span>Supports {p.serviceSuburbs.length} {p.serviceSuburbs.length === 1 ? 'area' : 'areas'}</span>}
            </p>
          </div>
        </div>

        <div className="pp-layout">
          <div className="pp-main">
            {p.registrationGroups.length > 0 && (
              <>
                <h2 className="reg-h2">Supports offered</h2>
                <ul className="pp-chips">{p.registrationGroups.map((g) => (
                  <li key={g} className="pp-chip"><Link to={`/directory?service=${encodeURIComponent(g)}`}>{g}</Link></li>
                ))}</ul>
              </>
            )}

            {p.serviceSuburbs.length > 0 && (
              <>
                <h2 className="reg-h2">Where {p.name} supports people</h2>
                <ul className="pp-chips">{p.serviceSuburbs.map((s) => (
                  <li key={s} className="pp-chip pp-chip-plain"><Link to={`/directory/in/${slugify(s)}`}>{s}</Link></li>
                ))}</ul>
                {p.travelRadiusKm ? <p className="pp-lede">Travels up to {p.travelRadiusKm} km from its base.</p> : null}
              </>
            )}

            {p.acceptedFunding.length > 0 && (<><h2 className="reg-h2">Funding accepted</h2>{list(p.acceptedFunding)}</>)}
            {p.conditionExperience.length > 0 && (
              <>
                <h2 className="reg-h2">Experience supporting</h2>
                <ul className="pp-chips">{p.conditionExperience.map((c) => (
                  <li key={c} className="pp-chip pp-chip-plain">{conditionSlugs.has(slugify(c)) ? <Link to={`/directory/for/${slugify(c)}`}>{c}</Link> : c}</li>
                ))}</ul>
              </>
            )}
            {p.ageGroups.length > 0 && (<><h2 className="reg-h2">Age groups</h2>{list(p.ageGroups)}</>)}
            {p.languages.length > 0 && (<><h2 className="reg-h2">Languages</h2>{list(p.languages)}</>)}

            <p className="reg-note">
              <strong>Check before you engage.</strong> This profile was written by the provider. Confirm their registration, insurance and
              worker screening directly with them before you start.
            </p>
          </div>

          <aside className="pp-aside" aria-label="Get in touch">
            <h2>Interested in this provider?</h2>
            <p>Tell us where you are, when you need support and how it’s funded. Relevant providers review your enquiry — it’s free.</p>
            <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
            <Link className="pp-aside-alt" to="/directory">← Back to all providers</Link>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
