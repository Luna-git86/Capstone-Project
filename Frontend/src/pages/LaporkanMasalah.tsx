// Frontend/src/pages/LaporkanMasalah.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Divisi {
  id: number;
  nama: string;
}

const getLabelKategoriMasalah = (namaDivisi: string) => {
  const lower = namaDivisi.toLowerCase();
  if (lower.includes('umum') || lower.includes('it')) {
    return 'Fasilitas Gedung, AC, Listrik, Air & IT → (Divisi Umum & IT)';
  }
  if (lower.includes('penunjang')) {
    return 'Alat Medis, Rontgen, Lab, Gizi & Farmasi → (Divisi Penunjang Medis)';
  }
  if (lower.includes('keperawatan') || lower.includes('kebidanan')) {
    return 'Ruang Rawat Inap, Nifas, IGD & Keperawatan → (Divisi Keperawatan & Kebidanan)';
  }
  if (lower.includes('pelayanan medis')) {
    return 'Poliklinik, Ruang Operasi & Layanan Medis → (Divisi Pelayanan Medis)';
  }
  if (lower.includes('administrasi') || lower.includes('keuangan')) {
    return 'Kasir, Tagihan, BPJS & Administrasi → (Divisi Administrasi & Keuangan)';
  }
  if (lower.includes('hrd') || lower.includes('marketing')) {
    return 'Kepegawaian & Informasi Rumah Sakit → (Divisi HRD & Marketing)';
  }
  return namaDivisi;
};

const LaporkanMasalah: React.FC = () => {
  const navigate = useNavigate();
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [formData, setFormData] = useState({
    divisiId: '',
    judul: '',
    lokasi: '',
    deskripsi: '',
  });
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
          const defaultDiv =
            list.find((d) => d.nama.toLowerCase().includes('umum')) || list[0];
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
      });

      setCreatedTicket(res.data.data);
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
      }));
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal mengajukan tiket laporan masalah.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-full uppercase">
          Pengajuan Tiket Keluhan
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          Laporkan Masalah / Kerusakan Fasilitas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Ajukan tiket masalah kepada Koordinator / Kepala Divisi berwenang agar segera dibuatkan penugasan dan ditangani oleh petugas teknis.
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      {createdTicket && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-emerald-900">
            ✅ Tiket Masalah #T-{String(createdTicket.id).padStart(3, '0')} Berhasil Diajukan!
          </h3>
          <p className="text-xs text-emerald-800">
            Tiket Anda telah masuk ke bagian <strong>{createdTicket.divisi?.nama}</strong> dengan status <strong>Menunggu Dibuatkan Tugas</strong> oleh Koordinator/Kepala Divisi.
          </p>
          <button
            type="button"
            onClick={() => navigate('/semua-tugas')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            Pantau di Daftar Tugas →
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            1. Kategori Masalah & Bagian yang Berwenang *
          </label>
          <select
            name="divisiId"
            value={formData.divisiId}
            onChange={handleChange}
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {divisiList.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {getLabelKategoriMasalah(d.nama)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              2. Masalah / Kerusakan yang Ditemukan *
            </label>
            <input
              type="text"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              required
              placeholder="Contoh: AC Bocor / Komputer Poli Mati"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              3. Lokasi Ruangan / Nama Alat *
            </label>
            <input
              type="text"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              required
              placeholder="Contoh: Ruang Poli Anak - AC Unit 1"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            4. Keterangan Detail Masalah *
          </label>
          <textarea
            name="deskripsi"
            rows={4}
            value={formData.deskripsi}
            onChange={handleChange}
            required
            placeholder="Jelaskan kondisi masalah secara singkat agar atasan dapat menentukan prioritas dan petugas yang tepat..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-sm transition"
          >
            {loading ? 'Mengirim Tiket...' : 'Ajukan Tiket Masalah'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LaporkanMasalah;