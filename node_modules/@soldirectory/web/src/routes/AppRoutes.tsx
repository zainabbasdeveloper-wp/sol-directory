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
import { useAuth } from '../context/AuthContext';
import ServiceLocationPage from '../pages/public/ServiceLocationPage';


function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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
        <Route path="/workers" element={<WorkerDirectory />} />
        <Route path="/workers/:id" element={<WorkerProfile />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/verification" element={<Verification />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}