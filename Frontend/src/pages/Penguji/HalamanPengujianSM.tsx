// Frontend/src/pages/Penguji/HalamanPengujianSM.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import api from '../../services/api';
import { getAuthUserName } from '../../utils/authStorage';
import { Tab1MuatDataMentah } from './Tab1MuatDataMentah';
import { Tab2PreprocessingData } from './Tab2PreprocessingData';
import { Tab3PolaFaktor } from './Tab3PolaFaktor';
import { Tab4ModelEvaluasi } from './Tab4ModelEvaluasi';
import { Tab5HipotesisKeamanan } from './Tab5HipotesisKeamanan';
import { Tab6ProyeksiDashboard } from './Tab6ProyeksiDashboard';
import type {
  Tab1Data,
  Tab2Data,
  Tab3Data,
  Tab4Data,
  Tab5Data,
  Tab6Data,
  TabId,
} from './uatSmTypes';

interface TabConfig {
  id: TabId;
  num: number;
  label: string;
  desc: string;
  totalSteps: number;
}

const TABS: TabConfig[] = [
  {
    id: 'tab1',
    num: 1,
    label: '1. Muat Data Mentah',
    desc: 'Muat 4 file Excel mentah apa adanya (belum ada preprocessing)',
    totalSteps: 2,
  },
  {
    id: 'tab2',
    num: 2,
    label: '2. Preprocessing Data',
    desc: 'Bersihkan data, hapus nama pasien, hash+salt No. RM & rekap harian',
    totalSteps: 3,
  },
  {
    id: 'tab3',
    num: 3,
    label: '3. Pola & Faktor',
    desc: 'Pola hari kerja/libur, 14 faktor kalender & jam sibuk',
    totalSteps: 3,
  },
  {
    id: 'tab4',
    num: 4,
    label: '4. Model & Evaluasi',
    desc: 'Latih model HistGB vs NB GLM & adu ketepatan di 2026',
    totalSteps: 3,
  },
  {
    id: 'tab5',
    num: 5,
    label: '5. Hipotesis & Privasi',
    desc: '3 hipotesis, grafik laporan penuh & 8 uji keamanan data',
    totalSteps: 3,
  },
  {
    id: 'tab6',
    num: 6,
    label: '6. Proyeksi & Web',
    desc: 'Perkiraan Jul–Des 2026 & panduan Dashboard Analisis Kunjungan',
    totalSteps: 3,
  },
];

const NEXT_STAGE_BY_STEP: Record<TabId, Array<{ stageId: string | null; actionText: string; buttonText: string }>> = {
  tab1: [
    {
      stageId: 'stage1_understanding',
      actionText: 'Memuat 4 berkas Excel mentah SIMRS (2023–2026)...',
      buttonText: 'Muat Data Mentah (1/2)',
    },
    {
      stageId: null,
      actionText: 'Membuka struktur 9 kolom & sampel data mentah...',
      buttonText: 'Lihat Struktur & Sampel Mentah →',
    },
  ],
  tab2: [
    {
      stageId: 'stage2_preprocessing',
      actionText: 'Menjalankan pembersihan data, hapus kolom & hash+salt...',
      buttonText: 'Mulai Pembersihan Data (1/3)',
    },
    {
      stageId: null,
      actionText: 'Membuka contoh data bersih & rekap harian...',
      buttonText: 'Lihat Hasil Data Bersih →',
    },
    {
      stageId: null,
      actionText: 'Membuka porsi 7 unit & pembagian waktu uji...',
      buttonText: 'Lihat Porsi Unit & Waktu Uji →',
    },
  ],
  tab3: [
    {
      stageId: null,
      actionText: 'Memuat perbandingan hari kerja, akhir pekan & libur...',
      buttonText: 'Lihat Pola Hari & Libur (1/3)',
    },
    {
      stageId: 'stage3_features',
      actionText: 'Menyusun 14 faktor kalender & riwayat bebas contek...',
      buttonText: 'Susun 14 Faktor Prediksi →',
    },
    {
      stageId: null,
      actionText: 'Membuka daftar tanggal merah & peta jam sibuk...',
      buttonText: 'Lihat Libur & Jam Sibuk →',
    },
  ],
  tab4: [
    {
      stageId: 'stage4_modeling',
      actionText: 'Melatih model HistGB & NB GLM...',
      buttonText: 'Latih Model Prediksi (1/3)',
    },
    {
      stageId: 'stage5_evaluation',
      actionText: 'Mengadu ketepatan pada 181 hari data uji 2026...',
      buttonText: 'Uji Ketepatan Data 2026 →',
    },
    {
      stageId: null,
      actionText: 'Menampilkan grafik perbandingan aktual vs perkiraan...',
      buttonText: 'Lihat Grafik Uji Harian →',
    },
  ],
  tab5: [
    {
      stageId: null,
      actionText: 'Memuat hasil pembuktian 3 hipotesis penelitian...',
      buttonText: 'Cek 3 Hipotesis Penelitian (1/3)',
    },
    {
      stageId: 'stage6_visualization',
      actionText: 'Menyiapkan 7 grafik laporan resolusi penuh...',
      buttonText: 'Lihat Grafik Laporan →',
    },
    {
      stageId: 'stage8_integrity_test',
      actionText: 'Menjalankan 8 pemeriksaan keamanan & anti-bocor...',
      buttonText: 'Jalankan 8 Uji Privasi →',
    },
  ],
  tab6: [
    {
      stageId: null,
      actionText: 'Menghitung proyeksi kunjungan Jul–Des 2026...',
      buttonText: 'Lihat Proyeksi Jul–Des 2026 (1/3)',
    },
    {
      stageId: 'stage7_export',
      actionText: 'Menyiapkan 9 paket rekap aman ke Dashboard RSIA...',
      buttonText: 'Cek Kesiapan Data Dashboard →',
    },
    {
      stageId: null,
      actionText: 'Menampilkan panduan Dashboard Analisis Kunjungan...',
      buttonText: 'Lihat Panduan Uji Role →',
    },
  ],
};

