// Frontend/src/components/navConfig.ts
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { canAccessAnalisisKunjungan } from '../utils/authStorage';

export interface MenuItem {
  title: string;
  shortTitle: string;
  path: string;
  allowedRoles: string[];
  icon: LucideIcon;
}

export const getDashboardPath = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard-admin';
    case 'DIREKTUR':
      return '/dashboard';
    case 'KADIV':
      return '/dashboard-kadiv';
    case 'KOORDINATOR':
      return '/dashboard-koordinator';
    case 'PENGUJI':
      return '/dashboard-penguji';
    default:
      return '/dashboard-staff';
  }
};

export const getMenuItems = (userRole: string, userDivisi?: string | null): MenuItem[] => {
  const menuItems: MenuItem[] = [
    {
      title: userRole === 'ADMIN' ? 'Kelola Akun Pegawai' : userRole === 'PENGUJI' ? 'Simulasi & Uji Sistem' : 'Beranda',
      shortTitle: userRole === 'ADMIN' ? 'Akun' : userRole === 'PENGUJI' ? 'Uji SM' : 'Beranda',
      path: getDashboardPath(userRole),
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF', 'PENGUJI'],
      icon: userRole === 'ADMIN' ? Users : userRole === 'PENGUJI' ? ClipboardCheck : Home,
    },
    {
      title: 'Menu Laporan',
      shortTitle: 'Laporan',
      path: '/menu-laporan',
      allowedRoles: ['KOORDINATOR'],
      icon: Inbox,
    },

    //Rute untuk semua role

    {
      title: 'Daftar Tugas',
      shortTitle: 'Tugas',
      path: '/semua-tugas',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
      icon: ClipboardList,
    },
    {
      title: 'Panduan SOP',
      shortTitle: 'SOP',
      path: '/dokumen-sop',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
      icon: BookOpen,
    },
    {
      title: 'Laporan Kinerja',
      shortTitle: 'Kinerja',
      path: '/laporan-sla',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR'],
      icon: BarChart3,
    },
    {
      title: 'Analisis Kunjungan',
      shortTitle: 'Analisis',
      path: '/analisis-kunjungan',
      allowedRoles: ['DIREKTUR', 'KADIV'],
      icon: Activity,
    },
    {
      title: 'Laporkan Masalah',
      shortTitle: 'Lapor',
      path: '/laporkan-masalah',
      allowedRoles: ['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
      icon: TriangleAlert,
    },
    {
      title: 'Laporan Saya',
      shortTitle: 'Laporan Saya',
      path: '/riwayat-laporan',
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
      icon: FileText,
    },

    //Rute Khusus Admin

    {
      title: 'Log Notifikasi',
      shortTitle: 'Notifikasi',
      path: '/monitoring-notifikasi',
      allowedRoles: ['ADMIN'],
      icon: BellRing,
    },
    {
      title: 'Pengaturan Sistem',
      shortTitle: 'Pengaturan',
      path: '/pengaturan-admin',
      allowedRoles: ['ADMIN'],
      icon: Settings,
    },
  ];

  return menuItems.filter((item) => {
    if (!item.allowedRoles.includes(userRole)) return false;
    if (item.path === '/analisis-kunjungan') {
      return canAccessAnalisisKunjungan(userRole, userDivisi);
    }
    return true;
  });
};
