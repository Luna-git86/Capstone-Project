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
  Upload,
  X,
  Building2,
  UserCheck,
  AlertTriangle,
  Camera,
  RotateCcw
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

export default function SemuaTugas() {
  const navigate = useNavigate();
  const location = useLocation();

  const isTugasSaya = location.pathname.includes('semua-tugas-staff');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [activeTab, setActiveTab] = useState<
    'SEMUA_AKTIF' | 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI'
  >('SEMUA_AKTIF');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Modal Triase & Atur Tugas (Koordinator/Kadiv)
  const [selectedTriage, setSelectedTriage] = useState<Ticket | null>(null);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  // 2. Modal Lapor Selesai (Staf)
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // 3. Modal Evaluasi Foto (Atasan)
  const [evalTarget, setEvalTarget] = useState<Ticket | null>(null);
  const [evalNote, setEvalNote] = useState('');

  // 4. Modal Kendala (Staf)
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote] = useState('');

  // 5. Modal Preview Foto
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
  void getUserId();
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

  const counts = useMemo(() => {
    const active = tickets.filter(
      (t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'
    );
    return {
      active: active.length,
      total: tickets.length,
      completed: tickets.filter((t) => t.status === 'SELESAI').length,
      triase: tickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      diproses: tickets.filter((t) => t.status === 'DIPROSES').length,
      validasi: tickets.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      eskalasi: tickets.filter((t) => t.status === 'HOLD_ESKALASI').length,
    };
  }, [tickets]);

  const filteredActiveTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Hanya tampilkan tugas yang masih aktif
      if (t.status === 'SELESAI' || t.status === 'DITOLAK') return false;

      // Filter Tab Kategori
      if (activeTab === 'MENUNGGU_TRIASE' && t.status !== 'MENUNGGU_TRIASE') return false;
      if (activeTab === 'DIPROSES' && t.status !== 'DIPROSES') return false;
      if (activeTab === 'MENUNGGU_VALIDASI' && t.status !== 'MENUNGGU_VALIDASI') return false;
      if (activeTab === 'HOLD_ESKALASI' && t.status !== 'HOLD_ESKALASI') return false;

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `t-${String(t.id).padStart(3, '0')}`.includes(q);
        const matchLoc = (t.lokasi || '').toLowerCase().includes(q);
        const matchPelaksana = (t.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchDivisi = (t.divisi?.nama || '').toLowerCase().includes(q);

        if (!matchTitle && !matchId && !matchLoc && !matchPelaksana && !matchDivisi) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, activeTab, searchQuery]);

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
        laporanPenyelesaian: reportText,
        fotoBukti: reportPhoto,
      });
      setReportTarget(null);
      setReportText('');
      setReportPhoto('');
      fetchData();
    } catch {
      alert('Gagal mengirimkan laporan selesai.');
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

  const matchingStaff = staffList.filter(
    (s) => !triageForm.divisiId || String(s.divisiId) === String(triageForm.divisiId)
  );
  const availableStaffForModal = matchingStaff.length > 0 ? matchingStaff : staffList;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-28 md:pb-12">
      {/* 1. HEADER HALAMAN YANG BERSIH & JELAS */}
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

      {/* 2. DUA KOLOM: TASK SUB-NAV + KONTEN DAFTAR TUGAS */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Navigasi Sub-Tab Tugas (Segmented di mobile, Panel di desktop) */}
        <TaskSubNav
          currentTab="AKTIF"
          activeCount={counts.active}
          totalCount={counts.total}
          completedCount={counts.completed}
        />

        {/* Konten Kanan: Filter Terpadu + Kartu Tugas Minimalis */}
        <div className="flex-1 w-full space-y-4">
          
          {/* BAR PENCARIAN & FILTER TERPADU (Sederhana, Bersih, Tidak Menumpuk) */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
            {/* Input Pencarian Besar & Nyaman */}
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

            {/* Filter Kategori Status Ringkas & Intuitif */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('SEMUA_AKTIF')}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  activeTab === 'SEMUA_AKTIF'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Aktif ({counts.active})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MENUNGGU_TRIASE')}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'MENUNGGU_TRIASE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Perlu Petugas ({counts.triase})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DIPROSES')}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'DIPROSES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Dikerjakan ({counts.diproses})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MENUNGGU_VALIDASI')}
                className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'MENUNGGU_VALIDASI'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Evaluasi Foto ({counts.validasi})</span>
              </button>

              {counts.eskalasi > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('HOLD_ESKALASI')}
                  className={`h-9 px-3.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'HOLD_ESKALASI'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Ada Kendala ({counts.eskalasi})</span>
                </button>
              )}
            </div>
          </div>

          {/* LIST KARTU TUGAS MINIMALIS, RAPI & MUDAH DITEKAN */}
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
                {searchQuery
                  ? `Tidak ada tugas yang cocok dengan pencarian "${searchQuery}".`
                  : 'Seluruh tugas pada status ini telah ditangani dengan baik.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredActiveTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const dlDate = t.deadline ? new Date(t.deadline) : null;
                const isOverdue = dlDate ? new Date() > dlDate : false;

                const priorityBorder =
                  t.prioritas === 'HIGH'
                    ? 'border-l-rose-500'
                    : t.prioritas === 'MEDIUM'
                    ? 'border-l-amber-500'
                    : 'border-l-blue-500';

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 border-l-4 ${priorityBorder} shadow-xs hover:shadow-md transition-all p-4 sm:p-5 space-y-3.5`}
                  >
                    {/* Baris 1: ID Tiket, Badge Status Jelas, dan Deadline SLA */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        
                        {/* Status Semantik Jelas */}
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>

                        {/* Prioritas */}
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
                      </div>

                      {/* Tenggat Waktu / SLA */}
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

                    {/* Baris 2: Judul Tugas Berukuran Besar & Uraian Bersih */}
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
                            <span>Tentukan Petugas & Jam</span>
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
                            <span>Ubah Jam / Petugas</span>
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
                        className="w-full sm:w-auto h-11 px-4 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 ml-auto shrink-0"
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

      {/* MODAL 1: TRIASE / TETAPKAN PETUGAS & JAM */}
      {selectedTriage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {selectedTriage.status === 'MENUNGGU_TRIASE' ? 'Tetapkan Petugas & Jam' : 'Perbarui Penugasan'}
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

            <form onSubmit={handleSaveTriage} className="space-y-4 text-xs font-semibold">
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
                <label className="block text-slate-700 mb-1.5 font-bold">Petugas Pelaksana:</label>
                <select
                  value={triageForm.pelaksanaId}
                  onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })}
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
                  <label className="block text-slate-700 mb-1.5 font-bold">Tingkat Prioritas:</label>
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
                  <label className="block text-slate-700 mb-1.5 font-bold">Batas Waktu (Deadline):</label>
                  <input
                    type="datetime-local"
                    value={triageForm.deadline}
                    onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })}
                    className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5 font-bold">Catatan Instruksi Khusus (Opsional):</label>
                <textarea
                  rows={3}
                  value={triageForm.catatanRevisi}
                  onChange={(e) => setTriageForm({ ...triageForm, catatanRevisi: e.target.value })}
                  placeholder="Tambahkan catatan atau instruksi pengerjaan..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-[#0f5c43]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTriage(null)}
                  className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-[#0f5c43] hover:bg-[#0c4935] text-white font-bold rounded-xl shadow-xs"
                >
                  Simpan & Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LAPOR SELESAI + FOTO BUKTI (STAF) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs font-semibold">
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setReportPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReport || !reportPhoto}
                  className="h-11 px-6 bg-[#f47a45] hover:bg-[#e06934] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{submittingReport ? 'Mengirim...' : 'Kirim Laporan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EVALUASI HASIL & FOTO (ATASAN) */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            {evalTarget.fotoBukti && (
              <div>
                <p className="text-xs font-bold text-slate-700 mb-1">Foto Bukti dari Staf:</p>
                <img
                  src={evalTarget.fotoBukti}
                  alt="Bukti Staf"
                  className="w-full h-44 object-cover rounded-xl border border-slate-200"
                />
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Catatan Pengerjaan Staf:</p>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {evalTarget.laporanPenyelesaian || 'Tugas telah diselesaikan.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRejectToRevision}
                className="h-11 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Minta Revisi</span>
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: LAPOR KENDALA (STAF) */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            <div className="space-y-3">
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEscalateTarget(null)}
                className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReportEscalation}
                disabled={!escalateNote.trim()}
                className="h-11 px-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                Kirim Laporan Kendala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PREVIEW FOTO BESAR */}
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
