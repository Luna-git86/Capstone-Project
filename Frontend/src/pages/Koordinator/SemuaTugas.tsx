import { useState } from 'react';

// --- DUMMY DATA TUGAS (GABUNGAN TIKET & KADIV) ---
const daftarTugas = [
  { 
    id: 'TSK-088', 
    namaTugas: 'Perbaikan AC Poli Anak', 
    staf: 'Budi Santoso', 
    tanggalSelesai: '28 Ags 2026, 14:30', 
    status: 'Menunggu Validasi',
    sumber: 'TIKET' 
  },
  { 
    id: 'PRJ-012', 
    namaTugas: 'Inspeksi Kelistrikan IGD Bulanan', 
    staf: 'Belum Ditugaskan', 
    tanggalSelesai: 'Batas: 30 Ags 2026', 
    status: 'Baru',
    sumber: 'KADIV' // Penanda bahwa ini tugas proaktif dari Atasan
  },
  { 
    id: 'TSK-085', 
    namaTugas: 'Pengecekan Panel Listrik', 
    staf: 'M. Hafidz', 
    tanggalSelesai: '28 Ags 2026, 11:15', 
    status: 'Menunggu Validasi',
    sumber: 'TIKET' 
  },
  { 
    id: 'TSK-080', 
    namaTugas: 'Penggantian Pipa Wastafel IGD', 
    staf: 'Andi', 
    tanggalSelesai: '27 Ags 2026, 16:00', 
    status: 'Selesai',
    sumber: 'INTERNAL' 
  }
];

export default function PantauValidasi() {
  const [activeTab, setActiveTab] = useState('AKTIF'); 

  // Filter logika: "Aktif" menampilkan yang belum selesai. "Riwayat" menampilkan Selesai/Dibatalkan.
  const dataTertampil = daftarTugas.filter(item => 
    activeTab === 'AKTIF' ? item.status !== 'Selesai' : item.status === 'Selesai'
  );

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header & Tombol Tambah Tugas */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen & Validasi Tugas</h1>
          <p className="text-slate-500 text-sm mt-1">Pantau instruksi Kadiv dan periksa hasil kerja lapangan Staf</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-sm transition-colors flex items-center gap-2">
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
              Semua Tugas (3)
            </button>
            <button 
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 md:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Riwayat Tugas
            </button>
          </div>
          <div className="relative w-full md:w-64">
            <input type="text" placeholder="Cari ID atau nama..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" />
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
              {dataTertampil.length > 0 ? (
                dataTertampil.map((item) => (
                  <tr key={item.id} className={`border-b border-slate-50 transition-colors ${item.sumber === 'KADIV' ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                    <td className="py-4 px-6">
                      {/* Badge Khusus Instruksi Kadiv */}
                      {item.sumber === 'KADIV' && (
                        <span className="inline-block mb-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider rounded">
                          Instruksi Manajerial
                        </span>
                      )}
                      <div className="text-sm font-bold text-slate-800">{item.namaTugas}</div>
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{item.id}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-semibold text-slate-700">
                      {item.staf === 'Belum Ditugaskan' ? (
                        <span className="text-slate-400 italic">Belum ditentukan</span>
                      ) : (
                        item.staf
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">{item.tanggalSelesai}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider 
                        ${item.status === 'Menunggu Validasi' ? 'bg-amber-100 text-amber-700' : 
                          item.status === 'Baru' ? 'bg-sky-100 text-sky-700' : 
                          'bg-emerald-100 text-emerald-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {/* Logika Perubahan Tombol */}
                      {item.sumber === 'KADIV' && item.status === 'Baru' ? (
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full">
                          Mulai
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