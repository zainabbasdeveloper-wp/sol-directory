import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="not-found-page" aria-live="polite">
      <div className="not-found-page__inner">
        <div className="not-found-page__eyebrow">Page missing</div>
        <span className="not-found-page__code" aria-hidden="true">404</span>
        <h1 className="not-found-page__title">This page can’t be found</h1>
        <p className="not-found-page__copy">
          The page you’re looking for may have moved, been removed, or the link may be outdated.
          Try heading back to the main directory or browse the most popular options below.
        </p>

        <div className="not-found-page__actions">
          <Link to="/" className="not-found-page__primary">Go home</Link>
          <Link to="/directory" className="not-found-page__secondary">Find a provider</Link>
        </div>

        <div className="not-found-page__meta">
          <Link to="/services">Browse services</Link>
          <Link to="/locations">Locations</Link>
          <Link to="/providers">For providers</Link>
          <Link to="/independent-workers">Independent Workers</Link>
        </div>
      </div>
    </div>
  );
}
