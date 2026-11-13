// Frontend/src/pages/SemuaTugasLengkap.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Eye,
  Filter,
  Layers,
  MapPin,
  Plus,
  Search,
  X,
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';
import TaskSubNav from '../components/TaskSubNav';

interface Ticket {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status:
    | 'MENUNGGU_TRIASE'
    | 'DIPROSES'
    | 'MENUNGGU_VALIDASI'
    | 'HOLD_ESKALASI'
    | 'SELESAI'
    | 'DITOLAK';
  deadline: string | null;
  completedAt: string | null;
  laporanPenyelesaian: string | null;
  fotoBukti: string | null;
  catatanRevisi: string | null;
  pembuat?: { id: number; nama: string; noHp?: string; role?: string };
  penanggungJawab?: { id: number; nama: string; noHp?: string; role?: string } | null;
  pelaksana?: { id: number; nama: string; noHp?: string; role?: string } | null;
  divisi?: { id: number; nama: string } | null;
}

const SemuaTugasLengkap: React.FC = () => {
  const navigate = useNavigate();
  const userRole = getAuthRole() || 'STAF';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');

  const fetchTickets = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await api.get('/tickets?jenis=TUGAS');
      const data: Ticket[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setTickets(data);
    } catch (err) {
      console.error('Gagal mengambil semua tugas', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(false);
    const intervalId = setInterval(() => {
      fetchTickets(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const counts = useMemo(() => {
    const active = tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK').length;
    const completed = tickets.filter((t) => t.status === 'SELESAI').length;
    return {
      total: tickets.length,
      active,
      completed,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterStatus === 'ARAHAN_PIMPINAN') {
        if (!['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')) return false;
      } else if (filterStatus === 'AKTIF') {
        if (t.status === 'SELESAI' || t.status === 'DITOLAK') return false;
      } else if (filterStatus !== 'SEMUA') {
        if (t.status !== filterStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `#t-${t.id}`.includes(q) || String(t.id).includes(q);
        const matchLoc = (t.lokasi || '').toLowerCase().includes(q);
        const matchPelaksana = (t.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchDivisi = (t.divisi?.nama || '').toLowerCase().includes(q);
        return matchTitle || matchId || matchLoc || matchPelaksana || matchDivisi;
      }

      return true;
    });
  }, [tickets, filterStatus, searchQuery]);

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return { label: 'Menunggu Triase', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'DIPROSES':
        return { label: 'Sedang Dikerjakan', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'MENUNGGU_VALIDASI':
        return { label: 'Menunggu Validasi', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'HOLD_ESKALASI':
        return { label: 'Tertahan (Kendala)', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'SELESAI':
        return { label: 'Selesai', bg: 'bg-blue-100 text-brand-deep border-brand-mint/50' };
      case 'DITOLAK':
        return { label: 'Ditolak', bg: 'bg-slate-200 text-slate-700 border-slate-300' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Tidak diatur';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-clinical-surface p-5 sm:p-6 rounded-3xl border border-clinical-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-brand-deep border border-brand-mint/40">
              Inventaris Lengkap
            </span>
            <span className="text-xs text-slate-400 font-medium">Seluruh Riwayat & Tugas Berjalan</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-clinical-ink tracking-tight">
            Semua Inventaris Tugas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Daftar komprehensif seluruh tugas operasional dari yang sedang berlangsung hingga yang sudah tuntas.
          </p>
        </div>

        {['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole) && (
          <button
            type="button"
            onClick={() => navigate('/tambah-tugas')}
            className="h-11 px-5 bg-brand-orange hover:bg-brand-orange/90 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-brand-orange/20 flex items-center gap-2 transition self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Kontainer Dua Kolom */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <TaskSubNav
          currentTab="SEMUA"
          activeCount={counts.active}
          totalCount={counts.total}
          completedCount={counts.completed}
        />

        <div className="flex-1 w-full space-y-5">
          {/* Toolbar Pencarian & Filter Status */}
          <div className="bg-clinical-surface p-4 rounded-3xl border border-clinical-border shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari judul, #T-xxx, pelaksana, divisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-8 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 px-3.5 bg-slate-50 border border-clinical-border rounded-2xl text-xs font-bold text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
              >
                <option value="SEMUA">Semua Status ({counts.total})</option>
                <option value="AKTIF">Tugas Aktif Saja ({counts.active})</option>
                <option value="SELESAI">Sudah Selesai ({counts.completed})</option>
                <option value="ARAHAN_PIMPINAN">Arahan Pimpinan</option>
                <option value="MENUNGGU_TRIASE">Menunggu Triase</option>
                <option value="DIPROSES">Sedang Dikerjakan</option>
                <option value="MENUNGGU_VALIDASI">Menunggu Validasi</option>
                <option value="HOLD_ESKALASI">Tertahan (Kendala)</option>
              </select>
            </div>
          </div>

          {/* List Kartu Tugas Lengkap */}
          {loading ? (
            <div className="bg-clinical-surface p-12 text-center rounded-3xl border border-clinical-border shadow-xs text-slate-400 text-xs font-bold">
              <div className="w-8 h-8 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Memuat seluruh daftar tugas...</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-clinical-surface p-10 text-center rounded-3xl border border-clinical-border shadow-xs space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-brand-deep flex items-center justify-center font-bold text-lg">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-clinical-ink">Tidak Ada Tugas</h3>
              <p className="text-xs text-slate-400">Tidak ada data penugasan pada kriteria filter ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const priorityColor =
                  t.prioritas === 'HIGH'
                    ? 'border-l-rose-500'
                    : t.prioritas === 'MEDIUM'
                    ? 'border-l-brand-orange'
                    : 'border-l-blue-500';

                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/detail-tugas/${t.id}`)}
                    className={`bg-clinical-surface p-5 sm:p-6 rounded-3xl border border-clinical-border border-l-4 ${priorityColor} shadow-xs hover:shadow-md transition cursor-pointer space-y-3.5`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-clinical-border/60 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-xs bg-blue-50 text-brand-deep px-2.5 py-1 rounded-xl">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700">
                          {t.prioritas}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-semibold text-slate-600">
                          Target: {formatDateTime(t.deadline)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-clinical-ink hover:text-brand-deep transition">
                        {t.judul}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {t.deskripsi}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {t.lokasi && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.lokasi}</span>
                          </span>
                        )}
                        <span><strong>Divisi:</strong> {t.divisi?.nama || '-'}</span>
                        <span>
                          <strong>Pelaksana:</strong>{' '}
                          <span className="font-bold text-brand-deep">{t.pelaksana?.nama || 'Belum Ditunjuk'}</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/detail-tugas/${t.id}`);
                        }}
                        className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-clinical-ink font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemuaTugasLengkap;
