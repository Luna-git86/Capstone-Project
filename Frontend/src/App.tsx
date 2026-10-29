
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

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
import LaporanSLA from './pages/LaporanSLA';
import Login from './pages/Login';

// Halaman Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DetailTugasKoor from './pages/Koordinator/DetailTugasKoor';
import DetailValidasi from './pages/Koordinator/DetailValidasi';
import MenuLaporan from './pages/Koordinator/MenuLaporan';
import SemuaTugasKoordinator from './pages/Koordinator/SemuaTugas';

// Menentukan halaman dashboard berdasarkan role
export const getDashboardByRole = (role: string | null) => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard-admin';
    case 'DIREKTUR':
      return '/dashboard';
    case 'KADIV':
      return '/dashboard-kadiv';
    case 'KOORDINATOR':
      return '/dashboard-koordinator';
    case 'STAF':
    default:
      return '/dashboard-staff';
  }
};

// Memastikan pengguna sudah login
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Membatasi akses halaman berdasarkan role
const RoleProtectedRoute = ({
  allowedRoles,
}: {
  allowedRoles: string[];
}) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman umum */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Semua halaman yang memerlukan login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>

            {/* ADMIN */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route
                path="/dashboard-admin"
                element={<DashboardAdmin />}
              />
            </Route>

            {/* DIREKTUR */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
              <Route
                path="/persetujuan-sop"
                element={<PersetujuanSop />}
              />
            </Route>

            {/* KADIV */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route
                path="/dashboard-kadiv"
                element={<DashboardKadiv />}
              />
            </Route>

            {/* KOORDINATOR */}
            <Route
              element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}
            >
              <Route
                path="/dashboard-koordinator"
                element={<DashboardKoordinator />}
              />
              <Route
                path="/detail-tugas-koordinator/:id"
                element={<DetailTugasKoor />}
              />
              <Route
                path="/detail-validasi/:id"
                element={<DetailValidasi />}
              />
              <Route
                path="/semua-tugas-koor"
                element={<SemuaTugasKoordinator />}
              />
            </Route>

            {/* Laporan tiket untuk DIREKTUR, KADIV, dan KOORDINATOR */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR']}
                />
              }
            >
              <Route path="/menu-laporan" element={<MenuLaporan />} />
            </Route>

            {/* Tambah tugas */}
            <Route
              element={
                <RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR']} />
              }
            >
              <Route path="/tambah-tugas" element={<TambahTugas />} />
            </Route>

            {/* Laporan SLA */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    'ADMIN',
                    'DIREKTUR',
                    'KADIV',
                    'KOORDINATOR',
                  ]}
                />
              }
            >
              <Route path="/laporan-sla" element={<LaporanSLA />} />
            </Route>

            {/* Halaman yang dapat diakses semua role yang login */}
            <Route
              element={
                <RoleProtectedRoute
                  allowedRoles={[
                    'ADMIN',
                    'DIREKTUR',
                    'KADIV',
                    'KOORDINATOR',
                    'STAF',
                  ]}
                />
              }
            >
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route
                path="/laporkan-masalah"
                element={<LaporkanMasalah />}
              />
            </Route>

          </Route>
        </Route>

        {/* Halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
