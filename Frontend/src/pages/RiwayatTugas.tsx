// Frontend/src/pages/RiwayatTugas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Camera,
  X,
  SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';
import {
  getAuthRole,
  getAuthUserName,
  getAuthDivisiNama,
  getAuthUserId,
  getAuthToken
} from '../utils/authStorage';
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
  parentTicket?: { id: number; jenisTiket?: string; pembuat?: { role: string } } | null;
}

interface Divisi {
  id: number;
  nama: string;
}

export default function RiwayatTugas() {
  const navigate = useNavigate();
  const userName = getAuthUserName('Pegawai RSIA');
  const userRole = getAuthRole() || 'STAF';
  const userDivisi = getAuthDivisiNama();

  const getUserId = (): number => {
    const stored = getAuthUserId();
    if (stored) return Number(stored);
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload?.id) {
          const id = Number(payload.id);
          localStorage.setItem('userId', String(id));
          return id;
        }
      } catch {}
    }
    return 0;
  };

  const currentUserId = getUserId();

  // State menyimpan SELURUH tiket agar TaskSubNav bisa menghitung angka yang akurat
  const [allTickets, setAllTickets] = useState<TicketItem[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // State untuk accordion, filter & preview foto
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'Semua Waktu' | 'Minggu Ini' | 'Bulan Ini'>('Semua Waktu');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filter State Sidebar (Checkbox Akordion)
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDivisiIds, setSelectedDivisiIds] = useState<number[]>([]);
  const [selectedOwnership, setSelectedOwnership] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const [openSections, setOpenSections] = useState({
    prioritas: true,
    kepemilikan: true,
    status: true,
    divisi: true,
  });

  const fetchTickets = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }
    try {
      const response = await api.get('/tickets?jenis=TUGAS');
      const data: TicketItem[] = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAllTickets(data);

      try {
        const divRes = await api.get('/auth/divisi');
        setDivisiList(divRes.data?.data || divRes.data || []);
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }
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
  const activeCount = useMemo(
    () => allTickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK').length,
    [allTickets]
  );
  const completedCount = useMemo(
    () => allTickets.filter((t) => t.status === 'SELESAI').length,
    [allTickets]
  );
  const totalCount = allTickets.length;

  // FILTER TIKET KHUSUS UNTUK DITAMPILKAN DI HALAMAN RIWAYAT
  const historyTickets = useMemo(() => {
    return allTickets.filter((t) => getMappedStatus(t) !== null);
  }, [allTickets]);

  const countDisetujui = useMemo(
    () => historyTickets.filter((t) => getMappedStatus(t) === 'Disetujui').length,
    [historyTickets]
  );
  const countEvaluasi = useMemo(
    () => historyTickets.filter((t) => getMappedStatus(t) === 'Sedang Dievaluasi').length,
    [historyTickets]
  );
  const countRevisi = useMemo(
    () => historyTickets.filter((t) => getMappedStatus(t) === 'Revisi').length,
    [historyTickets]
  );

  // Hitungan dinamis untuk opsi filter sidebar
  const sidebarCounts = useMemo(() => {
    const now = new Date();
    const divisiMap: Record<number, number> = {};
    historyTickets.forEach((t) => {
      if (t.divisi?.id) {
        divisiMap[t.divisi.id] = (divisiMap[t.divisi.id] || 0) + 1;
      }
    });

    return {
      high: historyTickets.filter((t) => t.prioritas === 'HIGH').length,
      medium: historyTickets.filter((t) => t.prioritas === 'MEDIUM').length,
      low: historyTickets.filter((t) => t.prioritas === 'LOW').length,
      assignedToMe: historyTickets.filter((t) => Number(t.pelaksana?.id) === currentUserId).length,
      createdByMe: historyTickets.filter((t) => Number(t.pembuat?.id) === currentUserId).length,
      disetujui: countDisetujui,
      evaluasi: countEvaluasi,
      revisi: countRevisi,
      overdue: historyTickets.filter(
        (t) =>
          t.status !== 'SELESAI' &&
          Boolean(t.deadline && new Date(t.deadline) < now)
      ).length,
      divisiMap,
    };
  }, [historyTickets, currentUserId, countDisetujui, countEvaluasi, countRevisi]);

  const toggleStringFilter = (
    value: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const toggleDivisiFilter = (divisiId: number) => {
    setSelectedDivisiIds((prev) =>
      prev.includes(divisiId) ? prev.filter((id) => id !== divisiId) : [...prev, divisiId]
    );
  };

  const totalSidebarFilters =
    selectedPriorities.length +
    selectedDivisiIds.length +
    selectedOwnership.length +
    selectedStatuses.length;

  const resetSidebarFilters = () => {
    setSelectedPriorities([]);
    setSelectedDivisiIds([]);
    setSelectedOwnership([]);
    setSelectedStatuses([]);
  };

  const toggleQuickMetricFilter = (statusKey: 'Disetujui' | 'Sedang Dievaluasi' | 'Revisi') => {
    if (selectedStatuses.length === 1 && selectedStatuses[0] === statusKey) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses([statusKey]);
    }
  };

  const filteredTasks = useMemo(() => {
    const now = new Date();
    return historyTickets.filter((t) => {
      const mappedStatus = getMappedStatus(t);

      // 1. Filter Sidebar: Prioritas
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(t.prioritas)) {
        return false;
      }

      // 2. Filter Sidebar: Keterlibatan Saya (Hanya non-STAF)
      if (userRole !== 'STAF' && selectedOwnership.length > 0) {
        const isAssigned =
          selectedOwnership.includes('ASSIGNED_TO_ME') &&
          Number(t.pelaksana?.id) === currentUserId;
        const isCreated =
          selectedOwnership.includes('CREATED_BY_ME') &&
          Number(t.pembuat?.id) === currentUserId;

        if (!isAssigned && !isCreated) {
          return false;
        }
      }

      // 3. Filter Sidebar: Status Tugas (Disetujui, Sedang Dievaluasi, Revisi, Lewat Tenggat)
      if (selectedStatuses.length > 0) {
        const isOverdue =
          t.status !== 'SELESAI' &&
          Boolean(t.deadline && new Date(t.deadline) < now);
        const matchOverdue = selectedStatuses.includes('OVERDUE') && isOverdue;
        const matchStatus = mappedStatus ? selectedStatuses.includes(mappedStatus) : false;

        if (!matchOverdue && !matchStatus) {
          return false;
        }
      }

      // 4. Filter Sidebar: Divisi / Unit (Hanya DIREKTUR)
      if (userRole === 'DIREKTUR' && selectedDivisiIds.length > 0) {
        if (!t.divisi?.id || !selectedDivisiIds.includes(t.divisi.id)) {
          return false;
        }
      }

      // 5. Filter Pencarian Teks
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

      // 6. Filter Waktu
      if (timeFilter !== 'Semua Waktu') {
        const targetDate = new Date(t.completedAt || t.updatedAt || t.createdAt);
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
  }, [
    historyTickets,
    selectedPriorities,
    selectedOwnership,
    selectedStatuses,
    selectedDivisiIds,
    searchQuery,
    timeFilter,
    currentUserId,
    userRole,
  ]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-12">
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
                {userDivisi || "RSIA Qurrata A'yun"}
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

      {/* Main Container: Sidebar Kiri (Sub-Nav + Filter) & Konten Kanan */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* KOLOM KIRI */}
        <div className="w-full lg:w-64 shrink-0 space-y-4 [&>*]:w-full">
          <TaskSubNav
            currentTab="RIWAYAT"
            activeCount={activeCount}
            totalCount={totalCount}
            completedCount={completedCount}
          />

          {/* PANEL FILTER SIDEBAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <SlidersHorizontal className="w-4 h-4 text-[#0f5c43]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Filter Tugas</span>
              </div>
              {totalSidebarFilters > 0 && (
                <button
                  type="button"
                  onClick={resetSidebarFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset ({totalSidebarFilters})
                </button>
              )}
            </div>

            {/* Grup 1: Tingkat Prioritas */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => setOpenSections((p) => ({ ...p, prioritas: !p.prioritas }))}
                className="w-full flex items-center justify-between text-left text-[11px] font-extrabold text-slate-700 uppercase tracking-wider"
              >
                <span>Tingkat Prioritas</span>
                {openSections.prioritas ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSections.prioritas && (
                <div className="mt-3 space-y-2.5">
                  {[
                    { key: 'HIGH', label: 'Tinggi (High)', count: sidebarCounts.high },
                    { key: 'MEDIUM', label: 'Sedang (Medium)', count: sidebarCounts.medium },
                    { key: 'LOW', label: 'Rendah (Low)', count: sidebarCounts.low },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 cursor-pointer group select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPriorities.includes(item.key)}
                        onChange={() =>
                          toggleStringFilter(item.key, selectedPriorities, setSelectedPriorities)
                        }
                        className="w-4 h-4 rounded border-slate-300 text-[#0f5c43] focus:ring-[#0f5c43] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                        {item.label}{' '}
                        <span className="text-slate-400 font-normal">({item.count})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Grup 2: Keterlibatan Saya (Semua role kecuali STAF) */}
            {userRole !== 'STAF' && (
              <div className="py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, kepemilikan: !p.kepemilikan }))}
                  className="w-full flex items-center justify-between text-left text-[11px] font-extrabold text-slate-700 uppercase tracking-wider"
                >
                  <span>Keterlibatan Saya</span>
                  {openSections.kepemilikan ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections.kepemilikan && (
                  <div className="mt-3 space-y-2.5">
                    {[
                      { key: 'ASSIGNED_TO_ME', label: 'Ditugaskan ke Saya', count: sidebarCounts.assignedToMe },
                      { key: 'CREATED_BY_ME', label: 'Dibuat oleh Saya', count: sidebarCounts.createdByMe },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2.5 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOwnership.includes(item.key)}
                          onChange={() =>
                            toggleStringFilter(item.key, selectedOwnership, setSelectedOwnership)
                          }
                          className="w-4 h-4 rounded border-slate-300 text-[#0f5c43] focus:ring-[#0f5c43] cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                          {item.label}{' '}
                          <span className="text-slate-400 font-normal">({item.count})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grup 3: Status Tugas */}
            <div className="py-3.5">
              <button
                type="button"
                onClick={() => setOpenSections((p) => ({ ...p, status: !p.status }))}
                className="w-full flex items-center justify-between text-left text-[11px] font-extrabold text-slate-700 uppercase tracking-wider"
              >
                <span>Status Tugas</span>
                {openSections.status ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSections.status && (
                <div className="mt-3 space-y-2.5">
                  {[
                    { key: 'Disetujui', label: 'Disetujui Selesai', count: sidebarCounts.disetujui },
                    { key: 'Sedang Dievaluasi', label: 'Sedang Dievaluasi', count: sidebarCounts.evaluasi },
                    { key: 'Revisi', label: 'Perlu Revisi', count: sidebarCounts.revisi },
                    { key: 'OVERDUE', label: 'Lewat Tenggat', count: sidebarCounts.overdue },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 cursor-pointer group select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(item.key)}
                        onChange={() =>
                          toggleStringFilter(item.key, selectedStatuses, setSelectedStatuses)
                        }
                        className="w-4 h-4 rounded border-slate-300 text-[#0f5c43] focus:ring-[#0f5c43] cursor-pointer"
                      />
                      <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">
                        {item.label}{' '}
                        <span className="text-slate-400 font-normal">({item.count})</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Grup 4: Divisi / Unit (Hanya DIREKTUR) */}
            {userRole === 'DIREKTUR' && divisiList.length > 0 && (
              <div className="pt-3.5">
                <button
                  type="button"
                  onClick={() => setOpenSections((p) => ({ ...p, divisi: !p.divisi }))}
                  className="w-full flex items-center justify-between text-left text-[11px] font-extrabold text-slate-700 uppercase tracking-wider"
                >
                  <span>Divisi / Unit</span>
                  {openSections.divisi ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections.divisi && (
                  <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {divisiList.map((div) => (
                      <label
                        key={div.id}
                        className="flex items-center gap-2.5 cursor-pointer group select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDivisiIds.includes(div.id)}
                          onChange={() => toggleDivisiFilter(div.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#0f5c43] focus:ring-[#0f5c43] cursor-pointer shrink-0"
                        />
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 leading-snug">
                          {div.nama}{' '}
                          <span className="text-slate-400 font-normal">
                            ({sidebarCounts.divisiMap[div.id] || 0})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN */}
        <div className="flex-1 w-full space-y-6">
          {/* Quick Metrics Cards (Sinkron dengan selectedStatuses) */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => toggleQuickMetricFilter('Disetujui')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedStatuses.includes('Disetujui')
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${selectedStatuses.includes('Disetujui') ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Disetujui
                </span>
                <CheckCircle2 className={`w-4 h-4 ${selectedStatuses.includes('Disetujui') ? 'text-emerald-100' : 'text-emerald-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countDisetujui}</div>
            </button>

            <button
              type="button"
              onClick={() => toggleQuickMetricFilter('Sedang Dievaluasi')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedStatuses.includes('Sedang Dievaluasi')
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${selectedStatuses.includes('Sedang Dievaluasi') ? 'text-amber-100' : 'text-slate-500'}`}>
                  Dievaluasi
                </span>
                <Clock className={`w-4 h-4 ${selectedStatuses.includes('Sedang Dievaluasi') ? 'text-amber-100' : 'text-amber-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countEvaluasi}</div>
            </button>

            <button
              type="button"
              onClick={() => toggleQuickMetricFilter('Revisi')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                selectedStatuses.includes('Revisi')
                  ? 'bg-rose-500 text-white border-rose-500 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${selectedStatuses.includes('Revisi') ? 'text-rose-100' : 'text-slate-500'}`}>
                  Perlu Revisi
                </span>
                <AlertCircle className={`w-4 h-4 ${selectedStatuses.includes('Revisi') ? 'text-rose-100' : 'text-rose-600'}`} />
              </div>
              <div className="text-2xl md:text-3xl font-extrabold">{countRevisi}</div>
            </button>
          </div>

          {/* Search & Time Filter Bar (Tanpa Pill Filter Bawah) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              {/* Search Bar */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul, ID tiket, divisi, staf..."
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
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
                  {searchQuery || totalSidebarFilters > 0
                    ? 'Tidak ada tugas yang cocok dengan kombinasi pencarian dan filter yang dipilih.'
                    : 'Belum ada tugas yang selesai atau sesuai dengan filter pencarian yang Anda pilih.'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const mappedStatus = getMappedStatus(task) || 'Disetujui';
                const isExpanded = expandedTaskId === task.id;
                const dlDate = task.deadline ? new Date(task.deadline) : null;
                const isOverdue =
                  task.status !== 'SELESAI' &&
                  task.status !== 'DITOLAK' &&
                  dlDate
                    ? new Date() > dlDate
                    : false;

                const isArahanDivisi =
                  ['KADIV', 'DIREKTUR'].includes(task.pembuat?.role || '') ||
                  ['KADIV', 'DIREKTUR'].includes(task.parentTicket?.pembuat?.role || '');

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
                    className={`rounded-2xl border shadow-sm transition-all overflow-hidden border-l-4 ${
                      isOverdue
                        ? 'bg-rose-50/70 border-rose-300 border-l-rose-600'
                        : `bg-white border-slate-200/80 ${badge.borderLeft}`
                    }`}
                  >
                    {/* Header Card Ringkas & Rapi */}
                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Status, ID, Prioritas & Arahan Divisi */}
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
                          {isArahanDivisi && (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                              Arahan Divisi
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                              Lewat Tenggat
                            </span>
                          )}
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
                          <span> Lihat Detail </span>
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
