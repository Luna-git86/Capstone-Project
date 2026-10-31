import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DetailTugasKadiv() {
  const navigate = useNavigate();
  // --- DUMMY DATA ---
  // Data ini menyimulasikan tugas makro yang telah dipecah oleh Koordinator
  const detailTugas = {
    id: 'PRJ-012',
    namaTugas: 'Inspeksi Kelistrikan IGD Bulanan',
    koordinatorPIC: 'Ahmad (Koor. Sarpras)',
    deadline: '30 Oktober 2026, 17:00 WITA',
    urgensi: 'Tinggi',
    status: 'Dalam Progres',
    deskripsiInstruksi: 'Tolong pastikan genset IGD langsung backup dalam hitungan detik. Cek juga kelayakan kabel-kabel yang mulai terkelupas di area observasi. Laporan lengkap harus diserahkan sebelum akhir bulan.',
    dokumenSOP: 'SOP_Inspeksi_IGD.pdf',
    catatanKoordinator: 'Pengecekan dibagi menjadi 3 area agar lebih cepat. Alat ukur sudah dikalibrasi kemarin.',
    
    // Ini adalah data "Tugas Cabang" (Sub-tugas) yang dibuat oleh Koordinator
    subTugas: [
      { id: 'SUB-01', nama: 'Cek Panel Utama IGD', pelaksana: 'M. Hafidz (Teknisi)', status: 'Selesai', waktuSelesai: '28 Okt, 10:00' },
      { id: 'SUB-02', nama: 'Uji Coba Beban Genset Cadangan', pelaksana: 'Budi Santoso (Teknisi)', status: 'Dalam Progres', waktuSelesai: '-' },
      { id: 'SUB-03', nama: 'Ganti Kabel Area Observasi', pelaksana: 'Andi (Umum)', status: 'Menunggu', waktuSelesai: '-' }
    ]
  };

  // Helper Warna Badge Status Sub-Tugas
  const getSubStatusBadge = (status: string) => {
    switch (status) {
      case 'Selesai': return 'bg-emerald-100 text-emerald-700';
      case 'Dalam Progres': return 'bg-blue-100 text-blue-700';
      case 'Menunggu': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Helper Warna Skema Urgensi: Hijau(Rendah), Biru(Sedang), Kuning(Tinggi), Merah(Urgen/Kritis)
  const getUrgensiBadge = (urgensi: string) => {
    switch (urgensi) {
      case 'Rendah': return 'bg-green-100 text-green-700 border-green-200';
      case 'Sedang': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Tinggi': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Urgen':
      case 'Kritis': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        
        {/* Header & Tombol Kembali */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <button 
              onClick={() => navigate('/semua-tugas-kadiv')}
              className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-2 mb-3 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Kembali ke Daftar Tugas
            </button>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-slate-500 text-sm font-bold tracking-wider">{detailTugas.id}</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getUrgensiBadge(detailTugas.urgensi)}`}>
                Urgensi: {detailTugas.urgensi}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                {detailTugas.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{detailTugas.namaTugas}</h1>
          </div>
          
          {/* Action Button Kadiv (Muncul jika status Menunggu Pengesahan) */}
          {detailTugas.status === 'Menunggu Pengesahan' ? (
            <button className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors text-sm w-full sm:w-auto">
              Tinjau & Sahkan Laporan
            </button>
          ) : (
             <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
               <p className="text-xs text-slate-500 font-semibold text-center">Tugas sedang dikerjakan oleh Koordinator.</p>
             </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* KOLOM KIRI (2/3): Rincian Utama & Tabel Sub-Tugas */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Kartu Informasi Tugas */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Informasi Instruksi Makro
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">Tenggat Waktu (SLA)</p>
                  <p className="font-bold text-slate-800 text-sm">{detailTugas.deadline}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-semibold">Dokumen Referensi</p>
                  <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    {detailTugas.dokumenSOP}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2 font-semibold">Deskripsi / Target Instruksi</p>
                <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                  {detailTugas.deskripsiInstruksi}
                </div>
              </div>
            </div>

            {/* Area Tabel Pemantauan Sub-Tugas (Tugas Cabang) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    Rincian Tugas Cabang (Sub-Tugas)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Delegasi lapangan yang diatur oleh Koordinator</p>
                </div>
                
                {/* Progres Bar Mini */}
                <div className="flex flex-col items-end w-32">
                  <span className="text-[10px] font-bold text-slate-600 mb-1">Progres: 33%</span>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '33%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-[#f8fafc] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Sub-Tugas</th>
                      <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Pelaksana Lapangan</th>
                      <th className="py-3 px-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailTugas.subTugas.map((sub, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-5">
                          <div className="text-sm font-bold text-slate-800">{sub.nama}</div>
                          <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{sub.id} {sub.status === 'Selesai' && `• Selesai: ${sub.waktuSelesai}`}</div>
                        </td>
                        <td className="py-3 px-5 text-sm font-semibold text-slate-700">{sub.pelaksana}</td>
                        <td className="py-3 px-5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getSubStatusBadge(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* KOLOM KANAN (1/3): Info Koordinator & Status Validasi */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-5">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Penanggung Jawab</h3>
               
               <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {detailTugas.koordinatorPIC.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{detailTugas.koordinatorPIC.split(' (')[0]}</p>
                    <p className="text-xs font-semibold text-indigo-600">{detailTugas.koordinatorPIC.match(/\(([^)]+)\)/)?.[1] || 'Koordinator'}</p>
                  </div>
               </div>

               <div>
                 <p className="text-xs text-slate-500 mb-2 font-semibold">Catatan Strategi Koordinator:</p>
                 <p className="text-sm text-slate-700 italic border-l-4 border-slate-300 pl-3">
                   "{detailTugas.catatanKoordinator}"
                 </p>
               </div>
            </div>

            {/* Timeline Log Singkat */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
               <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Log Aktivitas</h3>
               <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Sub-Tugas 01 Diselesaikan</p>
                      <p className="text-[10px] text-slate-500">28 Okt 2026, 10:00 oleh M. Hafidz</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Tugas Dipecah & Didelegasikan</p>
                      <p className="text-[10px] text-slate-500">27 Okt 2026, 09:30 oleh Koordinator</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-300 shrink-0"></div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Instruksi Diterbitkan</p>
                      <p className="text-[10px] text-slate-500">27 Okt 2026, 08:00 oleh Anda (Kadiv)</p>
                    </div>
                  </div>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}