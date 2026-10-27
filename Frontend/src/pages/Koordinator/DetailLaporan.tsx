import { useState } from 'react';

export default function RuangTriase() {
  // State untuk form pemecahan tugas dinamis (bisa tambah lebih dari 1 tugas)
  const [tugasList, setTugasList] = useState([
    { id: 1, namaTugas: '', staf: '', deadline: '', instruksi: '' }
  ]);

  const handleAddTugas = () => {
    const newId = tugasList.length ? tugasList[tugasList.length - 1].id + 1 : 1;
    setTugasList([...tugasList, { id: newId, namaTugas: '', staf: '', deadline: '', instruksi: '' }]);
  };

  const handleRemoveTugas = (id: number) => {
    setTugasList(tugasList.filter(tugas => tugas.id !== id));
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-5xl w-full flex flex-col gap-6">
        
        {/* Header Ruang Triase */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider">TIKET: TKT-201</span>
              <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Urgensi Pelapor: Tinggi</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Ruang Triase & Penugasan</h1>
          </div>
          <button className="text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2">
            <span>← Kembali ke Dasbor</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: Detail Laporan Asli (Read-Only) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Informasi Laporan</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Dilaporkan Oleh</p>
                  <p className="font-semibold text-slate-800 text-sm">Ns. Siti (Poli Anak)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Waktu Kejadian</p>
                  <p className="font-semibold text-slate-800 text-sm">28 Ags 2026, 09:15 WITA</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Judul Masalah</p>
                  <p className="font-bold text-red-600 text-sm">AC Mati total, pasien kepanasan</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Deskripsi Detail</p>
                  <p className="text-slate-700 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                    AC di ruang tunggu poli anak tiba-tiba mati dan mengeluarkan bau gosong. Pasien mulai mengeluh kepanasan. Mohon segera diperbaiki.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Foto Bukti (Opsional)</p>
                  <div className="h-24 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                    [Gambar terlampir: ac_rusak.jpg]
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tombol Tolak / Kembalikan jika data tidak valid */}
            <button className="w-full bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-600 font-bold py-3 rounded-xl transition-colors shadow-sm text-sm">
              Tolak & Kembalikan ke Pelapor
            </button>
          </div>

          {/* KOLOM KANAN: Form Triase & Delegasi Tugas */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Formulir Triase Koordinator</h3>
              
              {/* Routing & Kategori */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Kategori Insiden <span className="text-red-500">*</span></label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Pilih Kategori...</option>
                    <option>Kelistrikan (Genset/Panel)</option>
                    <option selected>Tata Udara (AC/Exhaust)</option>
                    <option>Sanitasi & Air</option>
                    <option>Perangkat Medis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Prioritas Penanganan <span className="text-red-500">*</span></label>
                  <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>Rendah (SLA 3 Hari)</option>
                    <option>Sedang (SLA 1 Hari)</option>
                    <option selected>Tinggi (SLA 4 Jam)</option>
                    <option>Kritis (SLA 1 Jam)</option>
                  </select>
                </div>
              </div>

              {/* Pemecahan Tugas (Bisa Multi-Tugas) */}
              <div className="mb-4 flex justify-between items-end">
                <label className="block text-xs font-bold text-slate-700">Delegasi Tugas ke Staf (Sub-Task) <span className="text-red-500">*</span></label>
                <button onClick={handleAddTugas} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-md">
                  + Tambah Sub-Tugas
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {tugasList.map((tugas, index) => (
                  <div key={tugas.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                    {tugasList.length > 1 && (
                      <button onClick={() => handleRemoveTugas(tugas.id)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    )}
                    <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Tugas #{index + 1}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                         <label className="block text-xs text-slate-600 mb-1">Nama Tugas</label>
                         <input type="text" placeholder="Cth: Cek Freon AC Poli Anak" className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                         <label className="block text-xs text-slate-600 mb-1">Tenggat Waktu (SLA)</label>
                         <input type="datetime-local" className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs text-slate-600 mb-1">Tetapkan Staf Pelaksana</label>
                         <select className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500">
                           <option>Pilih Staf...</option>
                           <option>Muhammad Hafidz (Teknisi Listrik)</option>
                           <option>Budi Santoso (Teknisi AC)</option>
                           <option>Andi (Umum)</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs text-slate-600 mb-1">Catatan/Instruksi Tambahan</label>
                         <input type="text" placeholder="Cth: Bawa tangga lipat dan alat las" className="w-full p-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm shadow-sm">
                  Simpan Draf
                </button>
                <button className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm shadow-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                  Distribusikan Tugas ke Staf
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}