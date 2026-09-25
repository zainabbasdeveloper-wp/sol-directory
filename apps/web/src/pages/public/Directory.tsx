import { useEffect, useMemo, useRef, useState } from 'react';
import Pagination from '../../components/ui/Pagination';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Combobox, { type ComboItem } from '../../components/ui/Combobox';
import { listPublicProviders, type PublicProviderRow } from '../../api/providerResources';
import { listActiveServices } from '../../api/serviceCatalogue';
import { searchPlaces, formatPlace, placeSearchEnabled, type PlaceSuggestion } from '../../lib/places';
import { useMatchModal } from '../../context/MatchModalContext';
import { searchRegister, type RegisterListItem } from '../../api/registerApi';
import { AGED_CARE_CATEGORIES, STATES, categoryForService } from '../../lib/registerMeta';
import { slugify } from '../../lib/slugify';
import RegisterCard from './register/RegisterCard';
import './Home.css';
import './Directory.css';

const PAGE_SIZE = 12;
// "Near a suburb" search radius. Wide enough to catch providers based in
// neighbouring suburbs who travel to the area; providers that list the
// suburb by name are always included regardless.
const NEARBY_RADIUS_KM = 25;

interface Place { label: string; suburb: string; lat: number | null; lng: number | null; state?: string }

type DirTab = 'all' | 'providers' | 'listings';
const REGISTER_PREVIEW = 9;

