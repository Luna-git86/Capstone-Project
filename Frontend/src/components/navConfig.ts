// Frontend/src/components/navConfig.ts
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
    default:
      return '/dashboard-staff';
  }
};

export const getMenuItems = (userRole: string): MenuItem[] => {
  const menuItems: MenuItem[] = [
    {
      title: userRole === 'ADMIN' ? 'Kelola Akun Pegawai' : 'Beranda',
      shortTitle: userRole === 'ADMIN' ? 'Akun' : 'Beranda',
      path: getDashboardPath(userRole),
      allowedRoles: ['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF'],
      icon: userRole === 'ADMIN' ? Users : Home,
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
      title: 'Analitik Kunjungan',
      shortTitle: 'Analitik',
      path: '/analitik-kunjungan',
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

  return menuItems.filter((item) => item.allowedRoles.includes(userRole));
};
