export default function Topbar() {
  return (
    <header className="bg-white px-8 py-5 flex justify-between items-center border-b border-slate-200">
      
      {/* Kiri - Judul Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Portal Manajerial</h1>
        <p className="text-sm text-slate-500">Sabtu, 10 Oktober, 2026</p>
      </div>

      {/* Kanan - Filter & Profil */}
      <div className="flex items-center gap-5">
        
        {/* Filter Divisi */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-400">Filter per divisi</span>
          <select className="px-4 py-2 border border-slate-300 rounded-full bg-white text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-400 focus:ring-2 focus:ring-sky-100">
            <option>Semua</option>
          </select>
        </div>
        
        {/* Ikon Lonceng (Notifikasi) */}
        <button className="bg-transparent border-none cursor-pointer flex items-center hover:bg-slate-50 p-2 rounded-full transition-colors">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-slate-500 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 01-3.46 0"></path>
          </svg>
        </button>
        
        {/* Profil Pengguna */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full"></div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900">Nama user</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              Role/Divisi user 
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-slate-500 stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}