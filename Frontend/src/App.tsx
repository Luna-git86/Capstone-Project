import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SemuaTugas from './pages/SemuaTugas';
import TambahTugas from './pages/TambahTugas';
import DokumenSop from './pages/DokumenSop'; // Import halaman SOP

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="semua-tugas" element={<SemuaTugas />} />
          <Route path="tambah-tugas" element={<TambahTugas />} />
          <Route path="dokumen-sop" element={<DokumenSop />} /> 
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}