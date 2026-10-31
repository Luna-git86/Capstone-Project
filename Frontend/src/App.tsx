// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import LaporkanMasalah from './pages/LaporkanMasalah';
import DokumenSOP from './pages/DokumenSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import Login from './pages/Login';
import LaporanSLA from './pages/LaporanSLA';

// Rute import Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DetailTugasKoor from './pages/Koordinator/DetailTugasKoor';
import DetailValidasi from './pages/Koordinator/DetailValidasi';
import MenuLaporan from './pages/Koordinator/MenuLaporan';
import SemuaTugasKoordinator from './pages/Koordinator/SemuaTugas';

// Rute import Kadiv
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';
import SemuaTugasKadiv from './pages/Kadiv/SemuaTugasKadiv';
import DetailTugasKadiv from './pages/Kadiv/DetailTugasKadiv';
import DaftarEskalasiKadiv from './pages/Kadiv/DaftarEskalasiKadiv';
import DetailEskalasi from './pages/Kadiv/DetailEskalasi';

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
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 2. Komponen Penjaga Role (RBAC)
const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

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
            </Route>

            {/* 2. Beranda Eksekutif & Analitik (Khusus Direktur) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
            </Route>

            {/* 3. Beranda Manajerial (Khusus Kepala Divisi) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
              <Route path="/semua-tugas-kadiv" element={<SemuaTugasKadiv />} />
              <Route path="/detail-tugas-kadiv/:id" element={<DetailTugasKadiv />} />
              <Route path="/daftar-eskalasi-kadiv" element={<DaftarEskalasiKadiv />} />
              <Route path="/detail-eskalasi/:id" element={<DetailEskalasi />} />
            </Route>

            {/* 4. Beranda Koordinator (Khusus Koordinator) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
              <Route path="/detail-tugas-koordinator/:id" element={<DetailTugasKoor />} />
              <Route path="/detail-validasi/:id" element={<DetailValidasi />} />
              <Route path="/menu-laporan" element={<MenuLaporan />} />
              <Route path="/semua-tugas-koor" element={<SemuaTugasKoordinator />} />
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
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route path="/dokumen-sop" element={<DokumenSOP />} />
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