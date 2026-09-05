import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '@soldirectory/shared-types';
import './AppShell.css';

// `roles: undefined` means visible to any authenticated role. These
// lists match the RequireRole guards in AppRoutes.tsx exactly — a
// tab is only shown if the route behind it would actually let the
// person in.
const TABS: { to: string; label: string; roles?: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leads', label: 'Leads', roles: ['provider'] },
  { to: '/workers', label: 'Workers', roles: ['provider', 'coordinator', 'participant', 'admin'] },
  { to: '/find-providers', label: 'Find providers', roles: ['coordinator', 'participant', 'admin'] },
  { to: '/saved-providers', label: 'Saved providers', roles: ['coordinator', 'participant'] },
  { to: '/verification', label: 'Verification', roles: ['admin'] },
  { to: '/admin/providers', label: 'Providers', roles: ['admin'] },
  { to: '/admin/workers', label: 'Manage workers', roles: ['admin'] },
  { to: '/admin/users', label: 'Coordinators & Participants', roles: ['admin'] },
  { to: '/onboarding', label: 'Onboarding', roles: ['provider'] },
  { to: '/plans', label: 'Plans', roles: ['provider'] },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleTabs = TABS.filter((tab) => !tab.roles || (user && tab.roles.includes(user.role)));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

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
          {visibleTabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `app-tab ${isActive ? 'app-tab-active' : ''}`}>
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header-account" ref={menuRef}>
          {user && (
            <>
              <span className="app-account-chip">{user.role}</span>
              <button
                className="app-account-initials"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </button>

              {menuOpen && (
                <div className="app-account-dropdown" role="menu">
                  <div className="app-account-dropdown-header">
                    <p className="app-account-dropdown-name">{user.name}</p>
                    <p className="app-account-dropdown-role">{user.role}</p>
                  </div>
                  <button className="app-account-dropdown-item" role="menuitem" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
