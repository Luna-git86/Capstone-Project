// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';
import Login from './pages/Login';
import Register from './pages/Register';

// 1. Cek Token Login
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 2. Cek Otorisasi Role (RBAC sesuai UAT)
const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const role = localStorage.getItem('userRole');
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

// 3. Pengarah Dasbor Otomatis Berdasarkan Role
const RootRedirect = () => {
  const role = localStorage.getItem('userRole');
  switch (role) {
    case 'ADMIN':
    case 'DIREKTUR':
      return <Navigate to="/dashboard" replace />;
    case 'KADIV':
      return <Navigate to="/dashboard-kadiv" replace />;
    case 'KOORDINATOR':
      return <Navigate to="/dashboard-koordinator" replace />;
    case 'STAF':
    default:
      return <Navigate to="/dashboard-staff" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Terlindungi Token & Role */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<RootRedirect />} />

            {/* Dasbor Eksekutif & Analitik (Direktur & Admin) - UAT-4.2 & UAT-5.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR']} />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="performa" element={<PeformaAnalisis />} />
            </Route>

            {/* Dasbor Manajerial (Khusus Kepala Divisi) - UAT-3.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="dashboard-kadiv" element={<DashboardKadiv />} />
            </Route>

            {/* Dasbor Koordinator (Khusus Koordinator) - UAT-2.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="dashboard-koordinator" element={<DashboardKoordinator />} />
            </Route>

            {/* Dasbor Operasional (Khusus Staf) - UAT-4.1 */}
            <Route element={<RoleProtectedRoute allowedRoles={['STAF']} />}>
              <Route path="dashboard-staff" element={<DashboardStaff />} />
            </Route>

            {/* Pengajuan Tugas Baru (Hanya Koordinator & Kadiv; Admin & Staf Diblokir sesuai UAT-1.2 & Proposal) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR', 'KADIV']} />}>
              <Route path="tambah-tugas" element={<TambahTugas />} />
            </Route>

            {/* Pengesahan Dokumen SOP (Eksklusif Direktur sesuai UAT-1.2 & UAT-5.2) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="persetujuan-sop" element={<PersetujuanSop />} />
            </Route>

            {/* Rute Umum Lintas Role */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="semua-tugas" element={<SemuaTugas />} />
              <Route path="riwayat" element={<RiwayatTugas />} />
              <Route path="laporkan-masalah" element={<LaporkanMasalah />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback rute tidak dikenal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;