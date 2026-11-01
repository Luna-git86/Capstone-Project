import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TIPE DATA MOCK ---
interface Eskalasi {
  id: string;
  tanggalEskalasi: string;
  tiketTerkait: {
    id: string;
    judul: string;
  };
  koordinator: {
    nama: string;
    divisi: string;
  };
  alasanEskalasi: 'KENDALA_ANGGARAN' | 'LINTAS_DIVISI' | 'VENDOR_PIHAK_KETIGA';
  status: 'MENUNGGU_KEPUTUSAN' | 'DISETUJUI' | 'DITOLAK';
}

export default function DaftarEskalasiKadiv() {
  const navigate = useNavigate();
  const [daftarEskalasi, setDaftarEskalasi] = useState<Eskalasi[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [activeTab, setActiveTab] = useState('MENUNGGU'); // MENUNGGU | RIWAYAT
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAlasan, setFilterAlasan] = useState('Semua');

  useEffect(() => {
    // Simulasi Fetch Data dari Backend
    const fetchEskalasi = async () => {
      setLoading(true);
      try {
        // NANTINYA: const response = await api.get('/eskalasi');
        // setDaftarEskalasi(response.data);
        
        const mockData: Eskalasi[] = [
          {
            id: 'ESK-042',
            tanggalEskalasi: '31 Oktober 2026, 14:15',
            tiketTerkait: { id: 'T-088', judul: 'Perbaikan AC Poli Anak' },
            koordinator: { nama: 'Budi Santoso', divisi: 'Sarpras' },
            alasanEskalasi: 'KENDALA_ANGGARAN',
            status: 'MENUNGGU_KEPUTUSAN'
          },
          {
            id: 'ESK-041',
            tanggalEskalasi: '30 Oktober 2026, 09:00',
            tiketTerkait: { id: 'T-085', judul: 'Instalasi Jaringan LAN IGD' },
            koordinator: { nama: 'Siti Aminah', divisi: 'IT' },
            alasanEskalasi: 'LINTAS_DIVISI',
            status: 'MENUNGGU_KEPUTUSAN'
          },
          {
            id: 'ESK-039',
            tanggalEskalasi: '28 Oktober 2026, 16:30',
            tiketTerkait: { id: 'T-080', judul: 'Kalibrasi Mesin X-Ray' },
            koordinator: { nama: 'Ahmad', divisi: 'Alat Medis' },
            alasanEskalasi: 'VENDOR_PIHAK_KETIGA',
            status: 'DISETUJUI'
          }
        ];
        setDaftarEskalasi(mockData);
      } catch (error) {
        console.error("Gagal memuat data eskalasi", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEskalasi();
  }, []);

  // Filter Data
  const dataTertampil = daftarEskalasi.filter(esk => {
    // 1. Filter Tab
    const isMenunggu = esk.status === 'MENUNGGU_KEPUTUSAN';
    if (activeTab === 'MENUNGGU' && !isMenunggu) return false;
    if (activeTab === 'RIWAYAT' && isMenunggu) return false;

    // 2. Filter Search
    const matchesSearch = esk.tiketTerkait.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          esk.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          esk.koordinator.nama.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 3. Filter Alasan
    if (filterAlasan !== 'Semua' && esk.alasanEskalasi !== filterAlasan) return false;

    return true;
  });

  // Helper Warna Badge
  const getAlasanBadge = (alasan: string) => {
    switch (alasan) {
      case 'KENDALA_ANGGARAN': return 'bg-rose-100 text-rose-700';
      case 'LINTAS_DIVISI': return 'bg-purple-100 text-purple-700';
      case 'VENDOR_PIHAK_KETIGA': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISETUJUI': return 'bg-emerald-100 text-emerald-700';
      case 'DITOLAK': return 'bg-slate-200 text-slate-600';
      case 'MENUNGGU_KEPUTUSAN': return 'bg-sky-100 text-sky-700 border border-sky-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Eskalasi & Kendala</h1>
          <p className="text-slate-500 text-sm mt-1">Tinjau dan putuskan hambatan proyek yang dilaporkan oleh Koordinator</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar: Tabs, Search & Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('MENUNGGU')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'MENUNGGU' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Menunggu Keputusan ({daftarEskalasi.filter(e => e.status === 'MENUNGGU_KEPUTUSAN').length})
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Eskalasi
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari ID, tiket, atau PIC..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            
            <select 
              value={filterAlasan}
              onChange={(e) => setFilterAlasan(e.target.value)}
              className="w-full sm:w-auto p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="Semua">Semua Kendala</option>
              <option value="KENDALA_ANGGARAN">Anggaran</option>
              <option value="LINTAS_DIVISI">Lintas Divisi</option>
              <option value="VENDOR_PIHAK_KETIGA">Pihak Ketiga/Vendor</option>
            </select>
          </div>
        </div>
        
        {/* Area Tabel */}
        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">ID Eskalasi & Waktu</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tugas Terkait</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Koordinator</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Jenis Kendala</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-500 font-semibold text-sm">
                     Memuat daftar eskalasi...
                   </td>
                 </tr>
              ) : dataTertampil.length > 0 ? (
                dataTertampil.map((esk) => (
                  <tr key={esk.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-indigo-700">{esk.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{esk.tanggalEskalasi}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800 line-clamp-1">{esk.tiketTerkait.judul}</div>
                      <div className="text-[10px] text-slate-500 mt-1 uppercase">Tiket: {esk.tiketTerkait.id}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-slate-700">{esk.koordinator.nama}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 uppercase">{esk.koordinator.divisi}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                       <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${getAlasanBadge(esk.alasanEskalasi)}`}>
                         {esk.alasanEskalasi.replace(/_/g, ' ')}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                       <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${getStatusBadge(esk.status)}`}>
                         {esk.status.replace(/_/g, ' ')}
                       </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {esk.status === 'MENUNGGU_KEPUTUSAN' ? (
                        <button 
                          onClick={() => navigate(`/detail-eskalasi/${esk.id}`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full"
                        >
                          Tinjau Eskalasi
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/detail-eskalasi/${esk.id}`)}
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
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-semibold text-sm">
                    Tidak ada ajuan eskalasi.
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