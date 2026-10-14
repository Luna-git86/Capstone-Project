import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  // State untuk mengontrol dropdown Dokumen SOP
  const [isSopOpen, setIsSopOpen] = useState(false);

  return (
    <aside className="w-[260px] bg-[#042139] text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      
      {/* Header Sidebar */}
      <div className="flex items-center p-6 gap-4">
        <div className="w-10 h-10 bg-sky-400 rounded-lg flex justify-center items-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6 p-0.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M3 9h18M9 21V9"></path>
          </svg>
        </div>
        <div>
          <h2 className="text-[1.1rem] font-semibold m-0">Nama Program</h2>
          <p className="text-xs text-slate-400 mt-1">Portal Direktur</p>
        </div>
      </div>
      
      {/* Navigasi Menu */}
      <nav className="py-2 overflow-y-auto">
        <p className="text-[0.85rem] text-slate-50 font-bold px-5 mb-3">Main Menu</p>
        <ul className="flex flex-col gap-1 m-0 p-0">
          
          {/* Tombol Dashboard */}
          <li>
            <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 text-sm px-5 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Dashboard
            </NavLink>
          </li>
          
          {/* Tombol Semua Tugas */}
          <li>
            <NavLink to="/semua-tugas" className={({ isActive }) => `flex items-center gap-3 text-sm px-5 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                <path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              Semua Tugas
            </NavLink>
          </li>

          {/* Tombol Tambah Tugas */}
          <li>
            <NavLink to="/tambah-tugas" className={({ isActive }) => `flex items-center gap-3 text-sm px-5 py-3 transition-colors ${isActive ? 'bg-[#005bb5] text-white font-semibold rounded-r-xl mr-5' : 'text-slate-400 hover:text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Tambah Tugas
            </NavLink>
          </li>

          {/* Dropdown Menu: Dokumen SOP */}
          <li>
            <div 
              onClick={() => setIsSopOpen(!isSopOpen)}
              className={`flex items-center justify-between text-sm px-5 py-3 transition-colors cursor-pointer mr-5 rounded-r-xl ${isSopOpen ? 'bg-[#005bb5] text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current stroke-2 fill-none stroke-linecap-round stroke-linejoin-round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Dokumen SOP
              </div>
              {/* Panah Indikator Buka/Tutup */}
              <svg viewBox="0 0 24 24" className={`w-4 h-4 stroke-current stroke-[3] fill-none stroke-linecap-round stroke-linejoin-round transition-transform ${isSopOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Sub-menu (Muncul jika isSopOpen == true) */}
            {isSopOpen && (
              <div className="flex flex-col gap-2 mt-2 ml-[3.25rem]">
                <NavLink to="/dokumen-sop" end className={({ isActive }) => `text-sm font-semibold transition-colors py-1 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  Semua Dokumen
                </NavLink>
                <NavLink to="/dokumen-sop/persetujuan" className={({ isActive }) => `text-sm font-semibold transition-colors py-1 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  Menunggu Persetujuan
                </NavLink>
              </div>
            )}
          </li>

        </ul>
      </nav>
    </aside>
  );
}