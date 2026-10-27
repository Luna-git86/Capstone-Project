import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar: Lebar tetap (misal: w-64 = 256px) dan tidak mengecil (shrink-0) */}
      <div className="w-64 flex-shrink-0 z-20">
        <Sidebar />
      </div>

      {/* Kolom Kanan: Topbar & Konten Utama */}
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <Topbar />
        
        {/* Main Content: Dapat di-scroll jika isi dashboard panjang */}
        <main className="flex-1 overflow-y-auto w-full">
          {/* Komponen DashboardStaff akan masuk/dirender di dalam Outlet ini */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}