// Frontend/src/pages/TriageTugas.tsx
// Halaman pemberian tugas (delegasi) KEDUVAN — menu terpisah, tidak tercampur
// dengan daftar tugas. Koordinator memilih prioritas, tanggal tenggat, dan
// staff pelaksana secara langsung.
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  MapPin,
  Save,
  ShieldCheck,
  UserCheck,
  X,
  AlertTriangle,
  Building2,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

interface Ticket {
  id: number;
  judul: string;
  deskripsi: string | null;
  lokasi: string | null;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  deadline: string | null;
  divisi?: { id: number; nama: string } | null;
  pelaksana?: { id: number; nama: string; role: string; divisiId?: number | null } | null;
  pembuat?: { id: number; nama: string; role: string } | null;
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
}

const PRIORITAS_OPTIONS = [
  { value: 'LOW', label: 'Rendah', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'MEDIUM', label: 'Sedang', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'HIGH', label: 'Tinggi', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
] as const;

const TriageTugas: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userRole = getAuthRole() || 'STAF';

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Form delegation state
  const [divisiId, setDivisiId] = useState('');
  const [prioritas, setPrioritas] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [pelaksanaId, setPelaksanaId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Permission: only Kadiv/Director/Koordinator can delegate
  const isDirectoor = userRole === 'DIREKTUR';
  const isKadiv = userRole === 'KADIV';
  const isKoor = userRole === 'KOORDINATOR';
  const canDelegate = isDirectoor || isKadiv || isKoor;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [detailRes, divRes, staffRes] = await Promise.all([
          api.get(`/tickets/${id}`),
          api.get('/auth/divisi'),
          api.get('/tickets/staff'),
        ]);
        const data = detailRes.data?.data || detailRes.data;
        if (data?.jenisTiket === 'LAPORAN') {
          navigate(`/detail-laporan/${id}`, { replace: true });
          return;
        }
        setTicket(data);
        setDivisiList(divRes.data?.data || divRes.data || []);
        setStaffList(staffRes.data?.data || staffRes.data || []);

        // Pre-fill with existing values if any
        if (data.divisi?.id) setDivisiId(String(data.divisi.id));
        if (data.pelaksana?.id) setPelaksanaId(String(data.pelaksana.id));
        if (data.deadline) {
          const d = new Date(data.deadline);
          const pad = (n: number) => String(n).padStart(2, '0');
          setDeadline(
            `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
          );
        }
        if (data.prioritas) setPrioritas(data.prioritas as any);
        setCatatan(data.catatanRevisi || '');
      } catch (e: any) {
        setError(e.response?.data?.message || 'Gagal memuat data tugas.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pelaksanaId) {
      setError('Pilih minimal 1 staf pelaksana.');
      return;
    }
    if (!deadline) {
      setError('Tanggal & masa tenggat wajib diisi.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.put(`/tickets/${id}/triage`, {
        divisiId: divisiId ? Number(divisiId) : null,
        prioritas: prioritas,
        pelaksanaId: Number(pelaksanaId),
        deadline: new Date(deadline).toISOString(),
        status: 'DIPROSES',
        catatanRevisi: catatan || null,
      });
      setSaved(true);
      setTimeout(() => {
        navigate('/semua-tugas?filter=MENUNGGU_TRIASE', { replace: true });
      }, 900);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Gagal menyimpan pemberian tugas.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return 'Belum ditentukan';
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Memuat data tugasan...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <X className="w-6 h-6" />
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

  // Role guard
  if (!canDelegate) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-lg font-bold text-clinical-ink">Akses Dibatasi</p>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Menu pemberian tugasan hanya bisa diakses oleh <strong>Koordinator</strong>,
          <strong>Kepala Divisi</strong>, atau <strong>Direktur</strong>.
        </p>
        <button
          onClick={() => navigate('/semua-tugas')}
          className="mt-4 h-11 px-5 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clinical-bg pb-28 md:pb-12">
      {/* Top nav */}
      <div className="bg-clinical-surface border-b border-clinical-border px-4 py-4 sm:px-6 shadow-xs sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/semua-tugas')}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-2xl border border-clinical-border hover:bg-slate-100 text-clinical-ink text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Daftar Tugas</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-brand-deep bg-blue-50 px-2.5 py-1 rounded-xl">
              #T-{String(ticket.id).padStart(3, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Ticket header card */}
        <div className="bg-clinical-surface rounded-3xl border border-clinical-border shadow-xs p-5 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider border ${
                    ticket.prioritas === 'HIGH'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : ticket.prioritas === 'MEDIUM'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
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
              {ticket.deskripsi && (
                <p className="text-sm text-clinical-body leading-relaxed">{ticket.deskripsi}</p>
              )}
              {ticket.lokasi && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{ticket.lokasi}</span>
                </div>
              )}
            </div>

            {/* SLA / Deadline summary */}
            <div
              className={`p-4 rounded-3xl border-2 flex flex-col justify-center min-w-[180px] shrink-0 ${
                ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'SELESAI'
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : 'border-brand-mint/40 bg-blue-50/60 text-brand-deep'
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Batas Waktu (Deadline)
              </span>
              <p className="text-sm font-extrabold mt-1">{formatDateTime(ticket.deadline)}</p>
              {ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'SELESAI' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 mt-1 uppercase">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  Terlewati
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main delegation form */}
        <div className="bg-clinical-surface rounded-3xl border border-clinical-border shadow-xs p-5 sm:p-7 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-deep text-white flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-clinical-ink">
              Pemberian Tugas (Delegasi)
            </h2>
            <span className="text-[10px] font-extrabold text-brand-deep bg-white px-2 py-0.5 rounded-full border border-brand-deep/20">
              Khusus Koordinator / Kadiv / Direktur
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Division */}
            <div>
              <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1.5">
                <Building2 className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Divisi Pelaksana
              </label>
              <select
                value={divisiId}
                onChange={(e) => setDivisiId(e.target.value)}
                className="w-full h-11 px-3 border border-clinical-border bg-slate-50 rounded-xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
              >
                <option value="">-- Pilih Divisi --</option>
                {divisiList.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1.5">
                <TrendingUp className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Tingkat Prioritas
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITAS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrioritas(opt.value as any)}
                    className={`h-11 rounded-xl text-xs font-extrabold border transition-all active:scale-95 ${
                      prioritas === opt.value
                        ? 'bg-brand-deep text-white border-brand-deep shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff performer */}
            <div>
              <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1.5">
                <UserCheck className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Staf Pelaksana
              </label>
              <select
                value={pelaksanaId}
                onChange={(e) => setPelaksanaId(e.target.value)}
                className="w-full h-11 px-3 border border-clinical-border bg-slate-50 rounded-xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
              >
                <option value="">-- Pilih Staf --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.nama} ({s.role})
                  </option>
                ))}
              </select>
              {staffList.filter((s) => String(s.divisiId) === divisiId).length === 0 && divisiId && (
                <p className="text-[10px] text-rose-600 mt-1.5">
                  Tidak ada staf di divisi ini. Ganti divisi atau pilih divisi lain.
                </p>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Masa Tenggat (Deadline)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-11 px-3 border border-clinical-border bg-slate-50 rounded-xl text-xs font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-clinical-ink uppercase mb-1.5">
              Instruksi / Catatan Khusus (Opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Tambahkan rincian instruksi atau poin yang harus dipertimbangkan saat pelaksanaan..."
              className="w-full p-3 bg-slate-50 border border-clinical-border rounded-xl text-xs font-normal text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep resize-y"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-clinical-border/60">
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="h-11 px-5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 h-11 px-5 text-xs font-extrabold text-white bg-brand-deep hover:bg-brand-deeper rounded-xl shadow-xs transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan & Terbitkan Tugas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reminder */}
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tugas berhasil diterbitkan! Menampilkan daftar tugas untuk koordinasi berikutnya...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageTugas;
