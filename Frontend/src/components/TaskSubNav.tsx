// Frontend/src/components/TaskSubNav.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';

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

  const tabs = [
    {
      id: 'AKTIF' as const,
      label: 'Tugas Aktif',
      shortLabel: 'Aktif',
      count: activeCount,
      path: '/semua-tugas',
      icon: Clock,
      color: 'text-brand-deep',
    },
    {
      id: 'SEMUA' as const,
      label: 'Semua Tugas',
      shortLabel: 'Semua',
      count: totalCount,
      path: '/daftar-semua-tugas',
      icon: Layers,
      color: 'text-indigo-600',
    },
    {
      id: 'RIWAYAT' as const,
      label: 'Riwayat Selesai',
      shortLabel: 'Riwayat',
      count: completedCount,
      path: '/riwayat',
      icon: CheckCircle2,
      color: 'text-emerald-600',
    },
  ];

  return (
    <>
      {/* 1. VERSI MOBILE (< lg): Segmented Horizontal Pill Bar yang Ramping & Rapi */}
      <div className="lg:hidden w-full bg-clinical-surface p-2 rounded-2xl border border-clinical-border shadow-xs">
        <div className="grid grid-cols-3 gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`h-11 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-brand-deep text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.color}`} />
                <span className="truncate">{tab.shortLabel}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. VERSI DESKTOP (>= lg): Kartu Samping Elegan & Informatif */}
      <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
        <div className="bg-clinical-surface p-4 rounded-3xl border border-clinical-border shadow-xs space-y-3">
          <div className="px-2 py-1 flex items-center justify-between border-b border-clinical-border/60">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Kategori Tugas
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-deep bg-blue-50 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-brand-mint" />
              <span>RSIA</span>
            </span>
          </div>

          <nav className="space-y-1.5" aria-label="Navigasi kategori tugas">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all text-left group ${
                    isActive
                      ? 'bg-brand-deep text-white shadow-sm shadow-brand-deep/20'
                      : 'text-clinical-ink hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums transition-colors ${
                      isActive
                        ? 'bg-white text-brand-deep'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Petunjuk Singkat Pengoperasian */}
        <div className="bg-brand-orange-soft/50 p-4 rounded-3xl border border-brand-orange-soft text-xs text-clinical-ink space-y-1.5">
          <p className="font-extrabold text-brand-orange flex items-center gap-1.5">
            <span>Panduan Manajemen:</span>
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Pilih <strong>Tugas Aktif</strong> untuk kontrol prioritas dan aksi harian. Buka <strong>Semua Tugas</strong> atau <strong>Riwayat</strong> untuk audit data lengkap.
          </p>
        </div>
      </aside>
    </>
  );
};

export default TaskSubNav;
