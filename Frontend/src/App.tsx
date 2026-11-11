// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { getAuthToken, getAuthRole } from './utils/authStorage';
import Layout from './components/Layout';

import DashboardAdmin from './pages/DashboardAdmin';
import MonitoringNotifikasi from './pages/Admin/MonitoringNotifikasi';
import PengaturanAdmin from './pages/Admin/PengaturanAdmin';
import SemuaTugas from './pages/SemuaTugas';
import SemuaTugasLengkap from './pages/SemuaTugasLengkap';
import TambahTugas from './pages/TambahTugas';
import LaporkanMasalah from './pages/LaporkanMasalah';
import DokumenSOP from './pages/DokumenSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import Login from './pages/Login';
import LaporanSLA from './pages/LaporanSLA';
import Dashboard from './pages/Dashboard';
import DetailTugas from './pages/DetailTugas';
import DetailLaporan from './pages/DetailLaporan';
import RiwayatLaporan from './pages/RiwayatLaporan';

// Rute import Staff
import DashboardStaff from './pages/Staf/DashboardStaff';


// Rute import Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import MenuLaporan from './pages/Koordinator/MenuLaporan';


// Rute import Kadiv
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';

// Fungsi penentu beranda sesuai Role masing-masing
export const getDashboardByRole = (role: string | null) => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard-admin'; // Admin masuk ke Dashboard Admin (UAT-1.1)
    case 'DIREKTUR':
      return '/dashboard'; // Direktur masuk ke Dashboard Eksekutif (UAT-5.1)
    case 'KADIV':
      return '/dashboard-kadiv';
    case 'KOORDINATOR':
      return '/dashboard-koordinator';
    case 'STAF':
    default:
      return '/dashboard-staff';
  }
};

// 1. Komponen Penjaga Login (Wajib punya Token)
const ProtectedRoute = () => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 2. Komponen Penjaga Role (RBAC)
const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = getAuthToken();
  const role = getAuthRole();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  // Jika mencoba mengakses URL di luar wewenangnya, tampilkan peringatan Akses Ditolak
  if (!allowedRoles.includes(role)) {
    alert('Akses Ditolak! Anda tidak memiliki wewenang untuk mengakses halaman ini.');
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Saat pertama kali membuka web ('/'), selalu arahkan ke halaman Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rute Publik: Hanya Login */}
        <Route path="/login" element={<Login />} />

        {/* Rute Terlindungi Token & Role di dalam Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* 1. Kelola Akun Pegawai (Khusus Admin) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
              <Route path="/monitoring-notifikasi" element={<MonitoringNotifikasi />} />
              <Route path="/pengaturan-admin" element={<PengaturanAdmin />} />
            </Route>

            {/* 2. Beranda Eksekutif & Analitik (Khusus Direktur) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
            </Route>

            {/* 3. Beranda Manajerial (Khusus Kepala Divisi) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
            </Route>

            {/* 4. Beranda Koordinator (Khusus Koordinator) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
              <Route path="/menu-laporan" element={<MenuLaporan />} />
            </Route>

            {/* 5. Beranda Operasional (Khusus Staf) */}
            <Route element={<RoleProtectedRoute allowedRoles={['STAF']} />}>
              <Route path="/dashboard-staff" element={<DashboardStaff />} />

            </Route>

            {/* 6. Menu Buat Tugas dengan Batas Waktu Jam (Khusus Koordinator, Kadiv, Direktur) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/tambah-tugas" element={<TambahTugas />} />
            </Route>

            {/* 7. Menu Laporkan Masalah / Ajukan Tiket ke Pihak Berwenang */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
            </Route>

            {/* 8. Laporan Kinerja / SLA */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/laporan-sla" element={<LaporanSLA />} />
            </Route>

            {/* 9. Rute Umum Lintas Role (Daftar Tugas, Riwayat, Panduan SOP) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/semua-tugas-staff" element={<SemuaTugas />} />
              <Route path="/daftar-semua-tugas" element={<SemuaTugasLengkap />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route path="/dokumen-sop" element={<DokumenSOP />} />
              <Route path="/detail-tugas/:id" element={<DetailTugas />} />
              <Route path="/riwayat-laporan" element={<RiwayatLaporan />} />
              <Route path="/detail-laporan/:id" element={<DetailLaporan />} />
            </Route>
          </Route>
        </Route>

        {/* Tangkap URL yang tidak dikenal dan arahkan ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;