// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // <-- Import komponen penjaga baru

// Import Halaman (Pages)

// Import Halaman Publik (Login & Register)
import Login from './pages/Login';
import Register from './pages/Register';

import Dashboard from './pages/Dashboard';
import DashboardStaff from './pages/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import PersetujuanSop from './pages/PersetujuanSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import LaporkanMasalah from './pages/LaporkanMasalah';

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
        {/* Rute Publik (Bebas diakses tanpa login) */}
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
          </Route>

          {/* --- AREA STAF & EKSEKUTOR LAPANGAN --- */}
          {/* Koordinator & Kadiv juga boleh melihat daftar tugas lapangan */}
          <Route element={<ProtectedRoute allowedRoles={['STAF', 'KOORDINATOR', 'KADIV']} />}>
            <Route path="/dashboard-staff" element={<DashboardStaff />} />
            <Route path="/tugas" element={<SemuaTugas />} />
            <Route path="/riwayat" element={<RiwayatTugas />} />
          </Route>

          {/* --- AREA KOORDINATOR */}
          <Route element={<ProtectedRoute allowedRoles={['KOORDINATOR']} />}>
            <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} /> 
            <Route path="/ruang-triase" element={<DetailLaporan />} />
            <Route path="/menu-laporan" element={<MenuLaporan />} />
            <Route path="/semua-tugas-koor" element={<SemuaTugasKoor />} />
            <Route path="/detail-validasi" element={<DetailValidasi />} />
            <Route path="/detail-tugas-koor" element={<DetailTugasKoor />} />
          </Route>

          {/* --- AREA KADIV --- */}
          <Route element={<ProtectedRoute allowedRoles={['KADIV']} />}>
            <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
            <Route path="/semua-tugas-kadiv" element={<SemuaTugasKadiv />} />

          </Route>
          {/* --- AREA MANAJERIAL & EKSEKUTIF --- */}
          {/* Analisis performa hanya untuk pejabat eksekutif */}
          <Route element={<ProtectedRoute allowedRoles={['KADIV', 'DIREKTUR']} />}>
            <Route path="/performa" element={<PeformaAnalisis />} />
          </Route>

        </Route>
        
        {/* Tangkap rute yang tidak dikenal (404) dan lempar ke halaman awal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}