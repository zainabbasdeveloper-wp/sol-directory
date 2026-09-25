import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLayoutEffect, type ReactElement } from 'react';
import { resetSeoTags } from '../lib/seo';
import AppShell from '../components/layout/AppShell';
import Home from '../pages/public/Home';
import Directory from '../pages/public/Directory';
import Services from '../pages/public/Services';
import Locations from '../pages/public/Locations';
import ForProviders from '../pages/public/ForProviders';
import IndependentWorkers from '../pages/public/IndependentWorkers';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ConfirmCapacity from '../pages/ConfirmCapacity';
import { ForgotPassword, ResetPassword } from '../pages/auth/AccountRecovery';
import LegalPage from '../pages/public/LegalPage';
import GuidePage from '../pages/public/GuidePage';
import Dashboard from '../pages/Dashboard';
import WorkerDirectory from '../pages/workers/WorkerDirectory';
import WorkerProfile from '../pages/workers/WorkerProfile';
import Leads from '../pages/Leads';
import LeadDetailPage from '../pages/LeadDetailPage';
import Plans from '../pages/Plans';
import Onboarding from '../pages/Onboarding';
import Verification from '../pages/Verification';
import AdminProviders from '../pages/admin/AdminProviders';
import AdminProviderDetail from '../pages/admin/AdminProviderDetail';
import AdminWorkers from '../pages/admin/AdminWorkers';
import AdminWorkerDetail from '../pages/admin/AdminWorkerDetail';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminMemberPlans from '../pages/admin/AdminMemberPlans';
import AdminServices from '../pages/admin/AdminServices';
import AdminConditions from '../pages/admin/AdminConditions';
import AdminDiagnostics from '../pages/admin/AdminDiagnostics';
import AdminClaims from '../pages/admin/AdminClaims';
import AdminRegisterListings from '../pages/admin/AdminRegisterListings';
import AdminWorkerReviews from '../pages/admin/AdminWorkerReviews';
import ProviderPublicPage from '../pages/public/ProviderPublicPage';
import WorkerFinder from '../pages/public/WorkerFinder';
import WorkerPublicProfile from '../pages/public/WorkerPublicProfile';
import MyWorkerProfilePage from '../pages/workers/MyWorkerProfile';
import MyListingPage from '../pages/providers/MyListing';
import ProviderListingPage, { ConditionsHubPage } from '../pages/public/ProviderListingPage';
import ProviderDirectory from '../pages/providers/ProviderDirectory';
import ProviderProfilePage from '../pages/providers/ProviderProfilePage';
import SavedProviders from '../pages/providers/SavedProviders';
import AdminUserDetail from '../pages/admin/AdminUserDetail';
import { useAuth } from '../context/AuthContext';
import ServiceLocationPage from '../pages/public/ServiceLocationPage';
import WordPressCPTPage from '../pages/wordpress/WordPressCPTPage';
import { CPT_ROUTES } from '../lib/cptRouteConfig';
import WordPressCatchAllPage from '../pages/wordpress/WordPressCatchAllPage';
import { RegisterHubRoute, RegisterSingleRoute, RegisterSuburbRoute } from '../pages/public/register/RegisterRoutes';
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

// Mirrors the backend's requireAdminOrProProvider exactly — admin
// always gets in, a provider only on the 'pro' plan, everyone else
// (including coordinator/participant, who used to have access
// before this rule changed) is turned away. This is a UX
// convenience only; the real enforcement is the matching backend
// middleware on the /api/workers routes.
function RequireAdminOrProProvider({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = user.role === 'admin' || (user.role === 'provider' && user.plan === 'pro');
  if (!allowed) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2>Not available for your account type</h2>
        <p>
          {user.role === 'provider'
            ? "The worker directory is available on the Pro plan. "
            : "This section isn't part of your role. "}
          <a href="/dashboard">Back to dashboard</a>
        </p>
      </div>
    );
  }
  return children;
}

