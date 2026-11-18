// Frontend/src/pages/Penguji/HalamanPengujianSM.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import { getAuthUserName } from '../../utils/authStorage';
import { Tab1DataPrivasi } from './Tab1DataPrivasi';
import { Tab2PolaFaktor } from './Tab2PolaFaktor';
import { Tab3ModelEvaluasi } from './Tab3ModelEvaluasi';
import { Tab4HipotesisKeamanan } from './Tab4HipotesisKeamanan';
import { Tab5ProyeksiDashboard } from './Tab5ProyeksiDashboard';
import type { Tab1Data, Tab2Data, Tab3Data, Tab4Data, Tab5Data, TabId } from './uatSmTypes';

interface TabConfig {
  id: TabId;
  num: number;
  label: string;
  desc: string;
}

const TABS: TabConfig[] = [
  { id: 'tab1', num: 1, label: '1. Data & Privasi SIMRS', desc: 'Cek berkas SIMRS, bersihkan & samarkan identitas' },
  { id: 'tab2', num: 2, label: '2. Pola Jam & Kalender', desc: 'Jam sibuk harian & 14 faktor kalender bebas contek' },
  { id: 'tab3', num: 3, label: '3. Model & Adu Ketepatan', desc: 'Latih HistGB vs NB GLM & adu ketepatan uji 2026' },
  { id: 'tab4', num: 4, label: '4. Hipotesis & Keamanan', desc: 'Pembuktian 3 hipotesis, grafik & 8 uji privasi' },
  { id: 'tab5', num: 5, label: '5. Proyeksi 2026 & Web', desc: 'Perkiraan Jul–Des 2026 & ekspor ke Dashboard RSIA' },
];

const NEXT_STAGE_BY_STEP: Record<TabId, Array<{ stageId: string | null; actionText: string }>> = {
  tab1: [
    { stageId: 'stage1_understanding', actionText: 'Membaca & memeriksa 4 berkas kunjungan SIMRS (2023–2026)...' },
    { stageId: 'stage2_preprocessing', actionText: 'Membersihkan data & menyamarkan identitas pasien/dokter...' },
    { stageId: null, actionText: 'Menampilkan porsi 7 unit & pembagian waktu uji...' },
  ],
  tab2: [
    { stageId: null, actionText: 'Memuat perbandingan hari kerja, akhir pekan & libur...' },
    { stageId: 'stage3_features', actionText: 'Menyusun 14 faktor kalender, libur nasional & riwayat...' },
    { stageId: null, actionText: 'Membuka daftar tanggal merah & peta jam sibuk...' },
  ],
  tab3: [
    { stageId: 'stage4_modeling', actionText: 'Melatih model HistGB & NB GLM serta menyusun perbandingan...' },
    { stageId: 'stage5_evaluation', actionText: 'Menguji ketepatan pada 181 hari data uji tahun 2026...' },
    { stageId: null, actionText: 'Menampilkan grafik perbandingan aktual vs perkiraan...' },
  ],
  tab4: [
    { stageId: null, actionText: 'Memuat hasil pembuktian 3 hipotesis penelitian...' },
    { stageId: 'stage6_visualization', actionText: 'Membuat 7 grafik laporan resolusi tinggi...' },
    { stageId: 'stage8_integrity_test', actionText: 'Menjalankan 8 pemeriksaan otomatis privasi & anti-bocor...' },
  ],
  tab5: [
    { stageId: null, actionText: 'Menghitung ringkasan proyeksi paruh kedua 2026...' },
    { stageId: 'stage7_export', actionText: 'Mengirim 9 paket data rekap aman ke Dashboard RSIA...' },
    { stageId: null, actionText: 'Menampilkan ringkasan data yang tampil di Dashboard Analisis Kunjungan...' },
  ],
};

interface AllTabData {
  tab1: Tab1Data | null;
  tab2: Tab2Data | null;
  tab3: Tab3Data | null;
  tab4: Tab4Data | null;
  tab5: Tab5Data | null;
}

