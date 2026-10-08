import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        {/* <Outlet /> adalah area dinamis. Halaman Dashboard atau Semua Tugas akan dibongkar-pasang di sini */}
        <Outlet />
      </main>
    </div>
  );
}