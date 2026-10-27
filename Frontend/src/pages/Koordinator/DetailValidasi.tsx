import { useState } from 'react';

export default function DetailValidasi() {
  const [keputusan, setKeputusan] = useState<'SELESAI' | 'REVISI' | 'ESKALASI' | null>(null);

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* Header Detail */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Menunggu Validasi Anda</span>
              <span className="text-slate-500 text-xs font-semibold">Tugas: TSK-088</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Perbaikan AC Poli Anak</h1>
          </div>
          <button className="text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors">
            ← Kembali ke Daftar
          </button>
        </div>

        {/* Laporan Eksekusi Staf */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Bukti Laporan Staf Lapangan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-slate-500 mb-1">Staf Pelaksana</p>
              <p className="font-semibold text-slate-800 text-sm">Budi Santoso (Teknisi AC)</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Waktu Selesai Pengerjaan</p>
              <p className="font-semibold text-slate-800 text-sm">28 Ags 2026, 14:30 WITA</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Catatan Hasil Pekerjaan / Kendala</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700">
              Freon sudah diisi ulang dan filter dibersihkan. Suhu ruangan kini stabil di 22°C. Namun, kompresor AC mulai berisik dan kemungkinan perlu diganti dalam 1 bulan ke depan karena sudah berumur 5 tahun.
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Foto Bukti Perbaikan</p>
            <div className="flex gap-4">
              <div className="w-40 h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 text-xs border border-slate-300">
                [foto_sebelum_1.jpg]
              </div>
              <div className="w-40 h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 text-xs border border-slate-300">
                [foto_sesudah_1.jpg]
              </div>
            </div>
          </div>
        </div>

        {/* Form Keputusan Koordinator */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 mb-8">
           <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider border-b border-slate-100 pb-2">Keputusan Koordinator</h3>
           
           <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Pesan Umpan Balik / Alasan Revisi / Alasan Eskalasi</label>
              <textarea 
                rows={3}
                placeholder="Tulis pesan untuk Staf (jika revisi) atau untuk Kadiv (jika eskalasi)..."
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              ></textarea>
           </div>

           {/* 3 Opsi Radio Button (Tampilan Tombol) */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <button 
                onClick={() => setKeputusan('REVISI')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors group ${keputusan === 'REVISI' ? 'border-rose-500 bg-rose-50' : 'border-rose-100 bg-white hover:bg-rose-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${keputusan === 'REVISI' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <div className="text-center">
                  <span className={`block font-bold text-sm ${keputusan === 'REVISI' ? 'text-rose-700' : 'text-slate-700'}`}>Kembalikan (Revisi)</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-1 block">Tugas belum selesai sempurna</span>
                </div>
              </button>
              
              <button 
                onClick={() => setKeputusan('ESKALASI')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors group ${keputusan === 'ESKALASI' ? 'border-amber-500 bg-amber-50' : 'border-amber-100 bg-white hover:bg-amber-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${keputusan === 'ESKALASI' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div className="text-center">
                  <span className={`block font-bold text-sm ${keputusan === 'ESKALASI' ? 'text-amber-700' : 'text-slate-700'}`}>Eskalasi ke Kadiv</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-1 block">Butuh dana/bantuan manajerial</span>
                </div>
              </button>

              <button 
                onClick={() => setKeputusan('SELESAI')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors group ${keputusan === 'SELESAI' ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-100 bg-white hover:bg-emerald-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${keputusan === 'SELESAI' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div className="text-center">
                  <span className={`block font-bold text-sm ${keputusan === 'SELESAI' ? 'text-emerald-700' : 'text-slate-700'}`}>Sahkan (Selesai)</span>
                  <span className="text-[10px] font-medium text-slate-500 mt-1 block">Tugas beres sesuai SLA</span>
                </div>
              </button>
           </div>
           
           {/* Area Tombol Submit */}
           <div className="flex justify-end border-t border-slate-100 pt-5 mt-2">
             <button 
               disabled={!keputusan} 
               className={`px-8 py-3 text-sm font-bold rounded-xl shadow-sm transition-colors ${keputusan ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
               {keputusan ? `Kirim Keputusan: ${keputusan}` : 'Pilih Tindakan Terlebih Dahulu'}
             </button>
           </div>
        </div>

      </div>
    </div>
  );
}