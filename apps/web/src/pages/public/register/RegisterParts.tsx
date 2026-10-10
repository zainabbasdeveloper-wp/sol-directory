import { Link } from 'react-router-dom';
import { useMatchModal } from '../../../context/MatchModalContext';
import type { RegisterKind } from '../../../lib/registerMeta';

export interface Crumb { label: string; to?: string }

/** Visible breadcrumb trail; the matching BreadcrumbList JSON-LD is written by each page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="reg-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((c, i) => (
          <li key={c.label} aria-current={i === items.length - 1 ? 'page' : undefined}>
            {c.to && i < items.length - 1 ? <Link to={c.to}>{c.label}</Link> : c.label}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The one thing every register page must say plainly: this is what the
 * register showed, it may have changed, and here's where to confirm it.
 * It also says what a listing does NOT tell you (availability).
 */
export function VerifyNote({ kind }: { kind: RegisterKind }) {
  return (
    <p className="reg-note">
      <strong>Check before you engage.</strong> Listings are based on {kind.register} data and may be out of date. To confirm a provider’s
      current status, search the official register at{' '}
      <a href={kind.officialUrl} target="_blank" rel="noopener noreferrer">{kind.officialName}</a>. A listing does not show whether a
      provider has capacity to take on new people.
    </p>
  );
}

export function GetMatchedCta({ title, body }: { title: string; body: string }) {
  const { openMatchModal } = useMatchModal();
  return (
    <div className="reg-cta">
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      <button type="button" className="btn-gradient btn-lg" onClick={() => openMatchModal()}>Get matched, free →</button>
    </div>
  );
}

/**
 * "Ask this provider" — a request sent to ONE named register provider, next to the general "Get matched, free" option.
 * The form opens in provider mode (see MatchModalContext), and the server routes the request to that provider only.
 */
export function RequestProviderCta({ type, slug, name, where }: { type: 'ndis' | 'aged_care'; slug: string; name: string; where: string }) {
  const { openMatchModal } = useMatchModal();
  return (
    <section className="reg-request" aria-labelledby="reg-request-heading">
      <div className="reg-request-main">
        <span className="reg-request-eyebrow">Ask this provider directly</span>
        <h2 id="reg-request-heading">Request support from {name}</h2>
        <p>
          Tell us what you need and where. We send your request to {name} only, and your phone number and email are never published.
          It is free, and you are not obliged to go ahead.
        </p>
        <ul className="reg-request-points">
          <li>Takes about two minutes</li>
          <li>Goes to this provider only</li>
          <li>Free, with no obligation</li>
        </ul>
        <button type="button" className="sd-btn sd-btn-primary sd-btn-lg" onClick={() => openMatchModal({ provider: { type, slug, name } })}>
          Request support from this provider →
        </button>
      </div>
      <div className="reg-request-alt">
        <strong>Not sure who to choose?</strong>
        <span>Get matched, free: send one request and hear from several suitable providers in {where}.</span>
        <button type="button" className="sd-btn sd-btn-outline sd-btn-lg" onClick={() => openMatchModal()}>Get matched, free</button>
      </div>
    </section>
  );
}

/** The provider-facing counterpart to GetMatchedCta — for a business reading a register page, not a participant. */
export function ListBusinessCta({ title, body }: { title: string; body: string }) {
  return (
    <div className="reg-cta reg-cta-muted">
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      <Link to="/providers" className="btn-outline btn-lg">List your business →</Link>
    </div>
  );
}

export const formatCount = (n: number) => n.toLocaleString('en-AU');
export const trimTo = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
export const titleCase = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
