// Frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  ArrowRight,
  Plus,
  Sparkles,
  TrendingUp,
  Building2,
  ExternalLink,
  AlertCircle,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import { getAuthUserName, getAuthRole, getAuthUserId } from '../utils/authStorage';

interface SmSummarySnippet {
  kpi_total_rs?: {
    total_visits_all_time: number;
    mean_daily_visits: number;
    annual_trends?: Record<
      string,
      { total: number; daily_mean: number; h1_actual?: number; h2_projected?: number }
    >;
    model_performance_test_2026?: {
      mae: number;
      rmse: number;
      wape_pct: number;
      mase: number;
    };
  };
}

interface Ticket {
  id: number;
  judul: string;
  jenisTiket?: 'TUGAS' | 'LAPORAN';
  lokasi?: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status:
    | 'MENUNGGU_TRIASE'
    | 'DIPROSES'
    | 'SELESAI'
    | 'DITOLAK'
    | 'MENUNGGU_VALIDASI'
    | 'HOLD_ESKALASI';
  deadline: string | null;
  createdAt: string;
  completedAt?: string | null;
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string } | null;
  divisi?: { id: number; nama: string } | null;
  childTickets?: Array<{
    id: number;
    status: string;
  }>;
}

type ExecutiveTab = 'PRIORITY_ATTENTION' | 'ESKALASI' | 'ARAHAN_SAYA' | 'OVERDUE';

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = getAuthUserName('Direktur RSIA');
  const userRole = getAuthRole() || 'DIREKTUR';
  const currentUserId = getAuthUserId();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [smSummary, setSmSummary] = useState<SmSummarySnippet | null>(null);

  // Filter State
  const [selectedDivisi, setSelectedDivisi] = useState<string>('SEMUA');
  const [activeTab, setActiveTab] = useState<ExecutiveTab>('PRIORITY_ATTENTION');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setTickets(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal memuat data dasbor eksekutif:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchSmSummary = async () => {
      try {
        const res = await api.get('/sm/summary');
        setSmSummary(res.data?.data || null);
      } catch {
        // Ringkasan analitik bersifat tambahan
      }
    };

    fetchTickets();
    fetchSmSummary();
  }, []);

  // Sinkronkan status efektif tiket induk jika seluruh tugas turunannya sudah SELESAI
  const getEffectiveStatus = (t: Ticket): Ticket['status'] => {
    if (
      t.status === 'DIPROSES' &&
      t.childTickets &&
      t.childTickets.length > 0 &&
      t.childTickets.every((c) => c.status === 'SELESAI')
    ) {
      return 'SELESAI';
    }
    return t.status;
  };

  // Ambil daftar divisi unik secara dinamis dari data tiket
  const daftarDivisi = useMemo(() => {
    return Array.from(new Set(tickets.map((t) => t.divisi?.nama).filter(Boolean))) as string[];
  }, [tickets]);

  // Filter tiket berdasarkan divisi yang dipilih
  const ticketsByDivisi = useMemo(() => {
    return selectedDivisi === 'SEMUA'
      ? tickets
      : tickets.filter((t) => t.divisi?.nama === selectedDivisi);
  }, [tickets, selectedDivisi]);

  // Kalkulasi Metrik Utama Real-Time (Mengecualikan tiket DITOLAK dari rasio penyelesaian)
  const metrics = useMemo(() => {
    const now = new Date();

    const aktif = ticketsByDivisi.filter((t) => {
      const st = getEffectiveStatus(t);
      return st !== 'SELESAI' && st !== 'DITOLAK';
    });

    const selesai = ticketsByDivisi.filter((t) => getEffectiveStatus(t) === 'SELESAI');

    const ditolak = ticketsByDivisi.filter((t) => getEffectiveStatus(t) === 'DITOLAK');

    const darurat = aktif.filter((t) => t.prioritas === 'HIGH');

    const terlambat = aktif.filter((t) => Boolean(t.deadline && new Date(t.deadline) < now));

    const eskalasi = aktif.filter((t) => getEffectiveStatus(t) === 'HOLD_ESKALASI');

    const arahanSaya = aktif.filter(
      (t) => currentUserId && String(t.pembuat?.id) === String(currentUserId)
    );

    const totalValid = aktif.length + selesai.length;
    const completionRate = totalValid > 0 ? Math.round((selesai.length / totalValid) * 100) : 0;

    return {
      aktif,
      selesai,
      ditolak,
      darurat,
      terlambat,
      eskalasi,
      arahanSaya,
      totalValid,
      completionRate,
    };
  }, [ticketsByDivisi, currentUserId]);

  // Ringkasan Kinerja & Beban Kerja Lintas Divisi
  const divisiPerformance = useMemo(() => {
    const now = new Date();
    const map = new Map<
      string,
      {
        nama: string;
        aktif: number;
        selesai: number;
        terlambat: number;
        eskalasi: number;
        rate: number;
      }
    >();

    tickets.forEach((t) => {
      const divName = t.divisi?.nama || 'Belum Terpetakan';
      const st = getEffectiveStatus(t);
      if (st === 'DITOLAK') return;

      if (!map.has(divName)) {
        map.set(divName, {
          nama: divName,
          aktif: 0,
          selesai: 0,
          terlambat: 0,
          eskalasi: 0,
          rate: 0,
        });
      }

      const row = map.get(divName)!;
      if (st === 'SELESAI') {
        row.selesai += 1;
      } else {
        row.aktif += 1;
        if (st === 'HOLD_ESKALASI') row.eskalasi += 1;
        if (t.deadline && new Date(t.deadline) < now) row.terlambat += 1;
      }
    });

    return Array.from(map.values())
      .map((item) => {
        const total = item.aktif + item.selesai;
        return {
          ...item,
          rate: total > 0 ? Math.round((item.selesai / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.terlambat - a.terlambat || b.aktif - a.aktif);
  }, [tickets]);

  // Daftar Tiket Krusial untuk Perhatian Eksekutif (Maksimal 8 baris teratas)
  const executiveWatchlist = useMemo(() => {
    const now = new Date();

    const filtered = metrics.aktif.filter((ticket) => {
      const st = getEffectiveStatus(ticket);
      const isOverdue = Boolean(ticket.deadline && new Date(ticket.deadline) < now);
      const isMyDirective =
        Boolean(currentUserId) && String(ticket.pembuat?.id) === String(currentUserId);
      const isEscalated = st === 'HOLD_ESKALASI';
      const isHigh = ticket.prioritas === 'HIGH';

      if (activeTab === 'PRIORITY_ATTENTION') {
        if (!isEscalated && !isMyDirective && !isHigh && !isOverdue) return false;
      } else if (activeTab === 'ESKALASI') {
        if (!isEscalated) return false;
      } else if (activeTab === 'ARAHAN_SAYA') {
        if (!isMyDirective) return false;
      } else if (activeTab === 'OVERDUE') {
        if (!isOverdue) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const paddedId = String(ticket.id).padStart(3, '0');
        const matchTitle = ticket.judul.toLowerCase().includes(q);
        const matchDivisi = (ticket.divisi?.nama || '').toLowerCase().includes(q);
        const matchPelaksana = (ticket.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchId = `t-${paddedId}`.includes(q) || `l-${paddedId}`.includes(q);

        if (!matchTitle && !matchDivisi && !matchPelaksana && !matchId) {
          return false;
        }
      }

      return true;
    });

    // Urutkan berdasarkan urgensi: Eskalasi -> Overdue -> Prioritas HIGH -> Terbaru
    return [...filtered].sort((a, b) => {
      const stA = getEffectiveStatus(a);
      const stB = getEffectiveStatus(b);
      if (stA === 'HOLD_ESKALASI' && stB !== 'HOLD_ESKALASI') return -1;
      if (stB === 'HOLD_ESKALASI' && stA !== 'HOLD_ESKALASI') return 1;

      const overA = a.deadline && new Date(a.deadline) < now ? 1 : 0;
      const overB = b.deadline && new Date(b.deadline) < now ? 1 : 0;
      if (overA !== overB) return overB - overA;

      const prioScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (prioScore[a.prioritas] !== prioScore[b.prioritas]) {
        return prioScore[b.prioritas] - prioScore[a.prioritas];
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [metrics.aktif, activeTab, searchQuery, currentUserId]);

  const getPriorityBadge = (prioritas: Ticket['prioritas']) => {
    switch (prioritas) {
      case 'HIGH':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Tinggi',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Sedang',
        };
      default:
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Rendah',
        };
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: 'Menunggu Triase',
          style: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'DIPROSES':
        return {
          label: 'Diproses',
          style: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'Menunggu Validasi',
          style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Eskalasi / Kendala',
          style: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status.replace('_', ' '),
          style: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const formatDeadline = (iso: string | null): { formatted: string; isPast: boolean } => {
    if (!iso) return { formatted: 'Tanpa SLA', isPast: false };
    const d = new Date(iso);
    const isPast = d < new Date();
    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    return { formatted, isPast };
  };

  const handleOpenTicket = (ticket: Ticket) => {
    if (ticket.jenisTiket === 'LAPORAN') {
      navigate(`/detail-laporan/${ticket.id}`);
    } else {
      navigate(`/detail-tugas/${ticket.id}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-12">
      {/* 1. HERO GREETING KHUSUS DIREKTUR */}
      <section className="relative bg-[#0f5c43] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#0f5c43]/15 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-teal-400/20 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-white/5 blur-xl"
        />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>Direksi (Seluruh Divisi) • {userRole} RSIA</span>
              <Sparkles className="w-3.5 h-3.5 text-[#f47a45]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
              Terdapat{' '}
              <span className="font-bold text-white underline decoration-[#f47a45] underline-offset-4">
                {metrics.aktif.length} tiket aktif
              </span>{' '}
              dan{' '}
              <span className="font-bold text-amber-200">
                {metrics.eskalasi.length} eskalasi pimpinan
              </span>{' '}
              dalam pengawasan operasional rumah sakit hari ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/tambah-tugas')}
              className="flex-1 sm:flex-none h-12 min-h-[48px] px-5 bg-[#f47a45] hover:bg-[#e06934] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#f47a45]/20 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Arahan</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="flex-1 sm:flex-none h-12 min-h-[48px] px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/15 transition flex items-center justify-center gap-2"
            >
              <span>Semua Tugas RS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. EMPAT KARTU KPI EKSEKUTIF */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Tugas Aktif */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tugas Aktif
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
              {metrics.aktif.length}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Sedang berjalan di RS
            </p>
          </div>
        </div>

        {/* Tugas Selesai (Dihitung dari total tiket valid tanpa DITOLAK) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tugas Selesai
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0f5c43] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#0f5c43] tracking-tight">
              {metrics.selesai.length}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              {metrics.totalValid > 0
                ? `Tuntas ${metrics.completionRate}% dari ${metrics.totalValid} tiket valid`
                : 'Belum ada data'}
            </p>
          </div>
        </div>

        {/* Prioritas Tinggi */}
        <button
          type="button"
          onClick={() => setActiveTab('PRIORITY_ATTENTION')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prioritas Tinggi
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#f47a45] flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#f47a45] tracking-tight">
                {metrics.darurat.length}
              </p>
              {metrics.darurat.length > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                  Penting
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Butuh perhatian segera
            </p>
          </div>
        </button>

        {/* Terlambat SLA */}
        <button
          type="button"
          onClick={() => setActiveTab('OVERDUE')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between text-left"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Terlambat (SLA)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-extrabold text-rose-600 tracking-tight">
                {metrics.terlambat.length}
              </p>
              {metrics.terlambat.length > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase">
                  SLA Breach
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Melebihi batas waktu
            </p>
          </div>
        </button>
      </section>

      {/* 3. BANNER AKSES CEPAT ANALITIK KUNJUNGAN PASIEN RAWAT JALAN */}
      {smSummary?.kpi_total_rs && (
        <section className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f47a45] animate-ping" />
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#0f5c43]" />
                Proyeksi Kunjungan Pasien Rawat Jalan (Scientific Method)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
              <span>
                Total Rekam Kunjungan:{' '}
                <strong className="font-mono text-slate-900 text-sm">
                  {smSummary.kpi_total_rs.total_visits_all_time.toLocaleString('id-ID')}
                </strong>{' '}
                pasien
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span>
                Rata-rata Harian:{' '}
                <strong className="font-mono text-[#0f5c43] text-sm">
                  {Math.round(smSummary.kpi_total_rs.mean_daily_visits)}
                </strong>{' '}
                pasien/hari
              </span>
              {smSummary.kpi_total_rs.annual_trends?.['2026_full_est'] && (
                <>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span>
                    Target Proyeksi 2026:{' '}
                    <strong className="font-mono text-[#f47a45] text-sm">
                      {smSummary.kpi_total_rs.annual_trends[
                        '2026_full_est'
                      ].total.toLocaleString('id-ID')}
                    </strong>{' '}
                    pasien
                  </span>
                </>
              )}
            </div>
          </div>

          <Link
            to="/analisis-kunjungan"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f5c43] hover:bg-[#0c4935] text-white text-xs font-bold rounded-2xl transition-all shadow-xs shrink-0"
          >
            <span>Buka Analisis Kunjungan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* 4. RINGKASAN KINERJA & BEBAN KERJA LINTAS DIVISI */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0f5c43]" />
              <span>Kinerja & Beban Kerja Lintas Divisi</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik salah satu divisi untuk memfilter daftar perhatian eksekutif di bawah.
            </p>
          </div>
          {selectedDivisi !== 'SEMUA' && (
            <button
              type="button"
              onClick={() => setSelectedDivisi('SEMUA')}
              className="text-xs font-bold text-[#0f5c43] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition self-start sm:self-auto"
            >
              Reset Filter: {selectedDivisi} ×
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6">Unit / Divisi</th>
                <th className="py-3 px-4 text-center">Aktif</th>
                <th className="py-3 px-4 text-center">Selesai</th>
                <th className="py-3 px-4 text-center">Eskalasi</th>
                <th className="py-3 px-4 text-center">Terlambat SLA</th>
                <th className="py-3 px-6 w-48">Tingkat Tuntas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {divisiPerformance.map((div) => {
                const isSelected = selectedDivisi === div.nama;
                return (
                  <tr
                    key={div.nama}
                    onClick={() =>
                      setSelectedDivisi((prev) => (prev === div.nama ? 'SEMUA' : div.nama))
                    }
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3.5 px-6 font-bold text-slate-800">{div.nama}</td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-blue-600">
                      {div.aktif}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold text-[#0f5c43]">
                      {div.selesai}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {div.eskalasi > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-extrabold">
                          {div.eskalasi}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {div.terlambat > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold">
                          {div.terlambat}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0f5c43] rounded-full transition-all"
                            style={{ width: `${div.rate}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700 w-9 text-right">
                          {div.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. TABEL PADAT: PERLU PERHATIAN EKSEKUTIF */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#f47a45]" />
              <span>Perlu Perhatian Eksekutif</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {executiveWatchlist.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fokus pada tiket eskalasi pimpinan, arahan langsung Direktur, prioritas tinggi, dan keterlambatan SLA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter Lingkup Divisi */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <Building2 className="w-4 h-4 text-[#0f5c43] shrink-0" />
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="SEMUA">Semua Divisi</option>
                {daftarDivisi.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Pencarian */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Cari tiket, divisi, pelaksana..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Tab Filter Eksekutif */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PRIORITY_ATTENTION')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'PRIORITY_ATTENTION'
                ? 'bg-[#0f5c43] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Semua Perhatian Utama
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ESKALASI')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ESKALASI'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Eskalasi Pimpinan ({metrics.eskalasi.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ARAHAN_SAYA')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'ARAHAN_SAYA'
                ? 'bg-[#0f5c43] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Arahan Saya ({metrics.arahanSaya.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OVERDUE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'OVERDUE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Terlambat SLA ({metrics.terlambat.length})
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-[#0f5c43] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Memuat daftar pengawasan...</p>
          </div>
        ) : executiveWatchlist.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <div className="w-11 h-11 bg-emerald-50 text-[#0f5c43] rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak Ada Tiket Mendesak</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ditemukan eskalasi, keterlambatan SLA, maupun tiket prioritas tinggi pada filter ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                  <th className="py-3.5 px-6">Tiket & Judul</th>
                  <th className="py-3.5 px-4">Divisi Tujuan</th>
                  <th className="py-3.5 px-4">Pelaksana</th>
                  <th className="py-3.5 px-4">Batas Waktu</th>
                  <th className="py-3.5 px-4">Prioritas</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {executiveWatchlist.slice(0, 8).map((ticket) => {
                  const st = getEffectiveStatus(ticket);
                  const statusBadge = getStatusBadge(st);
                  const prioBadge = getPriorityBadge(ticket.prioritas);
                  const dl = formatDeadline(ticket.deadline);
                  const prefix = ticket.jenisTiket === 'LAPORAN' ? 'L' : 'T';

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => handleOpenTicket(ticket)}
                      className="hover:bg-slate-50/90 cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#0f5c43]">
                            #{prefix}-{String(ticket.id).padStart(3, '0')}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-[#0f5c43] transition line-clamp-1">
                            {ticket.judul}
                          </span>
                        </div>
                        {ticket.lokasi && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Lokasi: {ticket.lokasi}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-700">
                        {ticket.divisi?.nama || '-'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {ticket.pelaksana?.nama ? (
                          <span className="font-medium text-slate-700">
                            {ticket.pelaksana.nama}
                          </span>
                        ) : (
                          <span className="italic text-amber-600 font-semibold">
                            Belum ditunjuk
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={
                            dl.isPast
                              ? 'font-bold text-rose-600'
                              : 'font-medium text-slate-600'
                          }
                        >
                          {dl.formatted}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase ${prioBadge.badge}`}
                        >
                          {prioBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase ${statusBadge.style}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0f5c43] group-hover:underline">
                          <span>Tinjau</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Tabel menuju Semua Tugas RS */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">
            Menampilkan {Math.min(executiveWatchlist.length, 8)} dari{' '}
            <strong className="text-slate-700">{executiveWatchlist.length}</strong> tiket perhatian
            eksekutif.
          </span>
          <button
            type="button"
            onClick={() => navigate('/semua-tugas')}
            className="inline-flex items-center gap-1.5 font-bold text-[#0f5c43] hover:underline self-start sm:self-auto"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lihat Seluruh {metrics.aktif.length} Tiket Aktif RS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}