// Frontend/src/pages/LaporkanMasalah.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Divisi {
  id: number;
  nama: string;
}

const getLabelKategoriMasalah = (namaDivisi: string) => {
  const lower = namaDivisi.toLowerCase();
  if (lower.includes('umum') || lower.includes('it')) return 'Fasilitas Gedung, AC, Listrik, Air & IT → (Divisi Umum & IT)';
  if (lower.includes('penunjang')) return 'Alat Medis, Rontgen, Lab, Gizi & Farmasi → (Divisi Penunjang Medis)';
  if (lower.includes('keperawatan') || lower.includes('kebidanan')) return 'Ruang Rawat Inap, Nifas, IGD & Keperawatan → (Divisi Keperawatan & Kebidanan)';
  if (lower.includes('pelayanan medis')) return 'Poliklinik, Ruang Operasi & Layanan Medis → (Divisi Pelayanan Medis)';
  if (lower.includes('administrasi') || lower.includes('keuangan')) return 'Kasir, Tagihan, BPJS & Administrasi → (Divisi Administrasi & Keuangan)';
  if (lower.includes('hrd') || lower.includes('marketing')) return 'Kepegawaian & Informasi Rumah Sakit → (Divisi HRD & Marketing)';
  return namaDivisi;
};

// Fungsi utilitas untuk mengkompresi gambar sebelum dikirim
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
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Kompresi 70%
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const LaporkanMasalah: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [formData, setFormData] = useState({
    divisiId: '',
    judul: '',
    lokasi: '',
    deskripsi: '',
    fotoInstruksi: '', // Menambahkan field untuk menyimpan string base64 foto
  });
  
  // State khusus untuk UI Drag & Drop
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Handlers untuk File & Drag Drop ---
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah file gambar (JPG/PNG).');
      return;
    }
    try {
      const base64Str = await compressImageToBase64(file);
      setFormData(prev => ({ ...prev, fotoInstruksi: base64Str }));
      setPreviewName(file.name);
    } catch (err) {
      alert('Gagal memproses gambar.');
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
    setFormData(prev => ({ ...prev, fotoInstruksi: '' }));
    setPreviewName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  // -----------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatedTicket(null);
    setLoading(true);

    try {
      const res = await api.post('/tickets', {
        tipe: 'LAPORAN_MASALAH',
        divisiId: Number(formData.divisiId),
        judul: formData.judul,
        lokasi: formData.lokasi,
        deskripsi: formData.deskripsi,
        fotoInstruksi: formData.fotoInstruksi || null, // Kirim foto jika ada
      });

      setCreatedTicket(res.data.data);
      setFormData(prev => ({ ...prev, judul: '', lokasi: '', deskripsi: '', fotoInstruksi: '' }));
      setPreviewName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengajukan tiket laporan masalah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div>
        <span className="px-3 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-200 uppercase tracking-widest">
          Pengajuan Tiket Keluhan
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">
          Laporkan Masalah / Kerusakan Fasilitas
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          Ajukan tiket masalah kepada Koordinator / Kepala Divisi berwenang agar segera dibuatkan penugasan dan ditangani oleh petugas teknis.
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {createdTicket && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm md:text-base font-bold text-emerald-900">
              Tiket Masalah #T-{String(createdTicket.id).padStart(3, '0')} Berhasil Diajukan!
            </h3>
            <p className="text-xs md:text-sm font-medium text-emerald-800 mt-1">
              Laporan telah masuk ke bagian <strong>{createdTicket.divisi?.nama}</strong> dan menunggu dibuatkan tugas oleh Koordinator.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/riwayat-laporan')}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            Lacak Status di Riwayat Laporan →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            1. Kategori Masalah & Bagian yang Berwenang *
          </label>
          <select
            name="divisiId"
            value={formData.divisiId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            {divisiList.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {getLabelKategoriMasalah(d.nama)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              2. Masalah / Kerusakan yang Ditemukan *
            </label>
            <input
              type="text"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              required
              placeholder="Contoh: AC Bocor / Komputer Poli Mati"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              3. Lokasi Ruangan / Nama Alat *
            </label>
            <input
              type="text"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              required
              placeholder="Contoh: Ruang Poli Anak - AC Unit 1"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            4. Keterangan Detail Masalah *
          </label>
          <textarea
            name="deskripsi"
            rows={4}
            value={formData.deskripsi}
            onChange={handleChange}
            required
            placeholder="Jelaskan kondisi secara detail agar atasan dan teknisi mudah memahami situasinya..."
            className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50 leading-relaxed"
          />
        </div>

        {/* Zona Drag & Drop Foto (Opsional) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            5. Unggah Foto Bukti (Opsional)
          </label>
          
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            {formData.fotoInstruksi ? (
              <div className="w-full">
                <img src={formData.fotoInstruksi} alt="Preview Bukti" className="h-40 mx-auto object-cover rounded-lg border border-slate-200 shadow-sm mb-3" />
                <p className="text-xs font-bold text-slate-700 mb-2 truncate px-4">{previewName}</p>
                <button type="button" onClick={hapusFoto} className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase rounded-lg hover:bg-rose-200 transition">
                  Hapus & Ganti Foto
                </button>
              </div>
            ) : (
              <>
                <svg className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p className="text-sm font-bold text-slate-700 mb-1">Tarik & Lepas foto ke sini</p>
                <p className="text-xs text-slate-500 mb-4">atau klik tombol di bawah untuk memilih file JPG/PNG</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50">
                  Jelajahi File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={onFileInputChange} 
                  accept="image/png, image/jpeg, image/jpg" 
                  className="hidden" 
                />
              </>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            {loading ? 'Mengirim Data...' : 'Ajukan Tiket Keluhan Sekarang'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LaporkanMasalah;