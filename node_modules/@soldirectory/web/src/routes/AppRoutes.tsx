import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import AppShell from '../components/layout/AppShell';
import Home from '../pages/public/Home';
import Directory from '../pages/public/Directory';
import Services from '../pages/public/Services';
import Locations from '../pages/public/Locations';
import ForProviders from '../pages/public/ForProviders';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import Dashboard from '../pages/Dashboard';
import WorkerDirectory from '../pages/workers/WorkerDirectory';
import WorkerProfile from '../pages/workers/WorkerProfile';
import Leads from '../pages/Leads';
import Plans from '../pages/Plans';
import Onboarding from '../pages/Onboarding';
import Verification from '../pages/Verification';
import AdminProviders from '../pages/admin/AdminProviders';
import AdminProviderDetail from '../pages/admin/AdminProviderDetail';
import AdminWorkers from '../pages/admin/AdminWorkers';
import AdminWorkerDetail from '../pages/admin/AdminWorkerDetail';
import AdminUsers from '../pages/admin/AdminUsers';
import ProviderDirectory from '../pages/providers/ProviderDirectory';
import SavedProviders from '../pages/providers/SavedProviders';
import AdminUserDetail from '../pages/admin/AdminUserDetail';
import { useAuth } from '../context/AuthContext';
import ServiceLocationPage from '../pages/public/ServiceLocationPage';
import type { Role } from '@soldirectory/shared-types';

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  // Prevents a flash of protected content before we know whether a
  // stored token is actually valid — item 36 in the spec.
  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Real role guards on the routes that actually exist — leads/plans/
// onboarding were always provider-oriented in this build, and
// verification was always admin-only. /workers was previously
// unrestricted (a real gap — see below); it's now closed to workers,
// since browsing the worker directory was never a worker's own
// purpose in this product. Only /dashboard stays open to any
// authenticated role for now.
function RequireRole({ roles, children }: { roles: Role[]; children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2>Not available for your account type</h2>
        <p>This section isn't part of your role. <a href="/dashboard">Back to dashboard</a></p>
      </div>
    );
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={<Home />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/services" element={<Services />} />
      <Route path="/locations" element={<Locations />} />
      <Route path="/providers" element={<ForProviders />} />
      <Route path="/services/:serviceSlug/:suburb" element={<ServiceLocationPage />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Authenticated app */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/workers"
          element={
            <RequireRole roles={['provider', 'coordinator', 'participant', 'admin']}>
              <WorkerDirectory />
            </RequireRole>
          }
        />
        <Route
          path="/workers/:id"
          element={
            <RequireRole roles={['provider', 'coordinator', 'participant', 'admin']}>
              <WorkerProfile />
            </RequireRole>
          }
        />
        <Route path="/leads" element={<RequireRole roles={['provider']}><Leads /></RequireRole>} />
        <Route path="/plans" element={<RequireRole roles={['provider']}><Plans /></RequireRole>} />
        <Route path="/onboarding" element={<RequireRole roles={['provider']}><Onboarding /></RequireRole>} />
        <Route path="/verification" element={<RequireRole roles={['admin']}><Verification /></RequireRole>} />
        <Route path="/admin/providers" element={<RequireRole roles={['admin']}><AdminProviders /></RequireRole>} />
        <Route path="/admin/providers/:id" element={<RequireRole roles={['admin']}><AdminProviderDetail /></RequireRole>} />
        <Route path="/admin/workers" element={<RequireRole roles={['admin']}><AdminWorkers /></RequireRole>} />
        <Route path="/admin/workers/:id" element={<RequireRole roles={['admin']}><AdminWorkerDetail /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
        <Route path="/find-providers" element={<RequireRole roles={['coordinator', 'participant', 'admin']}><ProviderDirectory /></RequireRole>} />
        <Route path="/saved-providers" element={<RequireRole roles={['coordinator', 'participant']}><SavedProviders /></RequireRole>} />
        <Route path="/admin/users/:id" element={<RequireRole roles={['admin']}><AdminUserDetail /></RequireRole>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
