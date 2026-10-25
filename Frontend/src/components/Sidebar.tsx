import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const [isSopOpen, setIsSopOpen] = useState(true);
  const userData = localStorage.getItem('user');
  let user: any = null;
  try {
    user = userData ? JSON.parse(userData) : null;
  } catch {
    user = null;
  }
  const role = String(user?.role || localStorage.getItem('userRole') || 'STAF').toUpperCase();
  const dashboardPath = role === 'DIREKTUR' ? '/dashboard-direktur'
    : role === 'KOORDINATOR' ? '/dashboard-koordinator'
    : role === 'KADIV' ? '/performa'
    : '/dashboard-staff';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-r-xl px-6 py-3 text-sm transition-colors ${isActive ? 'mr-5 bg-[#005bb5] font-semibold text-white' : 'text-slate-300 hover:text-white'}`;

  return (
    <aside className="fixed left-0 top-0 z-20 flex min-h-screen w-64 flex-col bg-[#003366] text-white">
      <div className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-400 font-bold text-[#003366]">Q</div>
        <div>
          <h2 className="font-bold leading-tight">RSIA Qurrata A'yun</h2>
          <p className="text-xs text-slate-300">Portal {role === 'DIREKTUR' ? 'Direktur' : role === 'KADIV' ? 'Kepala Divisi' : role === 'KOORDINATOR' ? 'Koordinator' : 'Staf'}</p>
        </div>
      </div>

      <div className="px-6 py-2">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Menu Utama</p>
      </div>

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          <li><NavLink to={dashboardPath} end className={linkClass}><span className="w-5 text-center">▦</span>Dashboard</NavLink></li>

          {['STAF', 'KOORDINATOR', 'KADIV'].includes(role) && (
            <>
              <li><NavLink to="/tugas" className={linkClass}><span className="w-5 text-center">✓</span>Semua Tugas</NavLink></li>
              <li><NavLink to="/riwayat" className={linkClass}><span className="w-5 text-center">◷</span>Riwayat Tugas</NavLink></li>
            </>
          )}

          {role === 'KOORDINATOR' && (
            <>
              <li><NavLink to="/tugas/tambah" className={linkClass}><span className="w-5 text-center">＋</span>Tambah Tugas</NavLink></li>
              <li><NavLink to="/ruang-triase" className={linkClass}><span className="w-5 text-center">▤</span>Ruang Triase</NavLink></li>
              <li><NavLink to="/menu-laporan" className={linkClass}><span className="w-5 text-center">≡</span>Antrean Laporan</NavLink></li>
              <li><NavLink to="/pantau-validasi" className={linkClass}><span className="w-5 text-center">✓</span>Pantau Validasi</NavLink></li>
            </>
          )}

          {role === 'DIREKTUR' && (
            <>
              <li>
                <button type="button" onClick={() => setIsSopOpen(!isSopOpen)} className="flex w-full items-center justify-between px-6 py-3 text-left text-sm text-slate-300 transition-colors hover:text-white">
                  <span className="flex items-center gap-3"><span className="w-5 text-center">▤</span>Dokumen SOP</span>
                  <span className={`transition-transform ${isSopOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>
                {isSopOpen && (
                  <ul className="flex flex-col bg-[#002244] py-2">
                    <li><NavLink to="/dokumen-sop" end className={({ isActive }) => `block px-14 py-2 text-sm ${isActive ? 'font-bold text-white' : 'text-slate-300 hover:text-white'}`}>Semua Dokumen</NavLink></li>
                    <li><NavLink to="/dokumen-sop/persetujuan" className={({ isActive }) => `block px-14 py-2 text-sm ${isActive ? 'font-bold text-white' : 'text-slate-300 hover:text-white'}`}>Menunggu Persetujuan</NavLink></li>
                  </ul>
                )}
              </li>
              <li><NavLink to="/performa" className={linkClass}><span className="w-5 text-center">▥</span>Performa & Analisis</NavLink></li>
            </>
          )}

          {role === 'KADIV' && <li><NavLink to="/performa" className={linkClass}><span className="w-5 text-center">▥</span>Performa & Analisis</NavLink></li>}

          {['STAF', 'KOORDINATOR', 'KADIV', 'DIREKTUR'].includes(role) && (
            <li className="mt-3"><NavLink to="/laporkan-masalah" className={linkClass}><span className="w-5 text-center">!</span>Laporkan Masalah</NavLink></li>
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-5 text-xs text-slate-400">
        E-Ticketing RSIA · Internal
      </div>
    </aside>
  );
}
