// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';
import LaporanSLA from './pages/LaporanSLA';
import Login from './pages/Login';

export const getDashboardByRole = (role: string | null) => {
  switch (role) {
    case 'ADMIN': return '/dashboard-admin';
    case 'DIREKTUR': return '/dashboard';
    case 'KADIV': return '/dashboard-kadiv';
    case 'KOORDINATOR': return '/dashboard-koordinator';
    case 'STAF':
    default: return '/dashboard-staff';
  }
};

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  if (!token || !role) return <Navigate to="/login" replace />;
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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['STAF']} />}>
              <Route path="/dashboard-staff" element={<DashboardStaff />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR', 'KADIV']} />}>
              <Route path="/tambah-tugas" element={<TambahTugas />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/persetujuan-sop" element={<PersetujuanSop />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/laporan-sla" element={<LaporanSLA />} />
            </Route>
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
