// Frontend/src/pages/DetailTugas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  MapPin,
  Maximize2,
  MessageCircle,
  Play,
  Plus,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole, getAuthUserId } from '../utils/authStorage';

interface TicketLog {
  id: number;
  statusSebelumnya: string | null;
  statusBaru: string;
  catatan: string | null;
  createdAt: string;
  user: { id: number; nama: string; role: string };
}

interface SubTicketItem {
  id: number;
  judul: string;
  status: string;
  prioritas: string;
  deadline: string | null;
  completedAt: string | null;
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string };
  childTickets?: Array<{
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    completedAt: string | null;
    pembuat?: { id: number; nama: string; role: string };
    pelaksana?: { id: number; nama: string; role: string };
  }>;
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
    jenisTiket?: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    pembuat?: { id: number; nama: string; role: string };
  } | null;
  childTickets?: SubTicketItem[];
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

const getMinDateTimeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function DetailTugas() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const userRole = getAuthRole() || 'STAF';
  const currentUserId = getAuthUserId();
  const isKadivDir = ['KADIV', 'DIREKTUR'].includes(userRole);
  const isKadiv = userRole === 'KADIV';
  const isKoor = userRole === 'KOORDINATOR';
  const isAtasan = isKoor || isKadivDir;

  const [laporanText, setLaporanText] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [laporSelesaiErrors, setLaporSelesaiErrors] = useState<{
    foto?: string;
    catatan?: string;
  }>({});
  const [kendalaText, setKendalaText] = useState('');
  const [kendalaError, setKendalaError] = useState('');
  const [evaluasiNote, setEvaluasiNote] = useState('');
  const [evaluasiError, setEvaluasiError] = useState('');
  const [tindakLanjutKendalaNote, setTindakLanjutKendalaNote] = useState('');
  const [tindakLanjutError, setTindakLanjutError] = useState('');
  const [perpanjangDeadline, setPerpanjangDeadline] = useState(false);
  const [newDeadline, setNewDeadline] = useState('');
  const [deadlineError, setDeadlineError] = useState('');
  const [isKerjakanSendiri, setIsKerjakanSendiri] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const isPdfInstruction = Boolean(
    ticket?.fotoInstruksi?.startsWith('data:application/pdf')
  );

  const instructionPdfBlobUrl = React.useMemo(() => {
    if (!ticket?.fotoInstruksi || !isPdfInstruction) return null;
    try {
      const base64Data = ticket.fotoInstruksi.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }, [ticket?.fotoInstruksi, isPdfInstruction]);

  useEffect(() => {
    return () => {
      if (instructionPdfBlobUrl) {
        URL.revokeObjectURL(instructionPdfBlobUrl);
      }
    };
  }, [instructionPdfBlobUrl]);

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

  // Ambil seluruh jejak catatan eskalasi berurutan sejak kendala pertama kali dilaporkan
  const escalationChainLogs = useMemo(() => {
    if (!ticket?.logs || ticket.logs.length === 0) return [];
    const sorted = [...ticket.logs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let lastHoldStartIndex = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].statusBaru === 'HOLD_ESKALASI') {
        lastHoldStartIndex = i;
      } else if (lastHoldStartIndex !== -1) {
        break;
      }
    }
    if (lastHoldStartIndex === -1) return [];
    return sorted.slice(lastHoldStartIndex).filter((log) => log.statusBaru === 'HOLD_ESKALASI');
  }, [ticket?.logs]);

  // Kumpulkan seluruh sub-tugas langsung maupun sub-tugas lanjutan buatan Koordinator
  const allDescendantTickets = useMemo(() => {
    if (!ticket?.childTickets) return [];
    const list: Array<{ id: number; status: string }> = [];
    ticket.childTickets.forEach((child) => {
      list.push(child);
      if (child.childTickets && child.childTickets.length > 0) {
        child.childTickets.forEach((grandChild) => list.push(grandChild));
      }
    });
    return list;
  }, [ticket?.childTickets]);

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
          label: 'Ada Kendala',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          dot: 'bg-rose-600',
        };
      case 'SELESAI':
        return {
          label: 'Selesai',
          bg: 'bg-blue-100 text-brand-deep border-brand-mint/50',
          dot: 'bg-brand-mint',
        };
      case 'DITOLAK':
        return {
          label: 'Ditolak / Dibatalkan',
          bg: 'bg-slate-200 text-slate-800 border-slate-300',
          dot: 'bg-slate-600',
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
    if (!file) return;

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedImageTypes.includes(file.type)) {
      setFotoBase64('');
      setLaporSelesaiErrors((prev) => ({
        ...prev,
        foto: 'Format file tidak didukung. Unggah gambar (JPG, PNG).',
      }));
      e.target.value = '';
      return;
    }

    try {
      setFotoBase64(await compressImageToBase64(file));
      setLaporSelesaiErrors((prev) => ({ ...prev, foto: undefined }));
    } catch {
      setFotoBase64('');
      setLaporSelesaiErrors((prev) => ({
        ...prev,
        foto: 'File gambar rusak atau tidak dapat diproses.',
      }));
      e.target.value = '';
    }
  };

  const handleLaporSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { foto?: string; catatan?: string } = {};
    if (!fotoBase64) errors.foto = 'Foto bukti dokumentasi wajib diunggah';
    if (!laporanText.trim()) errors.catatan = 'Catatan penyelesaian wajib diisi';

    if (errors.foto || errors.catatan) {
      setLaporSelesaiErrors(errors);
      return;
    }

    setLaporSelesaiErrors({});
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
    if (!kendalaText.trim()) {
      setKendalaError('Alasan kendala wajib diisi');
      return;
    }
    setKendalaError('');
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
      setEvaluasiError('Catatan revisi wajib diisi');
      return;
    }
    setEvaluasiError('');
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

  const handleTindakLanjutKendala = async (aksi: 'LANJUTKAN' | 'ESKALASI') => {
    let hasError = false;
    if (!tindakLanjutKendalaNote.trim()) {
      setTindakLanjutError(
        aksi === 'ESKALASI'
          ? `Alasan eskalasi ke ${isKadiv ? 'Direktur' : 'Kadiv'} wajib diisi`
          : 'Arahan tindak lanjut wajib diisi'
      );
      hasError = true;
    } else {
      setTindakLanjutError('');
    }

    if (perpanjangDeadline) {
      if (!newDeadline) {
        setDeadlineError('Batas waktu baru wajib diisi');
        hasError = true;
      } else if (new Date(newDeadline) < new Date()) {
        setDeadlineError('Batas waktu tidak boleh di masa lalu');
        hasError = true;
      } else {
        setDeadlineError('');
      }
    } else {
      setDeadlineError('');
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      const targetEskalasi = isKadiv ? 'DIREKTUR' : 'KADIV';
      const statusTujuan = aksi === 'LANJUTKAN' ? 'DIPROSES' : 'HOLD_ESKALASI';
      const formattedNewDeadline =
        perpanjangDeadline && newDeadline
          ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(newDeadline))
          : null;

      const infoPerpanjangan = formattedNewDeadline
        ? ` (Batas waktu diperpanjang hingga ${formattedNewDeadline})`
        : '';

      const catatanFinal =
        aksi === 'LANJUTKAN'
          ? `[Arahan ${userRole}]: ${tindakLanjutKendalaNote.trim()}${infoPerpanjangan}`
          : `[Eskalasi ${userRole} ke ${targetEskalasi}]: ${tindakLanjutKendalaNote.trim()}${infoPerpanjangan}`;

      await api.patch(`/tickets/${id}/status`, {
        status: statusTujuan,
        catatanRevisi: catatanFinal,
        ...(perpanjangDeadline && newDeadline
          ? { deadline: new Date(newDeadline).toISOString() }
          : {}),
      });

      alert(
        aksi === 'LANJUTKAN'
          ? 'Kendala berhasil ditindaklanjuti! Tugas kini kembali berstatus Sedang Dikerjakan.'
          : `Masalah berhasil dieskalasikan ke ${isKadiv ? 'Direktur' : 'Kadiv'}.`
      );
      setTindakLanjutKendalaNote('');
      setPerpanjangDeadline(false);
      setNewDeadline('');
      await fetchDetail(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal memproses tindak lanjut kendala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMulaiKerjakanSendiri = async () => {
    if (!ticket) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, {
        status: 'DIPROSES',
        catatanRevisi: `[Dikerjakan oleh ${userRole}]`,
      });
      await fetchDetail(true);
      setIsKerjakanSendiri(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal memperbarui status pengerjaan tugas.');
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
    ticket.deadline &&
    new Date(ticket.deadline) < new Date() &&
    ticket.status !== 'SELESAI' &&
    ticket.status !== 'DITOLAK';

  const totalChild = allDescendantTickets.length;
  const completedChild = allDescendantTickets.filter((c) => c.status === 'SELESAI').length;
  const progressPercent = totalChild === 0 ? 0 : Math.round((completedChild / totalChild) * 100);

  const isAssignedToCurrentUser =
    Boolean(
      currentUserId &&
        ticket.pelaksana?.id &&
        String(ticket.pelaksana.id) === String(currentUserId)
    ) ||
    (!ticket.pelaksana && isKadiv && ticket.pembuat?.role === 'DIREKTUR');

  const isCreatorOfTicket = Boolean(
    currentUserId && ticket.pembuat?.id && String(ticket.pembuat.id) === String(currentUserId)
  );

  const canEvaluate =
    ticket.status === 'MENUNGGU_VALIDASI' &&
    isAtasan &&
    isCreatorOfTicket &&
    !isAssignedToCurrentUser;

  const isEscalatedToKadiv = Boolean(
    ticket.catatanRevisi?.includes('[Eskalasi KOORDINATOR ke KADIV]')
  );
  const isEscalatedToDirektur = Boolean(
    ticket.catatanRevisi?.includes('[Eskalasi KADIV ke DIREKTUR]')
  );

  const canHandleEscalation =
    ticket.status === 'HOLD_ESKALASI' &&
    !isAssignedToCurrentUser &&
    ((isKoor && !isEscalatedToKadiv && !isEscalatedToDirektur) ||
      (isKadiv &&
        (isEscalatedToKadiv ||
          (!isEscalatedToDirektur && ticket.pembuat?.role !== 'KOORDINATOR'))) ||
      (userRole === 'DIREKTUR' &&
        (isEscalatedToDirektur ||
          (!isEscalatedToKadiv &&
            ticket.pembuat?.role !== 'KOORDINATOR' &&
            ticket.pembuat?.role !== 'KADIV'))));

  const canMulaiKerjakan =
    isAssignedToCurrentUser &&
    ['MENUNGGU_TRIASE', 'HOLD_ESKALASI'].includes(ticket.status);

  const showFormLaporSelesai =
    isAssignedToCurrentUser &&
    (ticket.status === 'DIPROSES' || (ticket.status === 'HOLD_ESKALASI' && isKerjakanSendiri));

  const directiveBadge =
    ticket.pembuat?.role === 'DIREKTUR'
      ? {
          label: 'Arahan Direksi',
          style: 'bg-purple-100 text-purple-800 border border-purple-300',
        }
      : ticket.pembuat?.role === 'KADIV'
      ? {
          label: 'Arahan Divisi',
          style: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
        }
      : null;

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
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* SUMBER TUGAS / TIKET INDUK */}
        {ticket.parentTicket && (
          <div className="p-4 sm:p-5 bg-blue-50/70 border border-brand-mint/40 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-brand-deep uppercase tracking-widest bg-white/90 px-2.5 py-0.5 rounded-full">
                Sumber Tugas (Tiket Induk)
              </span>
              <p className="text-sm font-extrabold text-clinical-ink mt-1.5 truncate">
                #{ticket.parentTicket.jenisTiket === 'LAPORAN' ? 'L' : 'T'}-
                {String(ticket.parentTicket.id).padStart(3, '0')} — {ticket.parentTicket.judul}
              </p>
              {ticket.parentTicket.pembuat?.nama && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Dibuat oleh{' '}
                  <strong className="text-slate-700">
                    {ticket.parentTicket.pembuat.nama}
                  </strong>{' '}
                  ({ticket.parentTicket.pembuat.role})
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(
                  ticket.parentTicket!.jenisTiket === 'LAPORAN'
                    ? `/detail-laporan/${ticket.parentTicket!.id}`
                    : `/detail-tugas/${ticket.parentTicket!.id}`
                )
              }
              className="h-10 px-4 bg-white hover:bg-slate-50 border border-clinical-border text-brand-deep font-bold text-xs rounded-2xl shadow-xs transition whitespace-nowrap self-start sm:self-auto"
            >
              Lihat Tiket Sumber
            </button>
          </div>
        )}

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

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  <span>{badge.label}</span>
                </span>

                {directiveBadge && (
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${directiveBadge.style}`}
                  >
                    {directiveBadge.label}
                  </span>
                )}

                {ticket.parentTicket && (
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    Sub-Tugas
                  </span>
                )}

                {ticket.divisi?.nama && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
                Target Batas Waktu
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
                  <span>Tenggat Waktu Terlewati (Urgent)</span>
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
                    Lampiran Bukti Masalah / Panduan Awal:
                  </p>
                  {isPdfInstruction && instructionPdfBlobUrl ? (
                    <div className="space-y-2.5 max-w-2xl">
                      <div className="rounded-2xl overflow-hidden border border-clinical-border bg-slate-100 shadow-xs">
                        <iframe
                          src={`${instructionPdfBlobUrl}#toolbar=1&navpanes=0`}
                          title={`Lampiran PDF Tugas #T-${String(ticket.id).padStart(3, '0')}`}
                          className="w-full h-80 sm:h-96 border-0"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPdfUrl(instructionPdfBlobUrl)}
                          className="inline-flex items-center gap-1.5 h-9 px-4 bg-brand-deep hover:bg-brand-deep/90 text-white text-xs font-bold rounded-xl shadow-xs transition"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Layar Penuh</span>
                        </button>
                        <a
                          href={instructionPdfBlobUrl}
                          download={`Lampiran_Tugas_${ticket.id}.pdf`}
                          className="inline-flex items-center gap-1.5 h-9 px-4 bg-white hover:bg-slate-50 border border-clinical-border text-clinical-ink text-xs font-bold rounded-xl shadow-xs transition"
                        >
                          <span>Unduh PDF</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setPreviewImage(ticket.fotoInstruksi!)}
                      className="relative group cursor-pointer rounded-2xl overflow-hidden border border-clinical-border shadow-xs hover:shadow-md transition max-w-md bg-slate-50"
                    >
                      <img
                        src={ticket.fotoInstruksi}
                        alt="Referensi Tugas"
                        className="w-full h-48 sm:h-60 object-cover group-hover:scale-102 transition duration-300"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(ticket.fotoInstruksi!);
                        }}
                        title="Perbesar Gambar"
                        className="absolute top-3 right-3 p-2 bg-slate-900/75 hover:bg-slate-900 text-white rounded-xl shadow-md backdrop-blur-xs transition"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Banner Laporan Kendala / Catatan Arahan, Revisi & Evaluasi */}
            {(ticket.status === 'HOLD_ESKALASI' || ticket.catatanRevisi) && (
              <div
                className={`p-5 sm:p-6 rounded-3xl border shadow-xs space-y-2.5 ${
                  ticket.status === 'HOLD_ESKALASI'
                    ? 'bg-rose-50/70 border-rose-200'
                    : ticket.status === 'SELESAI'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {ticket.status === 'SELESAI' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        ticket.status === 'HOLD_ESKALASI' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                  )}
                  <h3
                    className={`text-xs font-extrabold uppercase tracking-widest ${
                      ticket.status === 'HOLD_ESKALASI'
                        ? 'text-rose-700'
                        : ticket.status === 'SELESAI'
                        ? 'text-emerald-800'
                        : 'text-amber-800'
                    }`}
                  >
                    {ticket.status === 'HOLD_ESKALASI'
                      ? 'Laporan Kendala Lapangan (Eskalasi)'
                      : ticket.status === 'SELESAI'
                      ? 'Catatan Persetujuan / Evaluasi Akhir'
                      : 'Catatan Arahan / Revisi Terbaru'}
                  </h3>
                </div>

                {ticket.status === 'HOLD_ESKALASI' && escalationChainLogs.length > 0 ? (
                  <div className="space-y-2">
                    {escalationChainLogs.map((log, idx) => (
                      <div
                        key={log.id}
                        className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-extrabold text-rose-800">
                            {idx === 0
                              ? `1. Laporan Awal (${log.user.nama} - ${log.user.role})`
                              : `${idx + 1}. Tindak Lanjut (${log.user.nama} - ${log.user.role})`}
                          </span>
                          <span className="text-slate-400 font-medium">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(log.createdAt))}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-rose-950 leading-relaxed whitespace-pre-wrap">
                          {log.catatan || 'Melaporkan kendala tanpa rincian tambahan.'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`text-sm font-medium bg-white/90 p-4 rounded-2xl border leading-relaxed whitespace-pre-wrap ${
                      ticket.status === 'HOLD_ESKALASI'
                        ? 'text-rose-950 border-rose-200/80'
                        : ticket.status === 'SELESAI'
                        ? 'text-emerald-950 border-emerald-200/80'
                        : 'text-amber-950 border-amber-200/80'
                    }`}
                  >
                    {ticket.catatanRevisi || 'Pelaksana melaporkan kendala tanpa rincian tambahan.'}
                  </p>
                )}
              </div>
            )}

            {/* Sub-Tugas / Delegasi (Termasuk Delegasi Lanjutan Koordinator ke Staf) */}
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

                <div className="space-y-3">
                  {ticket.childTickets.map((child) => (
                    <div key={child.id} className="space-y-2">
                      <div
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
                            Pelaksana:{' '}
                            <strong className="text-slate-700">
                              {child.pelaksana?.nama || 'Belum ditunjuk'}
                            </strong>
                            {child.pembuat?.nama && (
                              <span>
                                {' '}
                                • Dibuat oleh {child.pembuat.nama} ({child.pembuat.role})
                              </span>
                            )}
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

                      {/* Sub-tugas lanjutan yang dibuat oleh Koordinator untuk Staf */}
                      {child.childTickets && child.childTickets.length > 0 && (
                        <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-brand-mint/50 ml-3">
                          {child.childTickets.map((sub) => (
                            <div
                              key={sub.id}
                              onClick={() => navigate(`/detail-tugas/${sub.id}`)}
                              className="p-3 bg-blue-50/40 hover:bg-blue-50 border border-brand-mint/30 rounded-2xl cursor-pointer transition flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-bold text-brand-deep bg-white px-2 py-0.5 rounded-full border border-brand-mint/30">
                                    Delegasi Koordinator
                                  </span>
                                  <span className="font-mono text-xs font-bold text-brand-deep">
                                    #T-{String(sub.id).padStart(3, '0')}
                                  </span>
                                  <span className="text-xs font-bold text-clinical-ink truncate">
                                    {sub.judul}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Staf Pelaksana:{' '}
                                  <strong className="text-slate-700">
                                    {sub.pelaksana?.nama || 'Belum ditunjuk'}
                                  </strong>
                                  {sub.pembuat?.nama && <span> • Oleh {sub.pembuat.nama}</span>}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap ${
                                  sub.status === 'SELESAI'
                                    ? 'bg-blue-100 text-brand-deep'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {sub.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                      <div
                        onClick={() => setPreviewImage(ticket.fotoBukti!)}
                        className="relative group cursor-pointer rounded-2xl overflow-hidden border border-clinical-border shadow-xs bg-slate-50"
                      >
                        <img
                          src={ticket.fotoBukti}
                          alt="Bukti Selesai"
                          className="h-44 w-full object-cover group-hover:scale-102 transition duration-300"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(ticket.fotoBukti!);
                          }}
                          title="Perbesar Gambar"
                          className="absolute top-2.5 right-2.5 p-2 bg-slate-900/75 hover:bg-slate-900 text-white rounded-xl shadow-md backdrop-blur-xs transition"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {ticket.laporanPenyelesaian && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mb-2">
                        Catatan Pelaksana
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Ditugaskan Oleh</p>
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

            {/* A0. PELAKSANA YANG DITUNJUK: MULAI KERJAKAN TUGAS */}
            {canMulaiKerjakan && !isKerjakanSendiri && (
              <div className="bg-clinical-surface p-5 rounded-3xl border-2 border-brand-orange/40 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-ping" />
                  <h3 className="text-sm font-extrabold text-clinical-ink">
                    Konfirmasi Pengerjaan
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Tugas ini ditujukan kepada Anda. Tekan tombol di bawah untuk mulai mengerjakan dan mengubah status menjadi Sedang Dikerjakan.
                </p>
                <button
                  type="button"
                  onClick={handleMulaiKerjakanSendiri}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-brand-orange hover:bg-brand-orange/90 active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Wrench className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memproses...' : 'Kerjakan Tugas Ini'}</span>
                </button>
              </div>
            )}

            {/* A. PELAKSANA YANG DITUNJUK: LAPOR SELESAI */}
            {showFormLaporSelesai && (
              <div className="bg-clinical-surface p-5 rounded-3xl border-2 border-brand-mint shadow-md space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-deep animate-ping" />
                    <h3 className="text-sm font-extrabold text-clinical-ink">
                      Lapor Tugas Selesai
                    </h3>
                  </div>
                  {isKerjakanSendiri && (
                    <button
                      type="button"
                      onClick={() => setIsKerjakanSendiri(false)}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-700"
                    >
                      Tutup
                    </button>
                  )}
                </div>

                <form onSubmit={handleLaporSelesai} noValidate className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-[11px] font-bold text-clinical-ink uppercase">
                        Foto Bukti Dokumentasi <span className="text-rose-600">*</span>
                      </label>
                      {laporSelesaiErrors.foto && (
                        <span className="text-[11px] font-bold text-rose-600">
                          {laporSelesaiErrors.foto}
                        </span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className={`w-full text-xs text-slate-600 rounded-xl p-1 transition file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-brand-deep ${
                        laporSelesaiErrors.foto
                          ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                          : 'border border-transparent'
                      }`}
                    />
                    {fotoBase64 && (
                      <div
                        onClick={() => setPreviewImage(fotoBase64)}
                        className="relative group cursor-pointer mt-2 rounded-2xl overflow-hidden border border-clinical-border"
                      >
                        <img
                          src={fotoBase64}
                          alt="Preview Selesai"
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(fotoBase64);
                          }}
                          title="Perbesar Gambar"
                          className="absolute top-2 right-2 p-1.5 bg-slate-900/75 hover:bg-slate-900 text-white rounded-lg shadow-xs transition"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-[11px] font-bold text-clinical-ink uppercase">
                        Catatan Penyelesaian <span className="text-rose-600">*</span>
                      </label>
                      {laporSelesaiErrors.catatan && (
                        <span className="text-[11px] font-bold text-rose-600">
                          {laporSelesaiErrors.catatan}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={laporanText}
                      onChange={(e) => {
                        setLaporanText(e.target.value);
                        if (e.target.value.trim()) {
                          setLaporSelesaiErrors((prev) => ({ ...prev, catatan: undefined }));
                        }
                      }}
                      placeholder="Jelaskan tindakan yang telah Anda selesaikan..."
                      className={`w-full p-3 rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none transition ${
                        laporSelesaiErrors.catatan
                          ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                          : 'bg-slate-50 border border-clinical-border focus:ring-2 focus:ring-brand-deep'
                      }`}
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
                {ticket.status === 'DIPROSES' && (
                  <div className="pt-3 border-t border-clinical-border/60">
                    <details className="group">
                      <summary className="text-xs font-bold text-brand-orange cursor-pointer list-none flex items-center justify-between hover:underline">
                        <span>Lapor Kendala Biaya / Alat</span>
                        <span className="text-xs group-open:rotate-180 transition">▼</span>
                      </summary>
                      <form onSubmit={handleLaporKendala} noValidate className="mt-3 space-y-2.5">
                        {kendalaError && (
                          <p className="text-[11px] font-bold text-rose-600">{kendalaError}</p>
                        )}
                        <textarea
                          rows={2}
                          value={kendalaText}
                          onChange={(e) => {
                            setKendalaText(e.target.value);
                            if (e.target.value.trim()) setKendalaError('');
                          }}
                          placeholder="Sebutkan kendala biaya, sparepart, atau koordinasi..."
                          className={`w-full p-2.5 rounded-xl text-xs font-medium text-clinical-ink focus:outline-none transition ${
                            kendalaError
                              ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                              : 'bg-brand-orange-soft/50 border border-brand-orange/40 focus:ring-2 focus:ring-brand-orange'
                          }`}
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
                )}
              </div>
            )}

            {/* B. ATASAN: EVALUASI VALIDASI */}
            {canEvaluate && (
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

                {evaluasiError && (
                  <p className="text-[11px] font-bold text-rose-600">{evaluasiError}</p>
                )}
                <textarea
                  rows={2}
                  value={evaluasiNote}
                  onChange={(e) => {
                    setEvaluasiNote(e.target.value);
                    if (e.target.value.trim()) setEvaluasiError('');
                  }}
                  placeholder="Catatan evaluasi atau instruksi revisi..."
                  className={`w-full p-3 rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none transition ${
                    evaluasiError
                      ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                      : 'bg-slate-50 border border-clinical-border focus:ring-2 focus:ring-indigo-600'
                  }`}
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
                </div>
              </div>
            )}

            {/* B2. ATASAN: TINDAK LANJUT KENDALA / ESKALASI */}
            {canHandleEscalation && (
              <div className="bg-clinical-surface p-5 rounded-3xl border-2 border-rose-200 shadow-md space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <h3 className="text-sm font-extrabold text-rose-950">
                    Tindak Lanjut Kendala
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Berikan arahan solusi (misal persetujuan biaya/alat) untuk melanjutkan pengerjaan tugas
                  {userRole !== 'DIREKTUR'
                    ? `, atau eskalasikan masalah ke ${isKadiv ? 'Direktur' : 'Kadiv'} jika memerlukan keputusan lebih lanjut.`
                    : '.'}
                </p>

                {tindakLanjutError && (
                  <p className="text-[11px] font-bold text-rose-600">{tindakLanjutError}</p>
                )}
                <textarea
                  rows={3}
                  value={tindakLanjutKendalaNote}
                  onChange={(e) => {
                    setTindakLanjutKendalaNote(e.target.value);
                    if (e.target.value.trim()) setTindakLanjutError('');
                  }}
                  placeholder={
                    userRole !== 'DIREKTUR'
                      ? `Tulis arahan tindak lanjut, persetujuan biaya/sparepart, atau alasan eskalasi ke ${isKadiv ? 'Direktur' : 'Kadiv'}...`
                      : 'Tulis arahan tindak lanjut atau persetujuan biaya/sparepart...'
                  }
                  className={`w-full p-3 rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none transition ${
                    tindakLanjutError
                      ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                      : 'bg-slate-50 border border-clinical-border focus:ring-2 focus:ring-rose-500'
                  }`}
                />

                {/* Opsi Perpanjangan Batas Waktu (Opsional) */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-clinical-border space-y-2.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={perpanjangDeadline}
                      onChange={(e) => {
                        setPerpanjangDeadline(e.target.checked);
                        if (!e.target.checked) {
                          setNewDeadline('');
                          setDeadlineError('');
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-brand-deep focus:ring-brand-deep cursor-pointer"
                    />
                    <span className="text-xs font-bold text-clinical-ink flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-brand-deep" />
                      <span>Perpanjang Batas Waktu (Opsional)</span>
                    </span>
                  </label>

                  {perpanjangDeadline && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Batas Waktu Baru
                        </label>
                        {deadlineError && (
                          <span className="text-[10px] font-bold text-rose-600">
                            {deadlineError}
                          </span>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        value={newDeadline}
                        min={getMinDateTimeLocal()}
                        onChange={(e) => {
                          setNewDeadline(e.target.value);
                          if (!e.target.value) {
                            setDeadlineError('Batas waktu baru wajib diisi');
                          } else if (new Date(e.target.value) < new Date()) {
                            setDeadlineError('Batas waktu tidak boleh di masa lalu');
                          } else {
                            setDeadlineError('');
                          }
                        }}
                        className={`w-full h-10 px-3 rounded-xl text-xs font-semibold text-clinical-ink focus:outline-none transition ${
                          deadlineError
                            ? 'bg-rose-50/40 border-2 border-rose-500 ring-2 ring-rose-500/15'
                            : 'bg-white border border-clinical-border focus:ring-2 focus:ring-brand-deep'
                        }`}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTindakLanjutKendala('LANJUTKAN')}
                    disabled={isSubmitting}
                    className="w-full h-12 bg-brand-deep hover:bg-brand-deeper active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>{isSubmitting ? 'Memproses...' : 'Setujui & Lanjutkan Tugas'}</span>
                  </button>

                  {userRole !== 'DIREKTUR' && (
                    <button
                      type="button"
                      onClick={() => handleTindakLanjutKendala('ESKALASI')}
                      disabled={isSubmitting}
                      className="w-full h-11 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>
                        {isKadiv
                          ? 'Eskalasikan Masalah ke Direktur'
                          : 'Eskalasikan Masalah ke Kadiv'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* C. ATASAN: DELEGASI TUGAS */}
            {(isKoor || isKadiv) &&
              (ticket.status === 'MENUNGGU_TRIASE' ||
                ticket.status === 'DIPROSES' ||
                ticket.status === 'HOLD_ESKALASI') && (
                <div className="bg-clinical-surface p-5 rounded-3xl border border-clinical-border shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-clinical-ink">
                    Pendelegasian Tugas
                  </h3>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/tambah-tugas?parentId=${ticket.id}&parentTitle=${encodeURIComponent(
                          ticket.judul
                        )}`
                      )
                    }
                    className="w-full h-12 bg-brand-deep hover:bg-brand-deeper active:scale-98 text-white font-extrabold text-xs rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Buat Tiket Turunan Baru</span>
                  </button>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Modal Lightbox Perbesar Gambar */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              title="Tutup"
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Pratinjau Gambar Diperbesar"
              className="w-full max-h-[85vh] object-contain rounded-xl bg-white"
            />
          </div>
        </div>
      )}

      {previewPdfUrl && (
        <div
          onClick={() => setPreviewPdfUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-clinical-border flex items-center justify-between bg-clinical-surface">
              <span className="text-xs sm:text-sm font-extrabold text-clinical-ink">
                Pratinjau Dokumen Lampiran Tugas (#T-{String(ticket.id).padStart(3, '0')})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPdfUrl}
                  download={`Lampiran_Tugas_${ticket.id}.pdf`}
                  className="h-9 px-3.5 bg-brand-deep text-white text-xs font-bold rounded-xl inline-flex items-center"
                >
                  Unduh PDF
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-clinical-ink text-xs font-bold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
            <iframe
              src={previewPdfUrl}
              title="Pratinjau Dokumen PDF"
              className="w-full flex-1 border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}