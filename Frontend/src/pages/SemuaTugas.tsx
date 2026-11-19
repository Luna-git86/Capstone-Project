// Frontend/src/pages/SemuaTugas.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Plus,
  Search,
  Filter,
  Upload,
  X,
  Building2,
  UserCheck,
  AlertTriangle,
  Camera,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  SlidersHorizontal
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
  divisiId?: number | null;
  fotoInstruksi?: string | null;
}

interface Divisi {
  id: number;
  nama: string;
}

interface StaffUser {
  id: number;
  nama: string;
  role: string;
  divisiId?: number;
}

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
export default function SemuaTugas() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTugasSaya = location.pathname.includes('semua-tugas-staff');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State Utama
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'SEMUA_AKTIF' | 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI'
  >('SEMUA_AKTIF');

  const [selectedTriage, setSelectedTriage] = useState<Ticket | null>(null);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [evalTarget, setEvalTarget] = useState<Ticket | null>(null);
  const [evalNote, setEvalNote] = useState('');
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote] = useState('');

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

  // Kunci scroll halaman belakang dan tangani ESC agar modal dinamis & tidak ikut tergeser
  useEffect(() => {
    const isAnyModalOpen = Boolean(
      selectedTriage || reportTarget || evalTarget || escalateTarget || previewPhoto
    );
    if (isAnyModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyTouchAction = document.body.style.touchAction;
      const mainEl = document.querySelector('main');
      const originalMainOverflow = mainEl?.style.overflow || '';
      const originalMainTouchAction = mainEl?.style.touchAction || '';

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      if (mainEl) {
        mainEl.style.overflow = 'hidden';
        mainEl.style.touchAction = 'none';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.touchAction = originalBodyTouchAction;
        if (mainEl) {
          mainEl.style.overflow = originalMainOverflow;
          mainEl.style.touchAction = originalMainTouchAction;
        }
      };
    }
  }, [selectedTriage, reportTarget, evalTarget, escalateTarget, previewPhoto]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewPhoto) setPreviewPhoto(null);
        else if (reportTarget) setReportTarget(null);
        else if (selectedTriage) setSelectedTriage(null);
        else if (evalTarget) setEvalTarget(null);
        else if (escalateTarget) setEscalateTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPhoto, reportTarget, selectedTriage, evalTarget, escalateTarget]);

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
  const isAdmin = userRole === 'ADMIN';
  const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole);

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const ticketRes = await api.get('/tickets?jenis=TUGAS');
      const rawTickets: Ticket[] = Array.isArray(ticketRes.data)
        ? ticketRes.data
        : ticketRes.data?.data || [];

      setTickets(rawTickets);

      try {
        const divRes = await api.get('/auth/divisi');
        setDivisiList(divRes.data?.data || divRes.data || []);
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }

      try {
        const staffRes = await api.get('/tickets/staff');
        setStaffList(staffRes.data?.data || staffRes.data || []);
      } catch (e) {
        console.warn('Gagal memuat staf:', e);
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
  }, []);

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
        (t) =>
          t.status === 'SELESAI' ||
          t.status === 'MENUNGGU_VALIDASI' ||
          (t.status === 'DIPROSES' && Boolean(t.catatanRevisi))
      ).length,
      triase: activeTickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      diproses: activeTickets.filter((t) => t.status === 'DIPROSES').length,
      validasi: tickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      eskalasi: activeTickets.filter((t) => t.status === 'HOLD_ESKALASI').length,
    };
  }, [tickets, activeTickets]);

  // Hitungan dinamis untuk opsi filter sidebar
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
      sedangDikerjakan: activeTickets.filter((t) => t.status === 'DIPROSES').length,
      menungguValidasi: activeTickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
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

  // Tombol filter kategori pengerjaan (label bahasa Indonesia, gampang dipahami)
  const filterTabs = [
    { id: 'SEMUA_AKTIF' as const, label: 'Semua Aktif', color: 'bg-slate-400', count: counts.active },
    { id: 'MENUNGGU_TRIASE' as const, label: 'Perlu Petugas', color: 'bg-amber-400', count: counts.triase },
    { id: 'DIPROSES' as const, label: 'Sedang Dikerjakan', color: 'bg-blue-400', count: counts.diproses },
    { id: 'MENUNGGU_VALIDASI' as const, label: 'Menunggu Validasi', color: 'bg-indigo-400', count: counts.validasi },
    { id: 'HOLD_ESKALASI' as const, label: 'Ada Kendala', color: 'bg-rose-400', count: counts.eskalasi },
  ];

  const matchingStaff = staffList.filter(
    (staff) => !triageForm.divisiId || String(staff.divisiId) === String(triageForm.divisiId)
  );
  const availableStaffForModal = matchingStaff.length > 0 ? matchingStaff : staffList;

  const filteredActiveTickets = useMemo(() => {
    const now = new Date();
    return activeTickets.filter((t) => {
      if (activeTab !== 'SEMUA_AKTIF' && t.status !== activeTab) {
        return false;
      }

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

      // 3. Filter Sidebar: Status Tugas (Termasuk Lewat Tenggat)
      if (selectedStatuses.length > 0) {
        const isOverdue = Boolean(t.deadline && new Date(t.deadline) < now);
        const matchOverdue = selectedStatuses.includes('OVERDUE') && isOverdue;
        const matchStatus = selectedStatuses.includes(t.status);

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
        const matchId =
          `t-${String(t.id).padStart(3, '0')}`.includes(q) ||
          `#t-${String(t.id).padStart(3, '0')}`.includes(q) ||
          String(t.id).includes(q);
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
    activeTab,
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

  const toDateTimeLocalInput = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  // Simpan Triase / Pendelegasian
  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTriage) return;
    try {
      await api.patch(`/tickets/${selectedTriage.id}/triage`, {
        divisiId: triageForm.divisiId ? Number(triageForm.divisiId) : null,
        prioritas: triageForm.prioritas,
        pelaksanaId: triageForm.pelaksanaId ? Number(triageForm.pelaksanaId) : null,
        deadline: triageForm.deadline ? new Date(triageForm.deadline).toISOString() : null,
        catatanRevisi: triageForm.catatanRevisi || null,
      });
      setSelectedTriage(null);
      fetchData();
    } catch {
      alert('Gagal memperbarui pengaturan tugas.');
    }
  };

  // Kirim Laporan Selesai (Staf)
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;

    if (!reportPhoto) {
      alert('Wajib melampirkan foto bukti penyelesaian.');
      return;
    }

    setSubmittingReport(true);
    try {
      await api.patch(`/tickets/${reportTarget.id}/selesai`, {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: reportText,
        fotoBukti: reportPhoto,
      });
      alert('Laporan penyelesaian berhasil dikirim untuk dievaluasi atasan!');
      setReportTarget(null);
      setReportText('');
      setReportPhoto('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirimkan laporan selesai.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Evaluasi Atasan (Setujui atau Minta Revisi)
  const handleApprove = async () => {
    if (!evalTarget) return;
    try {
      await api.patch(`/tickets/${evalTarget.id}/status`, {
        status: 'SELESAI',
        catatanRevisi: evalNote || 'Tugas telah divalidasi dan disetujui.',
      });
      setEvalTarget(null);
      setEvalNote('');
      fetchData();
    } catch {
      alert('Gagal menyetujui tugas.');
    }
  };

  const handleRejectToRevision = async () => {
    if (!evalTarget) return;
    if (!evalNote.trim()) {
      alert('Wajib mengisi catatan perbaikan/revisi untuk staf.');
      return;
    }
    try {
      await api.patch(`/tickets/${evalTarget.id}/status`, {
        status: 'DIPROSES',
        catatanRevisi: evalNote,
      });
      setEvalTarget(null);
      setEvalNote('');
      fetchData();
    } catch {
      alert('Gagal mengembalikan tugas untuk revisi.');
    }
  };

  // Lapor Kendala
  const handleReportEscalation = async () => {
    if (!escalateTarget) return;
    try {
      await api.patch(`/tickets/${escalateTarget.id}/status`, {
        status: 'HOLD_ESKALASI',
        catatanRevisi: escalateNote,
      });
      setEscalateTarget(null);
      setEscalateNote('');
      alert('Laporan kendala berhasil diajukan (Status: Tertahan).');
      fetchData();
    } catch {
      alert('Gagal mengajukan laporan kendala.');
    }
  };

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
      default:
        return {
          label: status,
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
                    { key: 'MENUNGGU_VALIDASI', label: 'Menunggu Validasi', count: sidebarCounts.menungguValidasi },
                    { key: 'HOLD_ESKALASI', label: 'Ada Kendala', count: sidebarCounts.adaKendala },
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

        {/* KONTEN KANAN: Pencarian + Kartu Tugas */}
        <div className="flex-1 w-full space-y-4">
          
          {/* 1. Cari Tugas */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="space-y-2">
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                Cari Tugas
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari judul tugas, #T-xxx, lokasi, atau nama staf..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-10 pr-9 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Filter Pengerjaan (kategori pengerjaan tugas) */}
            <div className="space-y-2">
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filter Pengerjaan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 h-12 px-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${tab.id === activeTab ? 'bg-brand-deep text-white shadow-sm shadow-brand-deep/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${tab.id === activeTab ? 'bg-white/20' : tab.color}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[11px] font-extrabold tabular-nums ${tab.id === activeTab ? 'text-white/80' : 'text-slate-400'}`}>
                      {tab.count}
                    </span>
                    {/* Titik merah berkala (blinking) → muncul kalau ada kendala */}
                    {tab.id === 'HOLD_ESKALASI' && tab.count > 0 && (
                      <span className="flex items-center gap-1 pl-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-blink-dot" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
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
                const badge = getStatusBadge(t.status);
                const dlDate = t.deadline ? new Date(t.deadline) : null;
                const isOverdue = dlDate ? new Date() > dlDate : false;
                const isArahanDivisi =
                  ['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '') ||
                  ['KADIV', 'DIREKTUR'].includes(t.parentTicket?.pembuat?.role || '');

                const priorityBorder = isOverdue
                  ? 'border-l-rose-600'
                  : t.prioritas === 'HIGH'
                  ? 'border-l-rose-500'
                  : t.prioritas === 'MEDIUM'
                  ? 'border-l-amber-500'
                  : 'border-l-blue-500';

                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl md:rounded-3xl border border-l-4 ${priorityBorder} shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5 ${
                      isOverdue
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-white border-slate-200/90'
                    }`}
                  >
                    {/* Baris 1: ID Tiket, Badge Status, Prioritas, dan Deadline */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>

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

                    {/* Baris 3: Rincian Lokasi, Divisi & Pelaksana */}
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

                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Pelaksana:</span>
                        <strong className="text-slate-800">
                          {t.pelaksana?.nama || 'Belum Ditunjuk'}
                        </strong>
                      </span>
                    </div>

                    {/* Catatan Kendala / Revisi Jika Ada */}
                    {t.catatanRevisi && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Catatan Kendala / Perbaikan:</strong>
                          <span>{t.catatanRevisi}</span>
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

                    {/* Baris 4: ACTION BAR RAMAH USER AWAM (Tombol Berukuran Besar & Sangat Jelas) */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Kelompok Tombol Aksi Utama */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">

                        {/* Aksi Koordinator / Atasan: Triase Petugas */}
                        {isAtasan && t.status === 'MENUNGGU_TRIASE' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTriage(t);
                              setTriageForm({
                                divisiId: t.divisi?.id ? String(t.divisi.id) : '',
                                prioritas: t.prioritas,
                                pelaksanaId: t.pelaksana?.id ? String(t.pelaksana.id) : '',
                                deadline: toDateTimeLocalInput(t.deadline),
                                catatanRevisi: t.catatanRevisi || '',
                              });
                            }}
                            className="flex-1 sm:flex-none h-11 px-5 bg-[#0f5c43] hover:bg-[#0c4935] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Delegasikan ke Staf</span>
                          </button>
                        )}

                        {/* Aksi Koordinator / Atasan: Atur Ulang Tugas yang Sedang Berjalan */}
                        {isAtasan && t.status === 'DIPROSES' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTriage(t);
                              setTriageForm({
                                divisiId: t.divisi?.id ? String(t.divisi.id) : '',
                                prioritas: t.prioritas,
                                pelaksanaId: t.pelaksana?.id ? String(t.pelaksana.id) : '',
                                deadline: toDateTimeLocalInput(t.deadline),
                                catatanRevisi: t.catatanRevisi || '',
                              });
                            }}
                            className="flex-1 sm:flex-none h-11 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                          >
                            <span>Ubah Delegasi Staf</span>
                          </button>
                        )}

                        {/* Aksi Koordinator / Atasan: Evaluasi Foto */}
                        {isAtasan && t.status === 'MENUNGGU_VALIDASI' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEvalTarget(t);
                              setEvalNote(t.catatanRevisi || '');
                            }}
                            className="flex-1 sm:flex-none h-11 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Periksa & Setujui Hasil</span>
                          </button>
                        )}

                        {/* Aksi Staf: Lapor Selesai (Foto) */}
                        {!isAdmin && (t.status === 'DIPROSES' || t.status === 'HOLD_ESKALASI') && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReportTarget(t);
                                setReportText(t.laporanPenyelesaian || '');
                                setReportPhoto(t.fotoBukti || '');
                              }}
                              className="flex-1 sm:flex-none h-11 px-5 bg-[#f47a45] hover:bg-[#e06934] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Lapor Selesai (Foto)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEscalateTarget(t);
                                setEscalateNote(t.catatanRevisi || '');
                              }}
                              className="flex-1 sm:flex-none h-11 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Lapor Kendala</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Tombol Lihat Detail Tiket (Selalu Rapi di Kanan) */}
                      <button
                        type="button"
                        onClick={() => navigate(`/detail-tugas/${t.id}`)}
                        className="w-full sm:w-auto h-10 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Lihat Detail Tiket</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: DELEGASI TUGAS KE STAF */}
      {selectedTriage &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedTriage(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 touch-none overscroll-none animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <form onSubmit={handleSaveTriage} className="flex flex-col h-full max-h-full overflow-hidden min-h-0">
                <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedTriage.status === 'MENUNGGU_TRIASE' ? 'Delegasikan Tugas ke Staf' : 'Perbarui Delegasi Tugas'}
                    </h3>
                    <p className="text-xs text-slate-500">Tiket #{selectedTriage.id}: {selectedTriage.judul}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTriage(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 text-xs font-semibold touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {/* Tahap 1: Informasi Tugas & Lokasi (Otomatis Terisi Sempurna) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Tahap 1: Informasi Tugas & Lokasi
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Terisi Sempurna
                      </span>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{selectedTriage.judul}</p>
                      {selectedTriage.lokasi && (
                        <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{selectedTriage.lokasi}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                        {selectedTriage.deskripsi}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-brand-mint/40 rounded-xl">
                    <p className="text-[11px] text-brand-deep font-semibold leading-relaxed">
                      Bagian Tahap 1 sudah otomatis terisi dari laporan. Koordinator hanya bertugas memilih tingkat prioritas, batas waktu, dan staf pelaksana di bawah ini.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1.5 font-bold">Divisi Penanggung Jawab:</label>
                    <select
                      value={triageForm.divisiId}
                      onChange={(e) => setTriageForm({ ...triageForm, divisiId: e.target.value, pelaksanaId: '' })}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                    >
                      <option value="">Pilih Divisi Target</option>
                      {divisiList.map((d) => (
                        <option key={d.id} value={d.id}>{d.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1.5 font-bold">Petugas Pelaksana (Staf) *:</label>
                    <select
                      value={triageForm.pelaksanaId}
                      onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })}
                      required
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                    >
                      <option value="">Pilih Petugas yang Ditugaskan</option>
                      {availableStaffForModal.map((s) => (
                        <option key={s.id} value={s.id}>{s.nama} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1.5 font-bold">Tingkat Prioritas *:</label>
                      <select
                        value={triageForm.prioritas}
                        onChange={(e) => setTriageForm({ ...triageForm, prioritas: e.target.value as any })}
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                      >
                        <option value="LOW">Rendah (LOW)</option>
                        <option value="MEDIUM">Sedang (MEDIUM)</option>
                        <option value="HIGH">Tinggi (HIGH)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1.5 font-bold">Batas Waktu (Deadline) *:</label>
                      <input
                        type="datetime-local"
                        value={triageForm.deadline}
                        onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })}
                        required
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1.5 font-bold">Catatan Instruksi Khusus (Opsional):</label>
                    <textarea
                      rows={2}
                      value={triageForm.catatanRevisi}
                      onChange={(e) => setTriageForm({ ...triageForm, catatanRevisi: e.target.value })}
                      placeholder="Tambahkan catatan atau instruksi pengerjaan..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                    />
                  </div>
                </div>

                <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const ticketToDelegate = selectedTriage;
                      setSelectedTriage(null);
                      navigate('/tambah-tugas', {
                        state: {
                          ticketId: ticketToDelegate.id,
                          judul: ticketToDelegate.judul,
                          lokasi: ticketToDelegate.lokasi,
                          deskripsi: ticketToDelegate.deskripsi,
                          prioritas: ticketToDelegate.prioritas,
                          divisiId: ticketToDelegate.divisiId,
                          fotoInstruksi: ticketToDelegate.fotoInstruksi,
                        },
                      });
                    }}
                    className="text-[11px] font-bold text-brand-deep hover:underline text-left self-start sm:self-auto"
                  >
                    Delegasi Multi-Staf →
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedTriage(null)}
                      className="h-10 sm:h-11 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="h-10 sm:h-11 px-5 sm:px-6 bg-[#0f5c43] hover:bg-[#0c4935] text-white font-bold rounded-xl text-xs shadow-xs transition"
                    >
                      Simpan & Delegasikan
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 2: LAPOR SELESAI + FOTO BUKTI (STAF) */}
      {reportTarget &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setReportTarget(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 touch-none overscroll-none animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <form onSubmit={handleSubmitReport} className="flex flex-col h-full max-h-full overflow-hidden min-h-0">
                <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Lapor Tugas Selesai</h3>
                    <p className="text-xs text-slate-500">Tiket #{reportTarget.id}: {reportTarget.judul}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportTarget(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 text-xs font-semibold touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div>
                    <label className="block text-slate-700 mb-1.5 font-bold">Catatan Hasil Pengerjaan:</label>
                    <textarea
                      rows={3}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Uraikan tindakan yang telah Anda selesaikan..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#f47a45]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 mb-1.5 font-bold">Foto Bukti Hasil Pekerjaan:</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const base64 = await compressImageToBase64(file);
                              setReportPhoto(base64);
                            } catch {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setReportPhoto(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                      />

                      {reportPhoto && (
                        <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-50">
                          <img src={reportPhoto} alt="Preview Bukti" className="w-full h-44 object-cover" />
                          <button
                            type="button"
                            onClick={() => setReportPhoto('')}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReportTarget(null)}
                    className="h-10 sm:h-11 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport || !reportPhoto}
                    className="h-10 sm:h-11 px-5 sm:px-6 bg-[#f47a45] hover:bg-[#e06934] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-2 transition"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{submittingReport ? 'Mengirim...' : 'Kirim Bukti & Tandai Selesai'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 3: EVALUASI HASIL & FOTO (ATASAN) */}
      {evalTarget &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEvalTarget(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 touch-none overscroll-none animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Evaluasi Pekerjaan Staf</h3>
                  <p className="text-xs text-slate-500">Tiket #{evalTarget.id}: {evalTarget.judul}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEvalTarget(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-4 text-xs font-semibold touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                {evalTarget.fotoBukti && (
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1.5">Foto Bukti dari Staf:</p>
                    <img
                      src={evalTarget.fotoBukti}
                      alt="Bukti Staf"
                      onClick={() => setPreviewPhoto(evalTarget.fotoBukti!)}
                      className="w-full h-44 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-95 transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">Klik gambar untuk memperbesar</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1.5">Catatan Pengerjaan Staf:</p>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                    {evalTarget.laporanPenyelesaian || 'Tugas telah diselesaikan.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Catatan Evaluasi / Arahan Perbaikan (Wajib jika revisi):
                  </label>
                  <textarea
                    rows={3}
                    value={evalNote}
                    onChange={(e) => setEvalNote(e.target.value)}
                    placeholder="Berikan catatan evaluasi atau alasan perbaikan jika belum sesuai..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleRejectToRevision}
                  className="h-10 sm:h-11 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Minta Revisi</span>
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="h-10 sm:h-11 px-5 sm:px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui Selesai</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 4: LAPOR KENDALA (STAF) */}
      {escalateTarget &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setEscalateTarget(null);
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 touch-none overscroll-none animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            >
              <div className="shrink-0 p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Laporkan Kendala</h3>
                  <p className="text-xs text-slate-500">Tiket #{escalateTarget.id}: {escalateTarget.judul}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEscalateTarget(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-3 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jelaskan kendala pengerjaan tugas (misal: alat cadangan tidak tersedia, butuh persetujuan biaya tambahan, atau menunggu vendor).
                </p>
                <textarea
                  rows={4}
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  placeholder="Tuliskan rincian kendala yang dialami secara jelas..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEscalateTarget(null)}
                  className="h-10 sm:h-11 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleReportEscalation}
                  disabled={!escalateNote.trim()}
                  className="h-10 sm:h-11 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Kirim Laporan Kendala
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL 5: PREVIEW FOTO BESAR */}
      {previewPhoto &&
        createPortal(
          <div
            onClick={() => setPreviewPhoto(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 cursor-pointer touch-none overscroll-none animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl max-h-[85vh] bg-slate-900 p-2 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            >
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black transition"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewPhoto} alt="Bukti Foto" className="max-w-full max-h-[80vh] object-contain rounded-xl" />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}