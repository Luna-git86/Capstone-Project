// Frontend/src/pages/RiwayatTugas.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole, getAuthUserName, getAuthDivisiNama } from '../utils/authStorage';
import TaskSubNav from '../components/TaskSubNav';

interface TicketItem {
  id: number;
  judul: string;
  lokasi?: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'SELESAI' | 'DITOLAK';
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

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // State untuk accordion dan filter
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'Semua Waktu' | 'Minggu Ini' | 'Bulan Ini'>('Semua Waktu');

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/tickets');
        const all: TicketItem[] = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        
        // Riwayat tugas menampilkan tiket yang sudah selesai, sedang divalidasi, atau pernah direvisi
        const historyTickets = all.filter(
          (t) =>
            t.status === 'SELESAI' ||
            t.status === 'MENUNGGU_VALIDASI' ||
            (t.status === 'DIPROSES' && Boolean(t.catatanRevisi))
        );

        setTickets(historyTickets);
      } catch (err: any) {
        console.error('Gagal memuat riwayat tugas:', err);
        setError(err.response?.data?.message || 'Gagal memuat data riwayat tugas.');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
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

  const getMappedStatus = (t: TicketItem): 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi' => {
    if (t.status === 'SELESAI') return 'Disetujui';
    if (t.status === 'MENUNGGU_VALIDASI') return 'Sedang Dievaluasi';
    return 'Revisi';
  };

  // Filter logika
  const filteredTasks = tickets.filter((t) => {
    const mappedStatus = getMappedStatus(t);

    // 1. Filter Status Tab
    if (activeFilter !== 'Semua' && mappedStatus !== activeFilter) {
      return false;
    }

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

  const countDisetujui = tickets.filter((t) => t.status === 'SELESAI').length;
  const countEvaluasi = tickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length;
  const countRevisi = tickets.filter((t) => t.status === 'DIPROSES' && Boolean(t.catatanRevisi)).length;
  const activeCount = tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK').length;
  const completedCount = tickets.filter((t) => t.status === 'SELESAI').length;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header & Informasi Pengguna */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-slate-800">
            {userName}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {userRole}
          </span>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {userDivisi}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          Riwayat Penyelesaian Tugas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Daftar tugas yang telah diselesaikan, dievaluasi, dan catatan pengerjaan oleh tim kerja.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-start gap-6">
        <TaskSubNav
          currentTab="RIWAYAT"
          activeCount={activeCount}
          totalCount={tickets.length}
          completedCount={completedCount}
        />
        <div className="flex-1 w-full space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-slate-200 pb-5">
        {/* Tombol Filter Status */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('Semua')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold border transition-colors ${
              activeFilter === 'Semua'
                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('Disetujui')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold border transition-colors flex items-center gap-1.5 ${
              activeFilter === 'Disetujui'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Disetujui ({countDisetujui})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('Sedang Dievaluasi')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold border transition-colors flex items-center gap-1.5 ${
              activeFilter === 'Sedang Dievaluasi'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Dievaluasi ({countEvaluasi})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('Revisi')}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold border transition-colors flex items-center gap-1.5 ${
              activeFilter === 'Revisi'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Revisi ({countRevisi})
          </button>
        </div>

        {/* Input Pencarian & Dropdown Waktu */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tugas, ID, staf..."
            className="w-full md:w-60 px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none"
          >
            <option value="Semua Waktu">Semua Waktu</option>
            <option value="Minggu Ini">Minggu Ini</option>
            <option value="Bulan Ini">Bulan Ini</option>
          </select>
        </div>
      </div>

      {/* List Riwayat Tugas */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
            Memuat data riwayat tugas dari sistem...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Tidak ada riwayat tugas untuk kriteria filter ini.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const mappedStatus = getMappedStatus(task);
            const isExpanded = expandedTaskId === task.id;

            const statusColors = {
              Disetujui: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                border: 'border-emerald-200',
                dot: 'bg-emerald-500',
              },
              'Sedang Dievaluasi': {
                bg: 'bg-amber-50',
                text: 'text-amber-700',
                border: 'border-amber-200',
                dot: 'bg-amber-500',
              },
              Revisi: {
                bg: 'bg-rose-50',
                text: 'text-rose-700',
                border: 'border-rose-200',
                dot: 'bg-rose-500',
              },
            };
            const colors = statusColors[mappedStatus];

            const supervisorName =
              task.penanggungJawab?.nama || task.pembuat?.nama || 'Supervisor Unit';
            const supervisorRole =
              task.penanggungJawab?.role || task.pembuat?.role || 'Koordinator';

            return (
              <div key={task.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Baris Utama Card */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* ID & Status */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold text-blue-600 font-mono">
                      #T-{String(task.id).padStart(3, '0')}
                    </span>
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border ${colors.border} ${colors.bg}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                      <span className={`text-xs font-bold ${colors.text}`}>
                        {mappedStatus}
                      </span>
                    </div>
                  </div>

                  {/* Info Utama Tugas */}
                  <div className="flex-1 md:border-l md:border-slate-100 md:pl-4">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {task.judul}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {task.divisi?.nama && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                          {task.divisi.nama}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                        Prioritas: {task.prioritas}
                      </span>
                      {task.pelaksana?.nama && (
                        <span className="text-xs text-slate-500">
                          Pelaksana: <strong className="text-slate-700">{task.pelaksana.nama}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Waktu & Supervisor */}
                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 md:border-l md:border-slate-100 md:pl-4">
                    <div className="text-left md:text-right">
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                        {task.completedAt ? 'Diselesaikan' : 'Pembaruan'}
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        {formatDateTime(task.completedAt || task.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {supervisorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {supervisorName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {supervisorRole} • {task.divisi?.nama || 'RSIA'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition"
                      title="Lihat Detail Hasil"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Konten Accordion (Laporan Staf & Feedback Evaluasi) */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/80 p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Laporan Staf & Foto Bukti */}
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Laporan Penyelesaian Staf
                        </h4>
                        <p className="text-sm text-slate-800">
                          {task.laporanPenyelesaian || 'Belum ada catatan laporan.'}
                        </p>
                        {task.fotoBukti ? (
                          <div className="pt-2">
                            <p className="text-[11px] font-semibold text-slate-500 mb-1">
                              Foto Bukti Pengerjaan:
                            </p>
                            <img
                              src={task.fotoBukti}
                              alt="Bukti Penyelesaian"
                              className="w-full max-h-48 object-contain bg-slate-100 rounded-lg border border-slate-200"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Tidak ada foto bukti terlampir.</p>
                        )}
                      </div>

                      {/* Catatan Evaluasi Supervisor */}
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Catatan Evaluasi / Feedback Supervisor
                          </h4>
                          <p className="text-sm text-slate-800 mt-2">
                            {task.catatanRevisi ||
                              (task.status === 'SELESAI'
                                ? 'Pekerjaan telah diperiksa dan disetujui sesuai target penugasan.'
                                : 'Menunggu hasil pemeriksaan oleh atasan/supervisor.')}
                          </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => navigate(`/detail-tugas/${task.id}`)}
                            className="px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
                          >
                            Buka Detail Tiket →
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
</div>
  );
}
