import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SemuaTugas from './pages/SemuaTugas';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout membungkus semua halaman */}
        <Route path="/" element={<Layout />}>
          
          {/* Jika URL adalah "/", tampilkan Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Jika URL adalah "/semua-tugas", tampilkan SemuaTugas */}
          <Route path="semua-tugas" element={<SemuaTugas />} />
          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}