import { useState } from 'react';

// --- DUMMY DATA LAPORAN ---
const daftarLaporan = [
  { id: 'TKT-201', pelapor: 'Ns. Siti', unit: 'Poli Anak', masalah: 'AC Mati total, pasien kepanasan', urgensi: 'Tinggi', waktu: '28 Ags, 09:15', status: 'Menunggu Triase' },
  { id: 'TKT-202', pelapor: 'Andi (Farmasi)', unit: 'Apotek', masalah: 'Printer resep macet', urgensi: 'Sedang', waktu: '28 Ags, 08:30', status: 'Menunggu Triase' },
  { id: 'TKT-203', pelapor: 'Bagus (Pendaftaran)', unit: 'Lobi Utama', masalah: 'Kabel LAN putus', urgensi: 'Rendah', waktu: '28 Ags, 07:10', status: 'Menunggu Triase' },
  { id: 'TKT-199', pelapor: 'Dr. Tirta', unit: 'UGD', masalah: 'Lampu sorot redup', urgensi: 'Tinggi', waktu: '27 Ags, 22:00', status: 'Sudah Ditugaskan' },
  { id: 'TKT-198', pelapor: 'Siti (Gizi)', unit: 'Dapur', masalah: 'Exhaust fan berisik', urgensi: 'Sedang', waktu: '27 Ags, 15:45', status: 'Ditolak' }
];

export default function AntreanLaporan() {
  const [activeTab, setActiveTab] = useState('MENUNGGU'); // MENUNGGU | RIWAYAT
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUrgensi, setFilterUrgensi] = useState('Semua');

  // Helper Warna Badge Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu Triase': return 'bg-indigo-100 text-indigo-700';
      case 'Sudah Ditugaskan': return 'bg-emerald-100 text-emerald-700';
      case 'Ditolak': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Logika Filter Data
  const dataTertampil = daftarLaporan.filter(laporan => {
    // 1. Filter Tab (Menunggu vs Riwayat)
    const isMenunggu = laporan.status === 'Menunggu Triase';
    if (activeTab === 'MENUNGGU' && !isMenunggu) return false;
    if (activeTab === 'RIWAYAT' && isMenunggu) return false;

    // 2. Filter Search
    const matchesSearch = laporan.masalah.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          laporan.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 3. Filter Urgensi
    if (filterUrgensi !== 'Semua' && laporan.urgensi !== filterUrgensi) return false;

    return true;
  });

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Laporan Masuk</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau dan lakukan triase untuk tiket E-Ticketing dari unit lain</p>
        </div>
      </div>

      {/* Kontainer Utama Tabel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar: Tabs, Search & Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Tab Navigasi */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('MENUNGGU')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'MENUNGGU' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Menunggu Triase (3)
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Tiket
            </button>
          </div>

          {/* Search & Select Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari ID atau masalah..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
        
        {/* Area Tabel */}
        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tiket & Waktu</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/3">Masalah Dilaporkan</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Pelapor & Unit</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataTertampil.length > 0 ? (
                dataTertampil.map((laporan) => (
                  <tr key={laporan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800">{laporan.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{laporan.waktu}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800 line-clamp-2">{laporan.masalah}</div>
                      {/* Badge status tampil jika di tab Riwayat */}
                      {activeTab === 'RIWAYAT' && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(laporan.status)}`}>
                          Status: {laporan.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-semibold text-slate-700">{laporan.pelapor}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{laporan.unit}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {activeTab === 'MENUNGGU' ? (
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Lihat Detail
                        </button>
                      ) : (
                        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Lihat Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      <p className="font-semibold text-sm">Tidak ada laporan ditemukan</p>
                      <p className="text-xs mt-1">Coba ubah kata kunci pencarian atau filter urgensi.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Pagination Simpel */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-medium text-slate-500">Menampilkan {dataTertampil.length} laporan</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 bg-white rounded-md text-xs font-semibold text-slate-400 cursor-not-allowed">Sebelumnya</button>
            <button className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-md text-xs font-semibold text-slate-600 transition-colors">Selanjutnya</button>
          </div>
        </div>

      </div>
    </div>
  );
}