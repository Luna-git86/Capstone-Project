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

// 1. Komponen Penjaga (Protected Route)
// Memeriksa apakah user memiliki Token JWT. Jika tidak, arahkan ke Login.
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

// 2. Pengatur Lalu Lintas Awal (Root Redirect)
// Memeriksa role user dan mengarahkan ke dasbor yang sesuai saat mengakses '/'
const RootRedirect = () => {
  const role = localStorage.getItem('userRole');
  
  if (role === 'ADMIN' || role === 'DIREKTUR') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Default untuk staf, koordinator, dan kadiv
  return <Navigate to="/dashboard-staff" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik (Bebas diakses tanpa token) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute yang Dilindungi (Wajib Login) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            {/* Gunakan RootRedirect di sini agar pintar memilih dasbor */}
            <Route index element={<RootRedirect />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard-staff" element={<DashboardStaff />} />
            <Route path="semua-tugas" element={<SemuaTugas />} />
            <Route path="tambah-tugas" element={<TambahTugas />} />
            <Route path="persetujuan-sop" element={<PersetujuanSop />} />
            <Route path="riwayat" element={<RiwayatTugas />} />
            <Route path="performa" element={<PeformaAnalisis />} />
            <Route path="laporkan-masalah" element={<LaporkanMasalah />} />
            <Route path="" element={<RootRedirect />} />
          </Route>
        </Route>
        
        {/* Tangkap rute yang tidak dikenal (404) dan lempar ke halaman awal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;