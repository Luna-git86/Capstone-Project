import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DetailTugasKadiv() {
  const navigate = useNavigate();
  const [catatanEvaluasi, setCatatanEvaluasi] = useState('');

  // --- DUMMY DATA (Disesuaikan dengan gambar referensi) ---
  const detailTugas = {
    id: 'PRJ-012',
    judul: 'Inspeksi Kelistrikan IGD Bulanan',
    urgensi: 'TINGGI',
    // Coba ubah status ini menjadi 'DALAM PROGRES' untuk melihat tampilan persis seperti gambar Anda
    status: 'MENUNGGU PENGESAHAN', 
    sla: '30 Oktober 2026, 17:00 WITA',
    dokumenSop: 'SOP_Inspeksi_IGD.pdf',
    deskripsi: 'Tolong pastikan genset IGD langsung backup dalam hitungan detik. Cek juga kelayakan kabel-kabel yang mulai terkelupas di area observasi. Laporan lengkap harus diserahkan sebelum akhir bulan.',
    pic: {
      inisial: 'A',
      nama: 'Ahmad',
      role: 'Koor. Sarpras',
      catatanStrategi: '"Pengecekan dibagi menjadi 3 area agar lebih cepat. Alat ukur sudah dikalibrasi kemarin."'
    },
    subTugas: [
      { id: 'SUB-01', nama: 'Cek Panel Utama IGD', pelaksana: 'M. Hafidz (Teknisi)', status: 'SELESAI', detail: 'Selesai: 28 Okt, 10:00' },
      { id: 'SUB-02', nama: 'Uji Coba Beban Genset Cadangan', pelaksana: 'Budi Santoso (Teknisi)', status: 'DALAM PROGRES', detail: '' },
      { id: 'SUB-03', nama: 'Ganti Kabel Area Observasi', pelaksana: 'Andi (Umum)', status: 'MENUNGGU', detail: '' }
    ],
    logAktivitas: [
      { deskripsi: 'Sub-Tugas 01 Diselesaikan', waktu: '28 Okt 2026, 10:00', oleh: 'M. Hafidz', status: 'done' },
      { deskripsi: 'Tugas Dipecah & Didelegasikan', waktu: '27 Okt 2026, 09:30', oleh: 'Koordinator', status: 'progress' },
      { deskripsi: 'Instruksi Diterbitkan', waktu: '27 Okt 2026, 08:00', oleh: 'Anda (Kadiv)', status: 'start' }
    ]
  };

  // Menghitung progres persentase
  const totalSubTugas = detailTugas.subTugas.length;
  const selesaiSubTugas = detailTugas.subTugas.filter(sub => sub.status === 'SELESAI').length;
  const progres = totalSubTugas > 0 ? Math.round((selesaiSubTugas / totalSubTugas) * 100) : 0;

  // Helper Warna Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SELESAI': return 'bg-emerald-100 text-emerald-700';
      case 'DALAM PROGRES': return 'bg-indigo-100 text-indigo-700';
      case 'MENUNGGU': return 'bg-slate-100 text-slate-600';
      case 'MENUNGGU PENGESAHAN': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Handler Aksi Keputusan
  const handleApprove = () => {
    if (window.confirm('Setujui laporan dan tutup proyek ini?')) {
      alert('Proyek berhasil diselesaikan.');
      navigate(-1);
    }
  };

  const handleReject = () => {
    if (!catatanEvaluasi) {
      alert('Mohon isi catatan evaluasi terlebih dahulu sebelum meminta revisi.');
      return;
    }
    if (window.confirm('Kembalikan tugas ini ke Koordinator untuk diperbaiki?')) {
      alert('Tugas dikembalikan untuk revisi.');
      navigate(-1);
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* HEADER UTAMA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors flex items-center gap-2 self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Daftar Tugas
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-slate-700">{detailTugas.id}</span>
              <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Urgensi: {detailTugas.urgensi}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(detailTugas.status)}`}>
                {detailTugas.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{detailTugas.judul}</h1>
          </div>
          
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-500 shadow-sm">
            {detailTugas.status === 'MENUNGGU PENGESAHAN' 
              ? 'Menunggu Keputusan Anda (Kadiv)' 
              : 'Tugas sedang dikerjakan oleh Koordinator.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* KOLOM KIRI (2/3 LEBAR LAYAR) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* 1. INFORMASI INSTRUKSI MAKRO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-5 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Informasi Instruksi Makro
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
              <div>
                <p className="text-xs text-slate-400 mb-1">Tenggat Waktu (SLA)</p>
                <p className="font-bold text-slate-800 text-sm">{detailTugas.sla}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Dokumen Referensi</p>
                <button className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-bold transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  {detailTugas.dokumenSop}
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-slate-400 mb-2">Deskripsi / Target Instruksi</p>
              <div className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                {detailTugas.deskripsi}
              </div>
            </div>
          </div>

          {/* 2. RINCIAN TUGAS CABANG (SUB-TUGAS) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-100 pb-4 mb-4 gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                  Rincian Tugas Cabang (Sub-Tugas)
                </h3>
                <p className="text-xs text-slate-400 mt-1">Delegasi lapangan yang diatur oleh Koordinator</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 w-full md:w-48">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Progres: {progres}%</span>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progres}%` }}></div>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-[#f8fafc] border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Sub-Tugas</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pelaksana Lapangan</th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTugas.subTugas.map(sub => (
                    <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <div className="text-sm font-bold text-slate-800">{sub.nama}</div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {sub.id} {sub.detail && `• ${sub.detail}`}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-slate-600">{sub.pelaksana}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold tracking-wider ${getStatusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. PANEL KEPUTUSAN MANAJERIAL (Hanya Muncul Saat Menunggu Pengesahan) */}
          {detailTugas.status === 'MENUNGGU PENGESAHAN' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider">Keputusan Pengesahan Akhir</h3>
                <p className="text-xs text-slate-500 mt-1">Berikan catatan dan tentukan apakah tugas ini sudah selesai atau butuh revisi teknis.</p>
              </div>
              
              <textarea 
                rows={3}
                placeholder="Tambahkan catatan evaluasi manajerial di sini..."
                value={catatanEvaluasi}
                onChange={(e) => setCatatanEvaluasi(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-slate-50"
              />
              
              <div className="flex flex-col sm:flex-row gap-3 justify-end mt-2">
                <button 
                  onClick={handleReject}
                  className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 text-sm font-bold rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
                >
                  Tolak & Minta Revisi
                </button>
                <button 
                  onClick={handleApprove}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  Setujui & Tutup Proyek
                </button>
              </div>
            </div>
          )}

        </div>

        {/* KOLOM KANAN (1/3 LEBAR LAYAR) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* 1. PENANGGUNG JAWAB */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider">Penanggung Jawab</h3>
            
            <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-50 mb-5">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                {detailTugas.pic.inisial}
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{detailTugas.pic.nama}</p>
                <p className="text-[11px] font-semibold text-indigo-600 mt-0.5">{detailTugas.pic.role}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mb-2">Catatan Strategi Koordinator:</p>
            <div className="text-sm text-slate-600 italic border-l-4 border-slate-200 pl-3 py-1">
              {detailTugas.pic.catatanStrategi}
            </div>
          </div>

          {/* 2. LOG AKTIVITAS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex-1">
            <h3 className="text-xs font-bold text-slate-800 mb-5 uppercase tracking-wider">Log Aktivitas</h3>
            
            <div className="flex flex-col gap-6 relative">
              {/* Garis Vertikal Latar */}
              <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-100 -z-10"></div>
              
              {detailTugas.logAktivitas.map((log, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 outline outline-4 outline-white 
                    ${log.status === 'done' ? 'bg-emerald-500' : 
                      log.status === 'progress' ? 'bg-indigo-500' : 'bg-slate-300'}`}
                  ></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight">{log.deskripsi}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">
                      {log.waktu} oleh <span className="text-slate-600">{log.oleh}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}