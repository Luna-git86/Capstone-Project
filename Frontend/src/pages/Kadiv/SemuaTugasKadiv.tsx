import { useState } from 'react';

// --- DUMMY DATA PROYEK MAKRO ---
const daftarProyek = [
  { id: 'PRJ-012', nama: 'Inspeksi Kelistrikan IGD', PIC: 'Ahmad (Koor. Sarpras)', deadline: '30 Okt 2026', urgensi: 'Tinggi', status: 'Dalam Progres' },
  { id: 'PRJ-013', nama: 'Audit Kepatuhan APD Teknisi', PIC: 'Diana (Koor. K3)', deadline: '28 Okt 2026', urgensi: 'Sedang', status: 'Menunggu Pengesahan' },
  { id: 'PRJ-014', nama: 'Peremajaan Exhaust Dapur', PIC: 'Ahmad (Koor. Sarpras)', deadline: '15 Nov 2026', urgensi: 'Rendah', status: 'Baru Didelegasikan' },
  { id: 'PRJ-010', nama: 'Sertifikasi Kalibrasi Alkes', PIC: 'Budi (Koor. Alkes)', deadline: '10 Okt 2026', urgensi: 'Tinggi', status: 'Selesai' }
];

export default function SemuaTugasKadiv() {
  const [activeTab, setActiveTab] = useState('AKTIF'); // AKTIF | PENGESAHAN | RIWAYAT
  const [searchQuery, setSearchQuery] = useState('');

  // Helper Warna Badge Status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Dalam Progres': return 'bg-indigo-100 text-indigo-700';
      case 'Menunggu Pengesahan': return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Baru Didelegasikan': return 'bg-sky-100 text-sky-700';
      case 'Selesai': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper Warna Badge Urgensi
  const getUrgensiBadge = (urgensi: string) => {
    switch (urgensi) {
      case 'Tinggi': return 'bg-red-100 text-red-700';
      case 'Sedang': return 'bg-amber-100 text-amber-700';
      case 'Rendah': return 'bg-sky-100 text-sky-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Logika Filter
  const dataTertampil = daftarProyek.filter(proyek => {
    const matchSearch = proyek.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        proyek.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (activeTab === 'AKTIF') return ['Dalam Progres', 'Baru Didelegasikan'].includes(proyek.status);
    if (activeTab === 'PENGESAHAN') return proyek.status === 'Menunggu Pengesahan';
    if (activeTab === 'RIWAYAT') return proyek.status === 'Selesai';
    return true;
  });

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header & Tombol Buat Instruksi */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Instruksi & Proyek Divisi</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau progres Koordinator dan lakukan pengesahan akhir tugas</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Buat Instruksi Manajerial
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar: Tabs & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('AKTIF')}
              className={`px-5 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === 'AKTIF' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Proyek Aktif (2)
            </button>
            <button 
              onClick={() => setActiveTab('PENGESAHAN')}
              className={`px-5 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === 'PENGESAHAN' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Menunggu Pengesahan (1)
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`px-5 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Selesai
            </button>
          </div>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Cari ID atau nama proyek..." 
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
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">ID & Nama Proyek</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">PIC / Koordinator</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Tenggat Waktu</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Urgensi</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataTertampil.length > 0 ? (
                dataTertampil.map((proyek) => (
                  <tr key={proyek.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800">{proyek.nama}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-semibold">{proyek.id}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-700">{proyek.PIC}</td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">{proyek.deadline}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getUrgensiBadge(proyek.urgensi)}`}>
                        {proyek.urgensi}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(proyek.status)}`}>
                        {proyek.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {proyek.status === 'Menunggu Pengesahan' ? (
                        <button className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Tinjau
                        </button>
                      ) : (
                        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Detail
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-500 font-semibold text-sm">
                      Tidak ada proyek di kategori ini.
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