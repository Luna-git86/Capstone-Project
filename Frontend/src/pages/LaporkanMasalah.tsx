// Frontend/src/pages/LaporkanMasalah.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  Image as ImageIcon,
  MapPin,
  Send,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import api from '../services/api';

interface Divisi {
  id: number;
  nama: string;
}

const getKategoriMeta = (namaDivisi: string) => {
  const lower = namaDivisi.toLowerCase();
  if (lower.includes('umum') || lower.includes('it')) {
    return {
      label: 'Fasilitas Gedung, AC, Listrik & IT',
      sub: 'Divisi Umum & IT',
    };
  }
  if (lower.includes('penunjang')) {
    return {
      label: 'Alat Medis, Lab, Gizi & Farmasi',
      sub: 'Divisi Penunjang Medis',
    };
  }
  if (lower.includes('keperawatan') || lower.includes('kebidanan')) {
    return {
      label: 'Rawat Inap, Kebidanan & IGD',
      sub: 'Divisi Keperawatan',
    };
  }
  if (lower.includes('pelayanan medis')) {
    return {
      label: 'Poliklinik & Ruang Operasi',
      sub: 'Divisi Layanan Medis',
    };
  }
  if (lower.includes('administrasi') || lower.includes('keuangan')) {
    return {
      label: 'Kasir, Tagihan, BPJS & Administrasi',
      sub: 'Divisi Keuangan & Kasir',
    };
  }
  return {
    label: namaDivisi,
    sub: 'Bagian Internal',
  };
};

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

