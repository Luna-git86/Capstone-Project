import { NavLink } from 'react-router-dom';
// Jika Anda menggunakan state untuk dropdown SOP, pertahankan kodenya
import { useState } from 'react';

export default function Sidebar() {
  const [isSopOpen, setIsSopOpen] = useState(false);
  
  // Mengambil data user dari localStorage
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const role = user?.role || 'STAF'; // Default ke STAF jika tidak ada role

  return (
    <aside className="w-64 bg-[#003366] text-white min-h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-sky-400 rounded-lg"></div>
        <div>
          <h2 className="font-bold leading-tight">Nama Program</h2>
          <p className="text-xs text-slate-400">Portal {role === 'DIREKTUR' ? 'Direktur' : 'Staff'}</p>
        </div>
      </div>

      <div className="px-6 py-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Main Menu</p>
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {/* MENU UMUM (Dilihat Semua Role) */}
          <li>
            <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/semua-tugas" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              Semua Tugas
            </NavLink>
          </li>

          {/* MENU KHUSUS KOORDINATOR / STAF */}
          {role === 'KOORDINATOR' && (
            <li>
              <NavLink to="/riwayat-tugas" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 15 15"></polyline></svg>
                Riwayat Tugas
              </NavLink>
            </li>
          )}

          <li>
            <NavLink to="/tambah-tugas" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              Tambah Tugas
            </NavLink>
          </li>

          {/* MENU KHUSUS DIREKTUR */}
          {role === 'DIREKTUR' && (
            <>
              {/* Menu Dokumen SOP */}
              <li>
                <div onClick={() => setIsSopOpen(!isSopOpen)} className="flex items-center justify-between px-6 py-3 text-sm text-slate-400 hover:text-white cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Dokumen SOP
                  </div>
                  <svg viewBox="0 0 24 24" className={`w-4 h-4 stroke-current stroke-2 fill-none transition-transform ${isSopOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
                {isSopOpen && (
                  <ul className="flex flex-col bg-[#002244] py-2">
                    <li><NavLink to="/dokumen-sop" end className={({ isActive }) => `block px-14 py-2 text-sm ${isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-white'}`}>Semua Dokumen</NavLink></li>
                    <li><NavLink to="/dokumen-sop/persetujuan" className={({ isActive }) => `block px-14 py-2 text-sm ${isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-white'}`}>Menunggu Persetujuan</NavLink></li>
                  </ul>
                )}
              </li>
              {/* Menu Peforma Analisis */}
              <li>
                <NavLink to="/peforma-analisis" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                  Peforma & Analisis
                </NavLink>
              </li>
            </>
          )}

          {/* MENU KHUSUS KOORDINATOR / STAF */}
          {role === 'KOORDINATOR' && (
            <li className="mt-4">
              <NavLink to="/laporkan-masalah" className={({ isActive }) => `flex items-center gap-3 text-sm px-6 py-3 transition-colors ${isActive ? 'bg-red-500/20 text-red-400 font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-red-400'}`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Laporkan Masalah
              </NavLink>
            </li>
          )}
        </ul>
      </nav>
    </aside>
  );
}