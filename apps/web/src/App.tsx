import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { MatchModalProvider } from './context/MatchModalContext';
import MatchingWizard from './components/MatchingWizard';
import AppRoutes from './routes/AppRoutes';
import AccessibilityToolbar from './components/AccessibilityToolbar';
import SitePreloader from './components/SitePreloader';
import CookieConsent from './components/CookieConsent';
import './styles/global.css';

export default function App() {
  return (
    <>
      <SitePreloader />
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <MatchModalProvider>
              <AppRoutes />
              <MatchingWizard />
              <AccessibilityToolbar />
              <CookieConsent />
            </MatchModalProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}