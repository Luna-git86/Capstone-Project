import { useState } from 'react';

export default function TambahTugas() {
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [divisi, setDivisi] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [kategori, setKategori] = useState('');
  const [urgensi, setUrgensi] = useState('');

  const handleClear = () => {
    setJudul('');
    setDeskripsi('');
    setDivisi('');
    setAssignee('');
    setDeadline('');
    setKategori('');
    setUrgensi('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Tugas berhasil dibuat!');
  };

  // Data untuk kartu Level Urgensi beserta ikon wajah (tebal/bold)
  const urgencyLevels = [
    {
      id: 'Low',
      label: 'Low',
      desc: 'Tugas rutin, tanpa tekanan waktu',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-3 text-[#0f172a]">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      )
    },
    {
      id: 'Medium',
      label: 'Medium',
      desc: 'Prioritas sedang, segera ditangani',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-3 text-[#0f172a]">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="15" x2="16" y2="15"></line>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      )
    },
    {
      id: 'High',
      label: 'High',
      desc: 'Butuh perhatian, dalam 24 jam',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-3 text-[#0f172a]">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      )
    },
    {
      id: 'Urgent',
      label: 'Urgent',
      desc: 'Genting - butuh tindakan segera',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 mb-3 text-[#0f172a]">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
          <line x1="8" y1="7" x2="10" y2="9"></line>
          <line x1="16" y1="7" x2="14" y2="9"></line>
          <line x1="9" y1="10" x2="9.01" y2="10"></line>
          <line x1="15" y1="10" x2="15.01" y2="10"></line>
        </svg>
      )
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#0f172a] leading-tight mb-2">Buat Tugas Baru</h1>
        <p className="text-slate-500">Isi detail tugas dibawah ini</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          
          {/* Judul Tugas */}
          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold text-[#0f172a]">Judul Tugas</label>
            <input 
              type="text" 
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh : Cek tanggal kadaluarsa obat-obatan" 
              className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 placeholder-slate-400"
            />
          </div>

          {/* Deskripsi */}
          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold text-[#0f172a]">Deskripsi</label>
            <textarea 
              rows={4} 
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Deskripsikan tugasnya secara detail - Apa yang harus dilakukan, batasan yang relevan, atau instruksi khusus untuk staff yang ditugaskan" 
              className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 placeholder-slate-400 resize-y"
            ></textarea>
          </div>

          {/* Divisi & Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">Divisi yang ditugaskan</label>
              <select 
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-slate-700"
              >
                <option value="" disabled>Pilih divisi</option>
                <option value="IT">IT & Jaringan</option>
                <option value="Fasilitas">Fasilitas & Gedung</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">Ditugaskan kepada</label>
              <select 
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white text-slate-700"
              >
                <option value="">Tidak ditugaskan (Terbuka untuk divisi)</option>
                <option value="Hafidz">Hafidz Naufal</option>
              </select>
            </div>
          </div>

          {/* Deadline & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">Deadline</label>
              <input 
                type="date" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-[#0f172a]">Kategori</label>
              <input 
                type="text" 
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                placeholder="Contoh : Peralatan,Kebersihan,Keamanan"
                className="w-full border border-slate-200 rounded-lg px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Level Urgensi */}
          <div className="flex flex-col gap-3">
            <label className="text-[15px] font-bold text-[#0f172a]">Level Urgensi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {urgencyLevels.map((level) => (
                <label 
                  key={level.id} 
                  className={`relative flex flex-col items-center justify-center p-6 border rounded-2xl cursor-pointer transition-all ${
                    urgensi === level.id 
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                    : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="urgensi" 
                    value={level.id}
                    checked={urgensi === level.id}
                    onChange={(e) => setUrgensi(e.target.value)}
                    className="absolute top-4 right-4 w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 bg-white"
                  />
                  {level.icon}
                  <span className="text-lg font-bold text-[#0f172a]">{level.label}</span>
                  <span className="text-[11px] text-slate-500 text-center mt-1 font-medium">{level.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-4 mt-4 pt-8 border-t border-slate-100">
            <button 
              type="button" 
              onClick={handleClear}
              className="px-8 py-3 text-[15px] font-bold text-[#0f172a] bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Clear Form
            </button>
            <button 
              type="submit" 
              className="px-10 py-3 text-[15px] font-bold text-white bg-[#007bff] hover:bg-blue-700 rounded-xl transition-colors"
            >
              Kirim
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}