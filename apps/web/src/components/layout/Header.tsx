import { Fragment, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationsRead, type NotificationItem } from '../../api/adminDashboardResources';
import type { Role } from '@soldirectory/shared-types';
import './AppShell.css';

// `roles: undefined` means visible to any authenticated role. These
// lists match the RequireRole guards in AppRoutes.tsx exactly — a
// tab is only shown if the route behind it would actually let the
// person in.
// Internal role values stay as-is for backward compatibility with
// existing accounts and the database — this is purely the
// user-facing label mapping, same as Login.tsx/accountTypes.ts.
const ROLE_LABELS: Record<Role, string> = {
  worker: 'NDIS Worker',
  provider: 'Provider',
  coordinator: 'Allied Health',
  participant: 'Participant',
  admin: 'Admin',
};

const TABS: { to: string; label: string; roles?: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leads', label: 'Leads', roles: ['provider'] },
  { to: '/find-providers', label: 'Find providers', roles: ['coordinator', 'participant', 'admin'] },
  { to: '/saved-providers', label: 'Saved providers', roles: ['coordinator', 'participant'] },
  { to: '/verification', label: 'Verification', roles: ['admin'] },
  { to: '/admin/providers', label: 'Providers', roles: ['admin'] },
  { to: '/admin/workers', label: 'Manage workers', roles: ['admin'] },
  { to: '/admin/users', label: 'Coordinators & Participants', roles: ['admin'] },
  { to: '/admin/plans', label: 'Member Plans', roles: ['admin'] },
  { to: '/admin/services', label: 'Services', roles: ['admin'] },
  { to: '/admin/conditions', label: 'Conditions', roles: ['admin'] },
  { to: '/admin/diagnostics', label: 'Diagnostics', roles: ['admin'] },
  { to: '/onboarding', label: 'Onboarding', roles: ['provider'] },
  { to: '/plans', label: 'Plans', roles: ['provider'] },
];

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Poll every 60s so the badge stays reasonably current without
    // needing a websocket for what's a low-frequency admin feed.
    function load() {
      getNotifications().then((r) => { setUnreadCount(r.unreadCount); setItems(r.items); }).catch(() => {});
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      markNotificationsRead().then(() => {
        setUnreadCount(0);
        setItems((prev) => prev.map((i) => ({ ...i, unread: false })));
      }).catch(() => {});
    }
  }

  return (
    <div className="app-notif-wrap" ref={ref}>
      <button className="app-notif-bell" onClick={toggleOpen} aria-label="Notifications" aria-expanded={open}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && <span className="app-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="app-notif-dropdown" role="menu">
          <p className="app-notif-dropdown-title">Notifications</p>
          {items.length === 0 ? (
            <p className="app-notif-empty">Nothing yet.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`app-notif-item ${n.unread ? 'app-notif-item-unread' : ''}`}>
                <span className="app-notif-summary">{n.summary}</span>
                <span className="app-notif-time">{timeAgo(n.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleTabs = TABS.filter((tab) => !tab.roles || (user && tab.roles.includes(user.role)));
  // Workers can't use the plain roles list — access now depends on
  // plan for providers, not just role. Coordinator/participant no
  // longer see this tab at all, per the same rule change as the
  // route guard.
  const canSeeWorkersTab = !!user && (user.role === 'admin' || (user.role === 'provider' && user.plan === 'pro'));

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
            <Fragment key={tab.to}>
              <NavLink to={tab.to} className={({ isActive }) => `app-tab ${isActive ? 'app-tab-active' : ''}`}>
                {tab.label}
              </NavLink>
              {tab.to === '/dashboard' && canSeeWorkersTab && (
                <NavLink to="/workers" className={({ isActive }) => `app-tab ${isActive ? 'app-tab-active' : ''}`}>
                  Workers
                </NavLink>
              )}
            </Fragment>
          ))}
        </nav>

        <div className="app-header-account" ref={menuRef}>
          {user?.role === 'admin' && <NotificationBell />}
          {user && (
            <>
              <span className="app-account-chip">{ROLE_LABELS[user.role]}</span>
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
                    <p className="app-account-dropdown-role">{ROLE_LABELS[user.role]}</p>
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
