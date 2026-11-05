// Frontend/src/components/TaskSubNav.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TaskSubNavProps {
  currentTab: 'AKTIF' | 'SEMUA' | 'RIWAYAT';
  activeCount?: number;
  totalCount?: number;
  completedCount?: number;
}

export const TaskSubNav: React.FC<TaskSubNavProps> = ({
  currentTab,
  activeCount = 0,
  totalCount = 0,
  completedCount = 0,
}) => {
  const navigate = useNavigate();

  return (
    <div className="w-full lg:w-64 flex-shrink-0 space-y-3">
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Tugas
          </p>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-1.5 py-0.5 rounded">
            RSIA
          </span>
        </div>

        <nav className="space-y-1">
          {/* 1. Tugas Aktif (Bisa Diatur) */}
          <button
            type="button"
            onClick={() => navigate('/semua-tugas')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              currentTab === 'AKTIF'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Tugas Aktif (Diatur)</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                currentTab === 'AKTIF'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeCount}
            </span>
          </button>

          {/* 2. Semua Tugas (Lengkap) */}
          <button
            type="button"
            onClick={() => navigate('/daftar-semua-tugas')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              currentTab === 'SEMUA'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Semua Tugas</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                currentTab === 'SEMUA'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* 3. Riwayat Tugas (Selesai) */}
          <button
            type="button"
            onClick={() => navigate('/riwayat')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
              currentTab === 'RIWAYAT'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Riwayat Selesai</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                currentTab === 'RIWAYAT'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {completedCount}
            </span>
          </button>
        </nav>
      </div>

      <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-800 space-y-1">
        <p className="font-bold">Petunjuk:</p>
        <p className="text-slate-600 leading-relaxed">
          Gunakan <strong>Tugas Aktif</strong> untuk mengatur penugasan harian dan batas waktu. Klik <strong>Semua Tugas</strong> atau <strong>Riwayat</strong> untuk membuka arsip halaman tersendiri.
        </p>
      </div>
    </div>
  );
};
export default TaskSubNav;