const STATUS_STYLE: Record<string, { label: string; tone: 'ok' | 'limited' | 'wait' | 'closed' }> = {
  'Open to referrals': { label: 'Accepting referrals', tone: 'ok' },
  'Limited capacity': { label: 'Limited capacity', tone: 'limited' },
  'Waitlist only': { label: 'Waitlist only', tone: 'wait' },
  Closed: { label: 'Not accepting referrals', tone: 'closed' },
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

export default function Directory() {
  const [params, setParams] = useSearchParams();
  const { openMatchModal } = useMatchModal();

  // ---- Filters. "Committed" values drive the search; the *Text values are
  // just what's typed in the box while choosing. ----
  const [service, setService] = useState(params.get('service') ?? '');
  const [serviceText, setServiceText] = useState(service);
  const initialSuburb = params.get('suburb') ?? '';
  const [place, setPlace] = useState<Place | null>(initialSuburb ? { label: initialSuburb, suburb: initialSuburb, lat: null, lng: null } : null);
  const [placeText, setPlaceText] = useState(initialSuburb);
  const [nameText, setNameText] = useState('');
  const [nameQuery, setNameQuery] = useState('');

  // ---- Reference data for the pickers ----
  const [services, setServices] = useState<string[]>([]);
  const [placeItems, setPlaceItems] = useState<PlaceSuggestion[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);

  // ---- Results ----
  // Real page numbers, not "Load more": with the number of providers and
  // independent workers this directory is meant to grow to, an
  // ever-appending list would mean re-rendering thousands of cards and a
  // page that only gets heavier the longer someone browses. Each page
  // change instead fetches and shows exactly one bounded page.
  const [results, setResults] = useState<PublicProviderRow[]>([]);
  const [total, setTotal] = useState(0);
  const initialPage = Math.max(1, Number(params.get('page')) || 1);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  // Bumped by "Try again" so the search re-runs even though no filter changed.
  const [reloadKey, setReloadKey] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    document.title = 'Find a provider — SolDirectory';
    listActiveServices().then((r) => setServices(r.items.map((s) => s.name))).catch(() => {});
  }, []);

  // Debounce the free-text provider-name search.
  useEffect(() => {
    const t = setTimeout(() => setNameQuery(nameText.trim()), 300);
    return () => clearTimeout(t);
  }, [nameText]);

  // Live suburb / postcode suggestions — only while the person is typing,
  // not after a suggestion has been chosen.
  useEffect(() => {
    if (!placeSearchEnabled || placeText.trim().length < 2 || placeText === place?.label) {
      setPlaceItems([]);
      setPlaceLoading(false);
      return;
    }
    const controller = new AbortController();
    setPlaceLoading(true);
    const t = setTimeout(() => {
      searchPlaces(placeText, controller.signal).then((items) => {
        if (controller.signal.aborted) return;
        setPlaceItems(items);
        setPlaceLoading(false);
      });
    }, 220);
    return () => { controller.abort(); clearTimeout(t); };
  }, [placeText, place]);

  // Keep the URL shareable / bookmarkable — including which page, so a
  // link to "page 3 of personal care in Parramatta" reopens on page 3.
  useEffect(() => {
    const next = new URLSearchParams();
    if (service) next.set('service', service);
    if (place?.suburb) next.set('suburb', place.suburb);
    if (page > 1) next.set('page', String(page));
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, place, page]);

  function searchArgs(pageNumber: number) {
    return {
      service: service || undefined,
      suburb: place?.suburb || undefined,
      // With coordinates, providers based nearby count too, not only ones
      // that list this exact suburb by name.
      ...(place?.lat != null && place?.lng != null ? { lat: place.lat, lng: place.lng, radiusKm: NEARBY_RADIUS_KM } : {}),
      q: nameQuery || undefined,
      page: pageNumber,
      limit: PAGE_SIZE,
    };
  }

  // New search whenever a committed filter changes — always starts back
  // on page 1, since a filter change makes the previous page meaningless.
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    listPublicProviders(searchArgs(1))
      .then((res) => {
        if (id !== requestId.current) return;
        setResults(res.items);
        setTotal(res.total);
        setPage(1);
      })
      .catch(() => { if (id === requestId.current) setError('We couldn’t load providers just now. Please try again.'); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, place, nameQuery, reloadKey]);

  // ---------------------------------------------------------------
  // Organisations imported from the public NDIS/My Aged Care registers —
  // real businesses that exist in the directory but have not (yet) signed
  // up or claimed their listing. Shown as a clearly separate, clearly
  // labelled section, never merged into the "providers" count or list
  // above: an unclaimed listing has no account, can't respond to an
  // enquiry, and must never look like a verified SolDirectory member.
  // ---------------------------------------------------------------
  const [tab, setTab] = useState<DirTab>('all');
  const [registerItems, setRegisterItems] = useState<RegisterListItem[]>([]);
  const [registerTotal, setRegisterTotal] = useState(0);
  // Per-type totals, so the "see all" link below can point at the right
  // register hub with the right count — a single combined number would
  // either overcount (linking to just one hub) or have nowhere honest to link.
  const [registerTotalsByType, setRegisterTotalsByType] = useState<{ ndis: number; aged_care: number }>({ ndis: 0, aged_care: 0 });
  const [registerLoading, setRegisterLoading] = useState(true);
  const registerCategory = service ? categoryForService(service) : undefined;
  const registerStateCode = place?.state && STATES.some((s) => s.code === place.state) ? place.state : undefined;
  const registerSuburbSlug = place?.suburb ? slugify(place.suburb) : undefined;
  const registerRequestId = useRef(0);

  useEffect(() => {
    const id = ++registerRequestId.current;
    setRegisterLoading(true);
    const types = registerCategory ? [AGED_CARE_CATEGORIES.includes(registerCategory) ? 'aged_care' : 'ndis'] as const : (['ndis', 'aged_care'] as const);
    Promise.all(types.map((type) => searchRegister({
      type,
      category: registerCategory,
      // A suburb filter needs a state; without one (place typed free-text, no suggestion chosen) fall back to browsing the whole register for the category instead of filtering incorrectly.
      ...(registerStateCode && registerSuburbSlug ? { state: registerStateCode, suburb: registerSuburbSlug } : {}),
      q: nameQuery || undefined,
      limit: REGISTER_PREVIEW,
    }).then((r) => ({ type, ...r })).catch(() => ({ type, items: [] as RegisterListItem[], total: 0, page: 1, limit: REGISTER_PREVIEW }))))
      .then((results) => {
        if (id !== registerRequestId.current) return;
        const items = results.flatMap((r) => r.items).slice(0, REGISTER_PREVIEW);
        setRegisterItems(items);
        setRegisterTotal(results.reduce((sum, r) => sum + r.total, 0));
        setRegisterTotalsByType({
          ndis: results.find((r) => r.type === 'ndis')?.total ?? 0,
          aged_care: results.find((r) => r.type === 'aged_care')?.total ?? 0,
        });
      })
      .finally(() => { if (id === registerRequestId.current) setRegisterLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCategory, registerStateCode, registerSuburbSlug, nameQuery, reloadKey]);

  function goToPage(n: number) {
    const target = Math.min(Math.max(1, n), totalPages);
    if (target === page) return;
    const id = ++requestId.current;
    setPageLoading(true);
    setError('');
    listPublicProviders(searchArgs(target))
      .then((res) => {
        if (id !== requestId.current) return;
        setResults(res.items);
        setTotal(res.total);
        setPage(target);
        resultsTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      })
      .catch(() => { if (id === requestId.current) setError('We couldn’t load that page. Please try again.'); })
      .finally(() => { if (id === requestId.current) setPageLoading(false); });
  }

  // On first load, honour a ?page= from a shared/bookmarked link once
  // results for page 1 are in and we know how many pages actually exist.
  const appliedInitialPage = useRef(false);
  useEffect(() => {
    if (appliedInitialPage.current || loading || initialPage <= 1) return;
    appliedInitialPage.current = true;
    if (initialPage <= totalPages) goToPage(initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const retry = () => setReloadKey((k) => k + 1);

  const serviceItems: ComboItem[] = useMemo(() => {
    // While the box holds the committed value, show the whole list;
    // otherwise filter by what's being typed.
    const q = serviceText === service ? '' : serviceText.trim().toLowerCase();
    return services.filter((s) => !q || s.toLowerCase().includes(q)).map((s) => ({ key: s, label: s }));
  }, [services, serviceText, service]);

  const placeComboItems: ComboItem[] = placeItems.map((p) => ({
    key: p.id,
    label: `${p.suburb}${p.postcode && p.postcode !== p.suburb ? ` (${p.postcode})` : ''}`,
    hint: p.state,
  }));

  function clearAll() {
    setService(''); setServiceText('');
    setPlace(null); setPlaceText('');
    setNameText(''); setNameQuery('');
  }

  const anyFilter = !!(service || place || nameQuery);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header">
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light">
            <span className="eyebrow-rule" />
            Provider directory
          </span>
          <h1 className="section-heading section-heading-light">Find a provider</h1>
          <p className="directory-page-subtitle">
            Search for the support you need and where you need it. Providers who have
            confirmed their availability recently are shown.
          </p>
        </div>
      </div>

      <section className="directory-section dir">
        <div className="dir-search" role="search" aria-label="Search providers">
          <div className="dir-search-grid">
            <Combobox
              label="What support do you need?"
              value={serviceText}
              placeholder="Search supports, e.g. personal care"
              items={serviceItems}
              emptyText="No supports match. Try a shorter word."
              icon={<SearchIcon />}
              onInputChange={(t) => { setServiceText(t); if (!t) setService(''); }}
              onSelect={(item) => { setService(item.label); setServiceText(item.label); }}
              onClose={() => setServiceText(service)}
              onClear={() => { setService(''); setServiceText(''); }}
            />
            <Combobox
              label="Where?"
              value={placeText}
              placeholder="Suburb or postcode"
              items={placeComboItems}
              loading={placeLoading}
              emptyText="No matching suburb found. Check the spelling, or try a postcode."
              openOnFocus={false}
              icon={<PinIcon />}
              onInputChange={(t) => { setPlaceText(t); if (!t) setPlace(null); }}
              onSelect={(item) => {
                const s = placeItems.find((p) => p.id === item.key);
                if (!s) return;
                const label = formatPlace(s);
                setPlace({ label, suburb: s.suburb, lat: s.lat, lng: s.lng, state: s.state });
                setPlaceText(label);
              }}
              // Enter on typed text (no suggestion chosen) searches that suburb by name.
              onEnterText={(text) => { setPlace({ label: text, suburb: text, lat: null, lng: null }); setPlaceText(text); }}
              onClose={() => setPlaceText(place?.label ?? '')}
              onClear={() => { setPlace(null); setPlaceText(''); }}
            />
            <div className="cbx">
              <label className="cbx-label" htmlFor="dir-name">Provider name <span className="dir-optional">(optional)</span></label>
              <input
                id="dir-name"
                type="search"
                className="cbx-input"
                placeholder="Search by name"
                value={nameText}
                autoComplete="off"
                onChange={(e) => setNameText(e.target.value)}
              />
            </div>
          </div>

          {anyFilter && (
            <div className="dir-active">
              <span className="dir-active-label">Showing:</span>
              {service && <button type="button" className="dir-chip" onClick={() => { setService(''); setServiceText(''); }}>{service} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
              {place && <button type="button" className="dir-chip" onClick={() => { setPlace(null); setPlaceText(''); }}>{place.label} <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
              {nameQuery && <button type="button" className="dir-chip" onClick={() => { setNameText(''); setNameQuery(''); }}>“{nameQuery}” <span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>}
              <button type="button" className="dir-clear" onClick={clearAll}>Clear all</button>
            </div>
          )}
        </div>

        <div className="dir-help">
          <p>
            <strong>Need assistance identifying provider options?</strong> Submit your location, timeframe and funding
            information so relevant providers can assess your enquiry. There is no cost to submit a request.
          </p>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
        </div>

        <div className="dir-tabs" role="tablist" aria-label="Directory section">
          <button type="button" role="tab" aria-selected={tab === 'all'} className={`dir-tab${tab === 'all' ? ' dir-tab-active' : ''}`} onClick={() => setTab('all')}>All</button>
          <button type="button" role="tab" aria-selected={tab === 'providers'} className={`dir-tab${tab === 'providers' ? ' dir-tab-active' : ''}`} onClick={() => setTab('providers')}>
            SolDirectory providers{!loading ? ` (${total.toLocaleString('en-AU')})` : ''}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'listings'} className={`dir-tab${tab === 'listings' ? ' dir-tab-active' : ''}`} onClick={() => setTab('listings')}>
            Unclaimed listings{!registerLoading ? ` (${registerTotal.toLocaleString('en-AU')})` : ''}
          </button>
        </div>

        {tab !== 'listings' && (
          <>
            <div className="dir-results-head" aria-live="polite" ref={resultsTopRef}>
              {loading || pageLoading
                ? 'Searching…'
                : error || total === 0
                  ? ''
                  : total <= PAGE_SIZE
                    ? `${total.toLocaleString('en-AU')} ${total === 1 ? 'SolDirectory provider' : 'SolDirectory providers'}${anyFilter ? ' match your search' : ' listed'}`
                    : `Showing ${((page - 1) * PAGE_SIZE + 1).toLocaleString('en-AU')}–${Math.min(page * PAGE_SIZE, total).toLocaleString('en-AU')} of ${total.toLocaleString('en-AU')} SolDirectory providers${anyFilter ? ' matching your search' : ''}`}
            </div>

            {error && (
              <div className="dir-empty" role="alert">
                <p>{error}</p>
                <button type="button" className="btn-gradient" onClick={retry}>Try again</button>
              </div>
            )}

            {!error && !loading && results.length === 0 && (tab === 'providers' || registerTotal === 0) && (
              <div className="dir-empty">
                <h2>No SolDirectory providers for this search yet</h2>
                <p>
                  {anyFilter
                    ? 'Try removing a filter, or check the spelling. You can also send a request, and we will notify suitable providers in your area as they join.'
                    : 'No providers are listed yet.'}
                </p>
                <div className="dir-empty-actions">
                  {anyFilter && <button type="button" className="btn-tint" onClick={clearAll}>Clear search</button>}
                  <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
                </div>
              </div>
            )}

            {results.length > 0 && (
              <ul className={`dir-grid${pageLoading ? ' dir-grid-loading' : ''}`} aria-busy={pageLoading}>
                {results.map((p) => {
                  const name = p.tradingName || p.legalEntityName;
                  const status = STATUS_STYLE[p.intakeStatus];
                  const moreSuburbs = p.serviceSuburbCount - p.serviceSuburbs.length;
                  return (
                    <li key={p.id} className="dir-card">
                      <div className="dir-card-top">
                        {p.logoUrl
                          ? <img className="dir-logo" src={p.logoUrl} alt="" loading="lazy" />
                          : <span className="dir-logo dir-logo-fallback" aria-hidden="true">{initials(name)}</span>}
                        <div className="dir-card-title">
                          <h3>{p.slug ? <Link to={`/directory/${p.slug}`}>{name}</Link> : name}</h3>
                          {status && <span className={`dir-status dir-status-${status.tone}`}>{status.label}</span>}
                        </div>
                      </div>

                      {p.registrationGroups.length > 0 && (
                        <div className="dir-tags" aria-label="Supports offered">
                          {p.registrationGroups.slice(0, 4).map((g) => <span key={g} className="dir-tag">{g}</span>)}
                          {p.registrationGroups.length > 4 && <span className="dir-tag dir-tag-more">+{p.registrationGroups.length - 4} more</span>}
                        </div>
                      )}

                      <p className="dir-areas">
                        {p.serviceSuburbs.length > 0
                          ? <>Supports people in <strong>{p.serviceSuburbs.join(', ')}</strong>{moreSuburbs > 0 ? ` and ${moreSuburbs} more area${moreSuburbs === 1 ? '' : 's'}` : ''}</>
                          : 'Service areas not listed'}
                      </p>

                      {p.slug && <Link className="dir-card-cta" to={`/directory/${p.slug}`}>View profile →</Link>}
                      <button type="button" className="dir-card-cta" onClick={() => openMatchModal()}>
                        Get matched with providers like this →
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {tab === 'providers' && !loading && !error && total > PAGE_SIZE && (
              <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={pageLoading} />
            )}
          </>
        )}

        {tab !== 'providers' && (
          <section aria-labelledby="dir-listings-heading" className="dir-register-section">
            <h2 id="dir-listings-heading" className="reg-h2">
              {tab === 'listings' ? 'Unclaimed listings on the public register' : 'Also on the public register'}
            </h2>
            <p className="dir-note">
              These organisations are on the public NDIS or My Aged Care register but have not signed up to or claimed a listing on SolDirectory. They
              can’t receive enquiries here yet — details come from the official register, so confirm them directly before engaging.
            </p>

            {!registerLoading && registerItems.length === 0 && (tab === 'listings' || total === 0) && (
              <div className="dir-empty">
                <h3>No unclaimed listings match this search</h3>
                <p>{anyFilter ? 'Try removing a filter, or browse the full register.' : 'No listings found.'}</p>
                <Link className="btn-tint" to="/ndis-providers">Browse the NDIS register</Link>
              </div>
            )}

            {registerItems.length > 0 && (
              <>
                <ul className={`dir-grid${registerLoading ? ' dir-grid-loading' : ''}`} aria-busy={registerLoading}>
                  {registerItems.map((item) => <RegisterCard key={`${item.type}-${item.slug}`} item={item} />)}
                </ul>
                {registerTotal > registerItems.length && (
                  <p className="dir-register-more">
                    {/* One category always means one register type, so one honest link with the real count.
                        Browsing without a category spans both registers, which have no single combined page —
                        so that case links to each register's own hub with its own real count instead of one
                        link that would either undercount or point somewhere that doesn't have all of them. */}
                    {registerCategory ? (
                      <Link
                        className="btn-tint"
                        to={`/${AGED_CARE_CATEGORIES.includes(registerCategory) ? 'aged-care-providers' : 'ndis-providers'}${registerStateCode ? `/${registerStateCode.toLowerCase()}${registerSuburbSlug ? `/${registerSuburbSlug}` : ''}` : ''}?category=${encodeURIComponent(registerCategory)}`}
                      >
                        See all {registerTotal.toLocaleString('en-AU')} unclaimed listings →
                      </Link>
                    ) : (
                      <>
                        {registerTotalsByType.ndis > 0 && (
                          <Link className="btn-tint" to={`/ndis-providers${registerStateCode ? `/${registerStateCode.toLowerCase()}${registerSuburbSlug ? `/${registerSuburbSlug}` : ''}` : ''}`}>
                            See all {registerTotalsByType.ndis.toLocaleString('en-AU')} NDIS listings →
                          </Link>
                        )}
                        {' '}
                        {registerTotalsByType.aged_care > 0 && (
                          <Link className="btn-tint" to={`/aged-care-providers${registerStateCode ? `/${registerStateCode.toLowerCase()}${registerSuburbSlug ? `/${registerSuburbSlug}` : ''}` : ''}`}>
                            See all {registerTotalsByType.aged_care.toLocaleString('en-AU')} aged care listings →
                          </Link>
                        )}
                      </>
                    )}
                  </p>
                )}
              </>
            )}
          </section>
        )}
      </section>

      <PublicFooter />
    </>
  );
}

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10.5" r="2.6" /></svg>;
}
