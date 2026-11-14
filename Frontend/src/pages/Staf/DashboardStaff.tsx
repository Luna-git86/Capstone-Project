// Frontend/src/pages/Staf/DashboardStaff.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { getAuthUserName, getAuthRole, getAuthDivisiNama } from '../../utils/authStorage';

interface Ticket {
  id: number;
  judul: string;
  lokasi?: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  divisi?: { nama: string };
  pembuat?: { nama: string };
  fotoInstruksi?: string | null;
}

export default function DashboardStaff() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPrioritas, setFilterPrioritas] = useState<'ALL' | 'HIGH' | 'DIPROSES'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  const userName = getAuthUserName('Rekan Staf');
  const userRole = getAuthRole() || 'STAF';
  const userDivisi = getAuthDivisiNama() || 'Operasional RS';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data.data || response.data || []);
    } catch (error) {
      console.error('Gagal mengambil daftar tugas staf:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const tugasAktif = useMemo(
    () => tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'),
    [tickets]
  );

  const tugasSelesai = useMemo(
    () => tickets.filter((t) => t.status === 'SELESAI'),
    [tickets]
  );

  const tugasDarurat = useMemo(
    () => tugasAktif.filter((t) => t.prioritas === 'HIGH'),
    [tugasAktif]
  );

  const filteredList = useMemo(() => {
    return tugasAktif.filter((t) => {
      const matchSearch =
        t.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.lokasi && t.lokasi.toLowerCase().includes(searchQuery.toLowerCase())) ||
        `t-${t.id}`.includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (filterPrioritas === 'HIGH') return t.prioritas === 'HIGH';
      if (filterPrioritas === 'DIPROSES') return t.status === 'DIPROSES';
      return true;
    });
  }, [tugasAktif, searchQuery, filterPrioritas]);

  const getPriorityStyle = (prioritas: string) => {
    switch (prioritas) {
      case 'HIGH':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Mendesak / High',
          bar: 'bg-rose-500',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-brand-orange-soft text-brand-orange border-brand-orange/30',
          label: 'Penting / Med',
          bar: 'bg-brand-orange',
        };
      default:
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Normal / Low',
          bar: 'bg-blue-500',
        };
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DIPROSES':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MENUNGGU_VALIDASI':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'HOLD_ESKALASI':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  const formatDeadline = (iso: string | null): { formatted: string; isPast: boolean } => {
    if (!iso) return { formatted: 'Tidak ada deadline', isPast: false };
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
      {/* 1. HERO GREETING DENGAN DESAIN BRAND DEEP & ORGANIC SHAPES */}
      <section className="relative bg-brand-deep text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-brand-deep/15 overflow-hidden">
        {/* Bentuk dekoratif organik tema RSIA */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-mint/25 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 w-52 h-52 rounded-full bg-white/5 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-white/90">
              <span className="w-2 h-2 rounded-full bg-brand-mint animate-pulse" />
              <span>{userDivisi} • {userRole} Siaga</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {getGreeting()}, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
              Terdapat <span className="font-bold text-white underline decoration-brand-orange underline-offset-4">{tugasAktif.length} tugas aktif</span> yang memerlukan penanganan Anda hari ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate('/laporkan-masalah')}
              className="flex-1 sm:flex-none h-12 min-h-[48px] px-5 bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-brand-orange/20 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Laporkan Masalah</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="flex-1 sm:flex-none h-12 min-h-[48px] px-4 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/15 transition flex items-center justify-center gap-2"
            >
              <span>Semua Tugas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. STATISTIK CEPAT DENGAN KARTU MODERN */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
        {/* Tugas Aktif */}
        <div className="bg-white p-5 rounded-3xl border border-clinical-border shadow-xs hover:shadow-md transition flex flex-col justify-between">
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
              Perlu diselesaikan segera
            </p>
          </div>
        </div>

        {/* Tugas Selesai */}
        <div className="bg-white p-5 rounded-3xl border border-clinical-border shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tugas Selesai
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-brand-mint flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl sm:text-4xl font-extrabold text-brand-deep tracking-tight">
              {tugasSelesai.length}
            </p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              Tercatat di riwayat selesai
            </p>
          </div>
        </div>

        {/* Prioritas Mendesak */}
        <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-3xl border border-clinical-border shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Prioritas Tinggi
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl sm:text-4xl font-extrabold text-rose-600 tracking-tight">
                {tugasDarurat.length}
              </p>
              {tugasDarurat.length > 0 && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase">
                  Perhatian
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1 truncate">
              SLA ketat, kerjakan dahulu
            </p>
          </div>
        </div>
      </section>

      {/* 3. DAFTAR TUGAS PRIORITAS HARI INI (CARD LIST MOBILE-FIRST) */}
      <section className="bg-white rounded-3xl border border-clinical-border shadow-xs p-5 sm:p-7 space-y-5">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-clinical-border/60 pb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-clinical-ink tracking-tight flex items-center gap-2">
              <span>Tugas Prioritas Hari Ini</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {filteredList.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar tiket penugasan yang ditugaskan kepada Anda
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari nama tugas atau ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterPrioritas('ALL')}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition whitespace-nowrap active:scale-95 ${
              filterPrioritas === 'ALL'
                ? 'bg-brand-deep text-white shadow-xs'
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

        {/* List Card Tugas */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Memuat penugasan Anda...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-12 px-4 text-center border-2 border-dashed border-clinical-border rounded-3xl bg-slate-50/50 space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-clinical-ink">Tidak ada tugas tertunda!</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'Tidak ada tugas yang sesuai dengan pencarian.'
                  : 'Bagus! Semua tugas aktif telah Anda selesaikan dengan baik.'}
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
                  className="group relative bg-white hover:bg-slate-50/70 border border-clinical-border hover:border-brand-mint rounded-3xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-4 overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${pStyle.bar}`} />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-xs font-extrabold text-brand-deep bg-blue-50 px-2.5 py-1 rounded-xl">
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

                    <h3 className="text-base font-extrabold text-clinical-ink group-hover:text-brand-deep transition leading-snug line-clamp-2">
                      {ticket.judul}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {ticket.deskripsi}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-clinical-border/60 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                      {ticket.lokasi && (
                        <div className="flex items-center gap-1 text-slate-600 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{ticket.lokasi}</span>
                        </div>
                      )}
                      {ticket.divisi?.nama && (
                        <span className="text-[11px] text-slate-400">• {ticket.divisi.nama}</span>
                      )}
                    </div>

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
                        className="h-10 px-3.5 bg-brand-deep group-hover:bg-brand-orange text-white rounded-2xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                        <span>Kerjakan</span>
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
