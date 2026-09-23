import { Link } from 'react-router-dom';
import MegaMenu from '../../components/MegaMenu';
import { useMatchModal } from '../../context/MatchModalContext';
import { siteConfig, phoneHref } from '../../config/siteConfig';
import './PublicLayout.css';

export function PublicHeader() {
  const { openMatchModal } = useMatchModal();
  return (
    <>
      <div className="utility-bar">
        <div className="utility-bar-inner">
          {siteConfig.contactPhone && (
            <a className="utility-item" href={phoneHref(siteConfig.contactPhone)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
              </svg>
              {siteConfig.contactPhone}
            </a>
          )}
          {siteConfig.contactEmail && (
            <a className="utility-item" href={`mailto:${siteConfig.contactEmail}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
                <path d="m3 6.5 9 6 9-6" />
              </svg>
              {siteConfig.contactEmail}
            </a>
          )}
          <span className="utility-right">
            <Link to="/login">Login</Link>
            <Link to="/providers">For providers</Link>
          </span>
        </div>
      </div>

      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link to="/" className="public-brand-link">
            <span className="public-brand-stack">
              <span className="public-brand-name">SolDirectory</span>
              <span className="public-brand-sub">A Sol Consultancy service</span>
            </span>
          </Link>
          <Link to="/directory" className="public-nav-link">
            Find a provider
          </Link>
          <MegaMenu />
          <Link to="/locations" className="public-nav-link">
            Locations
          </Link>
          <Link to="/workers" className="public-nav-link">
            For workers
          </Link>
          <button onClick={openMatchModal} className="public-cta-btn">
            Get matched free
          </button>
        </div>
      </nav>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <span className="public-footer-name">SolDirectory</span>
          <p className="public-footer-tagline">
            An independent directory and enquiry service for people seeking NDIS
            and aged care provider information in Australia.
          </p>
          {(siteConfig.contactPhone || siteConfig.contactEmail || siteConfig.contactAddress) && (
            <p className="public-footer-contact">
              {siteConfig.contactPhone && <a href={phoneHref(siteConfig.contactPhone)}>{siteConfig.contactPhone}</a>}
              {siteConfig.contactPhone && (siteConfig.contactEmail || siteConfig.contactAddress) && <br />}
              {siteConfig.contactEmail && <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>}
              {siteConfig.contactEmail && siteConfig.contactAddress && <br />}
              {siteConfig.contactAddress}
            </p>
          )}
        </div>
        <div className="public-footer-col">
          <span className="public-footer-heading">Discover</span>
          <Link to="/directory">Provider finder</Link>
          <Link to="/services">Browse services</Link>
          <Link to="/locations">Browse locations</Link>
          <Link to="/#about">How it works</Link>
        </div>
        <div className="public-footer-col">
          <span className="public-footer-heading">Guides</span>
          <Link to="/guides/ndis-price-guide">NDIS price guide</Link>
          <Link to="/guides/choosing-a-provider">Choosing a provider</Link>
          <Link to="/guides/plan-management-basics">Plan management basics</Link>
          <Link to="/guides/aged-care-support">Aged care support</Link>
        </div>
        <div className="public-footer-col">
          <span className="public-footer-heading">Company</span>
          <Link to="/providers">List your business</Link>
          {siteConfig.contactEmail && <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>}
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms of use</Link>
          <Link to="/provider-agreement">Provider agreement</Link>
          <Link to="/lead-disclaimer">Enquiry disclaimer</Link>
        </div>
      </div>
      <div className="public-footer-legal">
        © {new Date().getFullYear()}{siteConfig.legalEntity ? ` ${siteConfig.legalEntity}.` : ' SolDirectory.'} Provider details are
        supplied by providers. SolDirectory is a directory and referral
        service; it does not provide care and does not recommend any provider.
      </div>
    </footer>
  );
}
