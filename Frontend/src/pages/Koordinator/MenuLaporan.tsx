import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Ticket {
  id: number;
  judul: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  createdAt?: string; 
  divisi?: { nama: string }; 
  pelapor?: { nama: string }; 
}

export default function AntreanLaporan() {
  const [daftarLaporan, setDaftarLaporan] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState('MENUNGGU'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgensi, setFilterUrgensi] = useState('Semua');

  const navigate = useNavigate(); // Deklarasi hook untuk navigasi

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setDaftarLaporan(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal mengambil data laporan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE': return 'bg-indigo-100 text-indigo-700';
      case 'DIPROSES': return 'bg-amber-100 text-amber-700';
      case 'SELESAI': return 'bg-emerald-100 text-emerald-700';
      case 'DITOLAK': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const dataTertampil = daftarLaporan.filter(laporan => {
    const isMenunggu = laporan.status === 'MENUNGGU_TRIASE';
    if (activeTab === 'MENUNGGU' && !isMenunggu) return false;
    if (activeTab === 'RIWAYAT' && isMenunggu) return false;

    const matchesSearch = (laporan.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(laporan.id).includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const mapUrgensi: Record<string, string> = { 'Tinggi': 'HIGH', 'Sedang': 'MEDIUM', 'Rendah': 'LOW' };
    if (filterUrgensi !== 'Semua' && laporan.prioritas !== mapUrgensi[filterUrgensi]) return false;

    return true;
  });

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Laporan Masuk</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau dan lakukan triase untuk tiket E-Ticketing dari unit lain</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('MENUNGGU')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'MENUNGGU' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Menunggu Triase ({daftarLaporan.filter(l => l.status === 'MENUNGGU_TRIASE').length})
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Tiket
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari ID atau masalah..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              />
            </div>
            
            <select 
              value={filterUrgensi}
              onChange={(e) => setFilterUrgensi(e.target.value)}
              className="w-full sm:w-auto p-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-indigo-500"
            >
              <option value="Semua">Semua Urgensi</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Sedang">Sedang</option>
              <option value="Rendah">Rendah</option>
            </select>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tiket & Waktu</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/3">Masalah Dilaporkan</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Pelapor & Unit</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Urgensi</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold text-sm">
                     Memuat daftar laporan...
                   </td>
                 </tr>
              ) : dataTertampil.length > 0 ? (
                dataTertampil.map((laporan) => (
                  <tr key={laporan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-blue-600">T-{String(laporan.id).padStart(3, '0')}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {laporan.createdAt ? new Date(laporan.createdAt).toLocaleDateString('id-ID') : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800 line-clamp-2">{laporan.judul}</div>
                      {activeTab === 'RIWAYAT' && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(laporan.status)}`}>
                          Status: {laporan.status.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-slate-700">{laporan.pelapor?.nama || 'Anonim'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{laporan.divisi?.nama || '-'}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                       <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
                         {laporan.prioritas}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => navigate(`/detail-laporan/${laporan.id}`)}
                        className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full ${activeTab === 'MENUNGGU' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="font-semibold text-sm">Tidak ada laporan ditemukan</p>
                    </div>
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