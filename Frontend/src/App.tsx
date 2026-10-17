import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard'; // Ini milik direktur sebelumnya
import DashboardStaff from './pages/DashboardStaff'; // Dashboard yang baru dibuat
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import DokumenSop from './pages/DokumenSop';
import PersetujuanSop from './pages/PersetujuanSop';
import PeformaAnalisis from './pages/PeformaAnalisis';
import Login from './pages/Login';
import RiwayatTugas from './pages/RiwayatTugas';

// Komponen Cerdas untuk menentukan Dashboard mana yang dirender
const RoleBasedDashboard = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return <Navigate to="/login" />; // Lempar ke login jika belum ada data

  const user = JSON.parse(userData);
  return user.role === 'DIREKTUR' ? <Dashboard /> : <DashboardStaff />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Layout />}>
          {/* Menggunakan komponen RoleBasedDashboard */}
          <Route index element={<RoleBasedDashboard />} />
          
          <Route path="semua-tugas" element={<SemuaTugas />} />
          <Route path="tambah-tugas" element={<TambahTugas />} />
          <Route path="dokumen-sop" element={<DokumenSop />} /> 
          <Route path="dokumen-sop/persetujuan" element={<PersetujuanSop />} />
          <Route path="peforma-analisis" element={<PeformaAnalisis />} />
          <Route path="riwayat-tugas" element={<RiwayatTugas />} />
          <Route path="laporkan-masalah" element={<div className="p-8">Halaman Laporkan Masalah</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}