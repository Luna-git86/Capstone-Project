// Frontend/src/pages/SemuaTugas.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Plus,
  Search,
  X,
  Building2,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';
import { getAuthUserId, getAuthRole, getAuthToken } from '../utils/authStorage';
import TaskSubNav from '../components/TaskSubNav';

interface Ticket {
  id: number;
  jenisTiket?: 'TUGAS' | 'LAPORAN';
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'SELESAI' | 'DITOLAK' | 'HOLD_ESKALASI';
  deadline: string | null;
  createdAt: string;
  laporanPenyelesaian?: string | null;
  fotoBukti?: string | null;
  catatanRevisi?: string | null;
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string };
  divisi?: { id: number; nama: string };
  parentTicket?: { id: number; jenisTiket?: string; pembuat?: { role: string } } | null;
}

interface Divisi {
  id: number;
  nama: string;
}

export default function SemuaTugas() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTugasSaya = location.pathname.includes('semua-tugas-staff');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State Utama
  const [searchQuery, setSearchQuery] = useState('');

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

  // Modal Preview Foto
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

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
      const ticketRes = await api.get('/tickets?jenis=TUGAS');
      const rawTickets: Ticket[] = Array.isArray(ticketRes.data)
        ? ticketRes.data
        : ticketRes.data?.data || [];

      let combinedTickets: Ticket[] = rawTickets.map((t) => ({
        ...t,
        jenisTiket: t.jenisTiket || 'TUGAS',
      }));

      // Khusus KADIV dan DIREKTUR: ambil juga tiket LAPORAN yang sedang dieskalasikan (HOLD_ESKALASI)
      if (userRole === 'KADIV' || userRole === 'DIREKTUR') {
        try {
          const laporanRes = await api.get('/tickets?jenis=LAPORAN');
          const rawLaporan: Ticket[] = Array.isArray(laporanRes.data)
            ? laporanRes.data
            : laporanRes.data?.data || [];

          const escalatedLaporan = rawLaporan
            .filter((l) => {
              if (l.status !== 'HOLD_ESKALASI') return false;
              const isToDirektur = (l.catatanRevisi || '').includes('[Eskalasi KADIV ke DIREKTUR]');
              if (userRole === 'DIREKTUR') return isToDirektur;
              return true;
            })
            .map((l) => ({ ...l, jenisTiket: 'LAPORAN' as const }));

          combinedTickets = [...escalatedLaporan, ...combinedTickets];
        } catch (errLap) {
          console.warn('Gagal memuat laporan eskalasi:', errLap);
        }
      }

      setTickets(combinedTickets);

      try {
        const divRes = await api.get('/auth/divisi');
        setDivisiList(divRes.data?.data || divRes.data || []);
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }
    } catch (error) {
      console.error('Gagal memuat data tugas:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [userRole]);

  const activeTickets = useMemo(() => {
    return tickets.filter(
      (t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'
    );
  }, [tickets]);

  const counts = useMemo(() => {
    return {
      active: activeTickets.length,
      total: tickets.length,
      completed: tickets.filter(
        (t) => t.status === 'SELESAI' || t.status === 'DITOLAK'
      ).length,
    };
  }, [tickets, activeTickets]);

  // Hitungan dinamis untuk opsi filter sidebar & kartu rangkuman
  const sidebarCounts = useMemo(() => {
    const now = new Date();
    const divisiMap: Record<number, number> = {};
    activeTickets.forEach((t) => {
      if (t.divisi?.id) {
        divisiMap[t.divisi.id] = (divisiMap[t.divisi.id] || 0) + 1;
      }
    });

    return {
      high: activeTickets.filter((t) => t.prioritas === 'HIGH').length,
      medium: activeTickets.filter((t) => t.prioritas === 'MEDIUM').length,
      low: activeTickets.filter((t) => t.prioritas === 'LOW').length,
      assignedToMe: activeTickets.filter((t) => Number(t.pelaksana?.id) === currentUserId).length,
      createdByMe: activeTickets.filter((t) => Number(t.pembuat?.id) === currentUserId).length,
      belumDikerjakan: activeTickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      sedangDikerjakan: activeTickets.filter((t) => t.status === 'DIPROSES' && !t.catatanRevisi).length,
      menungguEvaluasi: activeTickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      perluRevisi: activeTickets.filter((t) => t.status === 'DIPROSES' && Boolean(t.catatanRevisi)).length,
      adaKendala: activeTickets.filter((t) => t.status === 'HOLD_ESKALASI').length,
      overdue: activeTickets.filter((t) => Boolean(t.deadline && new Date(t.deadline) < now)).length,
      divisiMap,
    };
  }, [activeTickets, currentUserId]);

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

  const filteredActiveTickets = useMemo(() => {
    const now = new Date();
    return activeTickets.filter((t) => {
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

      // 3. Filter Sidebar: Status Tugas (Termasuk Revisi & Lewat Tenggat)
      if (selectedStatuses.length > 0) {
        const isOverdue = Boolean(t.deadline && new Date(t.deadline) < now);
        const isRevisi = t.status === 'DIPROSES' && Boolean(t.catatanRevisi);
        const isDiprosesNormal = t.status === 'DIPROSES' && !t.catatanRevisi;

        const matchOverdue = selectedStatuses.includes('OVERDUE') && isOverdue;
        const matchRevisi = selectedStatuses.includes('PERLU_REVISI') && isRevisi;
        const matchDiproses = selectedStatuses.includes('DIPROSES') && isDiprosesNormal;
        const matchOtherStatus =
          t.status !== 'DIPROSES' && selectedStatuses.includes(t.status);

        if (!matchOverdue && !matchRevisi && !matchDiproses && !matchOtherStatus) {
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
        const prefix = t.jenisTiket === 'LAPORAN' ? 'l' : 't';
        const matchId = `${prefix}-${String(t.id).padStart(3, '0')}`.includes(q);
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
    activeTickets,
    searchQuery,
    selectedPriorities,
    selectedDivisiIds,
    selectedOwnership,
    selectedStatuses,
    currentUserId,
    userRole,
  ]);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Tanpa Batas Waktu';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const getStatusBadge = (t: Ticket) => {
    if (t.jenisTiket === 'LAPORAN' && t.status === 'HOLD_ESKALASI') {
      const isToDirektur = (t.catatanRevisi || '').includes('[Eskalasi KADIV ke DIREKTUR]');
      return {
        label: isToDirektur ? 'Eskalasi ke Direktur' : 'Eskalasi Laporan',
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    }

    if (t.status === 'DIPROSES' && t.catatanRevisi) {
      return {
        label: 'Perlu Revisi',
        bg: 'bg-rose-100 text-rose-900 border-rose-300',
        dot: 'bg-rose-500',
      };
    }

    switch (t.status) {
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
          label: 'Menunggu Evaluasi',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          dot: 'bg-indigo-500',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Ada Kendala',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-500',
        };
      default:
        return {
          label: t.status,
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* 1. HEADER HALAMAN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-[#0f5c43] border border-emerald-200 uppercase tracking-wider">
              {userRole}
            </span>
            <span className="text-xs text-slate-400 font-medium">Manajemen Tugas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {isTugasSaya ? 'Daftar Tugas Saya' : 'Daftar Tugas Aktif Rumah Sakit'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola penugasan, batas waktu SLA, dan pelaporan hasil kerja staf secara terstruktur.
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

      {/* 2. DUA KOLOM: SIDEBAR KIRI (SUB-NAV + FILTER) & KONTEN KANAN */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* KOLOM KIRI: Navigasi Sub-Tab + Panel Filter */}
        <div className="w-full lg:w-64 shrink-0 space-y-4 [&>*]:w-full">
          <TaskSubNav
            currentTab="AKTIF"
            activeCount={counts.active}
            totalCount={counts.total}
            completedCount={counts.completed}
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
                    { key: 'MENUNGGU_TRIASE', label: 'Belum Dikerjakan', count: sidebarCounts.belumDikerjakan },
                    { key: 'DIPROSES', label: 'Sedang Dikerjakan', count: sidebarCounts.sedangDikerjakan },
                    { key: 'MENUNGGU_VALIDASI', label: 'Menunggu Evaluasi', count: sidebarCounts.menungguEvaluasi },
                    { key: 'PERLU_REVISI', label: 'Perlu Revisi', count: sidebarCounts.perluRevisi },
                    { key: 'HOLD_ESKALASI', label: 'Ada Kendala / Eskalasi', count: sidebarCounts.adaKendala },
                    { key: 'OVERDUE', label: 'Tugas Terlambat', count: sidebarCounts.overdue },
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

        {/* KONTEN KANAN: Kartu Rangkuman + Pencarian + Kartu Tugas */}
        <div className="flex-1 w-full space-y-4">
          {/* 3 KARTU RANGKUMAN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Kartu 1: Menunggu Evaluasi */}
            <button
              type="button"
              onClick={() =>
                toggleStringFilter('MENUNGGU_VALIDASI', selectedStatuses, setSelectedStatuses)
              }
              className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                selectedStatuses.includes('MENUNGGU_VALIDASI')
                  ? 'border-amber-400 ring-2 ring-amber-200'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-500">Menunggu Evaluasi</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                {sidebarCounts.menungguEvaluasi}
              </p>
            </button>

            {/* Kartu 2: Perlu Revisi */}
            <button
              type="button"
              onClick={() =>
                toggleStringFilter('PERLU_REVISI', selectedStatuses, setSelectedStatuses)
              }
              className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                selectedStatuses.includes('PERLU_REVISI')
                  ? 'border-rose-400 ring-2 ring-rose-200'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-500">Perlu Revisi</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                {sidebarCounts.perluRevisi}
              </p>
            </button>

            {/* Kartu 3: Tugas Terlambat */}
            <button
              type="button"
              onClick={() =>
                toggleStringFilter('OVERDUE', selectedStatuses, setSelectedStatuses)
              }
              className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                selectedStatuses.includes('OVERDUE')
                  ? 'border-rose-500 ring-2 ring-rose-200'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-500">Tugas Terlambat</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                {sidebarCounts.overdue}
              </p>
            </button>
          </div>
          
          {/* BAR PENCARIAN */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ketik judul tugas, nomor tiket #T-..., lokasi, atau nama staf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 sm:h-12 pl-11 pr-9 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5c43] focus:bg-white transition"
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
          </div>

          {/* LIST KARTU TUGAS */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/90 shadow-xs text-slate-400 text-xs font-bold space-y-2">
              <div className="w-8 h-8 border-3 border-[#0f5c43] border-t-transparent rounded-full animate-spin mx-auto" />
              <span>Memuat daftar tugas...</span>
            </div>
          ) : filteredActiveTickets.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-[#0f5c43] flex items-center justify-center font-bold text-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Tugas Pada Kategori Ini</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || totalSidebarFilters > 0
                  ? 'Tidak ada tugas yang cocok dengan kombinasi pencarian dan filter yang dipilih.'
                  : 'Seluruh tugas pada status ini telah ditangani dengan baik.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredActiveTickets.map((t) => {
                const badge = getStatusBadge(t);
                const isLaporanEskalasi = t.jenisTiket === 'LAPORAN';
                const dlDate = t.deadline ? new Date(t.deadline) : null;
                const isOverdue = dlDate ? new Date() > dlDate : false;
                const isArahanDivisi =
                  !isLaporanEskalasi &&
                  (['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '') ||
                    ['KADIV', 'DIREKTUR'].includes(t.parentTicket?.pembuat?.role || ''));

                const priorityBorder = isLaporanEskalasi
                  ? 'border-l-amber-500'
                  : isOverdue
                  ? 'border-l-rose-600'
                  : t.prioritas === 'HIGH'
                  ? 'border-l-rose-500'
                  : t.prioritas === 'MEDIUM'
                  ? 'border-l-amber-500'
                  : 'border-l-blue-500';

                return (
                  <div
                    key={`${t.jenisTiket || 'TUGAS'}-${t.id}`}
                    className={`rounded-2xl md:rounded-3xl border border-l-4 ${priorityBorder} shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5 ${
                      isOverdue && !isLaporanEskalasi
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    {/* Baris 1: ID Tiket, Badge Status, Prioritas, dan Deadline */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                          #{isLaporanEskalasi ? 'L' : 'T'}-{String(t.id).padStart(3, '0')}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>

                        {isLaporanEskalasi && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                            Laporan Masalah
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            t.prioritas === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : t.prioritas === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.prioritas}
                        </span>

                        {isArahanDivisi && (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                            Arahan Divisi
                          </span>
                        )}
                        
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`} />
                        <span className={`text-xs ${isOverdue ? 'font-bold text-rose-600' : 'font-medium text-slate-500'}`}>
                          {formatDateTime(t.deadline)}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            Lewat Tenggat
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Baris 2: Judul & Deskripsi */}
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                        {t.judul}
                      </h3>
                      {t.deskripsi && (
                        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {t.deskripsi}
                        </p>
                      )}
                    </div>

                    {/* Baris 3: Rincian Lokasi, Divisi & Pelaksana/Pelapor */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-500 pt-0.5">
                      {t.divisi?.nama && (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-semibold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.divisi.nama}</span>
                        </span>
                      )}

                      {t.lokasi && (
                        <span className="inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.lokasi}</span>
                        </span>
                      )}

                      {isLaporanEskalasi ? (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pelapor:</span>
                          <strong className="text-slate-800">
                            {t.pembuat?.nama || '-'} ({t.pembuat?.role || '-'})
                          </strong>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pelaksana:</span>
                          <strong className="text-slate-800">
                            {t.pelaksana?.nama || 'Belum Ditunjuk'}
                          </strong>
                        </span>
                      )}
                    </div>

                    {/* Catatan Kendala / Eskalasi / Revisi Jika Ada */}
                    {t.catatanRevisi && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                          isLaporanEskalasi
                            ? 'bg-amber-50/60 border-amber-200/80 text-slate-700'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isLaporanEskalasi ? 'text-amber-600' : 'text-rose-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <strong
                            className={`block font-bold mb-0.5 ${
                              isLaporanEskalasi ? 'text-amber-900' : 'text-rose-900'
                            }`}
                          >
                            {isLaporanEskalasi
                              ? 'Catatan Eskalasi Laporan:'
                              : 'Catatan Kendala / Perbaikan:'}
                          </strong>
                          <span className="line-clamp-2 whitespace-pre-line">
                            {t.catatanRevisi}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Lampiran Foto Hasil Staf (Jika Menunggu Validasi) */}
                    {t.fotoBukti && t.status === 'MENUNGGU_VALIDASI' && (
                      <div className="flex items-center gap-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                        <img
                          src={t.fotoBukti}
                          alt="Bukti Selesai"
                          onClick={() => setPreviewPhoto(t.fotoBukti || null)}
                          className="w-14 h-14 object-cover rounded-xl cursor-pointer border border-indigo-300 hover:scale-105 transition-transform"
                        />
                        <div className="text-xs text-indigo-950 min-w-0">
                          <p className="font-bold truncate">Hasil Kerja Staf: {t.laporanPenyelesaian || 'Tugas telah selesai.'}</p>
                          <p className="text-[11px] text-indigo-600 mt-0.5">Klik foto untuk melihat ukuran penuh</p>
                        </div>
                      </div>
                    )}

                    {/* Baris 4: ACTION BAR */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            isLaporanEskalasi
                              ? `/detail-laporan/${t.id}`
                              : `/detail-tugas/${t.id}`
                          )
                        }
                        className={`w-full sm:w-auto h-10 px-4 active:scale-95 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 ${
                          isLaporanEskalasi
                            ? 'bg-[#0f5c43] hover:bg-[#0b4633] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{isLaporanEskalasi ? 'Tindak Lanjuti Laporan' : 'Lihat Detail'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL PREVIEW FOTO BESAR */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 p-2 rounded-2xl overflow-hidden">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhoto} alt="Bukti Foto" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}