const HalamanPengujianSM: React.FC = () => {
  const userName = getAuthUserName('Penguji UAT');
  const [activeTab, setActiveTab] = useState<TabId>('tab1');
  const [stepProgress, setStepProgress] = useState<Record<TabId, number>>({
    tab1: 0,
    tab2: 0,
    tab3: 0,
    tab4: 0,
    tab5: 0,
  });
  const [tabData, setTabData] = useState<AllTabData>({
    tab1: null,
    tab2: null,
    tab3: null,
    tab4: null,
    tab5: null,
  });
  const [liveNotes, setLiveNotes] = useState<Record<string, string>>({});
  const [runningMsg, setRunningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const fetchTabPayload = useCallback(async (tabKey: TabId) => {
    const res = await api.get(`/uat-sm/stage-data/${tabKey}`);
    const nextPayload = res.data?.data || null;
    setTabData((prev) => ({ ...prev, [tabKey]: nextPayload }));
  }, []);

  const fetchSummaryBundle = useCallback(async (): Promise<AllTabData> => {
    const [r1, r2, r3, r4, r5] = await Promise.all([
      api.get('/uat-sm/stage-data/tab1'),
      api.get('/uat-sm/stage-data/tab2'),
      api.get('/uat-sm/stage-data/tab3'),
      api.get('/uat-sm/stage-data/tab4'),
      api.get('/uat-sm/stage-data/tab5'),
    ]);
    return {
      tab1: r1.data?.data || null,
      tab2: r2.data?.data || null,
      tab3: r3.data?.data || null,
      tab4: r4.data?.data || null,
      tab5: r5.data?.data || null,
    };
  }, []);

  const loadAllStageSummaries = useCallback(async () => {
    try {
      setInitialLoading(true);
      setErrorMsg('');
      const bundle = await fetchSummaryBundle();
      setTabData(bundle);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Gagal memuat ringkasan pengujian dari server.';
      setErrorMsg(msg);
    } finally {
      setInitialLoading(false);
    }
  }, [fetchSummaryBundle]);

  useEffect(() => {
    let active = true;
    fetchSummaryBundle()
      .then((bundle) => {
        if (active) setTabData(bundle);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Gagal memuat ringkasan pengujian dari server.';
        setErrorMsg(msg);
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchSummaryBundle]);

  const currentStep = stepProgress[activeTab];
  const totalDoneSteps = Object.values(stepProgress).reduce((acc, v) => acc + v, 0);
  const currentTabIdx = TABS.findIndex((t) => t.id === activeTab);
  const currentTabCfg = TABS[currentTabIdx] || TABS[0];

  const handleAdvanceStep = async () => {
    if (runningMsg) return;
    if (currentStep >= 3) {
      if (currentTabIdx < TABS.length - 1) {
        setActiveTab(TABS[currentTabIdx + 1].id);
      }
      return;
    }

    const plan = NEXT_STAGE_BY_STEP[activeTab]?.[currentStep];
    if (!plan) return;

    setErrorMsg('');
    setRunningMsg(plan.actionText);

    try {
      if (plan.stageId) {
        const res = await api.post(`/uat-sm/run/${plan.stageId}`);
        const sec = ((Number(res.data?.durationMs) || 0) / 1000).toFixed(1);
        setLiveNotes((prev) => ({
          ...prev,
          [plan.stageId as string]: `Dijalankan langsung (${sec} dtk)`,
        }));
        const refreshed = res.data?.refreshedTab?.[activeTab];
        if (refreshed) {
          setTabData((prev) => ({ ...prev, [activeTab]: refreshed }));
        } else {
          await fetchTabPayload(activeTab);
        }
      } else if (!tabData[activeTab]) {
        await fetchTabPayload(activeTab);
      }

      setStepProgress((prev) => ({
        ...prev,
        [activeTab]: Math.min(3, prev[activeTab] + 1),
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Proses belum berhasil dijalankan. Silakan coba klik ulang.';
      setErrorMsg(msg);
    } finally {
      setRunningMsg('');
    }
  };

  const handleResetTab = () => {
    if (runningMsg) return;
    setErrorMsg('');
    setStepProgress((prev) => ({ ...prev, [activeTab]: 0 }));
  };

  const mainButtonLabel = () => {
    if (runningMsg) return 'Sedang Memproses...';
    if (currentStep === 0) return 'Mulai Hitung (0/3)';
    if (currentStep < 3) return `Lanjut ke Langkah Berikutnya (${currentStep}/3)`;
    if (currentTabIdx < TABS.length - 1) return `Lanjut ke Tab ${currentTabIdx + 2} →`;
    return 'Seluruh Pengujian Selesai ✓';
  };

  return (
    <div className="p-4 sm:p-6 md:p-7 max-w-6xl mx-auto space-y-5 tvlk-shell min-h-full">
      {/* Banner Kepala Pengujian — Konsisten Tema Hijau Klinis RSIA */}
      <section className="relative bg-[#0f5c43] text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-[#0f5c43]/15 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-teal-400/20 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-white/5 blur-xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/95">
              <ClipboardCheck className="w-3.5 h-3.5 text-[#f47a45]" />
              <span>Mode Pengujian UAT Aman • Data RSIA Jan 2023 – Jun 2026 • Tanpa Identitas Pasien</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Panel Pengujian Sistem Prediksi Kunjungan (UAT)
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
              Selamat datang, <strong className="text-white">{userName}</strong>. Ikuti Tab 1 sampai Tab 5 secara berurutan untuk menguji pemrosesan data, model prediksi, dan keluaran Dashboard RSIA tanpa membuka terminal kode.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs">
              <p className="text-white/70 font-semibold">Progres Pengujian</p>
              <p className="text-base font-extrabold tabular-nums">
                {totalDoneSteps} / 15 Langkah Selesai
              </p>
            </div>
            <button
              type="button"
              onClick={loadAllStageSummaries}
              disabled={Boolean(runningMsg) || initialLoading}
              className="px-3.5 py-2.5 rounded-2xl bg-white text-[#0f5c43] hover:bg-[#edf8f2] text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${initialLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>
      </section>

      {/* Navigasi 5 Tab Pengujian */}
      <nav
        aria-label="Tahapan Pengujian UAT"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-[#eef1ef] border border-[#dce7e0] rounded-2xl p-1.5"
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          const isTabDone = stepProgress[t.id] >= 3;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`uat-tab-${t.id}`}
              onClick={() => !runningMsg && setActiveTab(t.id)}
              className={`text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between gap-1.5 ${
                isActive
                  ? 'bg-[#0f5c43] text-white shadow-sm'
                  : 'bg-white/70 text-[#3c4641] hover:bg-white'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-extrabold truncate">{t.label}</p>
                <p
                  className={`text-[10px] truncate mt-0.5 ${
                    isActive ? 'text-white/80' : 'text-[#6b7770]'
                  }`}
                >
                  Langkah {stepProgress[t.id]}/3
                </p>
              </div>
              {isTabDone && (
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#ace2c5]' : 'text-[#1e8455]'}`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Baris Kontrol Langkah Interaktif Tab Aktif */}
      <div className="tvlk-card rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
              Tab {currentTabCfg.num} dari 5
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-[#18201c]">
              {currentTabCfg.label}
            </h2>
          </div>
          <p className="text-xs text-[#6b7770]">{currentTabCfg.desc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleResetTab}
              disabled={Boolean(runningMsg)}
              className="px-3 py-2 rounded-xl tvlk-btn-soft text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Tab Ini</span>
            </button>
          )}
          <button
            type="button"
            data-testid="btn-uat-next-step"
            onClick={handleAdvanceStep}
            disabled={Boolean(runningMsg) || initialLoading || (currentStep >= 3 && currentTabIdx === TABS.length - 1)}
            className="px-4 py-2 rounded-xl tvlk-btn-primary text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-sm transition disabled:opacity-60"
          >
            {runningMsg ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : currentStep === 0 ? (
              <Play className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{mainButtonLabel()}</span>
          </button>
        </div>
      </div>

      {/* Pesan Status Proses / Error Ramah */}
      {runningMsg && (
        <div className="rounded-2xl bg-[#edf8f2] border border-[#93d1ae] px-4 py-3 flex items-center gap-3 text-xs font-bold text-[#0f5c43]">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{runningMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700"
        >
          {errorMsg}
        </div>
      )}

      {/* Konten Tab Aktif */}
      {initialLoading ? (
        <div className="tvlk-card rounded-2xl p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0f5c43] mx-auto" />
          <p className="text-xs font-semibold text-[#6b7770]">Menyiapkan ruang pengujian sistem RSIA...</p>
        </div>
      ) : (
        <>
          {activeTab === 'tab1' && (
            <Tab1DataPrivasi data={tabData.tab1} unlockedStep={stepProgress.tab1} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab2' && (
            <Tab2PolaFaktor data={tabData.tab2} unlockedStep={stepProgress.tab2} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab3' && (
            <Tab3ModelEvaluasi data={tabData.tab3} unlockedStep={stepProgress.tab3} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab4' && (
            <Tab4HipotesisKeamanan data={tabData.tab4} unlockedStep={stepProgress.tab4} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab5' && (
            <Tab5ProyeksiDashboard data={tabData.tab5} unlockedStep={stepProgress.tab5} liveNotes={liveNotes} />
          )}
        </>
      )}
    </div>
  );
};

export default HalamanPengujianSM;
