// Frontend/src/pages/SemuaTugasLengkap.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Layers,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import api from '../services/api';
import { getAuthUserId, getAuthRole, getAuthToken } from '../utils/authStorage';
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
  parentTicket?: { id: number; jenisTiket?: string; pembuat?: { role: string } } | null;
}

interface Divisi {
  id: number;
  nama: string;
}

const SemuaTugasLengkap: React.FC = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter State (Checkbox)
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedDivisiIds, setSelectedDivisiIds] = useState<number[]>([]);
  const [selectedOwnership, setSelectedOwnership] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(true);

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

  const userRole = getAuthRole() || 'STAF';
  const currentUserId = getUserId();
  const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole);

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await api.get('/tickets?jenis=TUGAS');
      const data: Ticket[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setTickets(data);

      try {
        const divRes = await api.get('/auth/divisi');
        setDivisiList(divRes.data?.data || divRes.data || []);
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }
    } catch (err) {
      console.error('Gagal mengambil semua tugas', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const intervalId = setInterval(() => {
      fetchData(true);
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

  // Hitungan dinamis untuk opsi filter (berdasarkan seluruh inventaris tickets)
  const filterCounts = useMemo(() => {
    const now = new Date();
    const divisiMap: Record<number, number> = {};
    tickets.forEach((t) => {
      if (t.divisi?.id) {
        divisiMap[t.divisi.id] = (divisiMap[t.divisi.id] || 0) + 1;
      }
    });

    return {
      high: tickets.filter((t) => t.prioritas === 'HIGH').length,
      medium: tickets.filter((t) => t.prioritas === 'MEDIUM').length,
      low: tickets.filter((t) => t.prioritas === 'LOW').length,
      assignedToMe: tickets.filter((t) => Number(t.pelaksana?.id) === currentUserId).length,
      createdByMe: tickets.filter((t) => Number(t.pembuat?.id) === currentUserId).length,
      belumDikerjakan: tickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      sedangDikerjakan: tickets.filter((t) => t.status === 'DIPROSES').length,
      menungguValidasi: tickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      adaKendala: tickets.filter((t) => t.status === 'HOLD_ESKALASI').length,
      selesai: tickets.filter((t) => t.status === 'SELESAI').length,
      ditolak: tickets.filter((t) => t.status === 'DITOLAK').length,
      overdue: tickets.filter(
        (t) =>
          t.status !== 'SELESAI' &&
          t.status !== 'DITOLAK' &&
          Boolean(t.deadline && new Date(t.deadline) < now)
      ).length,
      divisiMap,
    };
  }, [tickets, currentUserId]);

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

  const totalActiveFilters =
    selectedPriorities.length +
    selectedDivisiIds.length +
    selectedOwnership.length +
    selectedStatuses.length;

  const resetAllFilters = () => {
    setSelectedPriorities([]);
    setSelectedDivisiIds([]);
    setSelectedOwnership([]);
    setSelectedStatuses([]);
  };

  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter((t) => {
      // 1. Filter Prioritas
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(t.prioritas)) {
        return false;
      }

      // 2. Filter Keterlibatan Saya (Hanya non-STAF)
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

      // 3. Filter Status Tugas (Termasuk Lewat Tenggat)
      if (selectedStatuses.length > 0) {
        const isOverdue =
          t.status !== 'SELESAI' &&
          t.status !== 'DITOLAK' &&
          Boolean(t.deadline && new Date(t.deadline) < now);
        const matchOverdue = selectedStatuses.includes('OVERDUE') && isOverdue;
        const matchStatus = selectedStatuses.includes(t.status);

        if (!matchOverdue && !matchStatus) {
          return false;
        }
      }

      // 4. Filter Divisi / Unit (Hanya DIREKTUR)
      if (userRole === 'DIREKTUR' && selectedDivisiIds.length > 0) {
        if (!t.divisi?.id || !selectedDivisiIds.includes(t.divisi.id)) {
          return false;
        }
      }

      // 5. Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `t-${String(t.id).padStart(3, '0')}`.includes(q) || String(t.id).includes(q);
        const matchLoc = (t.lokasi || '').toLowerCase().includes(q);
        const matchPelaksana = (t.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchDivisi = (t.divisi?.nama || '').toLowerCase().includes(q);

        if (!matchTitle && !matchId && !matchLoc && !matchPelaksana && !matchDivisi) {
          return false;
        }
      }

      return true;
    });
  }, [
    tickets,
    searchQuery,
    selectedPriorities,
    selectedDivisiIds,
    selectedOwnership,
    selectedStatuses,
    currentUserId,
    userRole,
  ]);

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: 'Perlu Petugas',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'DIPROSES':
        return {
          label: 'Sedang Dikerjakan',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-500',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'Menunggu Validasi',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          dot: 'bg-indigo-500',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Ada Kendala',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'SELESAI':
        return {
          label: 'Selesai',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'DITOLAK':
        return {
          label: 'Ditolak',
          bg: 'bg-slate-200 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-800 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Tanpa Batas Waktu';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // Hitung jumlah kolom grid filter agar proporsional berdasarkan role
  const filterGridColsClass =
    userRole === 'DIREKTUR'
      ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
      : userRole !== 'STAF'
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* 1. HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-[#0f5c43] border border-emerald-200 uppercase tracking-wider">
              {userRole}
            </span>
            <span className="text-xs text-slate-400 font-medium">Inventaris Lengkap</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Semua Inventaris Tugas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar komprehensif seluruh tugas operasional dari yang sedang berlangsung hingga yang sudah tuntas.
          </p>
        </div>

        {isAtasan && (
          <button
            type="button"
            onClick={() => navigate('/tambah-tugas')}
            className="h-11 px-5 bg-gradient-to-r from-[#0f5c43] to-teal-700 hover:opacity-95 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tugas Baru</span>
          </button>
        )}
      </div>

      {/* 2. BARIS ATAS: SUB-NAV DI KIRI & PENCARIAN + PANEL FILTER DI KANAN */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* KOLOM KIRI: Hanya TaskSubNav */}
        <div className="w-full lg:w-64 shrink-0 [&>*]:w-full">
          <TaskSubNav
            currentTab="SEMUA"
            activeCount={counts.active}
            totalCount={counts.total}
            completedCount={counts.completed}
          />
        </div>

        {/* KOLOM KANAN: Kolom Pencarian + Panel Filter Multi-Kolom di bawahnya */}
        <div className="flex-1 w-full min-w-0 space-y-4">
          {/* BAR PENCARIAN */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ketik judul tugas, nomor tiket #T-..., lokasi, pelaksana, atau divisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-11 pr-9 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-500 px-1 shrink-0">
              Menampilkan <span className="font-extrabold text-slate-800">{filteredTickets.length}</span> dari{' '}
              <span className="font-extrabold text-slate-800">{tickets.length}</span> tugas
            </div>
          </div>

          {/* PANEL FILTER HORIZONTAL (DI BAWAH KOLOM PENCARIAN) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex items-center gap-2 text-slate-800 group"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#0f5c43]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Filter Tugas</span>
                {totalActiveFilters > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-[#0f5c43]">
                    {totalActiveFilters} aktif
                  </span>
                )}
                {isFilterOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                )}
              </button>

              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Reset ({totalActiveFilters})
                </button>
              )}
            </div>

            {isFilterOpen && (
              <div
                className={`mt-4 pt-4 border-t border-slate-100 grid ${filterGridColsClass} gap-5`}
              >
                {/* Grup 1: Tingkat Prioritas */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                    Tingkat Prioritas
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: 'HIGH', label: 'Tinggi (High)', count: filterCounts.high },
                      { key: 'MEDIUM', label: 'Sedang (Medium)', count: filterCounts.medium },
                      { key: 'LOW', label: 'Rendah (Low)', count: filterCounts.low },
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
                </div>

                {/* Grup 2: Keterlibatan Saya (Semua role kecuali STAF) */}
                {userRole !== 'STAF' && (
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                      Keterlibatan Saya
                    </h4>
                    <div className="space-y-2">
                      {[
                        { key: 'ASSIGNED_TO_ME', label: 'Ditugaskan ke Saya', count: filterCounts.assignedToMe },
                        { key: 'CREATED_BY_ME', label: 'Dibuat oleh Saya', count: filterCounts.createdByMe },
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
                  </div>
                )}

                {/* Grup 3: Status Tugas */}
                <div>
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                    Status Tugas
                  </h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {[
                      { key: 'MENUNGGU_TRIASE', label: 'Belum Dikerjakan', count: filterCounts.belumDikerjakan },
                      { key: 'DIPROSES', label: 'Sedang Dikerjakan', count: filterCounts.sedangDikerjakan },
                      { key: 'MENUNGGU_VALIDASI', label: 'Menunggu Validasi', count: filterCounts.menungguValidasi },
                      { key: 'HOLD_ESKALASI', label: 'Ada Kendala', count: filterCounts.adaKendala },
                      { key: 'OVERDUE', label: 'Lewat Tenggat', count: filterCounts.overdue },
                      { key: 'SELESAI', label: 'Selesai', count: filterCounts.selesai },
                      { key: 'DITOLAK', label: 'Ditolak', count: filterCounts.ditolak },
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
                </div>

                {/* Grup 4: Divisi / Unit (Hanya DIREKTUR) */}
                {userRole === 'DIREKTUR' && divisiList.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                      Divisi / Unit
                    </h4>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
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
                              ({filterCounts.divisiMap[div.id] || 0})
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BAGIAN BAWAH (FULL-WIDTH): TABEL INVENTARIS TUGAS */}
      <div className="w-full">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/90 shadow-xs text-slate-400 text-xs font-bold space-y-2">
            <div className="w-8 h-8 border-3 border-[#0f5c43] border-t-transparent rounded-full animate-spin mx-auto" />
            <span>Memuat seluruh daftar tugas...</span>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white p-10 text-center rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#0f5c43] flex items-center justify-center font-bold text-lg">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak Ada Tugas</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || totalActiveFilters > 0
                ? 'Tidak ada tugas yang cocok dengan kombinasi pencarian dan filter yang dipilih.'
                : 'Tidak ada data penugasan pada inventaris ini.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 pl-5 pr-3 whitespace-nowrap">Tiket</th>
                    <th className="py-3.5 px-3 min-w-[260px]">Tugas & Lokasi</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Status & Prioritas</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Divisi & Pelaksana</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Tenggat Waktu</th>
                    <th className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTickets.map((t) => {
                    const badge = getStatusBadge(t.status);
                    const dlDate = t.deadline ? new Date(t.deadline) : null;
                    const isOverdue =
                      t.status !== 'SELESAI' &&
                      t.status !== 'DITOLAK' &&
                      dlDate
                        ? new Date() > dlDate
                        : false;

                    const isArahanDivisi =
                      ['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '') ||
                      ['KADIV', 'DIREKTUR'].includes(t.parentTicket?.pembuat?.role || '');

                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/detail-tugas/${t.id}`)}
                        className={`group cursor-pointer transition-colors ${
                          isOverdue
                            ? 'bg-rose-50/60 hover:bg-rose-100/60'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {/* Kolom 1: ID Tiket */}
                        <td
                          className={`py-3.5 pl-5 pr-3 align-top whitespace-nowrap border-l-4 ${
                            isOverdue
                              ? 'border-l-rose-600'
                              : t.prioritas === 'HIGH'
                              ? 'border-l-rose-500'
                              : t.prioritas === 'MEDIUM'
                              ? 'border-l-amber-500'
                              : 'border-l-blue-500'
                          }`}
                        >
                          <span className="font-mono font-extrabold text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            #T-{String(t.id).padStart(3, '0')}
                          </span>
                        </td>

                        {/* Kolom 2: Judul, Arahan Divisi, Lokasi & Kendala */}
                        <td className="py-3.5 px-3 align-top">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900 group-hover:text-[#0f5c43] transition-colors">
                                {t.judul}
                              </span>
                              {isArahanDivisi && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider shrink-0">
                                  Arahan Divisi
                                </span>
                              )}
                            </div>

                            {t.lokasi && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{t.lokasi}</span>
                              </div>
                            )}

                            {t.catatanRevisi && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>{t.catatanRevisi}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Kolom 3: Status & Prioritas */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                t.prioritas === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : t.prioritas === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {t.prioritas}
                            </span>
                          </div>
                        </td>

                        {/* Kolom 4: Divisi & Pelaksana */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{t.divisi?.nama || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{t.pelaksana?.nama || 'Belum Ditunjuk'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Kolom 5: Tenggat Waktu */}
                        <td className="py-3.5 px-3 align-top whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Clock
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isOverdue ? 'text-rose-600' : 'text-slate-400'
                                }`}
                              />
                              <span
                                className={
                                  isOverdue
                                    ? 'font-bold text-rose-600'
                                    : 'font-medium text-slate-600'
                                }
                              >
                                {formatDateTime(t.deadline)}
                              </span>
                            </div>
                            {isOverdue && (
                              <span className="inline-block text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                                Lewat Tenggat
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Kolom 6: Aksi */}
                        <td className="py-3.5 pl-3 pr-5 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/detail-tugas/${t.id}`);
                            }}
                            className="h-8 px-3 bg-slate-100 hover:bg-[#0f5c43] text-slate-700 hover:text-white font-bold text-[11px] rounded-xl transition inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemuaTugasLengkap;
