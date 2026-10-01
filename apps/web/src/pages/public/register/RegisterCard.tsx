import { useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';
import type { RegisterListItem } from '../../../api/registerApi';
import { KIND_BY_TYPE, areaLabel, registerPath, stateByCode } from '../../../lib/registerMeta';
import { useMatchModal } from '../../../context/MatchModalContext';
import '../Directory.css';
import './register.css';

/** One listing in a results grid. Links to the listing's own page. */
export default function RegisterCard({ item, matchedCategory }: { item: RegisterListItem; matchedCategory?: string }) {
  const kind = KIND_BY_TYPE[item.type];
  const { openMatchModal } = useMatchModal();
  const [showAllSupports, setShowAllSupports] = useState(false);
  const more = item.areaCount - item.areas.length;
  const supportsId = `register-supports-${item.type}-${item.slug}`;
  const stateLabel = item.states.length > 3
    ? `${item.states.slice(0, 3).join(', ')} +${item.states.length - 3}`
    : item.states.join(', ') || 'Not listed';
  const areaPath = (area: RegisterListItem['areas'][number]) =>
    registerPath(kind, stateByCode(area.state)?.slug ?? area.state.toLowerCase(), area.suburbSlug);
  const categoryPath = (category: string) => {
    const firstArea = item.areas[0];
    const stateSlug = stateByCode(item.states[0] ?? '')?.slug;
    if (!firstArea && !stateSlug) return `/find-a-provider?service=${encodeURIComponent(category)}`;
    const base = firstArea ? areaPath(firstArea) : registerPath(kind, stateSlug);
    return `${base}?category=${encodeURIComponent(category)}`;
  };
  // supportCategories comes back in whatever order the register listed it —
  // when a category filter is active, that category is *why* this card
  // matched, so it needs to be one of the (at most 4) tags actually shown,
  // not buried in "+N more" where a correct filter reads as a broken one.
  return (
    <li className="dir-card reg-card">
      <div className="dir-card-top">
        {/* The registers publish no logos: a claimed listing shows its provider's own upload, everything else the initials, never a stock image. */}
        <Avatar src={item.logoUrl} name={item.name} size="lg" shape="square" />
        <div className="dir-card-title">
          <h3>
            <Link to={registerPath(kind, item.slug)}>{item.name}</Link>
          </h3>
          <span className="reg-badge reg-card-source"><span aria-hidden="true">✓</span> Listed on the {kind.label} register</span>
        </div>
      </div>

      {item.supportCategories.length > 0 && (() => {
        const hasMatch = !!matchedCategory && item.supportCategories.includes(matchedCategory);
        const ordered = hasMatch
          ? [matchedCategory, ...item.supportCategories.filter((c) => c !== matchedCategory)]
          : item.supportCategories;
        const visible = showAllSupports ? ordered : ordered.slice(0, 4);
        return (
          <div className="dir-tags" id={supportsId} aria-label="Supports listed">
            {visible.map((c) => (
              <Link key={c} to={categoryPath(c)} className={`dir-tag dir-tag-link${c === matchedCategory ? ' dir-tag-match' : ''}`}>{c}</Link>
            ))}
            {ordered.length > 4 && (
              <button
                type="button"
                className="dir-tag dir-tag-more"
                aria-expanded={showAllSupports}
                onClick={() => setShowAllSupports((shown) => !shown)}
              >
                {showAllSupports ? 'Show fewer' : `+${ordered.length - 4} more`}
              </button>
            )}
          </div>
        );
      })()}

      <div className="dir-areas reg-card-areas">
        <span className="reg-card-areas-label">Listed for</span>
        {item.areas.length > 0 ? (
          <div className="reg-card-area-links">
            {item.areas.map((area, index) => (
              <span key={`${area.state}-${area.suburbSlug}`}>
                {index > 0 && <span aria-hidden="true">; </span>}
                <Link to={areaPath(area)}>{areaLabel(area)}</Link>
              </span>
            ))}
            {more > 0 && (
              <>
                {' and '}
                <Link className="reg-card-more-areas" to={registerPath(kind, item.slug)}>{more} more area{more === 1 ? '' : 's'}</Link>
              </>
            )}
          </div>
        ) : <span className="reg-card-area-empty">Service areas not listed</span>}
      </div>

      <dl className="reg-card-facts">
        <div><dt>Service areas</dt><dd>{item.areaCount.toLocaleString('en-AU')}</dd></div>
        <div><dt>States</dt><dd>{stateLabel}</dd></div>
        <div><dt>Supports listed</dt><dd>{item.supportCategories.length}</dd></div>
        {item.abn && <div><dt>ABN</dt><dd>{item.abn}</dd></div>}
      </dl>

      <p className="reg-card-contact-note">Phone and email are not displayed. Send a free request so suitable providers can respond through SolDirectory.</p>

      <div className="reg-card-actions">
        <button type="button" className="btn-gradient reg-card-match" onClick={() => openMatchModal()}>Get matched, free</button>
        <Link className="dir-card-cta reg-card-link" to={registerPath(kind, item.slug)}>View register listing →</Link>
      </div>
    </li>
  );
}
