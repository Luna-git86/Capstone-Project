// Frontend/src/pages/Admin/MonitoringNotifikasi.tsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface NotificationLogItem {
  id: number;
  ticketId: number;
  recipientId: number;
  type: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  message: string;
  telegramChatId: string;
  dedupeKey: string;
  attempts: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  recipient?: {
    id: number;
    nama: string;
    role: string;
    telegramChatId: string | null;
    divisi?: { id: number; nama: string };
  };
  ticket?: {
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    divisi?: { id: number; nama: string };
  };
}

interface SummaryData {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function MonitoringNotifikasi() {
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 15 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/notifications/logs', { params });
      if (res.data) {
        setLogs(res.data.data || []);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err: any) {
      console.error('Error fetch notification logs:', err);
      alert(err.response?.data?.message || 'Gagal memuat log notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, statusFilter, typeFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleRetrySingle = async (id: number) => {
    try {
      setRetryingId(id);
      const res = await api.post(`/notifications/logs/${id}/retry`);
      alert(res.data.message || 'Notifikasi berhasil dikirim ulang!');
      fetchLogs();
    } catch (err: any) {
      console.error('Error retry single:', err);
      alert(err.response?.data?.message || 'Gagal mengirim ulang notifikasi.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!window.confirm('Kirim ulang seluruh notifikasi yang gagal?')) return;
    try {
      setIsRetryingAll(true);
      const res = await api.post('/notifications/logs/retry-failed');
      alert(res.data.message || 'Proses pengiriman ulang selesai!');
      fetchLogs();
    } catch (err: any) {
      console.error('Error retry all:', err);
      alert(err.response?.data?.message || 'Gagal memproses pengiriman ulang massal.');
    } finally {
      setIsRetryingAll(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Makassar',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
            Terkirim
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
            Gagal
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></span>
            Antrean
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      DIRECTIVE_ASSIGNED: 'Arahan Kadiv',
      TASK_ASSIGNED: 'Penugasan Tugas Baru',
      TASK_REASSIGNED: 'Penugasan Ulang',
      TASK_SUBMITTED: 'Laporan Selesai Diajukan',
      TASK_REVISION_REQUIRED: 'Permintaan Revisi',
      TASK_VERIFIED: 'Verifikasi Selesai',
      TASK_ESCALATED: 'Eskalasi Kendala',
      REPORT_SUBMITTED: 'Laporan Masalah Baru',
      REPORT_REJECTED: 'Laporan Masalah Ditolak',
      REPORT_RESUBMITTED: 'Revisi Laporan Terkirim',
      DEADLINE_SOON: 'Mendekati Batas Waktu',
      OVERDUE: 'Melewati Batas Waktu',
    };
    return map[type] || type.replace(/_/g, ' ');
  };

  return (
    <main className="w-full p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800">
              Integrasi Telegram
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Log Notifikasi Telegram
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pemantauan pengiriman pesan Telegram, status berhasil atau gagal, dan pengiriman ulang notifikasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition"
          >
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleRetryAll}
            disabled={isRetryingAll || summary.failed === 0}
            className="flex items-center gap-2 px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            <span>{isRetryingAll ? 'Memproses...' : 'Kirim Ulang Semua Gagal'}</span>
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Notifikasi
          </p>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {summary.total}
          </p>
          <span className="text-xs text-slate-400">Seluruh riwayat sistem</span>
        </div>

        <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Berhasil Terkirim
          </p>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {summary.sent}
          </p>
          <span className="text-xs text-emerald-600">Pesan sampai ke Telegram</span>
        </div>

        <div className="bg-rose-50/70 p-5 rounded-xl border border-rose-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Gagal Terkirim
          </p>
          <p className="text-2xl font-black text-rose-700 mt-2">
            {summary.failed}
          </p>
          <span className="text-xs text-rose-600">Pesan tidak terkirim</span>
        </div>

        <div className="bg-amber-50/70 p-5 rounded-xl border border-amber-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Dalam Antrean
          </p>
          <p className="text-2xl font-black text-amber-700 mt-2">
            {summary.pending}
          </p>
          <span className="text-xs text-amber-600">Menunggu giliran kirim</span>
        </div>
      </section>

      {/* FILTER & PENCARIAN */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Status Pengiriman
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="SENT">Terkirim</option>
              <option value="FAILED">Gagal</option>
              <option value="PENDING">Dalam Antrean</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Jenis Notifikasi
            </label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Semua Jenis Notifikasi</option>
              <option value="TASK_ASSIGNED">Penugasan Tugas Baru</option>
              <option value="DIRECTIVE_ASSIGNED">Arahan dari Kadiv</option>
              <option value="TASK_SUBMITTED">Laporan Selesai Diajukan</option>
              <option value="TASK_REVISION_REQUIRED">Permintaan Revisi Tugas</option>
              <option value="TASK_VERIFIED">Verifikasi Tugas Selesai</option>
              <option value="TASK_ESCALATED">Eskalasi Tugas</option>
              <option value="REPORT_SUBMITTED">Laporan Masalah Baru</option>
              <option value="REPORT_REJECTED">Laporan Masalah Ditolak</option>
              <option value="REPORT_RESUBMITTED">Revisi Laporan Terkirim</option>
              <option value="DEADLINE_SOON">Peringatan Mendekati Batas Waktu</option>
              <option value="OVERDUE">Peringatan Melewati Batas Waktu</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Cari berdasarkan nama penerima, ID tiket (#T-001), atau isi pesan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition"
          >
            Cari
          </button>
        </form>
      </section>

      {/* TABEL NOTIFICATION LOG */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Waktu Dibuat</th>
                <th className="py-3 px-4">Tiket Terkait</th>
                <th className="py-3 px-4">Penerima</th>
                <th className="py-3 px-4">Jenis Notifikasi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Percobaan</th>
                <th className="py-3 px-4">Keterangan / Error</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data log notifikasi...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada log notifikasi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      #{item.id}
                    </td>
                    <td className="py-3 px-4">
                      <div>{formatDate(item.createdAt)}</div>
                      {item.sentAt && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Terkirim: {formatDate(item.sentAt)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        #T-{String(item.ticketId).padStart(3, '0')}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                        {item.ticket?.judul || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {item.recipient?.nama || `Pengguna #${item.recipientId}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID Telegram: {item.telegramChatId || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[11px]">
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {item.attempts}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {item.errorMessage ? (
                        <span className="text-rose-600 text-[11px] font-mono break-words">
                          {item.errorMessage}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'FAILED' ? (
                        <button
                          type="button"
                          onClick={() => handleRetrySingle(item.id)}
                          disabled={retryingId === item.id}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition disabled:opacity-50"
                        >
                          {retryingId === item.id ? 'Mengirim...' : 'Kirim Ulang'}
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-bold disabled:opacity-50 hover:bg-slate-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-bold disabled:opacity-50 hover:bg-slate-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
