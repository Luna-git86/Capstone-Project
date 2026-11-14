// Frontend/src/pages/DetailTugas.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Plus,
  Upload,
  User,
  X,
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

interface TicketLog {
  id: number;
  statusSebelumnya: string | null;
  statusBaru: string;
  catatan: string | null;
  createdAt: string;
  user: { id: number; nama: string; role: string };
}

interface TicketDetail {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  laporanPenyelesaian: string | null;
  fotoInstruksi?: string | null;
  fotoBukti: string | null;
  catatanRevisi: string | null;
  pembuat?: { id: number; nama: string; role: string };
  penanggungJawab?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; noHp?: string; role: string };
  divisi?: { id: number; nama: string };
  logs?: TicketLog[];
  parentTicket?: {
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    pembuat?: { id: number; nama: string; role: string };
  } | null;
  childTickets?: Array<{
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    completedAt: string | null;
    pelaksana?: { id: number; nama: string; role: string };
  }>;
}

interface Divisi {
  id: number;
  nama: string;
}

interface StaffUser {
  id: number;
  nama: string;
  noHp: string;
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

export default function DetailTugas() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = getAuthRole() || 'STAF';
  const isKadivDir = ['KADIV', 'DIREKTUR'].includes(userRole);
  const isKadiv = userRole === 'KADIV';
  const isKoor = userRole === 'KOORDINATOR';
  const isAtasan = isKoor || isKadivDir;
  const isStaf = userRole === 'STAF';

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  const [laporanText, setLaporanText] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [kendalaText, setKendalaText] = useState('');
  const [evaluasiNote, setEvaluasiNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showDelegasiForm, setShowDelegasiForm] = useState(false);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  const toDateTimeLocalInput = (isoStr: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const fetchDetail = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await api.get(`/tickets/${id}`);
      const ticketData = response.data.data;

      if (ticketData.jenisTiket === 'LAPORAN') {
        navigate(`/detail-laporan/${id}`, { replace: true });
        return;
      }

      setTicket(ticketData);

      if (isAtasan && !isBackground) {
        const [divRes, staffRes] = await Promise.all([
          api.get('/auth/divisi'),
          api.get('/tickets/staff'),
        ]);
        setDivisiList(divRes.data.data || divRes.data || []);
        setStaffList(staffRes.data.data || staffRes.data || []);

        setTriageForm({
          divisiId: ticketData.divisi?.id ? String(ticketData.divisi.id) : '',
          prioritas: ticketData.prioritas || 'MEDIUM',
          pelaksanaId: ticketData.pelaksana?.id ? String(ticketData.pelaksana.id) : '',
          deadline: toDateTimeLocalInput(ticketData.deadline),
          catatanRevisi: ticketData.catatanRevisi || '',
        });
      }
    } catch (error: any) {
      if (!isBackground) {
        console.error('Gagal mengambil detail tugas', error);
        alert(error.response?.data?.message || 'Gagal memuat data tugas.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail(false);
      const intervalId = setInterval(() => fetchDetail(true), 12000);
      return () => clearInterval(intervalId);
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: 'Menunggu Triase',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'DIPROSES':
        return {
          label: 'Sedang Dikerjakan',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-600',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'Menunggu Validasi',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          dot: 'bg-indigo-600',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Tertahan (Kendala)',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-600',
        };
      case 'SELESAI':
        return {
          label: 'Selesai Tuntas',
          bg: 'bg-blue-100 text-brand-deep border-brand-mint/50',
          dot: 'bg-brand-mint',
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  };

  const getWhatsAppLink = (noHp?: string, msg?: string) => {
    if (!noHp) return '#';
    let wa = noHp.replace(/[\s\-]/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    return `https://wa.me/${wa}?text=${encodeURIComponent(
      msg || 'Halo, terkait tugas penugasan E-Ticketing RSIA...'
    )}`;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFotoBase64(await compressImageToBase64(file));
  };

  const handleLaporSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoBase64) return alert('Foto dokumentasi bukti pekerjaan wajib diunggah!');
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: laporanText,
        fotoBukti: fotoBase64,
      });
      alert('Laporan penyelesaian berhasil dikirim untuk divalidasi!');
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirim laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaporKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendalaText) return alert('Tuliskan alasan kendala pekerjaan.');
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: 'HOLD_ESKALASI',
        catatanRevisi: kendalaText,
      });
      alert('Tugas ditandai tertahan (Eskalasi ke Supervisor).');
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirim laporan kendala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEvaluasi = async (keputusan: 'SELESAI' | 'DIPROSES') => {
    if (keputusan === 'DIPROSES' && !evaluasiNote.trim()) {
      return alert('Mohon tulis catatan revisi untuk staf pelaksana.');
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: keputusan,
        catatanRevisi: evaluasiNote.trim() || null,
      });
      alert(`Tugas ${keputusan === 'SELESAI' ? 'berhasil disetujui' : 'dikembalikan untuk direvisi'}.`);
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan evaluasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelegasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/tickets/${id}/triage`, {
        divisiId: Number(triageForm.divisiId),
        prioritas: triageForm.prioritas,
        pelaksanaId: Number(triageForm.pelaksanaId),
        deadline: new Date(triageForm.deadline).toISOString(),
        status: 'DIPROSES',
        catatanRevisi: triageForm.catatanRevisi,
      });
      alert('Tugas berhasil didelegasikan!');
      setShowDelegasiForm(false);
      fetchDetail(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan pendelegasian.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // State untuk respons kendala
  const [responKendalaNote, setResponKendalaNote] = useState('');
  const [newDeadline, setNewDeadline] = useState(''); // <--- State baru
  const [eskalasiLanjutNote, setEskalasiLanjutNote] = useState('');

  const handleResponKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responKendalaNote.trim()) return alert('Tuliskan respons atau solusi untuk staf.');
    
    setIsSubmitting(true);
    try {
      const payload: any = { 
        status: 'DIPROSES', 
        catatanRevisi: `[Respons Koordinator]: ${responKendalaNote.trim()}` 
      };

      // Jika input deadline diisi, tambahkan ke payload
      if (newDeadline) {
        payload.deadline = new Date(newDeadline).toISOString();
      }

      await api.patch(`/tickets/${id}/status`, payload);
      alert('Respons terkirim dan tugas dilanjutkan (DIPROSES).');
      setResponKendalaNote('');
      setNewDeadline(''); // Reset form
      fetchDetail(true);
    } catch (error: any) { 
      alert(error.response?.data?.message || 'Gagal mengirim respons kendala.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleEskalasiLanjut = async () => {
    if (!eskalasiLanjutNote.trim()) return alert('Tuliskan catatan eskalasi untuk atasan.');
    setIsSubmitting(true);
    try {
      // Menggabungkan catatan staf lama dengan catatan dari atasan yang mengeskalasi
      const payload = {
        status: 'HOLD_ESKALASI',
        catatanRevisi: `${ticket?.catatanRevisi || ''}\n\n[Eskalasi ${userRole}]: ${eskalasiLanjutNote.trim()}`
      };

      await api.patch(`/tickets/${id}/status`, payload);
      alert('Kendala berhasil dieskalasikan ke tingkat selanjutnya.');
      setEskalasiLanjutNote('');
      fetchDetail(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal meneruskan eskalasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Memuat rincian tiket tugas...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          ✕
        </div>
        <p className="text-lg font-bold text-clinical-ink">Tiket Tidak Ditemukan</p>
        <button
          onClick={() => navigate('/semua-tugas')}
          className="h-11 px-5 bg-brand-deep text-white rounded-2xl text-xs font-bold"
        >
          Kembali ke Daftar Tugas
        </button>
      </div>
    );
  }

  const badge = getStatusBadge(ticket.status);
  const isOverdue =
    ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'SELESAI';

  const totalChild = ticket.childTickets?.length || 0;
  const completedChild =
    ticket.childTickets?.filter((c) => c.status === 'SELESAI').length || 0;
  const progressPercent = totalChild === 0 ? 0 : Math.round((completedChild / totalChild) * 100);

  return (
    <div className="min-h-screen bg-clinical-bg pb-28 md:pb-12">
      {/* 1. TOP NAV BAR */}
      <div className="bg-clinical-surface border-b border-clinical-border px-4 py-4 sm:px-6 shadow-xs sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl border border-clinical-border hover:bg-slate-100 text-clinical-ink text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-brand-deep bg-blue-50 px-2.5 py-1 rounded-xl">
              #T-{String(ticket.id).padStart(3, '0')}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${badge.bg}`}
            >
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* 2. SLA HEADER CARD */}
        <div className="bg-clinical-surface rounded-3xl border border-clinical-border shadow-xs p-5 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                    ticket.prioritas === 'HIGH'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : ticket.prioritas === 'MEDIUM'
                      ? 'bg-brand-orange-soft text-brand-orange border border-brand-orange/30'
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}
                >
                  Prioritas: {ticket.prioritas}
                </span>

                {ticket.divisi?.nama && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700">
                    Divisi: {ticket.divisi.nama}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-clinical-ink leading-tight">
                {ticket.judul}
              </h1>

              {ticket.lokasi && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{ticket.lokasi}</span>
                </div>
              )}
            </div>

            {/* SLA / Deadline Pill */}
            <div
              className={`p-4 rounded-3xl border-2 flex flex-col justify-center min-w-[200px] shrink-0 ${
                isOverdue
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-brand-mint/40 bg-blue-50/60 text-brand-deep'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Target Batas Waktu (SLA)
              </span>
              <p className="text-sm sm:text-base font-extrabold mt-1">
                {ticket.deadline
                  ? new Intl.DateTimeFormat('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(ticket.deadline))
                  : 'Belum ditentukan'}
              </p>
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 mt-1 uppercase">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  <span>SLA Terlewati (Urgent)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. GRID UTAMA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* KOLOM KIRI (KONTEN) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Deskripsi & Foto Referensi */}
            <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-clinical-border/60 pb-3">
                Deskripsi & Panduan Pekerjaan
              </h3>

              <div className="text-sm font-medium text-clinical-body bg-slate-50 p-4 rounded-2xl border border-clinical-border/60 leading-relaxed whitespace-pre-wrap">
                {ticket.deskripsi}
              </div>

              {ticket.fotoInstruksi && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-clinical-ink">
                    Foto Bukti Masalah / Panduan Awal:
                  </p>
                  <a
                    href={ticket.fotoInstruksi}
                    target="_blank"
                    rel="noreferrer"
                    className="block group rounded-2xl overflow-hidden border border-clinical-border shadow-xs hover:shadow-md transition max-w-md"
                  >
                    <img
                      src={ticket.fotoInstruksi}
                      alt="Referensi Tugas"
                      className="w-full h-48 sm:h-60 object-cover group-hover:scale-102 transition duration-300"
                    />
                  </a>
                </div>
              )}
            </div>

            {/* Sub-Tugas / Delegasi */}
            {ticket.childTickets && ticket.childTickets.length > 0 && (
              <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-clinical-border/60 pb-3">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      Delegasi Sub-Tugas
                    </h3>
                    <p className="text-sm font-extrabold text-clinical-ink mt-0.5">
                      Progres: {progressPercent}% ({completedChild}/{totalChild} Selesai)
                    </p>
                  </div>
                  <div className="w-28 sm:w-40 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-clinical-border">
                    <div
                      className="bg-brand-mint h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  {ticket.childTickets.map((child) => (
                    <div
                      key={child.id}
                      onClick={() => navigate(`/detail-tugas/${child.id}`)}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/50 border border-clinical-border rounded-2xl cursor-pointer transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand-deep">
                            #T-{String(child.id).padStart(3, '0')}
                          </span>
                          <span className="text-xs font-bold text-clinical-ink truncate">
                            {child.judul}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pelaksana: <strong className="text-slate-700">{child.pelaksana?.nama || 'Belum ditunjuk'}</strong>
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap ${
                          child.status === 'SELESAI'
                            ? 'bg-blue-100 text-brand-deep'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {child.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bukti Pekerjaan Selesai */}
            {(ticket.fotoBukti || ticket.laporanPenyelesaian) && (
              <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-brand-mint/40 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-brand-mint/30 pb-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-deep" />
                  <h3 className="text-xs font-extrabold text-brand-deep uppercase tracking-widest">
                    Laporan Hasil Pekerjaan Selesai
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ticket.fotoBukti && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                        Foto Bukti Selesai
                      </p>
                      <a
                        href={ticket.fotoBukti}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl overflow-hidden border border-clinical-border shadow-xs"
                      >
                        <img
                          src={ticket.fotoBukti}
                          alt="Bukti Selesai"
                          className="h-44 w-full object-cover"
                        />
                      </a>
                    </div>
                  )}

                  {ticket.laporanPenyelesaian && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                        Catatan Staf Pelaksana
                      </p>
                      <div className="p-4 bg-blue-50/50 rounded-2xl border border-brand-mint/30 text-xs sm:text-sm font-medium text-brand-deep leading-relaxed italic">
                        "{ticket.laporanPenyelesaian}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TIMELINE RIWAYAT TINDAKAN */}
            {ticket.logs && ticket.logs.length > 0 && (
              <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-clinical-border/60 pb-3">
                  Riwayat Tindakan & Timeline Perubahan
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-clinical-border">
                  {ticket.logs.map((log) => (
                    <div key={log.id} className="relative group">
                      <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-deep ring-4 ring-blue-100" />

                      <div className="bg-slate-50 p-4 rounded-2xl border border-clinical-border/60 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <p className="text-xs font-extrabold text-clinical-ink">
                            {log.user.nama}{' '}
                            <span className="text-[10px] text-brand-deep bg-blue-50 px-2 py-0.5 rounded-full uppercase font-bold">
                              {log.user.role}
                            </span>
                          </p>
                          <time className="text-[10px] text-slate-400 font-semibold">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            }).format(new Date(log.createdAt))}
                          </time>
                        </div>

                        <p className="text-xs text-slate-600">
                          Status diubah menjadi{' '}
                          <strong className="text-clinical-ink font-bold">
                            {log.statusBaru.replace('_', ' ')}
                          </strong>
                        </p>

                        {log.catatan && (
                          <p className="text-xs text-clinical-body italic bg-white p-3 rounded-xl border border-clinical-border/60 mt-2">
                            "{log.catatan}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KOLOM KANAN: SIDEBAR PIHAK TERLIBAT & AKSI */}
          <div className="space-y-6">
            {/* Pihak Terlibat */}
            <div className="bg-clinical-surface p-5 rounded-3xl border border-clinical-border shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-clinical-border/60 pb-3">
                Pihak Terlibat
              </h3>

              {/* Pembuat */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Pelapor / Pembuat</p>
                  <p className="text-xs font-bold text-clinical-ink truncate">
                    {ticket.pembuat?.nama || '-'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {ticket.pembuat?.role || '-'}
                  </p>
                </div>
              </div>

              {/* Pelaksana */}
              <div className="flex items-center gap-3 pt-3 border-t border-clinical-border/60">
                <div className="w-10 h-10 rounded-2xl bg-brand-peach text-brand-deep font-bold text-xs flex items-center justify-center shrink-0">
                  {ticket.pelaksana?.nama ? ticket.pelaksana.nama.substring(0, 2).toUpperCase() : 'ST'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Staf Pelaksana</p>
                  <p className="text-xs font-bold text-clinical-ink truncate">
                    {ticket.pelaksana?.nama || 'Belum Ditunjuk'}
                  </p>
                  <p className="text-[10px] text-brand-deep font-semibold">
                    {ticket.pelaksana?.role || 'Siaga'}
                  </p>
                </div>
              </div>

              {/* WhatsApp Button */}
              {ticket.pelaksana?.noHp && (
                <a
                  href={getWhatsAppLink(
                    ticket.pelaksana.noHp,
                    `Halo ${ticket.pelaksana.nama}, terkait tugas #${ticket.id} (${ticket.judul})...`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-11 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-brand-deep text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-brand-deep" />
                  <span>Hubungi via WhatsApp</span>
                </a>
              )}
            </div>

            {/* A. STAF: LAPOR SELESAI */}
            {isStaf && (ticket.status === 'DIPROSES' || ticket.status === 'HOLD_ESKALASI') && (
              <div className="bg-clinical-surface p-5 rounded-3xl border-2 border-brand-mint shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-deep animate-ping" />
                  <h3 className="text-sm font-extrabold text-clinical-ink">
                    Lapor Tugas Selesai
                  </h3>
                </div>

                <form onSubmit={handleLaporSelesai} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1">
                      Foto Bukti Dokumentasi *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      required
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-brand-deep"
                    />
                    {fotoBase64 && (
                      <img
                        src={fotoBase64}
                        alt="Preview Selesai"
                        className="mt-2 h-28 w-full object-cover rounded-2xl border border-clinical-border"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1">
                      Catatan Penyelesaian *
                    </label>
                    <textarea
                      rows={3}
                      value={laporanText}
                      onChange={(e) => setLaporanText(e.target.value)}
                      required
                      placeholder="Jelaskan tindakan yang telah Anda selesaikan..."
                      className="w-full p-3 bg-slate-50 border border-clinical-border rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-brand-deep hover:bg-brand-deeper active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isSubmitting ? 'Mengirim...' : 'Kirim Bukti & Tandai Selesai'}</span>
                  </button>
                </form>

                {/* Kendala Eskalasi */}
                <div className="pt-3 border-t border-clinical-border/60">
                  <details className="group">
                    <summary className="text-xs font-bold text-brand-orange cursor-pointer list-none flex items-center justify-between hover:underline">
                      <span>Lapor Kendala Biaya / Alat</span>
                      <span className="text-xs group-open:rotate-180 transition">▼</span>
                    </summary>
                    <form onSubmit={handleLaporKendala} className="mt-3 space-y-2.5">
                      <textarea
                        rows={2}
                        value={kendalaText}
                        onChange={(e) => setKendalaText(e.target.value)}
                        required
                        placeholder="Sebutkan kendala biaya, sparepart, atau koordinasi..."
                        className="w-full p-2.5 bg-brand-orange-soft/50 border border-brand-orange/40 rounded-xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 bg-brand-orange hover:bg-brand-orange/90 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-xs transition"
                      >
                        Ajukan Eskalasi Penundaan
                      </button>
                    </form>
                  </details>
                </div>
              </div>
            )}

            {/* B. ATASAN: EVALUASI VALIDASI */}
            {isAtasan && ticket.status === 'MENUNGGU_VALIDASI' && (
              <div className="bg-clinical-surface p-5 rounded-3xl border-2 border-indigo-200 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                  <h3 className="text-sm font-extrabold text-indigo-950">
                    Evaluasi Hasil Pekerjaan
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Tinjau foto dokumentasi sebelum memberi persetujuan:
                </p>

                <textarea
                  rows={2}
                  value={evaluasiNote}
                  onChange={(e) => setEvaluasiNote(e.target.value)}
                  placeholder="Catatan evaluasi atau instruksi revisi..."
                  className="w-full p-3 bg-slate-50 border border-clinical-border rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEvaluasi('SELESAI')}
                    disabled={isSubmitting}
                    className="w-full h-12 bg-brand-deep hover:bg-brand-deeper active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui (Tugas Selesai)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvaluasi('DIPROSES')}
                    disabled={isSubmitting}
                    className="w-full h-11 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    <span>Minta Revisi Ulang</span>
                  </button>
                ) : (
                  <form onSubmit={handleDelegasiSubmit} className="space-y-3 mt-2 border-t border-slate-100 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Divisi Pelaksana *</label>
                      <select value={triageForm.divisiId} onChange={(e) => setTriageForm({ ...triageForm, divisiId: e.target.value, pelaksanaId: '' })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs">
                        <option value="">-- Pilih Divisi --</option>
                        {divisiList.map((d) => (<option key={d.id} value={String(d.id)}>{d.nama}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Staf / Pelaksana *</label>
                      <select value={triageForm.pelaksanaId} onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs">
                        <option value="">-- Pilih Pelaksana --</option>
                        {staffList.filter((s) => !triageForm.divisiId || String(s.divisiId) === String(triageForm.divisiId)).map((s) => (<option key={s.id} value={String(s.id)}>{s.nama}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Batas Waktu *</label>
                      <input type="datetime-local" value={triageForm.deadline} onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowDelegasiForm(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                      <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Delegasi'}
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          )}

          {/* C. ATASAN: EVALUASI HASIL KERJA */}
          {isAtasan && ticket.status === 'MENUNGGU_VALIDASI' && (
            <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <h3 className="text-sm font-bold text-purple-800 mb-2 border-b border-purple-100 pb-2">Evaluasi Akhir</h3>
              <p className="text-[10px] text-slate-500 mb-3">Tinjau foto bukti sebelum memberikan persetujuan.</p>
              
              <textarea rows={2} value={evaluasiNote} onChange={(e) => setEvaluasiNote(e.target.value)} className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs mb-3" placeholder="Tuliskan alasan revisi di sini (jika menolak)..." />
              
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEvaluasi('SELESAI')} disabled={isSubmitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  Setujui (Tugas Selesai)
                </button>
                <button onClick={() => handleEvaluasi('DIPROSES')} disabled={isSubmitting} className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition">
                  Tolak (Minta Direvisi)
                </button>
              </div>
            </div>
          )}
          
          {/* D. KADIV/DIREKTUR: ESKALASI */}
          {isKadivDir && ticket.status === 'HOLD_ESKALASI' && (
             <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-300 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                 <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                 </span>
                 <h3 className="text-sm font-bold text-amber-900">Perlu Keputusan Manajerial</h3>
               </div>
               
               <p className="text-xs text-amber-800 mb-4 bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/50">
                 Tugas ini dilaporkan terkendala oleh pelaksana (Alat rusak / Butuh biaya).
               </p>
               
               <button onClick={() => navigate('/semua-tugas')} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  Proses Pengajuan Eskalasi
               </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
