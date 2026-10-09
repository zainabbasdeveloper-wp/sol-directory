import { useEffect, useMemo, useRef, useState } from 'react';
import { listProviders, listMyShortlist, type ProviderRow } from '../../api/providerResources';
import { listActiveServices, type ActiveService } from '../../api/serviceCatalogue';
import { searchRegister, type RegisterListItem } from '../../api/registerApi';
import { ApiError } from '../../api/client';
import ProviderDetailModal from '../../components/ProviderDetailModal';
import ProviderMap from '../../components/ProviderMap';
import Pagination from '../../components/ui/Pagination';
import RegisterCard from '../public/register/RegisterCard';
import { KIND_BY_TYPE, STATES, categoryForService, registerPath, type RegisterType } from '../../lib/registerMeta';
import './ProviderDirectory.css';

const PAGE = 12;
const fmt = (n: number) => n.toLocaleString('en-AU');
const slugify = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function ProviderDirectory() {
  const [items, setItems] = useState<ProviderRow[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPage, setMemberPage] = useState(1);
  const [query, setQuery] = useState('');
  const [service, setService] = useState('');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('');
  const [registerType, setRegisterType] = useState<RegisterType>('ndis');
  const [serviceOptions, setServiceOptions] = useState<ActiveService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const memberRequestId = useRef(0);
  const memberResultsRef = useRef<HTMLHeadingElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());

  // Public-register providers (the NDIS Commission / My Aged Care registers) — far more of them than member providers.
  const [regItems, setRegItems] = useState<RegisterListItem[]>([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [regLoading, setRegLoading] = useState(true);
  const [regFailed, setRegFailed] = useState(false);

  const category = useMemo(() => (service ? categoryForService(service) : undefined), [service]);
  const suburbSlug = state && suburb.trim() ? slugify(suburb) : undefined;
  const kind = KIND_BY_TYPE[registerType];
  const memberTotalPages = Math.max(1, Math.ceil(memberTotal / PAGE));
  const registerTotalPages = Math.max(1, Math.ceil(regTotal / PAGE));

  useEffect(() => {
    listMyShortlist().then((r) => setShortlistedIds(new Set(r.items.map((i) => i.provider.id)))).catch(() => {});
    listActiveServices('provider').then((res) => setServiceOptions(res.items)).catch(() => {});
  }, []);

  // Filters drive one bounded member-provider page, which also feeds its map markers.
  useEffect(() => { setMemberPage(1); }, [query, service, suburb]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const requestId = ++memberRequestId.current;
    const t = setTimeout(() => {
      listProviders({ q: query, service: service || undefined, suburb: suburb || undefined, page: memberPage, limit: PAGE })
        .then((res) => {
          if (requestId !== memberRequestId.current) return;
          setItems(res.items);
          setMemberTotal(res.total);
        })
        .catch((err) => { if (requestId === memberRequestId.current) setError(err instanceof ApiError ? err.message : 'Unable to load providers.'); })
        .finally(() => { if (requestId === memberRequestId.current) setLoading(false); });
    }, memberPage === 1 ? 300 : 0);
    return () => { clearTimeout(t); };
  }, [query, service, suburb, memberPage]);

  function goToMemberPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), memberTotalPages);
    if (target === memberPage) return;
    setMemberPage(target);
    memberResultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Any filter change starts the register list again from page 1.
  useEffect(() => { setRegPage(1); }, [query, service, state, suburbSlug, registerType]);

  useEffect(() => {
    let alive = true;
    setRegLoading(true);
    setRegFailed(false);
    const t = setTimeout(() => {
      searchRegister({ type: registerType, state: state || undefined, suburb: suburbSlug, category, q: query.trim() || undefined, page: regPage, limit: PAGE })
        .then((r) => { if (!alive) return; setRegTotal(r.total); setRegItems(r.items); })
        .catch(() => { if (alive) setRegFailed(true); })
        .finally(() => { if (alive) setRegLoading(false); });
    }, regPage === 1 ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [registerType, state, suburbSlug, category, query, regPage]);

  function goToRegisterPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), registerTotalPages);
    if (target === regPage) return;
    setRegPage(target);
    document.getElementById('pd-register-results')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function handleShortlistChange(providerId: string, shortlisted: boolean) {
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (shortlisted) next.add(providerId); else next.delete(providerId);
      return next;
    });
  }

  const mapPoints = [
    ...items.map((p) => ({
      id: p.id,
      name: p.tradingName || p.legalEntityName,
      location: p.location,
      category: p.registrationGroups[0] ?? null,
      suburb: p.serviceSuburbs[0] ?? null,
      href: p.slug ? `/providers/${p.slug}` : null,
    })),
    ...regItems.map((p) => ({
      id: `${p.type}:${p.slug}`,
      name: p.name,
      location: p.location,
      category: p.supportCategories[0] ?? null,
      suburb: p.areas[0] ? `${p.areas[0].suburb}, ${p.areas[0].state}` : null,
      href: registerPath(KIND_BY_TYPE[p.type], p.slug),
    })),
  ];
  const onMap = mapPoints.filter((p) => p.location).length;
  const stateName = STATES.find((s) => s.code === state)?.name;

  return (
    <div className="pd-page">
      <h1 className="pd-heading">Find providers</h1>

      <div className="pd-filter-row">
        <input className="pd-search pd-search-inline" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" aria-label="Search by name" />
        <select className="pd-select" value={registerType} onChange={(e) => setRegisterType(e.target.value as RegisterType)} aria-label="Register">
          <option value="ndis">NDIS providers</option>
          <option value="aged_care">Aged care providers</option>
        </select>
        <select className="pd-select" value={service} onChange={(e) => setService(e.target.value)} aria-label="Service">
          <option value="">All services</option>
          {serviceOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select className="pd-select" value={state} onChange={(e) => setState(e.target.value)} aria-label="State or territory">
          <option value="">All states</option>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <input className="pd-select" value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="Suburb" aria-label="Suburb" />
      </div>
      {suburb.trim() && !state && <p className="pd-hint">Choose a state to narrow the public-register list by suburb.</p>}
      {service && !category && <p className="pd-hint">No public-register category matches “{service}”, so the register list is not narrowed by service.</p>}

      {error && <p className="pd-error">{error}</p>}

      <p className="pd-result-count">
        {loading || regLoading && regPage === 1 ? 'Searching…' : (
          <>
            {memberTotal === 0 ? '0 member providers' : `${fmt((memberPage - 1) * PAGE + 1)}–${fmt(Math.min(memberPage * PAGE, memberTotal))} of ${fmt(memberTotal)} member providers`} · {fmt(regTotal)} {kind.label} register provider{regTotal === 1 ? '' : 's'}
            {onMap > 0 && onMap < mapPoints.length ? ` · ${fmt(onMap)} shown on map` : ''}
          </>
        )}
      </p>

      {mapPoints.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <ProviderMap providers={mapPoints} selectedProviderId={openId} onMarkerClick={(id) => { if (!id.includes(':')) setOpenId(id); }} />
        </div>
      )}

      <h2 className="pd-section-title" ref={memberResultsRef}>Member providers</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="pd-grid">
          {items.map((p) => (
            <button key={p.id} className="pd-card" onClick={() => setOpenId(p.id)}>
              {shortlistedIds.has(p.id) && <span className="pd-shortlisted-badge">✓ Shortlisted</span>}
              {p.logoUrl && <img className="pd-card-logo" src={p.logoUrl} alt="" />}
              <h3 className="pd-card-name">{p.tradingName || p.legalEntityName}</h3>
              <p className="pd-card-suburbs">{p.serviceSuburbs.join(', ') || 'No suburbs listed'}</p>
              <div className="pd-card-chips">
                {p.registrationGroups.slice(0, 3).map((g) => <span key={g} className="pd-chip">{g}</span>)}
              </div>
              <span className="pd-view-link">View profile →</span>
            </button>
          ))}
          {items.length === 0 && (
            <div className="pd-empty-state">
              <p>No member providers match these filters.</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted, #5A6B84)' }}>The {kind.label} register providers below are searched with the same filters.</p>
            </div>
          )}
        </div>
      )}
      {memberTotalPages > 1 && !error && <Pagination page={memberPage} totalPages={memberTotalPages} onChange={goToMemberPage} disabled={loading} />}

      <h2 className="pd-section-title" id="pd-register-results">{kind.label} register providers{stateName ? ` in ${stateName}` : ''}{category ? ` · ${category}` : ''}</h2>
      <p className="pd-section-note">Listed A–Z from the public register, not ranked. A listing shows what the register says, not who has capacity or the quality of their service.</p>
      {regFailed && <p className="pd-error" role="alert">We couldn’t load the register list just now. Please try again shortly.</p>}
      <ul className="dir-grid" aria-busy={regLoading}>
        {regItems.map((p) => <RegisterCard key={`${p.type}:${p.slug}`} item={p} matchedCategory={category} />)}
      </ul>
      {!regLoading && !regFailed && regItems.length === 0 && <p className="pd-section-note">No register providers match these filters.</p>}
      {registerTotalPages > 1 && !regFailed && <Pagination page={regPage} totalPages={registerTotalPages} onChange={goToRegisterPage} disabled={regLoading} />}

      {openId && (
        <ProviderDetailModal providerId={openId} onClose={() => setOpenId(null)} onShortlistChange={handleShortlistChange} />
      )}
    </div>
  );
}
