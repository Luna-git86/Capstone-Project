import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  // CATATAN: Ini adalah data dummy untuk keperluan desain UI Frontend.
  // Nantinya, hapus object ini dan ganti dengan pemanggilan Context/Zustand 
  // yang mengambil data user dari token backend teman Anda.
  const currentUser = {
    name: "Muhammad Hafidz",
    role: "KOORDINATOR", // Ubah string ini ke "STAF", "KADIV", atau "DIREKTUR" untuk melihat halaman lain
    isAuthenticated: true // Ubah ke false untuk mengetes lemparan ke halaman login
  };

  // 1. Cek Autentikasi: Jika belum login, tendang kembali ke halaman Login
  if (!currentUser.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Cek Otorisasi Role: Jika role user tidak ada di daftar yang diizinkan, tendang ke halaman 403
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Jika semua aman, render komponen halaman utama (children/Outlet)
  return <Outlet />;
}