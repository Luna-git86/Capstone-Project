// Frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface MenuItem {
  title: string;
  path: string;
  allowedRoles: string[];
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const userRole = localStorage.getItem('userRole') || 'STAF';
  const userName = localStorage.getItem('userName') || 'Pegawai RSIA';

  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '/dashboard-admin';
      case 'DIREKTUR':
        return '/dashboard';
      case 'KADIV':
        return '/dashboard-kadiv';
      case 'KOORDINATOR':
        return '/dashboard-koordinator';
      default:
        return '/dashboard-staff';
    }
  };

  const menuItems: MenuItem[] = [
    {
      title: userRole === 'ADMIN' ? 'Kelola Akun Pegawai' : 'Beranda',
      path: getDashboardPath(userRole),
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      // Pengajuan tiket masalah ke pihak berwenang
      title: 'Laporkan Masalah',
      path: '/laporkan-masalah',
      allowedRoles: ['KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      // Pembuatan tugas resmi dengan batas waktu jam (Khusus Koordinator s/d Direktur)
      title: 'Buat Tugas',
      path: '/tambah-tugas',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR'],
    },
    {
      title: 'Daftar Tugas',
      path: '/semua-tugas',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Riwayat Selesai',
      path: '/riwayat',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Panduan SOP',
      path: '/dokumen-sop',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Laporan Kinerja',
      path: '/laporan-sla',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR'],
    },
  ];

  const visibleMenus = menuItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-[#0B2447] text-white flex flex-col min-h-screen shadow-lg">
      <div className="p-6 border-b border-blue-900/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-lg shadow">
          RS
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">E-Ticketing RSIA</h1>
          <p className="text-xs text-blue-300">Qurrata A'yun</p>
        </div>
      </div>

      <div className="px-6 py-4 bg-blue-950/50 border-b border-blue-900/60">
        <p className="text-sm font-semibold text-white truncate">{userName}</p>
        <span className="inline-block mt-1 px-2.5 py-0.5 text-[11px] font-bold bg-blue-600/40 text-blue-200 rounded border border-blue-400/30 uppercase tracking-wider">
          Jabatan: {userRole}
        </span>
      </div>

      <div className="px-4 py-4 flex-1">
        <p className="px-3 text-xs font-semibold text-blue-300/70 uppercase tracking-wider mb-2">
          Menu Utama
        </p>
        <nav className="space-y-1">
          {visibleMenus.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-blue-100/80 hover:bg-blue-800/50 hover:text-white'
                }`
              }
            >
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-blue-900/60">
        <button
          onClick={handleLogout}
          className="w-full py-2 px-3 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;