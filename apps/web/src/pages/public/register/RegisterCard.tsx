import { Link } from 'react-router-dom';
import Avatar from '../../../components/ui/Avatar';
import type { RegisterListItem } from '../../../api/registerApi';
import { useMatchModal } from '../../../context/MatchModalContext';
import { KIND_BY_TYPE, areaLabel, registerPath } from '../../../lib/registerMeta';
import { useMatchModal } from '../../../context/MatchModalContext';
import '../Directory.css';
import './register.css';

/** One listing in a results grid. Links to the listing's own page — every fact shown here (categories, areas, ABN, verified-contact badge) is real register/import data, never invented. */
export default function RegisterCard({ item, matchedCategory }: { item: RegisterListItem; matchedCategory?: string }) {
  const kind = KIND_BY_TYPE[item.type];
  const { openMatchModal } = useMatchModal();
  const firstArea = item.areas[0];
  const otherAreaCount = item.areaCount - 1;
  // supportCategories comes back in whatever order the register listed it —
  // when a category filter is active, that category is *why* this card
  // matched, so it needs to be one of the (at most 6) tags actually shown,
  // not buried in "+N more" where a correct filter reads as a broken one.
  const orderedCategories = (() => {
    const hasMatch = !!matchedCategory && item.supportCategories.includes(matchedCategory);
    return hasMatch ? [matchedCategory, ...item.supportCategories.filter((c) => c !== matchedCategory)] : item.supportCategories;
  })();
  const hasVerifiedContact = !!(item.phone || item.email);

  return (
    <li className="dir-card reg-card reg-card-lg">
      <div className="dir-card-top">
        {/* The registers publish no logos: a claimed listing shows its provider's own upload, everything else the initials, never a stock image. */}
        <Avatar src={item.logoUrl} name={item.name} size="md" shape="square" />
        <div className="dir-card-title">
          <h3>
            <Link to={registerPath(kind, item.slug)}>{item.name}</Link>
          </h3>
          <span className="reg-badge">Listed on the {kind.label} register</span>
        </div>
      </div>

      <p className="dir-areas">
        {firstArea
          ? <>Serves <strong>{areaLabel(firstArea)}</strong>{otherAreaCount > 0 ? `, and ${otherAreaCount} other area${otherAreaCount === 1 ? '' : 's'}` : ''}</>
          : 'Service areas not listed'}
      </p>

      {orderedCategories.length > 0 && (
        <div className="dir-tags" aria-label="Supports listed">
          {orderedCategories.slice(0, 6).map((c) => (
            <span key={c} className={`dir-tag${c === matchedCategory ? ' dir-tag-match' : ''}`}>{c}</span>
          ))}
          {orderedCategories.length > 6 && <span className="dir-tag dir-tag-more">+{orderedCategories.length - 6} more</span>}
        </div>
      )}

      {(item.abn || hasVerifiedContact) && (
        <ul className="reg-card-facts">
          {item.abn && <li>ABN {item.abn}</li>}
          {hasVerifiedContact && <li className="reg-card-fact-verified">✓ Contact details verified</li>}
        </ul>
      )}

      <div className="reg-card-actions">
        <button type="button" className="btn-gradient reg-card-match" onClick={() => openMatchModal()}>Get matched →</button>
        <Link className="dir-card-cta reg-card-link" to={registerPath(kind, item.slug)}>View full listing →</Link>
      </div>
      {item.claimStatus === 'unclaimed' && (
        <Link className="reg-card-claim" to={`${registerPath(kind, item.slug)}#claim-heading`}>Is this your business? →</Link>
      )}
    </li>
  );
}
