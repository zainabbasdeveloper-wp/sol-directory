import { Outlet } from 'react-router-dom';
import Header from './Header';
import { PublicFooter } from '../../pages/public/PublicLayout';
import './AppShell.css';

export default function AppShell() {
  return (
    <>
      <Header />
      <main id="main" className="app-main">
        <Outlet />
      </main>
      <PublicFooter />
    </>
  );
}