export default function LaporkanMasalah() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [formData, setFormData] = useState({
    divisiId: '',
    judul: '',
    lokasi: '',
    deskripsi: '',
    fotoInstruksi: '',
  });

  const [isDragging, setIsDragging] = useState(false);
  const [previewName, setPreviewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  useEffect(() => {
    const fetchDivisi = async () => {
      try {
        const res = await api.get('/auth/divisi');
        const list: Divisi[] = res.data.data || res.data || [];
        setDivisiList(list);
        if (list.length > 0) {
          const defaultDiv = list.find((d) => d.nama.toLowerCase().includes('umum')) || list[0];
          setFormData((prev) => ({ ...prev, divisiId: String(defaultDiv.id) }));
        }
      } catch (err) {
        console.error('Gagal mengambil daftar divisi:', err);
      }
    };
    fetchDivisi();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah file foto gambar (JPG/PNG).');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatedTicket(null);

    if (!formData.divisiId) {
      setError('Silakan tentukan divisi tujuan penanganan.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/tickets', {
        tipe: 'LAPORAN_MASALAH',
        divisiId: Number(formData.divisiId),
        judul: formData.judul,
        lokasi: formData.lokasi,
        deskripsi: formData.deskripsi,
        fotoInstruksi: formData.fotoInstruksi || null,
      });

      setCreatedTicket(res.data.data);
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        fotoInstruksi: '',
      }));
      setPreviewName('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengajukan tiket laporan masalah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-clinical-bg pb-28 md:pb-12">
      {/* Top Banner Header */}
      <div className="bg-clinical-surface border-b border-clinical-border px-4 py-5 md:py-6 sm:px-6 shadow-xs">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange-soft text-brand-orange text-xs font-bold uppercase tracking-wider mb-2">
            <TriangleAlert className="w-3.5 h-3.5" />
            <span>Pengajuan Tiket Keluhan</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-clinical-ink tracking-tight">
            Laporkan Masalah / Kerusakan Fasilitas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Laporkan kendala fasilitas, alat kesehatan, atau sistem IT agar segera ditugaskan kepada petugas lapangan terkait.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Pesan Sukses Tiket Dibuat */}
        {createdTicket && (
          <div className="p-6 bg-brand-deep text-white rounded-3xl shadow-lg shadow-brand-deep/20 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-bold uppercase">
                  #T-{String(createdTicket.id).padStart(3, '0')}
                </span>
                <h3 className="text-lg font-extrabold mt-1">Laporan Berhasil Diajukan!</h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">
                  Laporan telah masuk ke bagian{' '}
                  <strong className="text-white underline">{createdTicket.divisi?.nama}</strong> dan menunggu dibuatkan penugasan oleh Koordinator.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-white/20">
              <button
                type="button"
                onClick={() => navigate('/riwayat-laporan')}
                className="h-11 px-5 bg-white text-brand-deep font-bold text-xs rounded-2xl shadow-sm hover:bg-slate-100 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <span>Lihat Status di Riwayat Laporan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCreatedTicket(null)}
                className="h-11 px-4 bg-white/15 hover:bg-white/25 text-white font-semibold text-xs rounded-2xl transition"
              >
                Buat Laporan Baru
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3">
            <TriangleAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* STEP 1: Pilih Kategori / Divisi */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  1
                </span>
                <span>Bagian / Divisi yang Berwenang *</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Wajib dipilih</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {divisiList.map((d) => {
                const meta = getKategoriMeta(d.nama);
                const isSelected = formData.divisiId === String(d.id);

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, divisiId: String(d.id) }))}
                    className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-98 flex items-start gap-3 ${
                      isSelected
                        ? 'border-brand-deep bg-blue-50/60 shadow-xs'
                        : 'border-clinical-border bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-snug ${isSelected ? 'text-brand-deep' : 'text-clinical-ink'}`}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] mt-0.5 text-slate-400">{meta.sub}</p>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-brand-deep text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Detail Masalah & Lokasi */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  2
                </span>
                <span>Detail Kerusakan & Lokasi *</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Informasi Jelas</span>
            </div>

            {/* Nama Masalah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Masalah / Kerusakan yang Ditemukan *
              </label>
              <input
                type="text"
                name="judul"
                value={formData.judul}
                onChange={handleChange}
                required
                placeholder="Contoh: AC Bocor / Komputer Poli Mati"
                className="w-full h-12 px-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
              />
            </div>

            {/* Lokasi Ruangan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Lokasi Ruangan / Nama Alat *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="lokasi"
                  value={formData.lokasi}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Ruang Poli Anak - Unit 1"
                  className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-clinical-ink">
                Keterangan Detail Masalah *
              </label>
              <textarea
                name="deskripsi"
                rows={4}
                value={formData.deskripsi}
                onChange={handleChange}
                required
                placeholder="Jelaskan kondisi secara detail agar atasan dan teknisi mudah memahami situasinya..."
                className="w-full p-4 bg-slate-50 border border-clinical-border rounded-2xl text-xs sm:text-sm font-medium text-clinical-ink focus:outline-none focus:ring-2 focus:ring-brand-deep focus:bg-white transition leading-relaxed"
              />
            </div>
          </div>

          {/* STEP 3: Foto Bukti */}
          <div className="bg-clinical-surface p-5 sm:p-7 rounded-3xl border border-clinical-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-clinical-ink flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-deep text-white flex items-center justify-center text-xs">
                  3
                </span>
                <span>Unggah Foto Bukti (Opsional)</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">Lampiran</span>
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
                    alt="Preview Bukti"
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
                    <p className="text-sm font-bold text-clinical-ink">Tarik & Lepas foto ke sini</p>
                    <p className="text-xs text-slate-400 mt-0.5">atau klik tombol di bawah untuk memilih file JPG/PNG</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 h-11 px-5 bg-white border border-clinical-border hover:bg-slate-50 text-clinical-ink text-xs font-bold rounded-2xl shadow-xs transition"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Jelajahi File / Buka Kamera</span>
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
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="hidden sm:inline-flex h-12 px-6 rounded-2xl border border-clinical-border bg-white text-clinical-ink font-bold text-sm hover:bg-slate-50 transition"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial h-12 px-8 bg-brand-orange hover:bg-brand-orange/90 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-brand-orange/20 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Mengirim Data...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Ajukan Tiket Keluhan Sekarang</span>
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
