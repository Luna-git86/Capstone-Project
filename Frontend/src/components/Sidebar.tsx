// Frontend/src/components/Sidebar.tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getAuthRole, getAuthUserName, getAuthDivisiNama, clearAuthSession } from '../utils/authStorage';

interface MenuItem {
  title: string;
  path: string;
  allowedRoles: string[];
}

interface SidebarProps {
  onNavigate?: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate, onClose }) => {
  const navigate = useNavigate();

  const userRole = getAuthRole() || 'STAF';
  const userName = getAuthUserName('Pegawai RSIA');
  const userDivisi = getAuthDivisiNama();

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
      title: 'Menu Laporan',
      path: '/menu-laporan',
      allowedRoles: ['KOORDINATOR'],
    },

     //Rute untuk semua role

    {
      title: 'Daftar Tugas',
      path: '/semua-tugas',
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
    {
      title: 'Analitik Kunjungan',
      path: '/analitik-kunjungan',
      allowedRoles: ['DIREKTUR', 'KADIV'],
    },
        {
      title: 'Laporkan Masalah',
      path: '/laporkan-masalah',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },
    {
      title: 'Laporan Saya',
      path: '/riwayat-laporan',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
    },

    //Rute Khusus Admin

    {
      title: 'Log Notifikasi',
      path: '/monitoring-notifikasi',
      allowedRoles: ['ADMIN'],
    },
    {
      title: 'Pengaturan Sistem',
      path: '/pengaturan-admin',
      allowedRoles: ['ADMIN'],
    },
  ];

  const visibleMenus = menuItems.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-full lg:w-64 max-w-full bg-[#0B2447] text-white flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden shadow-lg">
      <div className="p-4 sm:p-5 border-b border-blue-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-base shadow shrink-0">
            RS
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base leading-tight truncate">E-Ticketing RSIA</h1>
            <p className="text-xs text-blue-300 truncate">Qurrata A'yun</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu navigasi"
            className="lg:hidden p-1.5 rounded-lg text-blue-200 hover:bg-blue-800/60 hover:text-white transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-5 py-3.5 bg-blue-950/50 border-b border-blue-900/60 min-w-0">
        <p className="text-sm font-semibold text-white truncate max-w-full">{userName}</p>
        <div className="mt-1.5 flex flex-col gap-1 min-w-0">
          <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold bg-blue-600/40 text-blue-200 rounded border border-blue-400/30 uppercase tracking-wider truncate max-w-full">
            Jabatan: {userRole}
          </span>
          {userRole !== 'ADMIN' && (
            <span className="inline-block px-2.5 py-0.5 text-[11px] font-medium bg-slate-800/80 text-blue-200 rounded border border-slate-700/50 truncate max-w-full">
              Divisi: {userDivisi}
            </span>
          )}
        </div>
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
              onClick={() => onNavigate?.()}
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