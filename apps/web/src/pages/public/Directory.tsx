import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Pagination from '../../components/ui/Pagination';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import Combobox, { type ComboItem } from '../../components/ui/Combobox';
import { listPublicProviders, type PublicProviderRow } from '../../api/providerResources';
import { listActiveServices } from '../../api/serviceCatalogue';
import { searchPlaces, formatPlace, placeSearchEnabled, type PlaceSuggestion } from '../../lib/places';
import { useMatchModal } from '../../context/MatchModalContext';
import { searchRegister, getRegisterHub, type RegisterListItem } from '../../api/registerApi';
import { categoryForService, KIND_BY_TYPE, type RegisterType } from '../../lib/registerMeta';
import { slugify } from '../../lib/slugify';
import { api } from '../../api/client';
import RegisterCard from './register/RegisterCard';
import { formatCount } from './register/RegisterParts';
import './Home.css';
import './Directory.css';
import './register/register.css';

const PAGE_SIZE = 12;
// "Near a suburb" search radius. Wide enough to catch providers based in
// neighbouring suburbs who travel to the area; providers that list the
// suburb by name are always included regardless.
const NEARBY_RADIUS_KM = 25;

interface Place { label: string; suburb: string; lat: number | null; lng: number | null; state?: string }

const STATUS_STYLE: Record<string, { label: string; tone: 'ok' | 'limited' | 'wait' | 'closed' }> = {
  'Open to referrals': { label: 'Accepting referrals', tone: 'ok' },
  'Limited capacity': { label: 'Limited capacity', tone: 'limited' },
  'Waitlist only': { label: 'Waitlist only', tone: 'wait' },
  Closed: { label: 'Not accepting referrals', tone: 'closed' },
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}

/**
 * The main "Find a provider" directory — ONE unified search experience
 * (one search box, one NDIS/Aged care toggle, one continuous results
 * flow), backed by two data sources that stay functionally distinct even
 * though the page no longer visually separates them into two titled
 * sections:
 *  - SolDirectory providers: real accounts, can be matched/contacted.
 *    Only rendered at all once at least one real provider exists — see
 *    showProviderResults — so the page never shows a dead empty grid
 *    where a real-provider section would otherwise sit.
 *  - The public register: organisations imported from the NDIS/My Aged
 *    Care registers, always shown (it's real content, browsable here as
 *    well as on /ndis-providers, /aged-care-providers), but never merged
 *    into the provider grid or its count, never given a "Get matched"
 *    CTA, and never implied to be verified/accepting enquiries — see
 *    RegisterCard.
 * Each keeps its own pagination (different datasets, different APIs) —
 * a true single merged/paginated list across both isn't built here.
 */
