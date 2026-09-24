import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import Combobox, { type ComboItem } from '../../components/ui/Combobox';
import { listPublicWorkers, workerPhotoUrl, type PublicWorkerList } from '../../api/profilesApi';
import { listActiveServices } from '../../api/serviceCatalogue';
import { applySeoTags } from '../../lib/seo';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
const fmt = (n: number) => n.toLocaleString('en-AU');

/** /independent-workers/find — independent workers who chose to have a public profile. */
export default function WorkerFinder() {
  const [params, setParams] = useSearchParams();
  const service = params.get('service') ?? '';
  const suburb = params.get('suburb') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [serviceText, setServiceText] = useState(service);
  const [suburbText, setSuburbText] = useState(suburb);
  const [qText, setQText] = useState(q);
  const [services, setServices] = useState<string[]>([]);
  const [data, setData] = useState<PublicWorkerList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listActiveServices('worker').then((r) => setServices(r.items.map((s) => s.name))).catch(() => {});
  }, []);

  // Search runs from the URL, so every result page is a shareable link.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    listPublicWorkers({ service, suburb, q, page, limit: PAGE_SIZE })
      .then((r) => { if (alive) setData(r); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [service, suburb, q, page]);

  const filtered = !!(service || suburb || q);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filtered result lists are duplicates of the base list for search
  // engines; the unfiltered first page is the one worth indexing.
  useEffect(() => {
    applySeoTags({
      title: `Independent support workers${page > 1 ? ` (page ${page})` : ''} | SolDirectory`,
      description: 'Browse independent support workers who have created a public profile: their supports, suburb, languages and availability.',
      canonicalUrl: `${window.location.origin}/independent-workers/find${page > 1 && !filtered ? `?page=${page}` : ''}`,
      noindex: filtered || (data !== null && total === 0),
    });
  }, [page, filtered, data, total]);

  function update(next: { service?: string; suburb?: string; q?: string; page?: number }) {
    const merged = { service, suburb, q, page: 1, ...next };
    const p = new URLSearchParams();
    if (merged.service) p.set('service', merged.service);
    if (merged.suburb) p.set('suburb', merged.suburb);
    if (merged.q) p.set('q', merged.q);
    if (merged.page > 1) p.set('page', String(merged.page));
    setParams(p);
  }

  const serviceItems: ComboItem[] = useMemo(() => {
    const t = serviceText === service ? '' : serviceText.trim().toLowerCase();
    return services.filter((s) => !t || s.toLowerCase().includes(t)).map((s) => ({ key: s, label: s }));
  }, [services, serviceText, service]);

  return (
    <>
      <PublicHeader />
      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Independent workers</span>
          <h1 className="section-heading section-heading-light">Find an independent support worker</h1>
          <p className="directory-page-subtitle">
            Workers listed here chose to have a public profile. Contact details are not shown; organisations request contact through SolDirectory.
          </p>
        </div>
      </div>

      <section className="directory-section dir">
        <form
          className="dir-search pp-filters"
          role="search"
          aria-label="Search independent workers"
          onSubmit={(e) => { e.preventDefault(); update({ suburb: suburbText.trim(), q: qText.trim() }); }}
        >
          <Combobox
            label="Support"
            value={serviceText}
            placeholder="Search supports, e.g. personal care"
            items={serviceItems}
            emptyText="No supports match."
            onInputChange={(t) => { setServiceText(t); if (!t && service) update({ service: '' }); }}
            onSelect={(item) => { setServiceText(item.label); update({ service: item.label }); }}
            onClose={() => setServiceText(service)}
            onClear={() => { setServiceText(''); update({ service: '' }); }}
          />
          <div className="cbx">
            <label className="cbx-label" htmlFor="wf-suburb">Suburb</label>
            <input id="wf-suburb" className="cbx-input" placeholder="e.g. Parramatta" value={suburbText} autoComplete="off" onChange={(e) => setSuburbText(e.target.value)} />
          </div>
          <div className="cbx">
            <label className="cbx-label" htmlFor="wf-q">Name or role</label>
            <input id="wf-q" type="search" className="cbx-input" placeholder="e.g. Sam, nurse" value={qText} autoComplete="off" onChange={(e) => setQText(e.target.value)} />
          </div>
          <div className="cbx" style={{ alignSelf: 'end' }}>
            <button type="submit" className="btn-gradient">Search</button>
          </div>
        </form>

        {filtered && (
          <div className="dir-active">
            <span className="dir-active-label">Showing:</span>
            {service && <button type="button" className="dir-chip" onClick={() => { setServiceText(''); update({ service: '' }); }}>{service} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
            {suburb && <button type="button" className="dir-chip" onClick={() => { setSuburbText(''); update({ suburb: '' }); }}>{suburb} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
            {q && <button type="button" className="dir-chip" onClick={() => { setQText(''); update({ q: '' }); }}>“{q}” <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
            <button type="button" className="dir-clear" onClick={() => { setServiceText(''); setSuburbText(''); setQText(''); setParams(new URLSearchParams()); }}>Clear all</button>
          </div>
        )}

        <div className="dir-results-head" aria-live="polite" ref={topRef}>
          {loading ? 'Searching…' : error || total === 0 ? '' : total <= PAGE_SIZE
            ? `${fmt(total)} ${total === 1 ? 'worker' : 'workers'}${filtered ? ' match your search' : ' listed'}`
            : `Showing ${fmt((page - 1) * PAGE_SIZE + 1)}–${fmt(Math.min(page * PAGE_SIZE, total))} of ${fmt(total)} workers${filtered ? ' matching your search' : ''}`}
        </div>

        {error && <div className="dir-empty" role="alert"><p>We couldn’t load workers just now. Please try again.</p></div>}

        {!error && !loading && total === 0 && (
          <div className="dir-empty">
            <h2>{filtered ? 'No workers match this search' : 'No public worker profiles yet'}</h2>
            <p>
              {filtered
                ? 'Try removing a filter.'
                : 'Independent workers appear here once they’ve been approved and chosen to make their profile public.'}
            </p>
            <div className="dir-empty-actions">
              <Link className="btn-gradient" to="/signup?role=worker">Create a worker profile</Link>
              <Link className="btn-tint" to="/directory">Browse providers instead</Link>
            </div>
          </div>
        )}

        <ul className="dir-grid" aria-busy={loading}>
          {(data?.items ?? []).map((w) => {
            const name = `${w.firstName} ${w.lastInitial ? `${w.lastInitial}.` : ''}`.trim();
            return (
              <li key={w.slug} className="dir-card">
                <div className="dir-card-top">
                  <Avatar src={workerPhotoUrl(w)} name={name} size="md" />
                  <div className="dir-card-title">
                    <h3 className="pp-card-name"><Link to={`/independent-workers/${w.slug}`}>{name}</Link></h3>
                    <span className="pp-meta">{[w.role, [w.suburb, w.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</span>
                  </div>
                </div>
                {w.services.length > 0 && (
                  <div className="dir-tags" aria-label="Supports offered">
                    {w.services.slice(0, 4).map((s) => <span key={s} className="dir-tag">{s}</span>)}
                    {w.services.length > 4 && <span className="dir-tag dir-tag-more">+{w.services.length - 4} more</span>}
                  </div>
                )}
                <p className="pp-meta">
                  {[w.yearsExperience && `${w.yearsExperience} experience`, w.languages.length > 0 && w.languages.slice(0, 3).join(', '), w.hourlyRate && `about $${w.hourlyRate}/hr`]
                    .filter(Boolean).join(' · ')}
                </p>
                <Link className="dir-card-cta" to={`/independent-workers/${w.slug}`}>View profile →</Link>
              </li>
            );
          })}
        </ul>

        <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={(n) => { update({ page: n }); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
      </section>
      <PublicFooter />
    </>
  );
}
