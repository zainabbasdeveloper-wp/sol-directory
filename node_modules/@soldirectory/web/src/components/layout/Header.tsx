import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AppShell.css';

const TABS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leads', label: 'Leads' },
  { to: '/workers', label: 'Workers' },
  { to: '/verification', label: 'Verification' },
  { to: '/onboarding', label: 'Onboarding' },
  { to: '/plans', label: 'Plans' },
];

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="app-header-inner">
        <Link to="/dashboard" className="app-brand">
          SolDirectory
        </Link>

        <nav className="app-tabs" aria-label="Main">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `app-tab ${isActive ? 'app-tab-active' : ''}`}>
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header-account">
          {user && (
            <>
              <span className="app-account-chip">{user.role}</span>
              <button
                className="app-account-initials"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                style={{ border: 'none', cursor: 'pointer' }}
              >
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
