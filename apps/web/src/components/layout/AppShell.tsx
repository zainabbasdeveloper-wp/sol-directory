import { Outlet } from 'react-router-dom';
import Header from './Header';
import './AppShell.css';

export default function AppShell() {
  return (
    <>
      <Header />
      <main id="main" className="app-main">
        <Outlet />
      </main>
    </>
  );
}
