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

// Import Halaman Khusus untuk Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import RuangTriase from './pages/Koordinator/RuangTriase';
import AntreanLaporan from './pages/Koordinator/MenuLaporan';
import PantauValidasi from './pages/Koordinator/PantauValidasi';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rute Publik (Bebas diakses tanpa login) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Semua rute di bawah ini dibungkus Layout (punya Sidebar & Topbar) */}
        <Route element={<Layout />}>
          
          {/* Rute Default saat pertama kali buka aplikasi */}
          <Route index element={<Navigate to="/dashboard-staff" replace />} />

          {/* Halaman 403: Ditampilkan jika role tidak sesuai */}
          <Route path="/unauthorized" element={
            <div className="p-8 flex flex-col items-center justify-center h-full">
              <h1 className="text-red-500 font-bold text-4xl mb-4">403</h1>
              <p className="text-slate-600 text-xl">Akses Ditolak. Anda tidak memiliki izin ke halaman ini.</p>
            </div>
          } />

          {/* --- AKSES UMUM (Semua Role Bisa Lapor Masalah) --- */}
          <Route element={<ProtectedRoute allowedRoles={['STAF', 'KOORDINATOR', 'KADIV', 'DIREKTUR']} />}>
            <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
          </Route>

          {/* --- AREA STAF & EKSEKUTOR LAPANGAN --- */}
          {/* Koordinator & Kadiv juga boleh melihat daftar tugas lapangan */}
          <Route element={<ProtectedRoute allowedRoles={['STAF', 'KOORDINATOR', 'KADIV']} />}>
            <Route path="/dashboard-staff" element={<DashboardStaff />} />
            <Route path="/tugas" element={<SemuaTugas />} />
            <Route path="/riwayat" element={<RiwayatTugas />} />
          </Route>

          {/* --- AREA KOORDINATOR */}
          {/* Staf biasa tidak boleh membuat tugas proaktif atau menyetujui SOP */}
          <Route element={<ProtectedRoute allowedRoles={['KOORDINATOR']} />}>
            <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} /> 
            <Route path="/ruang-triase" element={<RuangTriase />} />
            <Route path="/menu-laporan" element={<AntreanLaporan />} />
            <Route path="/tugas/tambah" element={<TambahTugas />} />
          </Route>

          {/* --- AREA MANAJERIAL & EKSEKUTIF --- */}
          {/* Analisis performa hanya untuk pejabat eksekutif */}
          <Route element={<ProtectedRoute allowedRoles={['KADIV', 'DIREKTUR']} />}>
            <Route path="/performa" element={<PeformaAnalisis />} />
          </Route>

        </Route>
        
        {/* Tangkap rute yang tidak dikenal (404) dan lempar ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}