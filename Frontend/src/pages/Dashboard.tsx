// Frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  MapPin,
  ArrowRight,
  Plus,
  Sparkles,
  TrendingUp,
  Building2,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import api from '../services/api';
import { getAuthUserName, getAuthRole, getAuthDivisiNama } from '../utils/authStorage';

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
  lokasi?: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI';
  deadline: string | null;
  createdAt: string;
  completedAt?: string | null;
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string };
  divisi?: { id: number; nama: string };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = getAuthUserName('Direktur RSIA');
  const userRole = getAuthRole() || 'DIREKTUR';
  const userDivisi = getAuthDivisiNama();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [smSummary, setSmSummary] = useState<SmSummarySnippet | null>(null);

  // Filter State
  const [selectedDivisi, setSelectedDivisi] = useState<string>('SEMUA');
  const [filterPrioritas, setFilterPrioritas] = useState<'ALL' | 'HIGH' | 'TRIASE' | 'DIPROSES'>('ALL');
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

  // Kalkulasi Metrik Utama Real-Time
  const now = new Date();

  const tugasAktif = useMemo(
    () => ticketsByDivisi.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'),
    [ticketsByDivisi]
  );

  const tugasSelesai = useMemo(
    () => ticketsByDivisi.filter((t) => t.status === 'SELESAI'),
    [ticketsByDivisi]
  );

  const tugasDarurat = useMemo(
    () => ticketsByDivisi.filter((t) => t.prioritas === 'HIGH' && t.status !== 'SELESAI'),
    [ticketsByDivisi]
  );

  const tugasTerlambat = useMemo(
    () =>
      ticketsByDivisi.filter(
        (t) =>
          t.status !== 'SELESAI' &&
          t.status !== 'DITOLAK' &&
          t.deadline &&
          new Date(t.deadline) < now
      ),
    [ticketsByDivisi, now]
  );

  // Filter List Tugas untuk Card List
  const filteredList = useMemo(() => {
    return tugasAktif.filter((ticket) => {
      // 1. Filter Tab
      if (filterPrioritas === 'HIGH' && ticket.prioritas !== 'HIGH') return false;
      if (filterPrioritas === 'TRIASE' && ticket.status !== 'MENUNGGU_TRIASE') return false;
      if (filterPrioritas === 'DIPROSES' && ticket.status !== 'DIPROSES') return false;

      // 2. Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ticket.judul.toLowerCase().includes(q);
        const matchLoc = (ticket.lokasi || '').toLowerCase().includes(q);
        const matchDivisi = (ticket.divisi?.nama || '').toLowerCase().includes(q);
        const matchPelaksana = (ticket.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchId = `t-${String(ticket.id).padStart(3, '0')}`.includes(q);

        if (!matchTitle && !matchLoc && !matchDivisi && !matchPelaksana && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [tugasAktif, filterPrioritas, searchQuery]);

  const getPriorityStyle = (prioritas: Ticket['prioritas']) => {
    switch (prioritas) {
      case 'HIGH':
        return {
          bar: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Prioritas Tinggi',
        };
      case 'MEDIUM':
        return {
          bar: 'bg-[#f47a45]',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Prioritas Sedang',
        };
      default:
        return {
          bar: 'bg-blue-500',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Prioritas Rendah',
        };
    }
  };

  const getStatusStyle = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DIPROSES':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MENUNGGU_VALIDASI':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'HOLD_ESKALASI':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatDeadline = (iso: string | null): { formatted: string; isPast: boolean } => {
    if (!iso) return { formatted: 'Tanpa batas waktu', isPast: false };
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

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* 1. HERO GREETING KHUSUS DIREKTUR DENGAN DESAIN BRAND DEEP & ORGANIC SHAPES */}
      <section className="relative bg-[#0f5c43] text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#0f5c43]/15 overflow-hidden">
        {/* Bentuk dekoratif organik tema RSIA */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-60 h-60 rounded-full bg-teal-400/20 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-white/5 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>{userDivisi || 'Direksi'} • {userRole} RSIA</span>
              <Sparkles className="w-3.5 h-3.5 text-[#f47a45]" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
              Terdapat <span className="font-bold text-white underline decoration-[#f47a45] underline-offset-4">{tugasAktif.length} tugas aktif</span> rumah sakit yang berada dalam pengawasan operasional kepemimpinan Anda hari ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/tambah-tugas')}
              className="flex-1 sm:flex-none h-12 min-h-[48px] px-5 bg-[#f47a45] hover:bg-[#e06934] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#f47a45]/20 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Tugas Baru</span>
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

      {/* 2. STATISTIK CEPAT DENGAN 4 KARTU MODERN KHUSUS DIREKTUR */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Tugas Aktif */}
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
              {tugasAktif.length}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Sedang berjalan di RS
            </p>
          </div>
        </div>

        {/* Tugas Selesai */}
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
              {tugasSelesai.length}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              {ticketsByDivisi.length > 0
                ? `Tuntas ${Math.round((tugasSelesai.length / ticketsByDivisi.length) * 100)}% dari total`
                : 'Belum ada data'}
            </p>
          </div>
        </div>

        {/* Prioritas Tinggi */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
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
                {tugasDarurat.length}
              </p>
              {tugasDarurat.length > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                  Penting
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Butuh perhatian segera
            </p>
          </div>
        </div>

        {/* Terlambat SLA */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
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
                {tugasTerlambat.length}
              </p>
              {tugasTerlambat.length > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase">
                  SLA Breach
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Melebihi batas waktu
            </p>
          </div>
        </div>
      </section>

      {/* 3. BANNER AKSES CEPAT ANALITIK KUNJUNGAN PASIEN RAWAT JALAN (KHUSUS DIREKTUR) */}
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
                      {smSummary.kpi_total_rs.annual_trends['2026_full_est'].total.toLocaleString('id-ID')}
                    </strong>{' '}
                    pasien
                  </span>
                </>
              )}
            </div>
          </div>

          <Link
            to="/analitik-kunjungan"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f5c43] hover:bg-[#0c4935] text-white text-xs font-bold rounded-2xl transition-all shadow-xs shrink-0"
          >
            <span>Buka Analitik Prediksi</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}

      {/* 4. DAFTAR TUGAS PRIORITAS DIREKTUR (CARD LIST MOBILE-FIRST SEPERTI STAF) */}
      <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-7 space-y-5">
        {/* Header, Filter Divisi & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Pengawasan Tugas Prioritas Rumah Sakit</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {filteredList.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar tiket tugas lintas divisi yang memerlukan pengawasan kepemimpinan
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Lingkup Divisi */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
              <Building2 className="w-4 h-4 text-[#0f5c43] shrink-0" />
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-2"
              >
                <option value="SEMUA">Semua Divisi ({tickets.length})</option>
                {daftarDivisi.map((div) => {
                  const divCount = tickets.filter((t) => t.divisi?.nama === div).length;
                  return (
                    <option key={div} value={div}>
                      {div} ({divCount})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Input Pencarian */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari tugas, staf, ruangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>

        {/* Tab Filter Kategori Cepat */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterPrioritas('ALL')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              filterPrioritas === 'ALL'
                ? 'bg-[#0f5c43] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Aktif ({tugasAktif.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPrioritas('HIGH')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 flex items-center gap-1.5 ${
              filterPrioritas === 'HIGH'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Mendesak ({tugasDarurat.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterPrioritas('TRIASE')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              filterPrioritas === 'TRIASE'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Perlu Petugas
          </button>
          <button
            type="button"
            onClick={() => setFilterPrioritas('DIPROSES')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              filterPrioritas === 'DIPROSES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sedang Dikerjakan
          </button>
        </div>

        {/* List Card Tugas (Grid 2 Kolom di Desktop, 1 Kolom di Mobile - Format Persis Staf) */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-[#0f5c43] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Memuat data pengawasan tugas...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-[#0f5c43] rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Semua Terkendali Sempurna!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'Tidak ada tugas yang sesuai dengan kriteria pencarian.'
                  : 'Seluruh tugas pada status ini telah ditangani dengan baik.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredList.map((ticket) => {
              const pStyle = getPriorityStyle(ticket.prioritas);
              const dl = formatDeadline(ticket.deadline);

              return (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/detail-tugas/${ticket.id}`)}
                  className="group relative bg-white hover:bg-slate-50/70 border border-slate-200/90 hover:border-[#0f5c43] rounded-3xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-4 overflow-hidden"
                >
                  {/* Indikator Baris Samping Prioritas */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${pStyle.bar}`} />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-xs font-extrabold text-[#0f5c43] bg-emerald-50 px-2.5 py-1 rounded-xl">
                        #T-{String(ticket.id).padStart(3, '0')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${pStyle.badge}`}>
                          {pStyle.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusStyle(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#0f5c43] transition leading-snug line-clamp-2">
                      {ticket.judul}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {ticket.deskripsi || 'Tidak ada deskripsi tambahan.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    {/* Lokasi, Divisi & Pelaksana */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                      {ticket.lokasi && (
                        <div className="flex items-center gap-1 text-slate-700 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{ticket.lokasi}</span>
                        </div>
                      )}
                      {ticket.divisi?.nama && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{ticket.divisi.nama}</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        <span>Pelaksana:</span>
                        <strong className="text-slate-800">{ticket.pelaksana?.nama || 'Belum Ditunjuk'}</strong>
                      </span>
                    </div>

                    {/* Deadline SLA & Tombol Aksi */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${dl.isPast ? 'text-rose-500' : 'text-slate-400'}`} />
                        <span className={`text-[11px] font-semibold ${dl.isPast ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                          {dl.formatted}
                        </span>
                        {dl.isPast && (
                          <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">
                            SLA Lewat
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/detail-tugas/${ticket.id}`);
                        }}
                        className="h-10 px-4 bg-[#0f5c43] group-hover:bg-[#f47a45] text-white rounded-2xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <span>Periksa Tiket</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
