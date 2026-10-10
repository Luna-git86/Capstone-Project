import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex w-full min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-x-hidden">
        <Topbar />
        {/* Outlet adalah tempat di mana halaman Dashboard atau Semua Tugas akan dirender */}
        <Outlet />
      </main>
    </div>
  );
}