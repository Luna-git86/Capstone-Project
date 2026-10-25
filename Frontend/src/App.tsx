import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardStaff from './pages/DashboardStaff';
import DashboardDirektur from './pages/DashboardDirektur';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';
import DokumenSop from './pages/DokumenSop';
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import RuangTriase from './pages/Koordinator/RuangTriase';
import AntreanLaporan from './pages/Koordinator/MenuLaporan';
import PantauValidasi from './pages/Koordinator/PantauValidasi';

function HomeRedirect() {
  const userData = localStorage.getItem('user');
  const user = userData ? JSON.parse(userData) : null;
  const role = String(user?.role || localStorage.getItem('userRole') || '').toUpperCase();
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (role === 'DIREKTUR') return <Navigate to="/dashboard-direktur" replace />;
  if (role === 'KADIV') return <Navigate to="/performa" replace />;
  if (role === 'KOORDINATOR') return <Navigate to="/dashboard-koordinator" replace />;
  return <Navigate to="/dashboard-staff" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/unauthorized" element={
            <div className="flex h-full flex-col items-center justify-center p-8">
              <h1 className="mb-4 text-4xl font-bold text-red-500">403</h1>
              <p className="text-xl text-slate-600">Akses ditolak. Akun Anda tidak memiliki izin ke halaman ini.</p>
            </div>
          } />

          <Route element={<ProtectedRoute allowedRoles={['STAF', 'KOORDINATOR', 'KADIV', 'DIREKTUR']} />}>
            <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['STAF', 'KOORDINATOR', 'KADIV']} />}>
            <Route path="/dashboard-staff" element={<DashboardStaff />} />
            <Route path="/tugas" element={<SemuaTugas />} />
            <Route path="/riwayat" element={<RiwayatTugas />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['KOORDINATOR']} />}>
            <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
            <Route path="/ruang-triase" element={<RuangTriase />} />
            <Route path="/menu-laporan" element={<AntreanLaporan />} />
            <Route path="/tugas/tambah" element={<TambahTugas />} />
            <Route path="/pantau-validasi" element={<PantauValidasi />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['DIREKTUR']} />}>
            <Route path="/dashboard-direktur" element={<DashboardDirektur />} />
            <Route path="/dokumen-sop" element={<DokumenSop />} />
            <Route path="/dokumen-sop/persetujuan" element={<PersetujuanSop />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['KADIV', 'DIREKTUR']} />}>
            <Route path="/performa" element={<PeformaAnalisis />} />
            {/* Alias untuk tautan lama yang masih dipakai di beberapa komponen. */}
            <Route path="/peforma-analisis" element={<Navigate to="/performa" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