export default function Directory() {
  const [params, setParams] = useSearchParams();
  const { openMatchModal } = useMatchModal();
  const initialAlertResult = params.get('alert');
  const [alertEmail, setAlertEmail] = useState('');
  const [alertConsent, setAlertConsent] = useState(false);
  const [alertStatus, setAlertStatus] = useState<'idle' | 'sending' | 'sent' | 'verified' | 'unsubscribed' | 'invalid' | 'error'>(
    initialAlertResult === 'verified' || initialAlertResult === 'unsubscribed' || initialAlertResult === 'invalid' ? initialAlertResult : 'idle',
  );
  const [alertError, setAlertError] = useState('');

  // ---- Filters. "Committed" values drive the search; the *Text values are
  // just what's typed in the box while choosing. ----
  const [service, setService] = useState(params.get('service') ?? '');
  const [serviceText, setServiceText] = useState(service);
  const initialSuburb = params.get('suburb') ?? '';
  const [place, setPlace] = useState<Place | null>(initialSuburb ? { label: initialSuburb, suburb: initialSuburb, lat: null, lng: null } : null);
  const [placeText, setPlaceText] = useState(initialSuburb);
  const initialNameQuery = params.get('q') ?? '';
  const [nameText, setNameText] = useState(initialNameQuery);
  const [nameQuery, setNameQuery] = useState(initialNameQuery);

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
    if (nameQuery) next.set('q', nameQuery);
    if (page > 1) next.set('page', String(page));
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, place, nameQuery, page]);

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

  // ---- Public register section (separate dataset, separate pagination —
  // see the file doc comment for why this is never merged with the
  // providers above). Its own request-id ref: an earlier version of this
  // page shared one counter between the two fetches, which let each
  // invalidate the other's in-flight request. ----
  const [registerType, setRegisterType] = useState<RegisterType>('ndis');
  const [regResults, setRegResults] = useState<RegisterListItem[]>([]);
  const [regTotal, setRegTotal] = useState(0);
  const [regPage, setRegPage] = useState(1);
  const [regLoading, setRegLoading] = useState(true);
  const [regPageLoading, setRegPageLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regReloadKey, setRegReloadKey] = useState(0);
  const registerRequestId = useRef(0);
  const regTotalPages = Math.max(1, Math.ceil(regTotal / PAGE_SIZE));

  // Unfiltered grand totals for both registers — fetched once, shown next
  // to the toggle so the true scale is visible regardless of what's
  // currently filtered/paginated.
  const [registerGrandTotal, setRegisterGrandTotal] = useState<{ ndis: number; aged_care: number } | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([getRegisterHub('ndis').catch(() => null), getRegisterHub('aged_care').catch(() => null)])
      .then(([ndis, agedCare]) => { if (alive) setRegisterGrandTotal({ ndis: ndis?.total ?? 0, aged_care: agedCare?.total ?? 0 }); });
    return () => { alive = false; };
  }, []);

  // The register only has a fixed set of canonical support categories, and
  // suburb filtering needs a known state — so the shared search box maps
  // onto it on a best-effort basis rather than an exact filter.
  const regCategory = service ? categoryForService(service) : undefined;
  const regState = place?.state;
  const regSuburbSlug = regState && place?.suburb ? slugify(place.suburb) : undefined;

  function regSearchArgs(pageNumber: number) {
    return {
      type: registerType,
      state: regState,
      suburb: regSuburbSlug,
      category: regCategory,
      q: nameQuery || undefined,
      page: pageNumber,
      limit: PAGE_SIZE,
    };
  }

  useEffect(() => {
    const id = ++registerRequestId.current;
    setRegLoading(true);
    setRegError('');
    searchRegister(regSearchArgs(1))
      .then((res) => {
        if (id !== registerRequestId.current) return;
        setRegResults(res.items);
        setRegTotal(res.total);
        setRegPage(1);
      })
      .catch(() => { if (id === registerRequestId.current) setRegError('We couldn’t load the register just now. Please try again.'); })
      .finally(() => { if (id === registerRequestId.current) setRegLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, place, nameQuery, registerType, regReloadKey]);

  function goToRegPage(n: number) {
    const target = Math.min(Math.max(1, n), regTotalPages);
    if (target === regPage) return;
    const id = ++registerRequestId.current;
    setRegPageLoading(true);
    setRegError('');
    searchRegister(regSearchArgs(target))
      .then((res) => {
        if (id !== registerRequestId.current) return;
        setRegResults(res.items);
        setRegTotal(res.total);
        setRegPage(target);
      })
      .catch(() => { if (id === registerRequestId.current) setRegError('We couldn’t load that page. Please try again.'); })
      .finally(() => { if (id === registerRequestId.current) setRegPageLoading(false); });
  }

  const retryRegister = () => setRegReloadKey((k) => k + 1);

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

  async function createAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlertStatus('sending');
    setAlertError('');
    try {
      await api.post<{ message: string }>('/search-alerts', {
        email: alertEmail,
        service: service || undefined,
        suburb: place?.suburb || undefined,
        query: nameQuery || undefined,
        consent: alertConsent,
      });
      setAlertStatus('sent');
    } catch (alertRequestError) {
      setAlertError(alertRequestError instanceof Error ? alertRequestError.message : 'We couldn’t create this alert. Please try again.');
      setAlertStatus('error');
    }
  }
  // While there are no real providers AT ALL (not filtered to zero — zero,
  // full stop), the SolDirectory-providers block is skipped entirely
  // rather than rendering a permanently-empty grid above the register
  // results — that empty gap is exactly what made the page look broken
  // when a filter was applied and only the register section (further
  // down) actually had results. The moment even one real provider exists,
  // this reverts to the normal search UI, filtered or not.
  const showProviderResults = loading || error !== '' || total > 0;

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
            Search for the support you need and where you need it.
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

          <div className="reg-filters" role="group" aria-label="Choose a register" style={{ marginTop: 18 }}>
            <button type="button" className="reg-chip" aria-pressed={registerType === 'ndis'} onClick={() => setRegisterType('ndis')}>
              {KIND_BY_TYPE.ndis.label} register{registerGrandTotal && <small>{formatCount(registerGrandTotal.ndis)}</small>}
            </button>
            <button type="button" className="reg-chip" aria-pressed={registerType === 'aged_care'} onClick={() => setRegisterType('aged_care')}>
              {KIND_BY_TYPE.aged_care.label} register{registerGrandTotal && <small>{formatCount(registerGrandTotal.aged_care)}</small>}
            </button>
          </div>
          <p className="reg-note" style={{ marginTop: 10, marginBottom: 0 }}>
            {registerGrandTotal
              ? <>Searching {formatCount(registerGrandTotal.ndis + registerGrandTotal.aged_care)} organisations listed on the NDIS and My Aged Care registers, sourced directly from each register.</>
              : 'Searching organisations listed on the NDIS and My Aged Care registers, sourced directly from each register.'}{' '}
            A business can <Link to="/providers">set up its own SolDirectory listing</Link>.
          </p>
        </div>

        {(alertStatus === 'verified' || alertStatus === 'unsubscribed' || alertStatus === 'invalid') && (
          <p className={`dir-alert-status${alertStatus === 'invalid' ? ' is-error' : ''}`} role="status">
            {alertStatus === 'verified' && 'Your provider alert is active.'}
            {alertStatus === 'unsubscribed' && 'You have been unsubscribed from this provider alert.'}
            {alertStatus === 'invalid' && 'This alert link is invalid or has already been used.'}
          </p>
        )}

        {anyFilter && (
          <section className="dir-alert" aria-labelledby="provider-alert-title">
            <div>
              <h2 id="provider-alert-title">Email me new matching providers</h2>
              <p>Receive an email only when a new or updated SolDirectory member matches this search. Verify by email and unsubscribe at any time.</p>
            </div>
            {alertStatus === 'sent' ? (
              <p className="dir-alert-confirmation" role="status">Check your inbox and confirm the alert before emails begin.</p>
            ) : (
              <form onSubmit={createAlert}>
                <label htmlFor="provider-alert-email">Email address</label>
                <div className="dir-alert-fields">
                  <input id="provider-alert-email" type="email" value={alertEmail} onChange={(event) => setAlertEmail(event.target.value)} required autoComplete="email" />
                  <button type="submit" className="btn-gradient" disabled={alertStatus === 'sending' || !alertConsent}>
                    {alertStatus === 'sending' ? 'Creating alert…' : 'Create alert'}
                  </button>
                </div>
                <label className="dir-alert-consent">
                  <input type="checkbox" checked={alertConsent} onChange={(event) => setAlertConsent(event.target.checked)} />
                  <span>I agree to receive provider-alert emails for these search filters.</span>
                </label>
                {alertStatus === 'error' && <p className="dir-alert-error" role="alert">{alertError}</p>}
              </form>
            )}
          </section>
        )}

        {showProviderResults && (
          <>
            <div className="dir-results-head" aria-live="polite" ref={resultsTopRef}>
              {loading || pageLoading
                ? 'Searching…'
                : error || total === 0
                  ? ''
                  : total <= PAGE_SIZE
                    ? `${total.toLocaleString('en-AU')} ${total === 1 ? 'provider' : 'providers'}${anyFilter ? ' match your search' : ' listed'}`
                    : `Showing ${((page - 1) * PAGE_SIZE + 1).toLocaleString('en-AU')}–${Math.min(page * PAGE_SIZE, total).toLocaleString('en-AU')} of ${total.toLocaleString('en-AU')} providers${anyFilter ? ' matching your search' : ''}`}
            </div>

            {error && (
              <div className="dir-empty" role="alert">
                <p>{error}</p>
                <button type="button" className="btn-gradient" onClick={retry}>Try again</button>
              </div>
            )}

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

            {!loading && !error && total > PAGE_SIZE && (
              <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={pageLoading} />
            )}
          </>
        )}

        <div className="dir-register-hint">
          <div className="dir-results-head" aria-live="polite">
            {regLoading || regPageLoading
              ? 'Searching…'
              : regError || regTotal === 0
                ? ''
                : regTotal <= PAGE_SIZE
                  ? `${formatCount(regTotal)} ${regTotal === 1 ? 'listing' : 'listings'}${anyFilter ? ' match your search' : ''}`
                  : `Showing ${formatCount((regPage - 1) * PAGE_SIZE + 1)}–${formatCount(Math.min(regPage * PAGE_SIZE, regTotal))} of ${formatCount(regTotal)} listings${anyFilter ? ' matching your search' : ''}`}
          </div>

          {regError && (
            <div className="dir-empty" role="alert">
              <p>{regError}</p>
              <button type="button" className="btn-gradient" onClick={retryRegister}>Try again</button>
            </div>
          )}

          {!regError && !regLoading && regResults.length === 0 && (
            <div className="dir-empty">
              <h2>No {KIND_BY_TYPE[registerType].label} register listings match this search</h2>
              <p>Try removing a filter, or browse the full <Link to={registerPathFor(registerType)}>{KIND_BY_TYPE[registerType].label} register</Link>.</p>
            </div>
          )}

          <ul className={`dir-grid${regPageLoading ? ' dir-grid-loading' : ''}`} aria-busy={regPageLoading}>
            {regResults.map((item) => <RegisterCard key={`${item.type}-${item.slug}`} item={item} matchedCategory={regCategory} />)}
          </ul>

          {!regLoading && !regError && regTotal > PAGE_SIZE && (
            <Pagination page={regPage} totalPages={regTotalPages} onChange={goToRegPage} disabled={regPageLoading} />
          )}

          <p className="dir-register-hint-footer">
            Browse the full <Link to="/ndis-providers">NDIS provider register</Link> or <Link to="/aged-care-providers">My Aged Care register</Link> by state and suburb.
          </p>
        </div>

        <div className="dir-help">
          <p>
            <strong>Need assistance identifying provider options?</strong> Submit your location, timeframe and funding
            information so relevant providers can assess your enquiry. There is no cost to submit a request.
          </p>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button>
        </div>
      </section>

      <PublicFooter />
    </>
  );
}

function registerPathFor(type: RegisterType) {
  return type === 'ndis' ? '/ndis-providers' : '/aged-care-providers';
}

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10.5" r="2.6" /></svg>;
}
