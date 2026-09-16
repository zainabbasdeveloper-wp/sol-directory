import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { MatchModalProvider } from './context/MatchModalContext';
import MatchingWizard from './components/MatchingWizard';
import AppRoutes from './routes/AppRoutes';
import AccessibilityToolbar from './components/AccessibilityToolbar';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <MatchModalProvider>
            <AppRoutes />
            <MatchingWizard />
            <AccessibilityToolbar />
          </MatchModalProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}