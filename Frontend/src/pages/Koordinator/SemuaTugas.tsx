import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Menyesuaikan interface dengan struktur API backend
interface Ticket {
  id: number;
  judul: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  deadline?: string | null;
  pelaksana?: { nama: string };
  sumber?: string; // Mengakomodasi penanda KADIV jika backend sudah mendukung
}

export default function PantauValidasi() {
  const [daftarTugas, setDaftarTugas] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [activeTab, setActiveTab] = useState('AKTIF'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();

  // Fetch data dari Backend saat komponen dimuat
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setDaftarTugas(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal mengambil data tugas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  // Filter logika: "Aktif" untuk tugas berjalan, "Riwayat" untuk yang sudah selesai
  const dataTertampil = daftarTugas.filter(item => {
    // Filter Tab
    const isAktif = ['MENUNGGU_TRIASE', 'DIPROSES'].includes(item.status);
    if (activeTab === 'AKTIF' && !isAktif) return false;
    if (activeTab === 'RIWAYAT' && isAktif) return false;

    // Filter Pencarian
    const matchesSearch = (item.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(item.id).includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    return true;
  });

  // Helper tampilan status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE': return 'bg-amber-100 text-amber-700';
      case 'DIPROSES': return 'bg-sky-100 text-sky-700';
      case 'SELESAI': return 'bg-emerald-100 text-emerald-700';
      case 'DITOLAK': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header & Tombol Tambah Tugas */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen & Validasi Tugas</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau instruksi Kadiv dan periksa hasil kerja lapangan Staf</p>
        </div>
        <button 
          onClick={() => navigate('/tambah-tugas')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Tambah Tugas
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar: Tabs & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('AKTIF')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'AKTIF' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Semua Tugas Aktif
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Tugas
            </button>
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Cari ID atau nama..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
        
        {/* Area Tabel */}
        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left min-w-[950px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">ID & Nama Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Pelaksana</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tenggat / Waktu</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold text-sm">
                     Memuat daftar tugas...
                   </td>
                 </tr>
              ) : dataTertampil.length > 0 ? (
                dataTertampil.map((item) => (
                  <tr key={item.id} className={`border-b border-slate-50 transition-colors ${item.sumber === 'KADIV' ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 px-6">
                      {/* Badge Khusus Instruksi Kadiv (Bergantung pada respons API) */}
                      {item.sumber === 'KADIV' && (
                        <span className="inline-block mb-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider rounded">
                          Instruksi Manajerial
                        </span>
                      )}
                      <div className="text-sm font-bold text-slate-800">{item.judul}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">T-{String(item.id).padStart(3, '0')}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                      {item.pelaksana?.nama ? (
                        item.pelaksana.nama
                      ) : (
                        <span className="text-slate-400 italic">Belum ditentukan</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">
                      {item.deadline ? new Date(item.deadline).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {item.sumber === 'KADIV' && item.status === 'MENUNGGU_TRIASE' ? (
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Mulai
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/detail-tugas-koor/${item.id}`)} 
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full"
                        >
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold text-sm">
                      Tidak ada tugas di kategori ini.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}