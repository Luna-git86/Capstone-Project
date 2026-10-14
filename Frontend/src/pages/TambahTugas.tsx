import { useState } from 'react';

export default function TambahTugas() {
  const [urgensi, setUrgensi] = useState<string>('');

  const urgensiOptions = [
    { id: 'low', label: 'Low', desc: 'Tugas rutin, tanpa tekanan waktu', icon: <path d="M9 11.01V11m6 .01V11M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-6a3 3 0 0 0 6 0H9Z" /> },
    { id: 'medium', label: 'Medium', desc: 'Prioritas sedang, segera ditangani', icon: <path d="M9 11.01V11m6 .01V11M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-5h6" /> },
    { id: 'high', label: 'High', desc: 'Butuh perhatian, dalam 24 jam', icon: <path d="M9 11.01V11m6 .01V11M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-4a3 3 0 0 1 6 0H9Z" /> },
    { id: 'urgent', label: 'Urgent', desc: 'Genting - butuh tindakan segera', icon: <path d="M9 11V9m6 2V9M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-6a3 3 0 0 1 6 0H9Z" /> },
  ];

  return (
    <div className="p-8 max-w-[1000px] w-full">
      {/* Header Form */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Buat Tugas Baru</h1>
        <p className="text-slate-500 text-lg">Isi detail tugas dibawah ini</p>
      </div>

      <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
        
        {/* Judul Tugas */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-900 text-[1.05rem]">Judul Tugas</label>
          <input 
            type="text" 
            placeholder="Contoh : Cek tanggal kadaluarsa obat-obatan" 
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-400"
          />
        </div>

        {/* Deskripsi */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-900 text-[1.05rem]">Deskripsi</label>
          <textarea 
            placeholder="Deskripsikan tugasnya secara detail - Apa yang harus dilakukan, batasan yang relevan, atau instruksi khusus untuk staff yang ditugaskan" 
            className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-400 min-h-[140px] resize-y"
          ></textarea>
        </div>

        {/* Grid 2 Kolom: Divisi & Ditugaskan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2 relative">
            <label className="font-bold text-slate-900 text-[1.05rem]">Divisi yang ditugaskan</label>
            <select className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all bg-white text-slate-700 appearance-none">
              <option value="">Pilih divisi</option>
            </select>
            {/* Ikon panah bawah */}
            <div className="absolute right-4 top-[42px] pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            {/* Ikon plus */}
            <div className="flex justify-end mt-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-slate-900 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round cursor-pointer hover:opacity-70"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
          </div>

          <div className="flex flex-col gap-2 relative">
            <label className="font-bold text-slate-900 text-[1.05rem]">Ditugaskan kepada</label>
            <select className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all bg-white text-slate-700 appearance-none">
              <option value="">Tidak ditugaskan</option>
            </select>
            <div className="absolute right-4 top-[42px] pointer-events-none">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-400 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div className="flex justify-end mt-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-slate-900 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round cursor-pointer hover:opacity-70"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
          </div>
        </div>

        {/* Grid 2 Kolom: Deadline & Kategori */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-4">
          <div className="flex flex-col gap-2 relative">
            <label className="font-bold text-slate-900 text-[1.05rem]">Deadline</label>
            <input 
              type="date" 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-slate-700"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-slate-900 text-[1.05rem]">Kategori</label>
            <input 
              type="text" 
              placeholder="Contoh : Peralatan,Kebersihan,Keamanan" 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Level Urgensi */}
        <div className="flex flex-col gap-3 mt-2">
          <label className="font-bold text-slate-900 text-[1.05rem]">Level Urgensi</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {urgensiOptions.map((opt) => {
              const isSelected = urgensi === opt.id;
              return (
                <div 
                  key={opt.id}
                  onClick={() => setUrgensi(opt.id)}
                  className={`relative p-5 rounded-xl border flex flex-col items-center text-center cursor-pointer transition-all ${
                    isSelected ? 'border-sky-500 ring-1 ring-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Lingkaran Radio Button */}
                  <div className="absolute top-3 right-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-sky-500' : 'border-slate-300'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-sky-500 rounded-full"></div>}
                    </div>
                  </div>
                  
                  {/* Ikon Emoji */}
                  <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-slate-900 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round mb-2">
                    {opt.icon}
                  </svg>
                  
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{opt.label}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex justify-end items-center gap-4 mt-6 border-t border-slate-100 pt-6">
          <button type="button" className="px-6 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            Clear Form
          </button>
          <button type="button" className="px-8 py-2.5 bg-[#007bff] text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors">
            Kirim
          </button>
        </div>

      </form>
    </div>
  );
}