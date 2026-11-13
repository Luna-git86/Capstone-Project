// Frontend/src/pages/RiwayatTugas.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Camera,
  X
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole, getAuthUserName, getAuthDivisiNama } from '../utils/authStorage';
import TaskSubNav from '../components/TaskSubNav';

interface TicketItem {
  id: number;
  judul: string;
  lokasi?: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'SELESAI' | 'DITOLAK' | 'HOLD_ESKALASI';
  deadline: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  laporanPenyelesaian: string | null;
  fotoBukti: string | null;
  catatanRevisi: string | null;
  pembuat?: { id: number; nama: string; role: string } | null;
  penanggungJawab?: { id: number; nama: string; role: string } | null;
  pelaksana?: { id: number; nama: string; role: string } | null;
  divisi?: { id: number; nama: string } | null;
}

export default function RiwayatTugas() {
  const navigate = useNavigate();
  const userName = getAuthUserName('Pegawai RSIA');
  const userRole = getAuthRole() || 'STAF';
  const userDivisi = getAuthDivisiNama();

  // State menyimpan SELURUH tiket agar TaskSubNav bisa menghitung angka yang akurat
  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // State untuk accordion, filter & preview foto
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'Semua Waktu' | 'Minggu Ini' | 'Bulan Ini'>('Semua Waktu');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await api.get('/tickets?jenis=TUGAS');
      const data: TicketItem[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAllTickets(data);
    } catch (err: any) {
      console.error('Gagal memuat riwayat tugas:', err);
      setError(err.response?.data?.message || 'Gagal memuat data riwayat tugas.');
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

  const toggleExpand = (id: number) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const getMappedStatus = (t: TicketItem): 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi' | null => {
    if (t.status === 'SELESAI') return 'Disetujui';
    if (t.status === 'MENUNGGU_VALIDASI') return 'Sedang Dievaluasi';
    if (t.status === 'DIPROSES' && Boolean(t.catatanRevisi)) return 'Revisi';
    return null;
  };

  // HITUNG ANGKA UNTUK MENU SAMPING
  const activeCount = useMemo(() => allTickets.filter(t => t.status !== 'SELESAI' && t.status !== 'DITOLAK').length, [allTickets]);
  const completedCount = useMemo(() => allTickets.filter(t => t.status === 'SELESAI').length, [allTickets]);
  const totalCount = allTickets.length;

  // FILTER TIKET KHUSUS UNTUK DITAMPILKAN DI HALAMAN RIWAYAT
  const historyTickets = useMemo(() => {
    return allTickets.filter(t => getMappedStatus(t) !== null);
  }, [allTickets]);

  const filteredTasks = useMemo(() => {
    return historyTickets.filter((t) => {
      const mappedStatus = getMappedStatus(t);

      // 1. Filter Status Tab
      if (activeFilter !== 'Semua' && mappedStatus !== activeFilter) return false;

      // 2. Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `t-${String(t.id).padStart(3, '0')}`.includes(q);
        const matchDivisi = (t.divisi?.nama || '').toLowerCase().includes(q);
        const matchPelaksana = (t.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchSupervisor = (t.penanggungJawab?.nama || t.pembuat?.nama || '').toLowerCase().includes(q);

        if (!matchTitle && !matchId && !matchDivisi && !matchPelaksana && !matchSupervisor) {
          return false;
        }
      }

      // 3. Filter Waktu
      if (timeFilter !== 'Semua Waktu') {
        const targetDate = new Date(t.completedAt || t.updatedAt || t.createdAt);
        const now = new Date();
        if (timeFilter === 'Minggu Ini') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (targetDate < weekAgo) return false;
        } else if (timeFilter === 'Bulan Ini') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (targetDate < monthAgo) return false;
        }
      }
      return true;
    });
  }, [historyTickets, activeFilter, searchQuery, timeFilter]);

  const countDisetujui = historyTickets.filter((t) => getMappedStatus(t) === 'Disetujui').length;
  const countEvaluasi = historyTickets.filter((t) => getMappedStatus(t) === 'Sedang Dievaluasi').length;
  const countRevisi = historyTickets.filter((t) => getMappedStatus(t) === 'Revisi').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-teal-50/40 rounded-3xl p-5 md:p-6 border border-emerald-100/70 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm font-bold text-slate-800">{userName}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-[#0f5c43] bg-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {userRole}
              </span>
              <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                {userDivisi || 'RSIA Qurrata A\'yun'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Riwayat Penyelesaian Tugas
              <Sparkles className="w-6 h-6 text-[#f47a45]" />
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Arsip tugas yang telah diselesaikan, hasil evaluasi pimpinan, dan riwayat revisi pengerjaan tim.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-2xl flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <TaskSubNav
          currentTab="RIWAYAT"
          activeCount={activeCount}
          totalCount={totalCount}
          completedCount={completedCount}
        />

        <div className="flex-1 w-full space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setActiveFilter('Disetujui')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'Disetujui'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${activeFilter === 'Disetujui' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Disetujui
                </span>
                <CheckCircle2 className={`w-4 h-4 ${activeFilter === 'Disetujui' ? 'text-emerald-100' : 'text-emerald-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countDisetujui}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('Sedang Dievaluasi')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'Sedang Dievaluasi'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${activeFilter === 'Sedang Dievaluasi' ? 'text-amber-100' : 'text-slate-500'}`}>
                  Dievaluasi
                </span>
                <Clock className={`w-4 h-4 ${activeFilter === 'Sedang Dievaluasi' ? 'text-amber-100' : 'text-amber-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countEvaluasi}</div>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('Revisi')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                activeFilter === 'Revisi'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${activeFilter === 'Revisi' ? 'text-rose-100' : 'text-slate-500'}`}>
                  Perlu Revisi
                </span>
                <AlertCircle className={`w-4 h-4 ${activeFilter === 'Revisi' ? 'text-rose-100' : 'text-rose-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countRevisi}</div>
            </button>
          </div>

          {/* Filter & Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              {/* Search Bar */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, ID tiket, divisi, staf..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition-all"
                />
              </div>

              {/* Dropdown Waktu */}
              <div className="w-full sm:w-auto">
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value as any)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                >
                  <option value="Semua Waktu">Semua Waktu</option>
                  <option value="Minggu Ini">Minggu Ini</option>
                  <option value="Bulan Ini">Bulan Ini</option>
                </select>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFilter('Semua')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  activeFilter === 'Semua'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Riwayat ({historyTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Disetujui')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
                  activeFilter === 'Disetujui'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Disetujui ({countDisetujui})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Sedang Dievaluasi')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
                  activeFilter === 'Sedang Dievaluasi'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Dievaluasi ({countEvaluasi})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Revisi')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
                  activeFilter === 'Revisi'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Perlu Revisi ({countRevisi})
              </button>
            </div>
          </div>

          {/* List Riwayat Tugas */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="inline-block w-8 h-8 border-4 border-[#0f5c43] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-semibold text-slate-600">Memuat data riwayat tugas...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm p-6">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">Tidak ada riwayat ditemukan</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Belum ada tugas yang selesai atau sesuai dengan filter pencarian yang Anda pilih.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const mappedStatus = getMappedStatus(task) || 'Disetujui';
                const isExpanded = expandedTaskId === task.id;

                const statusBadges = {
                  'Disetujui': {
                    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    dot: 'bg-emerald-500',
                    label: 'Disetujui Selesai',
                    borderLeft: 'border-l-emerald-500'
                  },
                  'Sedang Dievaluasi': {
                    bg: 'bg-amber-50 text-amber-800 border-amber-200',
                    dot: 'bg-amber-500',
                    label: 'Sedang Dievaluasi',
                    borderLeft: 'border-l-amber-500'
                  },
                  'Revisi': {
                    bg: 'bg-rose-50 text-rose-800 border-rose-200',
                    dot: 'bg-rose-500',
                    label: 'Perlu Revisi',
                    borderLeft: 'border-l-rose-500'
                  },
                };
                const badge = statusBadges[mappedStatus];
                const supervisorName = task.penanggungJawab?.nama || task.pembuat?.nama || 'Atasan / Penanggung Jawab';

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all overflow-hidden border-l-4 ${badge.borderLeft}`}
                  >
                    {/* Header Card Ringkas & Rapi */}
                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Status, ID & Prioritas */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #T-{String(task.id).padStart(3, '0')}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                            {badge.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            task.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-800' :
                            task.prioritas === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {task.prioritas}
                          </span>
                          {task.divisi?.nama && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {task.divisi.nama}
                            </span>
                          )}
                        </div>

                        {/* Judul Tugas */}
                        <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                          {task.judul}
                        </h3>

                        {/* Metadata Pelaksana & Tanggal */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <div>
                            <span className="text-slate-400">Pelaksana: </span>
                            <span className="font-semibold text-slate-700">
                              {task.pelaksana?.nama || 'Belum Ditunjuk'}
                            </span>
                          </div>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <div>
                            <span className="text-slate-400">Waktu Selesai: </span>
                            <span className="font-semibold text-slate-700">
                              {formatDateTime(task.completedAt || task.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi Accordion & Detail */}
                      <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleExpand(task.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>{isExpanded ? 'Tutup Catatan' : 'Lihat Hasil'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/detail-tugas/${task.id}`)}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-white bg-[#0f5c43] hover:bg-[#0c4935] rounded-xl shadow-sm transition-all"
                        >
                          <span>Tiket</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Accordion Detail: Laporan Staf, Bukti Foto, Evaluasi Supervisor */}
                    {isExpanded && (
                      <div className="bg-slate-50/80 p-4 md:p-6 border-t border-slate-200/80 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Sisi Kiri: Laporan Staf & Foto Bukti */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Laporan Penyelesaian Staf
                              </h4>
                              {task.pelaksana?.nama && (
                                <span className="text-[11px] font-medium text-slate-500">
                                  Oleh: {task.pelaksana.nama}
                                </span>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {task.laporanPenyelesaian || 'Tidak ada catatan tertulis dari staf.'}
                            </p>

                            {task.fotoBukti && (
                              <div>
                                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1.5">
                                  <Camera className="w-3.5 h-3.5" />
                                  Foto Bukti Hasil Pekerjaan:
                                </span>
                                <div
                                  onClick={() => setSelectedPhoto(task.fotoBukti)}
                                  className="relative group cursor-pointer overflow-hidden rounded-xl border border-slate-200 max-h-48 bg-slate-100 flex items-center justify-center"
                                >
                                  <img
                                    src={task.fotoBukti}
                                    alt="Foto Bukti"
                                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                    <Search className="w-4 h-4" />
                                    Klik untuk memperbesar
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Sisi Kanan: Feedback & Keputusan Supervisor */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${badge.dot}`}></span>
                                  Evaluasi Supervisor
                                </h4>
                                <span className="text-[11px] font-medium text-slate-500">
                                  {supervisorName}
                                </span>
                              </div>

                              <div className={`p-3 rounded-xl border text-xs md:text-sm leading-relaxed ${
                                mappedStatus === 'Revisi'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : mappedStatus === 'Sedang Dievaluasi'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                  {mappedStatus === 'Revisi' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                                  {mappedStatus === 'Disetujui' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                  {mappedStatus === 'Sedang Dievaluasi' && <Clock className="w-4 h-4 text-amber-600" />}
                                  <span>Catatan Hasil Evaluasi:</span>
                                </div>
                                <p>
                                  {task.catatanRevisi ||
                                    (mappedStatus === 'Disetujui'
                                      ? 'Hasil pekerjaan telah divalidasi dan disetujui sesuai standar operasional.'
                                      : 'Menunggu review dan validasi foto/pekerjaan oleh atasan.')}
                                </p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">
                                Dibuat: {formatDateTime(task.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() => navigate(`/detail-tugas/${task.id}`)}
                                className="text-xs font-bold text-[#0f5c43] hover:underline flex items-center gap-1"
                              >
                                Lihat linimasa aktivitas tiket
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Lightbox Foto */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Foto Bukti Besar"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
