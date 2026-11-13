// Frontend/src/App.tsx
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { getAuthToken, getAuthRole } from './utils/authStorage';
import Layout from './components/Layout';
import Login from './pages/Login';

const DashboardAdmin = lazy(() => import('./pages/DashboardAdmin'));
const MonitoringNotifikasi = lazy(() => import('./pages/Admin/MonitoringNotifikasi'));
const PengaturanAdmin = lazy(() => import('./pages/Admin/PengaturanAdmin'));
const SemuaTugas = lazy(() => import('./pages/SemuaTugas'));
const SemuaTugasLengkap = lazy(() => import('./pages/SemuaTugasLengkap'));
const TambahTugas = lazy(() => import('./pages/TambahTugas'));
const LaporkanMasalah = lazy(() => import('./pages/LaporkanMasalah'));
const DokumenSOP = lazy(() => import('./pages/DokumenSop'));
const RiwayatTugas = lazy(() => import('./pages/RiwayatTugas'));
const PeformaAnalisis = lazy(() => import('./pages/PeformaAnalisis'));
const AnalitikKunjungan = lazy(() => import('./pages/AnalitikKunjungan'));
const LaporanSLA = lazy(() => import('./pages/LaporanSLA'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DetailTugas = lazy(() => import('./pages/DetailTugas'));
const DetailLaporan = lazy(() => import('./pages/DetailLaporan'));
const RiwayatLaporan = lazy(() => import('./pages/RiwayatLaporan'));
const DashboardStaff = lazy(() => import('./pages/Staf/DashboardStaff'));
const DashboardKoordinator = lazy(() => import('./pages/Koordinator/DashboardKoordinator'));
const MenuLaporan = lazy(() => import('./pages/Koordinator/MenuLaporan'));
const DashboardKadiv = lazy(() => import('./pages/Kadiv/DashboardKadiv'));

const RouteSuspenseFallback = () => (
  <div className="h-full w-full min-h-[260px] flex items-center justify-center bg-[#F4F8F5] p-6">
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#C6E8D5] shadow-xs">
      <span className="w-4 h-4 border-2 border-[#1E8455] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-[#24553F]">Memuat halaman...</span>
    </div>
  </div>
);

// Fungsi penentu beranda sesuai Role masing-masing
export const getDashboardByRole = (role: string | null) => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard-admin'; // Admin masuk ke Dashboard Admin (UAT-1.1)
    case 'DIREKTUR':
      return '/dashboard'; // Direktur masuk ke Dashboard Eksekutif (UAT-5.1)
    case 'KADIV':
      return '/dashboard-kadiv';
    case 'KOORDINATOR':
      return '/dashboard-koordinator';
    case 'STAF':
    default:
      return '/dashboard-staff';
  }
};

// 1. Komponen Penjaga Login (Wajib punya Token)
const ProtectedRoute = () => {
  const token = getAuthToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 2. Komponen Penjaga Role (RBAC)
const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const token = getAuthToken();
  const role = getAuthRole();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  // Jika mencoba mengakses URL di luar wewenangnya, tampilkan peringatan Akses Ditolak
  if (!allowedRoles.includes(role)) {
    alert('Akses Ditolak! Anda tidak memiliki wewenang untuk mengakses halaman ini.');
    return <Navigate to={getDashboardByRole(role)} replace />;
  }

  return <Outlet />;
};


// Pengatur Judul Tab Browser Dinamis Sesuai Status Otentikasi dan Role
const DynamicDocumentTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const token = getAuthToken();
    const role = getAuthRole();

    if (location.pathname === '/login' || !token) {
      document.title = 'Selamat datang di menu login';
    } else {
      const roleMap: Record<string, string> = {
        ADMIN: 'Admin',
        DIREKTUR: 'Direktur',
        KADIV: 'Kepala Divisi',
        KOORDINATOR: 'Koordinator',
        STAF: 'Staf',
      };
      const roleLabel = role ? (roleMap[role] || role) : 'Pengguna';
      document.title = `${roleLabel} - RSIA Qurrata A'yun`;
    }
  }, [location]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <DynamicDocumentTitle />
      <Suspense fallback={<RouteSuspenseFallback />}>
        <Routes>
        {/* Saat pertama kali membuka web ('/'), selalu arahkan ke halaman Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rute Publik: Hanya Login */}
        <Route path="/login" element={<Login />} />

        {/* Rute Terlindungi Token & Role di dalam Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* 1. Kelola Akun Pegawai (Khusus Admin) */}
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

            {/* 3. Beranda Manajerial (Khusus Kepala Divisi) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KADIV']} />}>
              <Route path="/dashboard-kadiv" element={<DashboardKadiv />} />
            </Route>

            {/* 4. Beranda Koordinator (Khusus Koordinator) */}
            <Route element={<RoleProtectedRoute allowedRoles={['KOORDINATOR']} />}>
              <Route path="/dashboard-koordinator" element={<DashboardKoordinator />} />
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

            {/* 7. Menu Laporkan Masalah / Ajukan Tiket ke Pihak Berwenang */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/laporkan-masalah" element={<LaporkanMasalah />} />
            </Route>

            {/* 8. Laporan Kinerja / SLA */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV', 'KOORDINATOR']} />}>
              <Route path="/laporan-sla" element={<LaporanSLA />} />
            </Route>

            {/* 8b. Analitik Prediksi Kunjungan Rawat Jalan (Scientific Method) */}
            <Route element={<RoleProtectedRoute allowedRoles={['DIREKTUR', 'KADIV']} />}>
              <Route path="/analitik-kunjungan" element={<AnalitikKunjungan />} />
            </Route>

            {/* 9. Rute Umum Lintas Role (Daftar Tugas, Riwayat, Panduan SOP) */}
            <Route element={<RoleProtectedRoute allowedRoles={['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']} />}>
              <Route path="/semua-tugas" element={<SemuaTugas />} />
              <Route path="/semua-tugas-staff" element={<SemuaTugas />} />
              <Route path="/daftar-semua-tugas" element={<SemuaTugasLengkap />} />
              <Route path="/riwayat" element={<RiwayatTugas />} />
              <Route path="/dokumen-sop" element={<DokumenSOP />} />
              <Route path="/detail-tugas/:id" element={<DetailTugas />} />
              <Route path="/riwayat-laporan" element={<RiwayatLaporan />} />
              <Route path="/detail-laporan/:id" element={<DetailLaporan />} />
              <Route path="/daftar-eskalasi-kadiv" element={<Navigate to="/semua-tugas" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Tangkap URL yang tidak dikenal dan arahkan ke Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;