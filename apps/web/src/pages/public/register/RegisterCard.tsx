import { Link } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';
import type { RegisterListItem } from '../../../api/registerApi';
import { KIND_BY_TYPE, areaLabel, registerPath } from '../../../lib/registerMeta';
import '../Directory.css';
import './register.css';

/** One listing in a results grid. Links to the listing's own page. */
export default function RegisterCard({ item, matchedCategory }: { item: RegisterListItem; matchedCategory?: string }) {
  const kind = KIND_BY_TYPE[item.type];
  const more = item.areaCount - item.areas.length;
  // supportCategories comes back in whatever order the register listed it —
  // when a category filter is active, that category is *why* this card
  // matched, so it needs to be one of the (at most 4) tags actually shown,
  // not buried in "+N more" where a correct filter reads as a broken one.
  return (
    <li className="dir-card reg-card">
      <div className="dir-card-top">
        {/* The registers publish no logos: a claimed listing shows its provider's own upload, everything else the initials, never a stock image. */}
        <Avatar src={item.logoUrl} name={item.name} shape="square" />
        <div className="dir-card-title">
          <h3>
            <Link to={registerPath(kind, item.slug)}>{item.name}</Link>
          </h3>
          <span className="reg-badge">Listed on the {kind.label} register</span>
        </div>
      </div>

      {item.supportCategories.length > 0 && (() => {
        const hasMatch = !!matchedCategory && item.supportCategories.includes(matchedCategory);
        const ordered = hasMatch
          ? [matchedCategory, ...item.supportCategories.filter((c) => c !== matchedCategory)]
          : item.supportCategories;
        return (
          <div className="dir-tags" aria-label="Supports listed">
            {ordered.slice(0, 4).map((c) => (
              <span key={c} className={`dir-tag${c === matchedCategory ? ' dir-tag-match' : ''}`}>{c}</span>
            ))}
            {ordered.length > 4 && <span className="dir-tag dir-tag-more">+{ordered.length - 4} more</span>}
          </div>
        );
      })()}

      <p className="dir-areas">
        {item.areas.length > 0
          ? <>Listed for <strong>{item.areas.map(areaLabel).join('; ')}</strong>{more > 0 ? ` and ${more} more area${more === 1 ? '' : 's'}` : ''}</>
          : 'Service areas not listed'}
      </p>

      <Link className="dir-card-cta reg-card-link" to={registerPath(kind, item.slug)}>View listing →</Link>
    </li>
  );
}
