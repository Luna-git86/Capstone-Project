// Frontend/src/pages/TambahTugas.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  MapPin,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole, getAuthDivisiId, getAuthUserId } from '../utils/authStorage';

interface Divisi {
  id: number;
  nama: string;
}

interface Pelaksana {
  id: number;
  nama: string;
  noHp?: string;
  role: string;
  divisiId: number | null;
  divisi?: { id: number; nama: string };
}

interface IncomingTicket {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  deadline?: string | null;
  divisiId?: number | null;
  divisi?: { id: number; nama: string } | null;
  pembuat?: { id?: number; nama: string; role: string };
  pelaksana?: { id?: number; nama: string; role: string } | null;
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

export default function TambahTugas() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  const paramParentId = searchParams.get('parentId');
  const paramParentTitle = searchParams.get('parentTitle');
  const stateSourceId = location.state?.ticketId;
  const stateSourceJudul = location.state?.judul;

  const sourceTicketId = stateSourceId || paramParentId || '';
  const sourceTicketTitle = stateSourceJudul || paramParentTitle || '';

  const userRole = getAuthRole() || 'KOORDINATOR';
  const userDivisiId = getAuthDivisiId() || '';
  const currentUserId = getAuthUserId();

  const [incomingTickets, setIncomingTickets] = useState<IncomingTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(String(sourceTicketId));

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [allStaffList, setAllStaffList] = useState<Pelaksana[]>([]);
  const [pelaksanaList, setPelaksanaList] = useState<Pelaksana[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    judul: location.state?.judul || '',
    lokasi: location.state?.lokasi || '',
    deskripsi: location.state?.deskripsi || '',
    prioritas: (location.state?.prioritas as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
    divisiId: location.state?.divisiId ? String(location.state.divisiId) : userDivisiId,
    pelaksanaIds: [] as string[],
    deadline: '',
    fotoInstruksi: location.state?.fotoInstruksi || '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [previewName, setPreviewName] = useState(
    formData.fotoInstruksi ? 'Lampiran dari Laporan Awal' : ''
  );
  const [staffSearch, setStaffSearch] = useState('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successCount, setSuccessCount] = useState<number>(0);

  const toDateTimeLocalInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const ticketRes = await api.get('/tickets');
        const allTickets: IncomingTicket[] = Array.isArray(ticketRes.data)
          ? ticketRes.data
          : ticketRes.data?.data || [];

        const delegatableTickets = allTickets.filter((t) => {
          if (t.status === 'MENUNGGU_TRIASE') return true;
          if (userRole === 'KADIV') {
            const isAssignedToKadiv =
              !t.pelaksana ||
              t.pelaksana.role === 'KADIV' ||
              (currentUserId && String(t.pelaksana.id) === String(currentUserId));
            return t.pembuat?.role === 'DIREKTUR' && isAssignedToKadiv && t.status !== 'SELESAI';
          }
          if (userRole === 'KOORDINATOR') {
            const isAssignedToKoor =
              (currentUserId && String(t.pelaksana?.id) === String(currentUserId)) ||
              t.pelaksana?.role === 'KOORDINATOR';
            const isDirective = ['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '');
            return isDirective && isAssignedToKoor && t.status !== 'SELESAI';
          }
          return false;
        });
        setIncomingTickets(delegatableTickets);
      } catch (e) {
        console.warn('Gagal memuat tiket masuk:', e);
      }

      try {
        const divRes = await api.get('/auth/divisi');
        const listDivisi: Divisi[] = divRes.data?.data || divRes.data || [];
        setDivisiList(listDivisi);
        if (!formData.divisiId && listDivisi.length > 0) {
          setFormData((prev) => ({
            ...prev,
            divisiId: prev.divisiId || String(listDivisi[0].id),
          }));
        }
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }

      try {
        const staffRes = await api.get('/tickets/staff');
        setAllStaffList(staffRes.data?.data || staffRes.data || []);
      } catch {
        try {
          const optRes = await api.get('/tickets/options');
          setAllStaffList(optRes.data?.pelaksana || []);
        } catch (errOpt) {
          console.warn('Gagal memuat staf:', errOpt);
        }
      }
    };

    loadInitialData();
  }, [userRole, currentUserId]);

  useEffect(() => {
    if (!formData.divisiId) {
      setPelaksanaList([]);
      return;
    }
    const fetchPelaksanaByDivisi = async () => {
      try {
        setLoadingOptions(true);
        const res = await api.get(`/tickets/options?divisiId=${formData.divisiId}`);
        setPelaksanaList(res.data.pelaksana || []);
      } catch {
        setPelaksanaList([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchPelaksanaByDivisi();
  }, [formData.divisiId]);

  const handleSelectIncomingTicket = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTicketId(val);
    if (!val) {
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        fotoInstruksi: '',
      }));
      setPreviewName('');
      return;
    }
    const found = incomingTickets.find((t) => String(t.id) === val);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        judul: found.judul,
        lokasi: found.lokasi || '',
        deskripsi: found.deskripsi,
        prioritas: found.prioritas || 'MEDIUM',
        divisiId: found.divisi?.id ? String(found.divisi.id) : prev.divisiId,
        pelaksanaIds: [],
        deadline: found.deadline ? toDateTimeLocalInput(found.deadline) : prev.deadline,
      }));
      setPreviewName('');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file foto gambar (JPG/PNG).');
      return;
    }
    try {
      const base64Str = await compressImageToBase64(file);
      setFormData((prev) => ({ ...prev, fotoInstruksi: base64Str }));
      setPreviewName(file.name);
    } catch {
      alert('Gagal memproses gambar foto.');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const hapusFoto = () => {
    setFormData((prev) => ({ ...prev, fotoInstruksi: '' }));
    setPreviewName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePelaksana = (staffId: string) => {
    setFormData((prev) => {
      const exists = prev.pelaksanaIds.includes(staffId);
      return {
        ...prev,
        pelaksanaIds: exists
          ? prev.pelaksanaIds.filter((id) => id !== staffId)
          : [...prev.pelaksanaIds, staffId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pelaksanaIds.length === 0) {
      setError('Wajib menunjuk minimal 1 staf pelaksana untuk tugas ini.');
      return;
    }
    if (!formData.deadline) {
      setError('Wajib menentukan batas waktu (SLA deadline).');
      return;
    }

    setError('');
    setSuccessCount(0);
    setSubmitting(true);

    try {
      const promises = formData.pelaksanaIds.map((pelaksanaId) => {
        const payload: any = {
          tipe: 'BUAT_TUGAS',
          ticketId: selectedTicketId ? Number(selectedTicketId) : undefined,
          judul: formData.judul,
          lokasi: formData.lokasi,
          deskripsi: formData.deskripsi,
          prioritas: formData.prioritas,
          divisiId: Number(formData.divisiId),
          pelaksanaId: Number(pelaksanaId),
          deadline: new Date(formData.deadline).toISOString(),
          fotoInstruksi: formData.fotoInstruksi || null,
        };

        if (paramParentId) {
          payload.parentTicketId = Number(paramParentId);
        }

        return api.post('/tickets', payload);
      });

      await Promise.all(promises);
      setSuccessCount(promises.length);

      if (!sourceTicketId) {
        setSelectedTicketId('');
      }

      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        pelaksanaIds: [],
        deadline: '',
        fotoInstruksi: '',
      }));
      setPreviewName('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menerbitkan tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const list =
      pelaksanaList.length > 0
        ? pelaksanaList
        : allStaffList.filter(
            (s) => !formData.divisiId || String(s.divisiId) === String(formData.divisiId)
          );

    if (!staffSearch.trim()) return list;
    return list.filter((s) => s.nama.toLowerCase().includes(staffSearch.toLowerCase()));
  }, [pelaksanaList, allStaffList, formData.divisiId, staffSearch]);

  const pageTitle =
    userRole === 'DIREKTUR'
      ? 'Terbitkan Arahan Direksi'
      : userRole === 'KADIV'
      ? 'Terbitkan Arahan Divisi'
      : sourceTicketId
      ? 'Terbitkan Tiket Operasional Lapangan'
      : 'Penugasan Staf Lapangan';

  return (
    <div className="min-h-screen bg-clinical-bg pb-28 md:pb-12">
      {/* Top Banner */}
      <div className="bg-clinical-surface border-b border-clinical-border px-4 py-5 md:py-6 sm:px-6 shadow-xs">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-brand-deep text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Wewenang Penugasan ({userRole})</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-clinical-ink tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            {sourceTicketId
              ? `Anda sedang menugaskan staf untuk menangani laporan / tiket #T-${String(sourceTicketId).padStart(3, '0')}.`
              : 'Delegasikan instruksi operasional, target SLA, dan tunjuk pelaksana lapangan.'}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Banner Jika Berasal dari Tiket Induk / Laporan */}
        {sourceTicketId && (
          <div className="p-5 bg-blue-50/70 border border-brand-mint/40 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-brand-deep uppercase tracking-widest bg-white/80 px-2.5 py-0.5 rounded-full">
                Tugas Turunan (Sub-Task)
              </span>
              <p className="text-sm font-bold text-clinical-ink mt-1.5">
                Sumber: #T-{String(sourceTicketId).padStart(3, '0')}{' '}
                {sourceTicketTitle && `— ${sourceTicketTitle}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/detail-laporan/${sourceTicketId}`)}
              className="h-10 px-4 bg-white hover:bg-slate-50 border border-clinical-border text-brand-deep font-bold text-xs rounded-2xl shadow-xs transition whitespace-nowrap self-start sm:self-auto"
            >
              Lihat Tiket Sumber
            </button>
          </div>
        )}

        {/* Sukses Alert */}
        {successCount > 0 && (
          <div className="p-6 bg-brand-deep text-white rounded-3xl shadow-lg shadow-brand-deep/20 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold">Penugasan Berhasil Diterbitkan!</h3>
                <p className="text-xs text-white/80 mt-0.5">
                  Sebanyak <strong>{successCount} tiket penugasan</strong> telah diteruskan kepada pelaksana yang dipilih.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="h-11 px-5 bg-white text-brand-deep font-bold text-xs rounded-2xl shadow-sm hover:bg-slate-100 active:scale-95 transition"
            >
              Lihat di Daftar Tugas →
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Info Utama & Lokasi */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>Informasi Tugas & Lokasi *</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Tahap 1</span>
            </div>

            {['KADIV', 'KOORDINATOR'].includes(userRole) && !sourceTicketId && (
              <div className="space-y-1.5 p-3.5 bg-slate-50 border border-clinical-border rounded-2xl">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  Tautkan dengan Keluhan / Arahan Masuk (Opsional)
                </label>
                <select
                  value={selectedTicketId}
                  onChange={handleSelectIncomingTicket}
                  className="w-full h-11 px-3 bg-white border border-clinical-border rounded-xl text-xs sm:text-sm font-semibold text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
                >
                  <option value="">-- Buat Penugasan Baru (Mandiri) --</option>
                  {incomingTickets.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      [#T-{String(t.id).padStart(3, '0')}] {t.judul}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Judul Tugas / Arahan *
              </label>
              <input
                type="text"
                name="judul"
                value={formData.judul}
                onChange={handleChange}
                required
                placeholder="Contoh: Perbaikan & Cuci AC Ruang Nifas"
                className="w-full h-12 px-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Lokasi / Area
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="lokasi"
                  value={formData.lokasi}
                  onChange={handleChange}
                  placeholder="Contoh: Gedung Utama Lt. 2"
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Instruksi Detail Pekerjaan *
              </label>
              <textarea
                name="deskripsi"
                rows={3}
                value={formData.deskripsi}
                onChange={handleChange}
                required
                placeholder="Tuliskan standar hasil kerja yang Anda harapkan..."
                className="w-full p-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition leading-relaxed"
              />
            </div>
          </div>

          {/* STEP 2: Prioritas SLA & Batas Waktu */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>Tingkat Prioritas & Batas Waktu (SLA) *</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Target Waktu</span>
            </div>

            {/* Selectable Cards Prioritas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, prioritas: 'LOW' }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center justify-between ${
                  formData.prioritas === 'LOW'
                    ? 'border-brand-deep bg-blue-50/70 shadow-xs'
                    : 'border-clinical-border bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-clinical-ink">Biasa (Low)</p>
                  <p className="text-[10px] text-slate-400">Tugas berkala rutin</p>
                </div>
                <span className="w-3 h-3 rounded-full bg-blue-500" />
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, prioritas: 'MEDIUM' }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center justify-between ${
                  formData.prioritas === 'MEDIUM'
                    ? 'border-brand-orange bg-brand-orange-soft/50 shadow-xs'
                    : 'border-clinical-border bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-clinical-ink">Penting (Medium)</p>
                  <p className="text-[10px] text-slate-400">Selesai dalam hari ini</p>
                </div>
                <span className="w-3 h-3 rounded-full bg-brand-orange" />
              </button>

              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, prioritas: 'HIGH' }))}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center justify-between ${
                  formData.prioritas === 'HIGH'
                    ? 'border-rose-600 bg-rose-50 shadow-xs'
                    : 'border-clinical-border bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-rose-800">Darurat (High)</p>
                  <p className="text-[10px] text-rose-600">Pelayanan terganggu</p>
                </div>
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
              </button>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-clinical-ink">
                Batas Waktu Target *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  required
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-bold text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              </div>
            </div>
          </div>

          {/* STEP 3: Multi-Delegasi Tim Pelaksana */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  3
                </span>
                <span>Pemilihan Tim Pelaksana (Multi-Select) *</span>
              </label>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-deep">
                {formData.pelaksanaIds.length} Terpilih
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Filter Divisi
                </label>
                <select
                  name="divisiId"
                  value={formData.divisiId}
                  onChange={handleChange}
                  className="w-full h-11 px-3 bg-slate-50 border border-clinical-border rounded-2xl text-xs font-semibold text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
                >
                  <option value="">-- Tampilkan Semua Divisi --</option>
                  {divisiList.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Cari Nama Staf
                </label>
                <input
                  type="text"
                  placeholder="Ketik nama staf..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full h-11 px-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
                />
              </div>
            </div>

            {/* Chip Pelaksana Terpilih */}
            {formData.pelaksanaIds.length > 0 && (
              <div className="p-3.5 bg-blue-50/60 border border-brand-mint/40 rounded-2xl space-y-2">
                <p className="text-[11px] font-bold text-brand-deep uppercase tracking-wider">
                  Tim Pelaksana Terpilih ({formData.pelaksanaIds.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.pelaksanaIds.map((id) => {
                    const st = allStaffList.find((s) => String(s.id) === id);
                    if (!st) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white text-brand-deep border border-brand-mint/40 text-xs font-bold shadow-2xs"
                      >
                        <span>{st.nama}</span>
                        <button
                          type="button"
                          onClick={() => togglePelaksana(id)}
                          className="w-5 h-5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grid Selectable Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto p-1">
              {loadingOptions ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold animate-pulse">
                  Memuat data pelaksana...
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium border border-dashed border-clinical-border rounded-2xl">
                  Tidak ada staf di divisi ini.
                </div>
              ) : (
                filteredStaff.map((staf) => {
                  const isSelected = formData.pelaksanaIds.includes(String(staf.id));

                  return (
                    <button
                      key={staf.id}
                      type="button"
                      onClick={() => togglePelaksana(String(staf.id))}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center gap-3 ${
                        isSelected
                          ? 'border-brand-deep bg-blue-50/80 shadow-xs'
                          : 'border-clinical-border bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-brand-deep text-white'
                            : 'bg-brand-peach text-brand-deep'
                        }`}
                      >
                        {staf.nama.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-brand-deep' : 'text-clinical-ink'}`}>
                          {staf.nama}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {staf.divisi?.nama || staf.role}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-brand-deep shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 4: Foto Referensi / Instruksi */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  4
                </span>
                <span>Lampiran Foto Referensi / Instruksi (Opsional)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Gambar</span>
            </div>

            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                isDragging
                  ? 'border-brand-deep bg-blue-50'
                  : 'border-clinical-border bg-slate-50/70 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              {formData.fotoInstruksi ? (
                <div className="w-full max-w-sm space-y-3">
                  <img
                    src={formData.fotoInstruksi}
                    alt="Preview Instruksi"
                    className="h-44 w-full object-cover rounded-2xl border border-clinical-border shadow-xs"
                  />
                  <p className="text-xs font-bold text-clinical-ink truncate px-2">{previewName}</p>
                  <button
                    type="button"
                    onClick={hapusFoto}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus & Ganti Foto</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-brand-deep flex items-center justify-center mx-auto">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-clinical-ink">Tarik & Lepas foto referensi ke sini</p>
                    <p className="text-xs text-slate-400 mt-0.5">atau klik tombol di bawah untuk memilih file</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-10 px-4 bg-white border border-clinical-border hover:bg-slate-50 text-clinical-ink text-xs font-bold rounded-2xl shadow-xs transition"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Jelajahi File</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileInputChange}
                    accept="image/png, image/jpeg, image/jpg"
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sticky Submit Bar di Mobile */}
          <div className="fixed bottom-16 left-0 right-0 z-30 p-4 bg-clinical-surface/95 backdrop-blur-md border-t border-clinical-border md:static md:p-0 md:bg-transparent md:border-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="hidden sm:inline-flex h-12 px-6 rounded-2xl border border-clinical-border bg-white text-clinical-ink font-bold text-sm hover:bg-slate-50 transition"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={submitting || formData.pelaksanaIds.length === 0}
                className="flex-1 sm:flex-initial h-12 px-8 bg-brand-orange hover:bg-brand-orange/90 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-brand-orange/20 transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Memproses Penugasan...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Terbitkan Tugas ke {formData.pelaksanaIds.length || 0} Orang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
