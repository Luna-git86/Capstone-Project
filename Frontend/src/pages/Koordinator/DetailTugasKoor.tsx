import { useState } from 'react';

export default function PemrosesanInstruksi() {
  // State untuk form pemecahan tugas
  const [subTugasList, setSubTugasList] = useState([
    { id: 1, namaTugas: '', staf: 'Saya Sendiri (Koordinator)', deadline: '', instruksi: '' }
  ]);

  const handleAddSubTugas = () => {
    const newId = subTugasList.length ? subTugasList[subTugasList.length - 1].id + 1 : 1;
    setSubTugasList([...subTugasList, { id: newId, namaTugas: '', staf: '', deadline: '', instruksi: '' }]);
  };

  const handleRemoveSubTugas = (id: number) => {
    setSubTugasList(subTugasList.filter(tugas => tugas.id !== id));
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase">Instruksi Manajerial (KADIV)</span>
              <span className="text-slate-500 text-xs font-semibold">Proyek: PRJ-012</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Inspeksi Kelistrikan IGD Bulanan</h1>
          </div>
          <button className="text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2">
            <span>← Kembali ke Daftar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: Detail Instruksi Kadiv (Read-Only) */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Rincian Instruksi</h3>
              
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Diberikan Oleh</p>
                  <p className="font-semibold text-slate-800 text-sm">Dr. Hendra (Kepala Divisi Sarpras)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Batas Waktu Proyek (SLA)</p>
                  <p className="font-bold text-red-600 text-sm">30 Oktober 2026, 17:00 WITA</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Target / Sasaran Utama</p>
                  <p className="font-semibold text-slate-800 text-sm">Panel Utama IGD, Genset Cadangan, Stop Kontak Area Kritis</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Catatan Tambahan Kadiv</p>
                  <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                    Tolong pastikan genset IGD langsung *backup* dalam hitungan detik. Cek juga kelayakan kabel-kabel yang mulai terkelupas di area observasi. Laporan lengkap harus diserahkan sebelum akhir bulan.
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Dokumen Pendukung (SOP)</p>
                  <button className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    SOP_Inspeksi_IGD.pdf
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: Form Rencana Eksekusi & Delegasi */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              
              <div className="flex justify-between items-end border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-1">Strategi Eksekusi Koordinator</h3>
                  <p className="text-xs text-slate-500">Kerjakan sendiri secara utuh, atau pecah menjadi sub-tugas dan delegasikan ke staf.</p>
                </div>
                <button onClick={handleAddSubTugas} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 transition-colors">
                  + Tambah Sub-Tugas
                </button>
              </div>

              {/* Daftar Form Sub-Tugas */}
              <div className="flex flex-col gap-5">
                {subTugasList.map((tugas, index) => (
                  <div key={tugas.id} className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl relative shadow-sm">
                    {subTugasList.length > 1 && (
                      <button onClick={() => handleRemoveSubTugas(tugas.id)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 bg-white p-1 rounded-md border border-slate-200 shadow-sm transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    )}
                    <h4 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider bg-slate-200 inline-block px-2.5 py-1 rounded-md">
                      Sub-Tugas #{index + 1}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Pekerjaan <span className="text-red-500">*</span></label>
                         <input 
                           type="text" 
                           placeholder="Cth: Cek Panel Utama IGD" 
                           className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                           value={tugas.namaTugas}
                           onChange={(e) => {
                             const newList = [...subTugasList];
                             newList[index].namaTugas = e.target.value;
                             setSubTugasList(newList);
                           }}
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1.5">Tenggat Waktu Sub-Tugas <span className="text-red-500">*</span></label>
                         <input 
                           type="datetime-local" 
                           className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                           value={tugas.deadline}
                           onChange={(e) => {
                             const newList = [...subTugasList];
                             newList[index].deadline = e.target.value;
                             setSubTugasList(newList);
                           }}
                         />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Pelaksana <span className="text-red-500">*</span></label>
                         <select 
                           className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold ${tugas.staf === 'Saya Sendiri (Koordinator)' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white border-slate-200 text-slate-700'}`}
                           value={tugas.staf}
                           onChange={(e) => {
                             const newList = [...subTugasList];
                             newList[index].staf = e.target.value;
                             setSubTugasList(newList);
                           }}
                         >
                           {/* Opsi Eksekutor Diri Sendiri (Hibrida) */}
                           <option value="Saya Sendiri (Koordinator)" className="font-bold text-indigo-700">➡️ Kerjakan Sendiri (Koordinator)</option>
                           <optgroup label="Delegasi ke Tim Teknisi">
                             <option value="Muhammad Hafidz (Teknisi Listrik)">Muhammad Hafidz (Teknisi Listrik)</option>
                             <option value="Budi Santoso (Teknisi AC)">Budi Santoso (Teknisi AC)</option>
                             <option value="Andi (Umum)">Andi (Umum)</option>
                           </optgroup>
                         </select>
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 mb-1.5">Instruksi Tambahan (Opsional)</label>
                         <input 
                           type="text" 
                           placeholder="Cth: Jangan lupa bawa multimeter..." 
                           className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                           value={tugas.instruksi}
                           onChange={(e) => {
                             const newList = [...subTugasList];
                             newList[index].instruksi = e.target.value;
                             setSubTugasList(newList);
                           }}
                         />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                <p className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                  Status akan berubah menjadi <strong>"Dalam Progres"</strong> di dasbor Kadiv
                </p>
                <button className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                  Konfirmasi & Mulai Pemrosesan
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}