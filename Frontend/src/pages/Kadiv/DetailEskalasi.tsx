import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function DetailEskalasi() {
  const navigate = useNavigate();
  // Nantinya, ambil ID dari URL untuk fetch data spesifik dari backend
  // const { id } = useParams(); 
  
  const [keputusan, setKeputusan] = useState('SETUJUI'); // SETUJUI | TOLAK
  const [catatanKadiv, setCatatanKadiv] = useState('');

  // --- DUMMY DATA ESKALASI ---
  // Data ini mensimulasikan rincian eskalasi yang diajukan oleh Koordinator
  const detailEskalasi = {
    id: 'ESK-042',
    tanggalEskalasi: '31 Oktober 2026, 14:15 WITA',
    tiketTerkait: {
      id: 'T-088',
      judul: 'Perbaikan AC Poli Anak',
      deadlineAsli: '28 Ags 2026',
    },
    koordinator: {
      nama: 'Budi Santoso',
      divisi: 'Sarpras',
    },
    alasanEskalasi: 'KENDALA_ANGGARAN', // KENDALA_ANGGARAN | LINTAS_DIVISI | VENDOR_PIHAK_KETIGA
    deskripsiKendala: 'Kompresor AC utama di Poli Anak terbakar dan tidak bisa diperbaiki. Membutuhkan pembelian unit kompresor baru yang melebihi batas wewenang anggaran Koordinator (Rp 5.000.000). Vendor sudah siap mengirim barang jika disetujui.',
    dampak: 'Poli Anak saat ini menggunakan kipas angin sementara, pasien mengeluh panas, berisiko mengganggu kenyamanan pelayanan medis.',
    solusiYangDiharapkan: 'Persetujuan anggaran darurat sebesar Rp 5.500.000 untuk pembelian kompresor baru dari Vendor PT Sejuk Selalu.',
    status: 'MENUNGGU_KEPUTUSAN'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanKadiv && keputusan === 'TOLAK') {
        alert('Mohon isi alasan penolakan pada catatan manajerial.');
        return;
    }
    
    // NANTINYA: Kirim ke backend (contoh: api.put(`/eskalasi/${id}`, { keputusan, catatanKadiv }))
    console.log({ keputusan, catatanKadiv });
    alert(`Eskalasi berhasil di${keputusan === 'SETUJUI' ? 'setujui' : 'tolak'}.`);
    navigate(-1); // Kembali ke dashboard
  };

  // Helper tampilan badge alasan
  const getAlasanBadge = (alasan: string) => {
    switch (alasan) {
      case 'KENDALA_ANGGARAN': return 'bg-rose-100 text-rose-700';
      case 'LINTAS_DIVISI': return 'bg-purple-100 text-purple-700';
      case 'VENDOR_PIHAK_KETIGA': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Navigasi Kembali */}
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors flex items-center gap-2 self-start"
        >
          <span>← Kembali ke Dashboard</span>
        </button>

        {/* Header Eskalasi */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-bold text-slate-600">{detailEskalasi.id}</span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getAlasanBadge(detailEskalasi.alasanEskalasi)}`}>
                {detailEskalasi.alasanEskalasi.replace('_', ' ')}
              </span>
              <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Status: {detailEskalasi.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Tinjauan Eskalasi: {detailEskalasi.tiketTerkait.judul}</h1>
            <p className="text-slate-500 text-sm mt-1">Diajukan oleh: <span className="font-semibold text-slate-700">{detailEskalasi.koordinator.nama}</span> ({detailEskalasi.koordinator.divisi}) pada {detailEskalasi.tanggalEskalasi}</p>
          </div>
        </div>

        {/* Rincian Kendala (Kiri) & Keputusan (Kanan) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Rincian Kendala */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-5 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Laporan Kendala Koordinator
              </h3>
              
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Masalah / Kendala</h4>
                  <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                    {detailEskalasi.deskripsiKendala}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Dampak Terhadap Operasional</h4>
                  <div className="text-rose-700 text-sm bg-rose-50 p-4 rounded-xl border border-rose-100 leading-relaxed">
                    {detailEskalasi.dampak}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Solusi / Dukungan yang Diharapkan</h4>
                  <div className="text-emerald-700 text-sm bg-emerald-50 p-4 rounded-xl border border-emerald-100 leading-relaxed font-medium">
                    {detailEskalasi.solusiYangDiharapkan}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Info Tiket Terkait (Konteks) */}
            <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informasi Tugas Asal</h4>
               <div className="flex gap-4">
                 <div className="flex-1">
                   <p className="text-[10px] text-slate-400 uppercase">ID Tugas</p>
                   <p className="font-semibold text-sm text-slate-700">{detailEskalasi.tiketTerkait.id}</p>
                 </div>
                 <div className="flex-2">
                   <p className="text-[10px] text-slate-400 uppercase">Judul Tugas</p>
                   <p className="font-semibold text-sm text-slate-700">{detailEskalasi.tiketTerkait.judul}</p>
                 </div>
                 <div className="flex-1">
                   <p className="text-[10px] text-slate-400 uppercase">Deadline Asli</p>
                   <p className="font-semibold text-sm text-rose-600">{detailEskalasi.tiketTerkait.deadlineAsli}</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Panel Keputusan (Kanan) */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm flex flex-col sticky top-8">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Formulir Keputusan</h3>
              
              <div className="flex flex-col gap-4 mb-6">
                <label className={`cursor-pointer flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${keputusan === 'SETUJUI' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="keputusan" 
                    value="SETUJUI"
                    checked={keputusan === 'SETUJUI'}
                    onChange={() => setKeputusan('SETUJUI')}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Setujui Permohonan</p>
                    <p className="text-xs text-slate-500 mt-1">Mengabulkan anggaran/perpanjangan SLA yang diminta Koordinator.</p>
                  </div>
                </label>

                <label className={`cursor-pointer flex items-start gap-3 p-4 rounded-xl border-2 transition-colors ${keputusan === 'TOLAK' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input 
                    type="radio" 
                    name="keputusan" 
                    value="TOLAK"
                    checked={keputusan === 'TOLAK'}
                    onChange={() => setKeputusan('TOLAK')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Tolak Eskalasi</p>
                    <p className="text-xs text-slate-500 mt-1">Tugas dikembalikan ke Koordinator untuk dicari solusi alternatif.</p>
                  </div>
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Catatan Manajerial <span className={keputusan === 'TOLAK' ? 'text-rose-500' : 'hidden'}>*</span></label>
                <textarea 
                  rows={4}
                  required={keputusan === 'TOLAK'}
                  value={catatanKadiv}
                  onChange={(e) => setCatatanKadiv(e.target.value)}
                  placeholder={keputusan === 'SETUJUI' ? "Tuliskan instruksi tambahan atau syarat persetujuan..." : "Tuliskan alasan penolakan dan arahan selanjutnya..."}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button 
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-sm transition-colors flex items-center justify-center gap-2 ${keputusan === 'SETUJUI' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {keputusan === 'SETUJUI' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Simpan & Setujui
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    Tolak Permohonan
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}