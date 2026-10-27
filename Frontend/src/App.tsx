// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';
import Login from './pages/Login';
import Register from './pages/Register';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const RootRedirect = () => {
  const role = localStorage.getItem('userRole');
  if (role === 'ADMIN' || role === 'DIREKTUR') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/dashboard-staff" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<RootRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard-staff" element={<DashboardStaff />} />
            <Route path="tugas" element={<SemuaTugas />} />
            <Route path="tugas/tambah" element={<TambahTugas />} />
            <Route path="persetujuan-sop" element={<PersetujuanSop />} />
            <Route path="riwayat" element={<RiwayatTugas />} />
            <Route path="performa" element={<PeformaAnalisis />} />
            <Route path="laporkan-masalah" element={<LaporkanMasalah />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;