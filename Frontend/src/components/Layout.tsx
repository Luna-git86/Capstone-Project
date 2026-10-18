import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar />
      {/* 
        Tambahkan margin-left (ml-64) pada container utama.
        Ini penting agar konten utama selalu berada di sebelah kanan
        sidebar yang memiliki lebar 64 (w-64) dan posisi fixed.
      */}
      <div className="flex-1 flex flex-col ml-64 min-w-0">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}