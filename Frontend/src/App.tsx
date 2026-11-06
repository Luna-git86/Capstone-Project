// Frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import MonitoringNotifikasi from './pages/Admin/MonitoringNotifikasi';
import PengaturanAdmin from './pages/Admin/PengaturanAdmin';
import DashboardStaff from './pages/Staf/DashboardStaff';
import SemuaTugas from './pages/SemuaTugas';
import SemuaTugasLengkap from './pages/SemuaTugasLengkap';
import DetailTugas from './pages/DetailTugas';
import DetailTugasList from './pages/DetailTugasList';
import TambahTugas from './pages/TambahTugas';
import LaporkanMasalah from './pages/LaporkanMasalah';
import DokumenSOP from './pages/DokumenSop';
import RiwayatTugas from './pages/RiwayatTugas';
import PeformaAnalisis from './pages/PeformaAnalisis';
import Login from './pages/Login';
import LaporanSLA from './pages/LaporanSLA';

// Rute import Koordinator
import DashboardKoordinator from './pages/Koordinator/DashboardKoordinator';
import DetailTugasKoor from './pages/Koordinator/DetailTugasKoor';
import DetailValidasi from './pages/Koordinator/DetailValidasi';
import DetailLaporan from './pages/Koordinator/DetailLaporan';
import MenuLaporan from './pages/Koordinator/MenuLaporan';

// Rute import Kepala Divisi (Kadiv)
import DashboardKadiv from './pages/Kadiv/DashboardKadiv';
import DaftarEskalasiKadiv from './pages/Kadiv/DaftarEskalasiKadiv';
import DetailEskalasi from './pages/Kadiv/DetailEskalasi';
import DetailTugasKadiv from './pages/Kadiv/DetailTugasKadiv';

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

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

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
            {/* 1. Kelola Akun, Monitoring Notifikasi & Pengaturan (Khusus Admin Sistem) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard-admin" element={<DashboardAdmin />} />
              <Route path="/monitoring-notifikasi" element={<MonitoringNotifikasi />} />
              <Route path="/pengaturan-admin" element={<PengaturanAdmin />} />
            </Route>

            {/* 2. Beranda Eksekutif & Analitik (Khusus Direktur) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/performa" element={<PeformaAnalisis />} />
            </Route>

            {/* 3. Beranda Manajerial & Eskalasi (Khusus Kepala Divisi) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
              <Route path="/daftar-eskalasi-kadiv" element={<DaftarEskalasiKadiv />} />
              <Route path="/detail-eskalasi/:id" element={<DetailEskalasi />} />
              <Route path="/detail-tugas-kadiv/:id" element={<DetailTugasKadiv />} />
            </Route>

            {/* 4. Beranda Koordinator (Khusus Koordinator) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
              <Route path="/detail-tugas-koordinator/:id" element={<DetailTugasKoor />} />
              <Route path="/detail-validasi/:id" element={<DetailValidasi />} />
              <Route path="/detail-laporan/:id" element={<DetailLaporan />} />
              <Route path="/menu-laporan" element={<MenuLaporan />} />
            </Route>

            {/* 5. Beranda Operasional (Khusus Staf) */}
            <Route element={<RoleProtectedRoute allowedRoles={['STAF']} />}>
              <Route path="/dashboard-staff" element={<DashboardStaff />} />
            </Route>

            {/* 6. Menu Buat Tugas dengan Batas Waktu Jam (Khusus Koordinator, Kadiv, Direktur) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/tambah-tugas" element={<TambahTugas />} />
            </Route>

            {/* 7. Menu Laporkan Masalah (Admin Diblokir) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
            </Route>

            {/* 8. Laporan Kinerja / SLA (Staf Diblokir) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/laporan-sla" element={<LaporanSLA />} />
            </Route>

            {/* 9. Panduan SOP (Admin Diblokir) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/dokumen-sop" element={<DokumenSOP />} />
              <Route path="/persetujuan-sop" element={<Navigate to="/dokumen-sop" replace />} />
            </Route>

            {/* 10. Rute Umum Lintas Role */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/semua-tugas-lengkap" element={<SemuaTugasLengkap />} />
              <Route path="/detail-tugas" element={<DetailTugasList />} />
              <Route path="/detail-tugas/:id" element={<DetailTugas />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;