export default function AppRoutes() {
  // Layout effects run before every child's useEffect, so this reset lands
  // before the new page writes its own tags.
  const { pathname } = useLocation();
  useLayoutEffect(() => { resetSeoTags(); }, [pathname]);

  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={<Home />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/services" element={<Services />} />
      <Route path="/locations" element={<Locations />} />
      <Route path="/providers" element={<ForProviders />} />
      <Route path="/independent-workers" element={<IndependentWorkers />} />
      <Route path="/independent-workers/find" element={<WorkerFinder />} />
      <Route path="/independent-workers/:slug" element={<WorkerPublicProfile />} />
      <Route path="/directory/in/:suburb" element={<ProviderListingPage mode="area" />} />
      <Route path="/directory/for" element={<ConditionsHubPage />} />
      <Route path="/directory/for/:condition" element={<ProviderListingPage mode="condition" />} />
      <Route path="/directory/:slug" element={<ProviderPublicPage />} />
      <Route path="/services/:serviceSlug/:suburb" element={<ServiceLocationPage />} />
      {/* Public-register pages (data from the NDIS Commission / My Aged Care registers). */}
      <Route path="/ndis-providers" element={<RegisterHubRoute path="ndis-providers" />} />
      <Route path="/ndis-providers/:first" element={<RegisterSingleRoute path="ndis-providers" />} />
      <Route path="/ndis-providers/:state/:suburb" element={<RegisterSuburbRoute path="ndis-providers" />} />
      <Route path="/aged-care-providers" element={<RegisterHubRoute path="aged-care-providers" />} />
      <Route path="/aged-care-providers/:first" element={<RegisterSingleRoute path="aged-care-providers" />} />
      <Route path="/aged-care-providers/:state/:suburb" element={<RegisterSuburbRoute path="aged-care-providers" />} />
      {/* New WordPress-backed dynamic content routes — single-segment,
          so they never collide with the two-segment route above or
          the exact marketing pages. */}
      {CPT_ROUTES.map((cfg) => (
        <Route key={cfg.pathPrefix} path={`/${cfg.pathPrefix}/:slug`} element={<WordPressCPTPage config={cfg} />} />
      ))}

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<LegalPage slug="privacy" />} />
      <Route path="/terms" element={<LegalPage slug="terms" />} />
      <Route path="/provider-agreement" element={<LegalPage slug="provider-agreement" />} />
      <Route path="/lead-disclaimer" element={<LegalPage slug="lead-disclaimer" />} />
      <Route path="/guides/ndis-price-guide" element={<GuidePage slug="ndis-price-guide" />} />
      <Route path="/guides/choosing-a-provider" element={<GuidePage slug="choosing-a-provider" />} />
      <Route path="/guides/plan-management-basics" element={<GuidePage slug="plan-management-basics" />} />
      <Route path="/guides/aged-care-support" element={<GuidePage slug="aged-care-support" />} />
      {/* Public — the weekly capacity confirmation email link's token
          IS the credential, same principle as password-reset links. */}
      <Route path="/confirm-capacity" element={<ConfirmCapacity />} />

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
            <RequireAdminOrProProvider>
              <WorkerDirectory />
            </RequireAdminOrProProvider>
          }
        />
        <Route
          path="/workers/:id"
          element={
            <RequireAdminOrProProvider>
              <WorkerProfile />
            </RequireAdminOrProProvider>
          }
        />
        <Route path="/provider/listing" element={<RequireRole roles={['provider']}><MyListingPage /></RequireRole>} />
        <Route path="/worker/profile" element={<RequireRole roles={['worker']}><MyWorkerProfilePage /></RequireRole>} />
        <Route path="/leads" element={<RequireRole roles={['provider']}><Leads /></RequireRole>} />
        <Route path="/leads/:id" element={<RequireRole roles={['provider']}><LeadDetailPage /></RequireRole>} />
        <Route path="/plans" element={<RequireRole roles={['provider']}><Plans /></RequireRole>} />
        <Route path="/onboarding" element={<RequireRole roles={['provider']}><Onboarding /></RequireRole>} />
        <Route path="/verification" element={<RequireRole roles={['admin']}><Verification /></RequireRole>} />
        <Route path="/admin/providers" element={<RequireRole roles={['admin']}><AdminProviders /></RequireRole>} />
        <Route path="/admin/providers/:id" element={<RequireRole roles={['admin']}><AdminProviderDetail /></RequireRole>} />
        <Route path="/admin/workers" element={<RequireRole roles={['admin']}><AdminWorkers /></RequireRole>} />
        <Route path="/admin/workers/:id" element={<RequireRole roles={['admin']}><AdminWorkerDetail /></RequireRole>} />
        <Route path="/admin/users" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
        <Route path="/find-providers" element={<RequireRole roles={['coordinator', 'participant', 'admin']}><ProviderDirectory /></RequireRole>} />
        <Route path="/providers/:slug" element={<RequireRole roles={['coordinator', 'participant', 'admin']}><ProviderProfilePage /></RequireRole>} />
        <Route path="/saved-providers" element={<RequireRole roles={['coordinator', 'participant']}><SavedProviders /></RequireRole>} />
        <Route path="/admin/users/:id" element={<RequireRole roles={['admin']}><AdminUserDetail /></RequireRole>} />
        <Route path="/admin/plans" element={<RequireRole roles={['admin']}><AdminMemberPlans /></RequireRole>} />
        <Route path="/admin/services" element={<RequireRole roles={['admin']}><AdminServices /></RequireRole>} />
        <Route path="/admin/conditions" element={<RequireRole roles={['admin']}><AdminConditions /></RequireRole>} />
        <Route path="/admin/diagnostics" element={<RequireRole roles={['admin']}><AdminDiagnostics /></RequireRole>} />
        <Route path="/admin/claims" element={<RequireRole roles={['admin']}><AdminClaims /></RequireRole>} />
        <Route path="/admin/register" element={<RequireRole roles={['admin']}><AdminRegisterListings /></RequireRole>} />
        <Route path="/admin/worker-reviews" element={<RequireRole roles={['admin']}><AdminWorkerReviews /></RequireRole>} />
      </Route>

      <Route path="*" element={<WordPressCatchAllPage />} />
    </Routes>
  );
}
