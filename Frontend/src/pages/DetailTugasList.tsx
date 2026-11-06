// Frontend/src/pages/DetailTugasList.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

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

const DetailTugasList: React.FC = () => {
  const navigate = useNavigate();
  const userRole = getAuthRole() || 'STAF';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('SEMUA_AKTIF');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tickets');
      const data: Ticket[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      // Khusus Menu Detail Tugas: Hanya tampilkan tugas yang AKTIF saja
      const activeOnly = data.filter(
        (t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'
      );
      setTickets(activeOnly);
    } catch (err) {
      console.error('Gagal mengambil daftar tugas aktif', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Hitung jumlah pada masing-masing kategori aktif
  const counts = useMemo(() => {
    return {
      all: tickets.length,
      triase: tickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      diproses: tickets.filter((t) => t.status === 'DIPROSES').length,
      validasi: tickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      eskalasi: tickets.filter((t) => t.status === 'HOLD_ESKALASI').length,
      arahan: tickets.filter((t) => ['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')).length,
    };
  }, [tickets]);

  // Filter berdasarkan Tab dan Search
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Filter Tab Status
      if (activeTab === 'MENUNGGU_TRIASE' && t.status !== 'MENUNGGU_TRIASE') return false;
      if (activeTab === 'DIPROSES' && t.status !== 'DIPROSES') return false;
      if (activeTab === 'MENUNGGU_VALIDASI' && t.status !== 'MENUNGGU_VALIDASI') return false;
      if (activeTab === 'HOLD_ESKALASI' && t.status !== 'HOLD_ESKALASI') return false;
      if (activeTab === 'ARAHAN_PIMPINAN' && !['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')) return false;

      // 2. Filter Search Query
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
  }, [tickets, activeTab, searchQuery]);

  const formatDeadline = (deadlineStr: string | null) => {
    if (!deadlineStr) return { text: 'Tidak ada batas waktu', isOverdue: false, isNear: false };
    const dl = new Date(deadlineStr);
    const now = new Date();
    const isOverdue = now > dl;
    const diffHours = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isNear = !isOverdue && diffHours <= 2;

    const formatted = dl.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return { text: formatted, isOverdue, isNear };
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return { label: 'Menunggu Triase / Tugas', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'DIPROSES':
        return { label: 'Sedang Dikerjakan', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'MENUNGGU_VALIDASI':
        return { label: 'Menunggu Evaluasi Foto', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'HOLD_ESKALASI':
        return { label: 'Tertahan (Kendala Alat/Biaya)', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
              Monitoring Operasional
            </span>
            <span className="text-xs text-slate-400 font-medium">Hanya Tugas Berjalan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Detail Tugas Aktif</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Menampilkan seluruh rincian penugasan yang sedang berjalan dan membutuhkan tindakan kerja atau evaluasi.
          </p>
        </div>

        {['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole) && (
          <button
            type="button"
            onClick={() => navigate('/tambah-tugas')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all self-start sm:self-auto hover:shadow"
          >
            <span className="text-sm font-bold">+</span>
            <span>Buat Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('SEMUA_AKTIF')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'SEMUA_AKTIF'
              ? 'bg-blue-50 border-blue-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">Semua Tugas Aktif</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{counts.all}</p>
        </div>

        <div
          onClick={() => setActiveTab('MENUNGGU_TRIASE')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'MENUNGGU_TRIASE'
              ? 'bg-amber-50 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <p className="text-xs font-semibold text-amber-700">Menunggu Triase</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{counts.triase}</p>
        </div>

        <div
          onClick={() => setActiveTab('DIPROSES')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'DIPROSES'
              ? 'bg-blue-50 border-blue-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <p className="text-xs font-semibold text-blue-700">Sedang Dikerjakan</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{counts.diproses}</p>
        </div>

        <div
          onClick={() => setActiveTab('MENUNGGU_VALIDASI')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'MENUNGGU_VALIDASI'
              ? 'bg-purple-50 border-purple-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <p className="text-xs font-semibold text-purple-700">Evaluasi Foto</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{counts.validasi}</p>
        </div>

        <div
          onClick={() => setActiveTab('HOLD_ESKALASI')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'HOLD_ESKALASI'
              ? 'bg-rose-50 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <p className="text-xs font-semibold text-rose-700">Tertahan (Kendala)</p>
          <p className="text-2xl font-bold text-rose-800 mt-1">{counts.eskalasi}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari berdasarkan judul tugas, nomor #T-xxx, lokasi, atau pelaksana..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-[11px] font-semibold">Cari:</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              x
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('SEMUA_AKTIF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'SEMUA_AKTIF'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('ARAHAN_PIMPINAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'ARAHAN_PIMPINAN'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            Arahan Pimpinan ({counts.arahan})
          </button>
          <button
            onClick={() => setActiveTab('DIPROSES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'DIPROSES'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dikerjakan ({counts.diproses})
          </button>
          <button
            onClick={() => setActiveTab('MENUNGGU_VALIDASI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'MENUNGGU_VALIDASI'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Validasi ({counts.validasi})
          </button>
        </div>
      </div>

      {/* Konten Daftar Tugas Aktif (Cards Modular & Rapi) */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 font-medium">
          <p className="animate-pulse">Memuat rincian tugas aktif...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
            
          </div>
          <h3 className="text-base font-bold text-slate-800">Tidak Ada Tugas Aktif</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? `Tidak ditemukan tugas aktif yang cocok dengan kata kunci "${searchQuery}".`
              : 'Semua tugas pada kategori ini telah selesai atau belum ada penugasan baru.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredTickets.map((t) => {
            const dl = formatDeadline(t.deadline);
            const statusInfo = getStatusBadge(t.status);
            const isDireksi = t.pembuat?.role === 'DIREKTUR';
            const isKadiv = t.pembuat?.role === 'KADIV';

            return (
              <div
                key={t.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Kolom Kiri: Informasi Inti Tugas */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      #T-{String(t.id).padStart(3, '0')}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg}`}
                    >
                      {statusInfo.label}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.prioritas === 'HIGH'
                          ? 'bg-rose-100 text-rose-700'
                          : t.prioritas === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      Prioritas: {t.prioritas}
                    </span>

                    {isDireksi && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                        Arahan Direksi
                      </span>
                    )}

                    {isKadiv && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Arahan Divisi
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {t.judul}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {t.deskripsi}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <strong>Lokasi:</strong> {t.lokasi || 'Dalam Lingkungan RSIA'}
                    </span>
                    <span className="flex items-center gap-1">
                      <strong>Divisi:</strong> {t.divisi?.nama || 'Lintas Divisi'}
                    </span>
                    <span className="flex items-center gap-1">
                      <strong>Dibuat oleh:</strong> {t.pembuat?.nama || 'Pegawai'} ({t.pembuat?.role || '-'})
                    </span>
                  </div>
                </div>

                {/* Kolom Kanan: Pelaksana, Deadline, & Tombol Aksi */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 md:min-w-[240px]">
                  {/* Status Pelaksana */}
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-slate-500">
                      {isDireksi && t.pelaksana?.role === 'KADIV' ? 'Penerima Arahan:' : 'Pelaksana Tugas:'}
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      {t.pelaksana?.nama || (
                        <span className="text-amber-600 italic">Belum Ditunjuk</span>
                      )}
                    </p>
                  </div>

                  {/* Batas Waktu / Deadline */}
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-slate-500">Tenggat Waktu:</p>
                    <p
                      className={`text-xs font-semibold ${
                        dl.isOverdue
                          ? 'text-rose-600 font-bold'
                          : dl.isNear
                          ? 'text-amber-600 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dl.text}
                      {dl.isOverdue && ' (Lewat Deadline)'}
                      {dl.isNear && ' (Mendekati Deadline)'}
                    </p>
                  </div>

                  {/* Tombol Menuju Halaman Detail Tugas */}
                  <button
                    type="button"
                    onClick={() => navigate(`/detail-tugas/${t.id}`)}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Rincian & Tindakan</span>
                    
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DetailTugasList;
