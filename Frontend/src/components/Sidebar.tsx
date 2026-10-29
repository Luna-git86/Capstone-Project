
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
  const userName = localStorage.getItem('userName') || 'Pengguna RSIA';

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
      title: userRole === 'ADMIN' ? 'Dashboard Admin (Akun)' : 'Dashboard',
      path: getDashboardPath(userRole),
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Log Notifikasi',
      path: '/notification-logs',
      allowedRoles: ['ADMIN'],
    },
    {
      title: 'Semua Tugas',
      path: '/semua-tugas',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Laporan Tiket',
      path: '/menu-laporan',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR'],
    },
    {
      title: 'Semua Tugas Koordinator',
      path: '/semua-tugas-koor',
      allowedRoles: ['KOORDINATOR'],
    },
    {
      title: 'Tambah Tugas',
      path: '/tambah-tugas',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR'],
    },
    {
      title: 'Riwayat Tugas',
      path: '/riwayat',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Dokumen SOP',
      path: '/persetujuan-sop',
      allowedRoles: ['DIREKTUR'],
    },
    {
      title: 'Performa & Analisis',
      path: '/performa',
      allowedRoles: ['DIREKTUR'],
    },
    {
      title: 'Laporan SLA',
      path: '/laporan-sla',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR'],
    },
    {
      title: 'Laporkan Masalah',
      path: '/laporkan-masalah',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
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
    <aside className="flex min-h-screen w-64 flex-col bg-[#0B2447] text-white shadow-lg">
      {/* Identitas aplikasi */}
      <div className="flex items-center gap-3 border-b border-blue-900/60 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-lg font-bold shadow">
          RS
        </div>

        <div>
          <h1 className="text-base font-bold leading-tight">
            E-Ticketing RSIA
          </h1>
          <p className="text-xs text-blue-300">Qurrata A'yun</p>
        </div>
      </div>

      {/* Informasi pengguna */}
      <div className="border-b border-blue-900/60 bg-blue-950/50 px-6 py-4">
        <p className="truncate text-sm font-semibold text-white">
          {userName}
        </p>

        <span className="mt-1 inline-block rounded border border-blue-400/30 bg-blue-600/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-200">
          Role: {userRole}
        </span>
      </div>

      {/* Navigasi */}
      <div className="flex-1 px-4 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-blue-300/70">
          Main Menu
        </p>

        <nav className="space-y-1">
          {visibleMenus.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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

      {/* Logout */}
      <div className="border-t border-blue-900/60 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-red-500/30 bg-red-600/20 px-3 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-600 hover:text-white"
        >
          Keluar Sesi
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
