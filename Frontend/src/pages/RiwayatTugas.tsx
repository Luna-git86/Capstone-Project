// Frontend/src/pages/RiwayatTugas.tsx
import React, { useState, useEffect, useMemo } from 'react';
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

  // State untuk accordion dan filter
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi'>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'Semua Waktu' | 'Minggu Ini' | 'Bulan Ini'>('Semua Waktu');

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await api.get('/tickets');
      const data: TicketItem[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
      // Simpan SEMUA data ke state tanpa memfilternya dulu
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
    }, 10000); // Update otomatis setiap 10 detik
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
    return null; // Bukan bagian dari riwayat
  };

  // HITUNG ANGKA UNTUK MENU SAMPING (Diambil dari allTickets, jadi angkanya akurat 100%)
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Informasi Pengguna */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-slate-800">{userName}</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
            {userRole}
          </span>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            {userDivisi || 'RSIA'}
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
          totalCount={totalCount}
          completedCount={completedCount}
        />
        
        <div className="flex-1 w-full space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center border-b border-slate-200 pb-5">
            {/* Tombol Filter Status */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('Semua')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  activeFilter === 'Semua'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua ({historyTickets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Disetujui')}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
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
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
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
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
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
            <div className="flex items-center gap-3 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-60">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tugas, ID..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
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
                <p className="animate-pulse">Memuat data riwayat tugas...</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Tidak ada riwayat tugas untuk filter ini.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const mappedStatus = getMappedStatus(task) || 'Disetujui';
                const isExpanded = expandedTaskId === task.id;

                const statusColors = {
                  'Disetujui': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                  'Sedang Dievaluasi': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
                  'Revisi': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
                };
                const colors = statusColors[mappedStatus];

                const supervisorName = task.penanggungJawab?.nama || task.pembuat?.nama || 'Supervisor';
                const supervisorRole = task.penanggungJawab?.role || task.pembuat?.role || 'Koordinator';

                return (
                  <div key={task.id} className="mb-4">
                    {/* Baris Utama Card */}
                    <div className="flex flex-col md:flex-row md:items-center bg-white rounded-xl shadow-sm border border-slate-200 p-4 gap-4 hover:border-slate-300 transition-colors">
                      
                      {/* ID Tugas & Badge Status */}
                      <div className="flex flex-row md:flex-col lg:flex-row items-center justify-between md:justify-start gap-4 shrink-0 lg:w-48">
                        <span className="text-lg font-bold text-slate-300 font-mono">#T-{String(task.id).padStart(3, '0')}</span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colors.border} ${colors.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${colors.text}`}>{mappedStatus}</span>
                        </div>
                      </div>

                      {/* Info Utama Tugas */}
                      <div className="flex-1 flex flex-col justify-center md:border-l md:border-slate-100 md:pl-4">
                        <h3 className="text-sm md:text-base font-bold text-slate-900 leading-tight">{task.judul}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {task.divisi?.nama && (
                            <span className="px-2 py-0.5 rounded text-slate-500 bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                              {task.divisi.nama}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            task.prioritas === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            task.prioritas === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            Prioritas: {task.prioritas}
                          </span>
                          <span className="px-2 py-0.5 rounded text-slate-500 bg-slate-100 border border-slate-200 text-[10px] font-semibold">
                            Pelaksana: {task.pelaksana?.nama || 'Belum Ditunjuk'}
                          </span>
                        </div>
                      </div>

                      {/* Kolom Kanan (Supervisor & Aksi) */}
                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 md:border-l md:border-slate-100 md:pl-4 mt-2 md:mt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{task.completedAt ? 'Selesai' : 'Pembaruan'}</p>
                          <p className="text-xs font-bold text-slate-800">{formatDateTime(task.completedAt || task.updatedAt)}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            {supervisorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="hidden lg:block text-left">
                            <p className="text-xs font-bold text-slate-900 leading-tight">{supervisorName}</p>
                            <p className="text-[10px] text-slate-500">{supervisorRole}</p>
                          </div>
                        </div>

                        <button onClick={() => toggleExpand(task.id)} className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all">
                          <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>
                    </div>

                    {/* Konten Accordion (Feedback & Foto) */}
                    {isExpanded && (
                      <div className="mx-2 border-x border-b border-slate-200 bg-slate-50 rounded-b-xl p-4 md:p-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Laporan Staf */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Laporan Penyelesaian Staf</h4>
                            <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                              {task.laporanPenyelesaian || 'Belum ada catatan penyelesaian dari staf.'}
                            </p>
                            {task.fotoBukti && (
                              <div className="mt-3">
                                <p className="text-[10px] font-bold text-slate-500 mb-1">LAMPIRAN FOTO:</p>
                                <img src={task.fotoBukti} alt="Bukti" className="w-full max-h-40 object-cover rounded-lg border border-slate-200 shadow-sm" />
                              </div>
                            )}
                          </div>

                          {/* Feedback Supervisor */}
                          <div className="flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Feedback & Evaluasi Supervisor</h4>
                              <p className={`text-sm p-3 rounded-lg border ${
                                mappedStatus === 'Revisi' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                mappedStatus === 'Sedang Dievaluasi' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {task.catatanRevisi || (mappedStatus === 'Disetujui' ? 'Pekerjaan telah diperiksa dan disetujui sesuai target penugasan.' : 'Menunggu hasil pemeriksaan dari atasan.')}
                              </p>
                            </div>
                            
                            <div className="flex justify-end mt-4">
                              <button onClick={() => navigate(`/detail-tugas/${task.id}`)} className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shadow-sm">
                                Lihat Detail Lengkap Tiket
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