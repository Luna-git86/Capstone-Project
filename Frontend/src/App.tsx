import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Halaman (Pages)
import Login from './pages/Login';
import Register from './pages/Register'; // TAMBAHKAN IMPORT INI
import DashboardStaff from './pages/DashboardStaff';
import LaporkanMasalah from './pages/LaporkanMasalah';
import SemuaTugas from './pages/SemuaTugas'; 
import RiwayatTugas from './pages/RiwayatTugas'; 
import TambahTugas from './pages/TambahTugas'; 

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Autentikasi (Tanpa Sidebar/Topbar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* TAMBAHKAN RUTE INI */}
        
        {/* Semua rute di dalam Layout akan memiliki Sidebar & Topbar */}
        <Route element={<Layout />}>
          
          {/* Rute Publik / Global (Bisa diakses siapapun yang login) */}
          <Route path="/lapor" element={<LaporkanMasalah />} />
          <Route path="/unauthorized" element={
            <div className="p-8 text-red-500 font-bold text-2xl">
              Akses Ditolak. Anda tidak memiliki izin untuk halaman ini.
            </div>
          } />

          {/* ==========================================
              AREA STAF
              ========================================== */}
          <Route element={<ProtectedRoute allowedRoles={['STAF']} />}>
            <Route path="/staf/dashboard" element={<DashboardStaff />} />
            <Route path="/staf/semua-tugas" element={<SemuaTugas />} />
            <Route path="/staf/riwayat-tugas" element={<RiwayatTugas />} />

            
            {/* Jika staf mengakses root (/), lempar ke dashboard */}
            <Route path="/" element={<Navigate to="/staf/dashboard" replace />} />
          </Route>

          {/* ==========================================
              AREA KOORDINATOR
              ========================================== */}
          <Route element={<ProtectedRoute allowedRoles={['KOORDINATOR']} />}>
            <Route path="/koordinator/dashboard" element={<div className="p-8">Dashboard Koordinator (Triase)</div>} />
            <Route path="/koordinator/tambah-tugas" element={<TambahTugas />} />
            <Route path="/koordinator/riwayat-tugas" element={<RiwayatTugas />} />
            {/* Tambahkan rute validasi & tugas koordinator di sini */}
          </Route>

          {/* ==========================================
              AREA MANAJERIAL & EKSEKUTIF (KADIV / DIREKTUR)
              ========================================== */}
          <Route element={<ProtectedRoute allowedRoles={['KADIV', 'DIREKTUR']} />}>
            <Route path="/manajerial/dashboard" element={<div className="p-8">Portal Manajerial</div>} />
            <Route path="/manajerial/peforma" element={<div className="p-8">Analisis Peforma</div>} />
          </Route>

        </Route>

        {/* Fallback route: Jika URL tidak ditemukan (404), kembalikan ke login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}