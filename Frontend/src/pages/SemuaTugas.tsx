// Frontend/src/pages/SemuaTugas.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
}

interface Divisi {
  id: number;
  nama: string;
}

interface StaffUser {
  id: number;
  nama: string;
  noHp?: string;
  role: string;
  divisiId: number | null;
  divisi?: { id: number; nama: string };
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

const SemuaTugas: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTugasSaya = location.pathname === '/semua-tugas-staff';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search Tab
  const [activeTab, setActiveTab] = useState<string>('SEMUA_AKTIF');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Modal Buat Tugas / Atur Jam dari Tiket Masalah (Triase)
  const [selectedTriage, setSelectedTriage] = useState<Ticket | null>(null);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  // 2. Modal Lapor Selesai + Upload Foto Bukti (Staf)
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // 3. Modal Evaluasi Foto & Laporan (Koordinator / Kadiv / Direktur)
  const [evalTarget, setEvalTarget] = useState<Ticket | null>(null);
  const [evalNote, setEvalNote] = useState('');

  // 4. Modal Lapor Kendala Biaya / Alat (Staf)
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
      } catch (e) {}
    }
    return 0;
  };

  const userRole = getAuthRole() || 'STAF';
  void getUserId();
  const isAdmin = userRole === 'ADMIN';
  const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole);

  const fetchData = async () => {
    try {
      setLoading(true);
      const ticketRes = await api.get('/tickets');
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
        try {
          const optRes = await api.get('/tickets/options');
          setStaffList(optRes.data?.pelaksana || []);
        } catch (errOpt) {
          console.warn('Gagal memuat daftar staf:', errOpt);
        }
      }
    } catch (err) {
      console.error('Gagal memuat daftar tugas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Belum diatur';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const toDateTimeLocalInput = (isoStr: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Hitung jumlah tugas
  const counts = useMemo(() => {
    const active = tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK');
    const completed = tickets.filter((t) => t.status === 'SELESAI').length;
    return {
      total: tickets.length,
      active: active.length,
      completed,
      triase: active.filter((t) => t.status === 'MENUNGGU_TRIASE').length,
      diproses: active.filter((t) => t.status === 'DIPROSES').length,
      validasi: active.filter((t) => t.status === 'MENUNGGU_VALIDASI').length,
      eskalasi: active.filter((t) => t.status === 'HOLD_ESKALASI').length,
      arahan: active.filter((t) => ['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')).length,
    };
  }, [tickets]);

  // Filter tugas aktif untuk ditampilkan di halaman utama
  const filteredActiveTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Wajib tugas AKTIF (belum selesai / tidak ditolak)
      if (t.status === 'SELESAI' || t.status === 'DITOLAK') return false;

      // 2. Filter Tab
      if (activeTab === 'MENUNGGU_TRIASE' && t.status !== 'MENUNGGU_TRIASE') return false;
      if (activeTab === 'DIPROSES' && t.status !== 'DIPROSES') return false;
      if (activeTab === 'MENUNGGU_VALIDASI' && t.status !== 'MENUNGGU_VALIDASI') return false;
      if (activeTab === 'HOLD_ESKALASI' && t.status !== 'HOLD_ESKALASI') return false;
      if (activeTab === 'ARAHAN_PIMPINAN' && !['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')) return false;

      // 3. Filter Search
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

  // Handlers Aksi Form / Modal
  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTriage) return;

    try {
      await api.put(`/tickets/${selectedTriage.id}/triage`, {
        divisiId: triageForm.divisiId ? Number(triageForm.divisiId) : null,
        prioritas: triageForm.prioritas,
        pelaksanaId: Number(triageForm.pelaksanaId),
        deadline: new Date(triageForm.deadline).toISOString(),
        status: 'DIPROSES',
        catatanRevisi: triageForm.catatanRevisi,
      });
      setSelectedTriage(null);
      alert('Tugas dan batas waktu berhasil diperbarui!');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengatur tugas.');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      setReportPhoto(compressed);
    } catch (err) {
      alert('Gagal memproses foto.');
    }
  };

  const handleStaffReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    if (!reportPhoto) {
      alert('Silakan pilih foto bukti penyelesaian tugas terlebih dahulu.');
      return;
    }

    try {
      setSubmittingReport(true);
      await api.patch(`/tickets/${reportTarget.id}/status`, {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: reportText,
        fotoBukti: reportPhoto,
      });
      setReportTarget(null);
      setReportText('');
      setReportPhoto('');
      alert('Laporan dan foto bukti berhasil dikirim! Menunggu validasi atasan.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim laporan penyelesaian.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleEvaluationDecision = async (decision: 'SELESAI' | 'DIPROSES') => {
    if (!evalTarget) return;
    if (decision === 'DIPROSES' && !evalNote.trim()) {
      alert('Tuliskan catatan evaluasi/revisi agar staf mengetahui bagian yang harus diperbaiki.');
      return;
    }

    try {
      await api.patch(`/tickets/${evalTarget.id}/status`, {
        status: decision,
        catatanRevisi: evalNote.trim() || null,
      });
      setEvalTarget(null);
      setEvalNote('');
      if (decision === 'SELESAI') {
        alert('Tugas disetujui selesai dan dipindahkan ke Riwayat Selesai!');
      } else {
        alert('Tugas dikembalikan ke staf dengan catatan revisi.');
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil evaluasi.');
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateTarget) return;
    try {
      await api.patch(`/tickets/${escalateTarget.id}/status`, {
        status: 'HOLD_ESKALASI',
        catatanRevisi: escalateNote,
      });
      setEscalateTarget(null);
      setEscalateNote('');
      alert('Laporan kendala berhasil diajukan (Status: HOLD).');
      fetchData();
    } catch (err) {
      alert('Gagal mengirim laporan kendala.');
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return { label: 'Menunggu Triase', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
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

  const matchingStaff = staffList.filter(
    (s) => !triageForm.divisiId || String(s.divisiId) === String(triageForm.divisiId)
  );
  const availableStaffForModal = matchingStaff.length > 0 ? matchingStaff : staffList;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Halaman Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
              Menu Utama
            </span>
            <span className="text-xs text-slate-400 font-medium">Pengaturan & Pemantauan Tugas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isTugasSaya ? 'Tugas Saya' : 'Daftar Tugas'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar seluruh tugas operasional aktif yang dapat diatur batas waktu, pelaksana, serta statusnya.
          </p>
        </div>

        {isAtasan && (
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

      {/* Kontainer Dua Kolom: Side Menu Kecil + Area Konten Tugas Aktif */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Side Menu Kecil (Navigasi Antar Halaman Tugas) */}
        <TaskSubNav
          currentTab="AKTIF"
          activeCount={counts.active}
          totalCount={counts.total}
          completedCount={counts.completed}
        />

        {/* Konten Kanan: Tugas Aktif yang Bisa Diatur */}
        <div className="flex-1 w-full space-y-4">
          {/* Ringkasan Metrik Cepat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setActiveTab('SEMUA_AKTIF')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'SEMUA_AKTIF'
                  ? 'bg-blue-50 border-blue-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-500">Semua Aktif</p>
              <p className="text-xl font-bold text-slate-800 mt-0.5">{counts.active}</p>
            </div>

            <div
              onClick={() => setActiveTab('MENUNGGU_TRIASE')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'MENUNGGU_TRIASE'
                  ? 'bg-amber-50 border-amber-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <p className="text-[11px] font-semibold text-amber-700">Perlu Triase</p>
              <p className="text-xl font-bold text-amber-800 mt-0.5">{counts.triase}</p>
            </div>

            <div
              onClick={() => setActiveTab('DIPROSES')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'DIPROSES'
                  ? 'bg-blue-50 border-blue-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <p className="text-[11px] font-semibold text-blue-700">Dikerjakan</p>
              <p className="text-xl font-bold text-blue-800 mt-0.5">{counts.diproses}</p>
            </div>

            <div
              onClick={() => setActiveTab('MENUNGGU_VALIDASI')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                activeTab === 'MENUNGGU_VALIDASI'
                  ? 'bg-purple-50 border-purple-400 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-purple-300'
              }`}
            >
              <p className="text-[11px] font-semibold text-purple-700">Evaluasi Foto</p>
              <p className="text-xl font-bold text-purple-800 mt-0.5">{counts.validasi}</p>
            </div>
          </div>

          {/* Toolbar Pencarian & Tab Kategori */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari berdasarkan judul, #T-xxx, lokasi, staf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-[11px] font-semibold">Cari:</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  x
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('SEMUA_AKTIF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'SEMUA_AKTIF'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({counts.active})
              </button>
              <button
                type="button"
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
                type="button"
                onClick={() => setActiveTab('HOLD_ESKALASI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'HOLD_ESKALASI'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tertahan ({counts.eskalasi})
              </button>
            </div>
          </div>

          {/* Daftar Kartu Tugas Aktif (Rapi & Bisa Diatur) */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-xs font-medium">
              <p className="animate-pulse">Memuat daftar tugas aktif...</p>
            </div>
          ) : filteredActiveTickets.length === 0 ? (
            <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Tugas Aktif</h3>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? `Tidak ada tugas cocok dengan "${searchQuery}".`
                  : 'Semua tugas pada kategori ini telah selesai.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredActiveTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const isDireksi = t.pembuat?.role === 'DIREKTUR';
                const isKadiv = t.pembuat?.role === 'KADIV';

                // Evaluasi deadline
                const dlDate = t.deadline ? new Date(t.deadline) : null;
                const isOverdue = dlDate ? new Date() > dlDate : false;

                return (
                  <div
                    key={t.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Header Bar Kartu */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
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
                          {t.prioritas}
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

                      {/* Info Deadline */}
                      <div className="text-right">
                        <span
                          className={`text-xs font-semibold ${
                            isOverdue
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-600'
                          }`}
                        >
                          Batas Waktu: {formatDateTime(t.deadline)}
                          {isOverdue && ' (Lewat Deadline)'}
                        </span>
                      </div>
                    </div>

                    {/* Isi Inti Tugas */}
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900">{t.judul}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{t.deskripsi}</p>

                      <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                        <span><strong>Lokasi:</strong> {t.lokasi || 'RSIA'}</span>
                        <span><strong>Divisi:</strong> {t.divisi?.nama || 'Lintas Divisi'}</span>
                        <span>
                          <strong>{isDireksi && t.pelaksana?.role === 'KADIV' ? 'Penerima Arahan:' : 'Pelaksana:'}</strong>{' '}
                          <span className="font-semibold text-emerald-700">{t.pelaksana?.nama || 'Belum Ditunjuk'}</span>
                        </span>
                        <span>Dibuat: {t.pembuat?.nama || 'Pegawai'}</span>
                      </div>

                      {/* Notifikasi Kendala / Revisi jika ada */}
                      {t.catatanRevisi && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                          <strong>Catatan Revisi / Kendala:</strong> {t.catatanRevisi}
                        </div>
                      )}

                      {/* Bukti Foto jika status Menunggu Validasi */}
                      {t.fotoBukti && t.status === 'MENUNGGU_VALIDASI' && (
                        <div className="mt-2 flex items-center gap-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <img
                            src={t.fotoBukti}
                            alt="Bukti Staf"
                            onClick={() => setPreviewPhoto(t.fotoBukti)}
                            className="w-14 h-14 object-cover rounded cursor-pointer border border-purple-300 hover:opacity-80"
                          />
                          <div className="text-xs text-purple-900">
                            <p className="font-bold">Laporan Staf: {t.laporanPenyelesaian || 'Tugas telah diselesaikan.'}</p>
                            <p className="text-[11px] text-purple-700">Klik foto untuk memperbesar sebelum mengevaluasi.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ACTION BAR: PENGATURAN TUGAS (BISA DIATUR) */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Aksi Atasan (Koordinator / Kadiv / Direktur): Atur Tugas & Jam */}
                        {isAtasan && (
                          <>
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
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                            >
                              <span>{t.status === 'MENUNGGU_TRIASE' ? 'Buat Tugas dari Tiket' : 'Atur Tugas & Jam'}</span>
                            </button>

                            {(t.status === 'MENUNGGU_TRIASE' || ['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')) && (
                              <button
                                type="button"
                                onClick={() => navigate(`/tambah-tugas?ticketId=${t.id}`)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors"
                              >
                                Buka di Pendelegasian
                              </button>
                            )}

                            {t.status === 'MENUNGGU_VALIDASI' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTarget(t);
                                  setEvalNote(t.catatanRevisi || '');
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                              >
                                <span>Evaluasi Foto & Hasil</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* Aksi Staf: Lapor Selesai / Lapor Kendala */}
                        {!isAdmin && (t.status === 'DIPROSES' || t.status === 'HOLD_ESKALASI') && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReportTarget(t);
                                setReportText(t.laporanPenyelesaian || '');
                                setReportPhoto(t.fotoBukti || '');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                            >
                              <span>Lapor Selesai (Foto)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEscalateTarget(t);
                                setEscalateNote(t.catatanRevisi || '');
                              }}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <span>Lapor Kendala Biaya/Alat</span>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Tombol Lihat Detail Tugas */}
                      <button
                        type="button"
                        onClick={() => navigate(`/detail-tugas/${t.id}`)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors ml-auto"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Atur Tugas & Jam / Triase */}
      {selectedTriage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedTriage.status === 'MENUNGGU_TRIASE' ? 'Buat Tugas dari Tiket' : 'Atur Ulang Tugas & Jam'}
                </h3>
                <p className="text-xs text-slate-500">Tiket #{selectedTriage.id} — {selectedTriage.judul}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTriage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                x
              </button>
            </div>

            <form onSubmit={handleTriageSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Divisi Pelaksana</label>
                <select
                  value={triageForm.divisiId}
                  onChange={(e) => setTriageForm({ ...triageForm, divisiId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  required
                >
                  <option value="">-- Pilih Divisi --</option>
                  {divisiList.map((d) => (
                    <option key={d.id} value={String(d.id)}>{d.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Staf Pelaksana</label>
                <select
                  value={triageForm.pelaksanaId}
                  onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                  required
                >
                  <option value="">-- Pilih Staf --</option>
                  {availableStaffForModal.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.nama} ({s.divisi?.nama || 'Umum'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={triageForm.prioritas}
                    onChange={(e) => setTriageForm({ ...triageForm, prioritas: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="LOW">Low (Biasa)</option>
                    <option value="MEDIUM">Medium (Menengah)</option>
                    <option value="HIGH">High (Darurat)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batas Waktu (Deadline) *</label>
                  <input
                    type="datetime-local"
                    value={triageForm.deadline}
                    onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={triageForm.catatanRevisi}
                  onChange={(e) => setTriageForm({ ...triageForm, catatanRevisi: e.target.value })}
                  placeholder="Instruksi khusus untuk staf pelaksana..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedTriage(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Simpan & Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Staf Lapor Selesai (Foto Bukti) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">Lapor Penyelesaian Tugas</h3>
            <p className="text-xs text-slate-500">Tiket #{reportTarget.id} — {reportTarget.judul}</p>

            <form onSubmit={handleStaffReportSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Foto Bukti Pekerjaan *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required
                  className="w-full text-xs text-slate-600"
                />
                {reportPhoto && (
                  <img src={reportPhoto} alt="Preview" className="w-24 h-24 object-cover mt-2 rounded border" />
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Laporan Pengerjaan</label>
                <textarea
                  rows={3}
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Jelaskan perbaikan yang telah dilakukan..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {submittingReport ? 'Mengirim...' : 'Kirim Laporan & Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Lapor Kendala Biaya/Alat (Eskalasi) */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-rose-800">Lapor Kendala Biaya / Suku Cadang</h3>
            <p className="text-xs text-slate-500">Tiket #{escalateTarget.id} — {escalateTarget.judul}</p>

            <form onSubmit={handleEscalateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rincian Hambatan *</label>
                <textarea
                  rows={3}
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  placeholder="Mengapa tugas ini memerlukan biaya/alat tambahan..."
                  required
                  className="w-full px-3 py-2 border border-rose-300 rounded-lg bg-rose-50/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEscalateTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Ajukan Eskalasi (HOLD)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Evaluasi Foto & Hasil (Atasan) */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-800">Evaluasi Hasil Pekerjaan Staf</h3>
            <p className="text-xs text-slate-500">Tiket #{evalTarget.id} — {evalTarget.judul}</p>

            {evalTarget.fotoBukti && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700">Foto Bukti:</p>
                <img
                  src={evalTarget.fotoBukti}
                  alt="Foto Bukti"
                  className="w-full max-h-56 object-cover rounded-lg border border-slate-200"
                />
              </div>
            )}

            <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <strong>Laporan Staf:</strong> {evalTarget.laporanPenyelesaian || '-'}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Evaluasi / Revisi:</label>
              <textarea
                rows={2}
                value={evalNote}
                onChange={(e) => setEvalNote(e.target.value)}
                placeholder="Tuliskan catatan jika meminta revisi atau ucapan evaluasi..."
                className="w-full px-3 py-2 border rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                onClick={() => setEvalTarget(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEvaluationDecision('DIPROSES')}
                  className="px-3.5 py-2 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-100"
                >
                  Minta Revisi
                </button>
                <button
                  type="button"
                  onClick={() => handleEvaluationDecision('SELESAI')}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm"
                >
                  Setujui Selesai 
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Preview Foto Besar */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer"
        >
          <div className="max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <img src={previewPhoto} alt="Preview Bukti" className="max-h-[85vh] object-contain mx-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default SemuaTugas;