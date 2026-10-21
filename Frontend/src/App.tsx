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
  
  // Jika ada token, izinkan masuk ke halaman yang direquest (Outlet merender Layout)
  return <Outlet />;
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
            {/* Jika user mengakses root '/', otomatis arahkan ke dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
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
        
        {/* Tangkap rute yang tidak dikenal (404) dan lempar ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;