const SUBSTEP_LABELS: Record<TabId, string[]> = {
  tab1: ['1.1 Muat & Status File', '1.2 Struktur & Data Mentah'],
  tab2: ['2.1 Pembersihan & Log 9 Tahap', '2.2 Data Bersih & Rekap Harian', '2.3 Porsi 7 Unit & Split Waktu'],
  tab3: ['3.1 Pola Hari Kerja vs Libur', '3.2 14 Faktor Kalender', '3.3 Tanggal Merah & Jam Sibuk'],
  tab4: ['4.1 Metode yang Diadu', '4.2 Skor Ketepatan 2026', '4.3 Grafik & Tabel Harian'],
  tab5: ['5.1 Pembuktian 3 Hipotesis', '5.2 Faktor & 7 Grafik Laporan', '5.3 8 Uji Privasi & Anti-Bocor'],
  tab6: ['6.1 Proyeksi Jul–Des 2026', '6.2 Ekspor 9 Paket Aman', '6.3 Panduan Dashboard Web'],
};

interface AllTabData {
  tab1: Tab1Data | null;
  tab2: Tab2Data | null;
  tab3: Tab3Data | null;
  tab4: Tab4Data | null;
  tab5: Tab5Data | null;
  tab6: Tab6Data | null;
}

class UatTabErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; errorText: string }
> {
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorText: error?.message || 'Kesalahan render tampilan tab.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="tvlk-card rounded-2xl p-6 border border-rose-200 bg-rose-50/70 space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Terjadi Ketidaksesuaian Data Tab Pengujian</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            Detail: {this.state.errorText}. Jika Anda baru saja memperbarui sistem, pastikan server Backend (port 3000) sudah di-restart lalu klik tombol di bawah.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, errorText: '' });
              this.props.onReset();
            }}
            className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 text-xs font-extrabold hover:bg-rose-100 transition"
          >
            Muat Ulang Data Tab
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
    tab6: 0,
  });
  const [viewStep, setViewStep] = useState<Record<TabId, number>>({
    tab1: 0,
    tab2: 0,
    tab3: 0,
    tab4: 0,
    tab5: 0,
    tab6: 0,
  });
  const [tabData, setTabData] = useState<AllTabData>({
    tab1: null,
    tab2: null,
    tab3: null,
    tab4: null,
    tab5: null,
    tab6: null,
  });
  const [liveNotes, setLiveNotes] = useState<Record<string, string>>({});
  const [runningMsg, setRunningMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const fetchTabPayload = useCallback(async (tabKey: TabId) => {
    const res = await api.get(`/uat-sm/stage-data/${tabKey}`);
    const nextPayload = res.data?.data || null;
    setTabData((prev) => ({ ...prev, [tabKey]: nextPayload }));
    return nextPayload;
  }, []);

  const fetchSummaryBundle = useCallback(async (): Promise<AllTabData> => {
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
      api.get('/uat-sm/stage-data/tab1'),
      api.get('/uat-sm/stage-data/tab2'),
      api.get('/uat-sm/stage-data/tab3'),
      api.get('/uat-sm/stage-data/tab4'),
      api.get('/uat-sm/stage-data/tab5'),
      api.get('/uat-sm/stage-data/tab6'),
    ]);
    return {
      tab1: r1.data?.data || null,
      tab2: r2.data?.data || null,
      tab3: r3.data?.data || null,
      tab4: r4.data?.data || null,
      tab5: r5.data?.data || null,
      tab6: r6.data?.data || null,
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
        'Gagal memuat ringkasan pengujian dari server. Pastikan server Backend (port 3000) sudah berjalan dengan versi terbaru.';
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
          'Gagal memuat ringkasan pengujian dari server. Pastikan server Backend (port 3000) sudah berjalan dengan versi terbaru.';
        setErrorMsg(msg);
      })
      .finally(() => {
        if (active) setInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchSummaryBundle]);

  const currentTabIdx = TABS.findIndex((t) => t.id === activeTab);
  const currentTabCfg = TABS[currentTabIdx] || TABS[0];
  const currentTabTotalSteps = currentTabCfg.totalSteps;
  const currentStep = stepProgress[activeTab];
  const currentViewStep = viewStep[activeTab];
  const totalMaxSteps = TABS.reduce((acc, t) => acc + t.totalSteps, 0);
  const totalDoneSteps = Object.values(stepProgress).reduce((acc, v) => acc + v, 0);
  const activeSubSteps = SUBSTEP_LABELS[activeTab] || [];

  const handleAdvanceStep = async () => {
    if (runningMsg) return;

    // Bila penguji sedang meninjau ulang langkah lebih awal, arahkan maju ke sub-langkah berikutnya
    if (currentViewStep > 0 && currentViewStep < currentStep) {
      setErrorMsg('');
      setViewStep((prev) => ({
        ...prev,
        [activeTab]: Math.min(currentStep, prev[activeTab] + 1),
      }));
      return;
    }

    if (currentStep >= currentTabTotalSteps) {
      if (currentTabIdx < TABS.length - 1) {
        setErrorMsg('');
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

      const nextUnlocked = Math.min(currentTabTotalSteps, currentStep + 1);
      setStepProgress((prev) => ({
        ...prev,
        [activeTab]: nextUnlocked,
      }));
      // Langsung tampilkan langkah terbaru di bagian atas tanpa menumpuk di bawah langkah lama
      setViewStep((prev) => ({
        ...prev,
        [activeTab]: nextUnlocked,
      }));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Proses belum berhasil dijalankan. Pastikan server Backend (port 3000) sudah berjalan dengan versi terbaru lalu coba ulang.';
      setErrorMsg(msg);
    } finally {
      setRunningMsg('');
    }
  };

  const handleResetTab = () => {
    if (runningMsg) return;
    setErrorMsg('');
    setStepProgress((prev) => ({ ...prev, [activeTab]: 0 }));
    setViewStep((prev) => ({ ...prev, [activeTab]: 0 }));
  };

  const mainButtonLabel = () => {
    if (runningMsg) return 'Sedang Memproses...';
    if (currentViewStep > 0 && currentViewStep < currentStep) {
      return `Lihat Langkah ${currentTabCfg.num}.${currentViewStep + 1} →`;
    }
    const nextPlan = NEXT_STAGE_BY_STEP[activeTab]?.[currentStep];
    if (currentStep < currentTabTotalSteps && nextPlan) {
      return nextPlan.buttonText;
    }
    if (currentTabIdx < TABS.length - 1) return `Lanjut ke Tab ${currentTabIdx + 2} →`;
    return 'Seluruh Pengujian Selesai ✓';
  };

  return (
    <div className="p-4 sm:p-6 md:p-7 max-w-6xl mx-auto space-y-5 tvlk-shell min-h-full">
      {/* Banner Kepala Pengujian */}
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
              <span>Panel Uji UAT • Data RSIA Jan 2023 – Jun 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Panel Pengujian Sistem Prediksi Kunjungan (UAT)
            </h1>
            <p className="text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed">
              Selamat datang, <strong className="text-white">{userName}</strong>. Ikuti Tab 1 sampai Tab 6 berurutan — pada setiap langkah, baca kotak <strong>Langkah Penguji</strong>, cek hasilnya, lalu tekan tombol hijau di sebelah kanan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs">
              <p className="text-white/70 font-semibold">Progres Pengujian</p>
              <p className="text-base font-extrabold tabular-nums">
                {totalDoneSteps} / {totalMaxSteps} Langkah Selesai
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

      {/* Navigasi 6 Tab Pengujian */}
      <nav
        aria-label="Tahapan Pengujian UAT"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[#eef1ef] border border-[#dce7e0] rounded-2xl p-1.5"
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          const isTabDone = stepProgress[t.id] >= t.totalSteps;
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`uat-tab-${t.id}`}
              onClick={() => {
                if (runningMsg) return;
                setErrorMsg('');
                setActiveTab(t.id);
              }}
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
                  Langkah {stepProgress[t.id]}/{t.totalSteps}
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

      {/* Baris Kontrol Langkah Interaktif Tab Aktif + Pemilih Sub-Langkah */}
      <div className="tvlk-card rounded-2xl px-4 py-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
                Tab {currentTabCfg.num} dari {TABS.length}
              </span>
              <h2 className="text-sm sm:text-base font-extrabold text-[#18201c]">
                {currentTabCfg.label}
              </h2>
            </div>
            <p className="text-xs text-[#6b7770]">{currentTabCfg.desc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {currentViewStep > 1 && (
              <button
                type="button"
                onClick={() =>
                  !runningMsg &&
                  setViewStep((prev) => ({
                    ...prev,
                    [activeTab]: Math.max(1, prev[activeTab] - 1),
                  }))
                }
                disabled={Boolean(runningMsg)}
                className="px-3 py-2 rounded-xl tvlk-btn-soft text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
            )}
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
              disabled={
                Boolean(runningMsg) ||
                initialLoading ||
                (currentStep >= currentTabTotalSteps &&
                  currentViewStep >= currentStep &&
                  currentTabIdx === TABS.length - 1)
              }
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

        {/* Switcher Sub-Langkah: mencegah penumpukan ke bawah & memudahkan pindah balik */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#eef1ef]">
          <span className="text-[11px] font-bold text-[#6b7770]">Langkah Aktif:</span>
          {activeSubSteps.map((stepLabel, idx) => {
            const stepNum = idx + 1;
            const isUnlocked = stepNum <= currentStep;
            const isViewing = stepNum === currentViewStep;
            return (
              <button
                key={stepLabel}
                type="button"
                data-testid={`uat-substep-${activeTab}-${stepNum}`}
                disabled={!isUnlocked || Boolean(runningMsg)}
                onClick={() => {
                  if (!isUnlocked || runningMsg) return;
                  setViewStep((prev) => ({ ...prev, [activeTab]: stepNum }));
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isViewing
                    ? 'bg-[#0f5c43] text-white shadow-xs'
                    : isUnlocked
                    ? 'bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5] hover:bg-[#d8f1e4]'
                    : 'bg-[#f6f8f7] text-[#98a39d] border border-[#dce7e0] cursor-not-allowed'
                }`}
              >
                {isUnlocked ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3 h-3 shrink-0" />
                )}
                <span>{stepLabel}</span>
              </button>
            );
          })}
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

      {/* Konten Tab Aktif (Dilindungi ErrorBoundary agar tidak pernah blank putih) */}
      {initialLoading ? (
        <div className="tvlk-card rounded-2xl p-8 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#0f5c43] mx-auto" />
          <p className="text-xs font-semibold text-[#6b7770]">Menyiapkan ruang pengujian sistem RSIA...</p>
        </div>
      ) : (
        <UatTabErrorBoundary key={activeTab} onReset={loadAllStageSummaries}>
          {activeTab === 'tab1' && (
            <Tab1MuatDataMentah data={tabData.tab1} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab2' && (
            <Tab2PreprocessingData data={tabData.tab2} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab3' && (
            <Tab3PolaFaktor data={tabData.tab3} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab4' && (
            <Tab4ModelEvaluasi data={tabData.tab4} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab5' && (
            <Tab5HipotesisKeamanan data={tabData.tab5} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
          {activeTab === 'tab6' && (
            <Tab6ProyeksiDashboard data={tabData.tab6} viewStep={currentViewStep} liveNotes={liveNotes} />
          )}
        </UatTabErrorBoundary>
      )}
    </div>
  );
};

export default HalamanPengujianSM;
