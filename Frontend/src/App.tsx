// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';
import Login from './pages/Login';

// rute import Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DetailTugasKoor from './pages/Koordinator/DetailTugasKoor';
import DetailValidasi from './pages/Koordinator/DetailValidasi';
import MenuLaporan from './pages/Koordinator/MenuLaporan';
import SemuaTugasKoordinator from './pages/Koordinator/SemuaTugas';



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

// 2. Komponen Penjaga Role (RBAC sesuai UAT-1.2 & UAT-4.2)
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
            {/* Dashboard Admin: Manajemen Akun & Matriks RBAC (Khusus Admin) - UAT-1.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            </Route>

            {/* Dashboard Eksekutif & Analitik (Khusus Direktur) - UAT-5.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
            </Route>

            {/* Dashboard Manajerial (Khusus Kepala Divisi) - UAT-3.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
            </Route>

            {/* Dashboard Koordinator (Khusus Koordinator) - UAT-2.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
              <Route path="/detail-tugas-koordinator/:id" element={<DetailTugasKoor />} />
              <Route path="/detail-validasi/:id" element={<DetailValidasi />} />
              <Route path="/menu-laporan" element={<MenuLaporan />} />
              <Route path="/semua-tugas-koor" element={<SemuaTugasKoordinator />} />
            </Route>

            {/* Dashboard Operasional (Khusus Staf) - UAT-4.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['STAF']} />}>
              <Route path="/dashboard-staff" element={<DashboardStaff />} />
            </Route>

            {/* Pengajuan Tugas Baru (Admin & Staf Diblokir sesuai UAT-1.2 & Proposal) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR', 'KADIV']} />}>
              <Route path="/tambah-tugas" element={<TambahTugas />} />
            </Route>

            {/* Pengesahan Dokumen SOP (Eksklusif Direktur sesuai UAT-1.2 & UAT-5.2) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/persetujuan-sop" element={<PersetujuanSop />} />
            </Route>

            {/* Rute Umum Lintas Role */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
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