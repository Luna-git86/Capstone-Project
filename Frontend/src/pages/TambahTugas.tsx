// Frontend/src/pages/TambahTugas.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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
}

const TambahTugas: React.FC = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'KOORDINATOR';
  const userDivisiId = localStorage.getItem('userDivisiId') || '';

  const [formData, setFormData] = useState({
    judul: '',
    lokasi: '',
    deskripsi: '',
    prioritas: 'MEDIUM',
    divisiId: userDivisiId,
    pelaksanaId: '',
    deadline: '', // Format YYYY-MM-DDTHH:mm (Tanggal & Jam)
  });

  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [pelaksanaList, setPelaksanaList] = useState<Pelaksana[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  useEffect(() => {
    const fetchInitialDivisi = async () => {
      try {
        const res = await api.get('/tickets/options');
        const listDivisi: Divisi[] = res.data.divisi || [];
        setDivisiList(listDivisi);

        if (!formData.divisiId && listDivisi.length > 0) {
          setFormData((prev) => ({
            ...prev,
            divisiId: String(listDivisi[0].id),
          }));
        }
      } catch (err) {
        console.error('Gagal memuat opsi divisi:', err);
      }
    };
    fetchInitialDivisi();
  }, []);

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
      } catch (err) {
        console.error('Gagal memuat daftar staf pelaksana:', err);
        setPelaksanaList([]);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchPelaksanaByDivisi();
  }, [formData.divisiId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'divisiId') {
      setFormData({ ...formData, divisiId: value, pelaksanaId: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreatedTicket(null);
    setSubmitting(true);

    try {
      const response = await api.post('/tickets', {
        tipe: 'BUAT_TUGAS',
        judul: formData.judul,
        lokasi: formData.lokasi,
        deskripsi: formData.deskripsi,
        prioritas: formData.prioritas,
        divisiId: Number(formData.divisiId),
        pelaksanaId: formData.pelaksanaId ? Number(formData.pelaksanaId) : null,
        deadline: new Date(formData.deadline).toISOString(),
      });

      setCreatedTicket(response.data.data);
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        pelaksanaId: '',
        deadline: '',
      }));
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal menerbitkan tugas baru.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  const generateWhatsAppUrl = (ticket: any) => {
    const rawPhone = ticket?.pelaksana?.noHp || '';
    let waNumber = rawPhone.replace(/[\s\-]/g, '');
    if (waNumber.startsWith('0')) {
      waNumber = '62' + waNumber.slice(1);
    }
    const text = encodeURIComponent(
      `*[PENUGASAN BARU RSIA QURRATA A'YUN]*\n` +
        `No. Tiket: #T-${String(ticket.id).padStart(3, '0')}\n` +
        `Tugas: ${ticket.judul}\n` +
        `Lokasi: ${ticket.lokasi || '-'}\n` +
        `Prioritas: *${ticket.prioritas}*\n` +
        `Batas Waktu: *${formatDateTime(ticket.deadline)}*\n` +
        `Instruksi: ${ticket.deskripsi}\n\n` +
        `Silakan kerjakan dan unggah foto bukti penyelesaiannya di web E-Ticketing RSIA.`
    );
    return `https://wa.me/${waNumber}?text=${text}`;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase">
          Wewenang Penugasan ({userRole})
        </span>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">
          Buat Tugas Baru
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tetapkan staf pelaksana, prioritas, serta batas waktu pengerjaan (lengkap hingga jam & menit).
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
            ✅ Tugas #T-{String(createdTicket.id).padStart(3, '0')} Berhasil Diterbitkan!
          </h3>
          <p className="text-xs text-emerald-800">
            Pelaksana: <strong>{createdTicket.pelaksana?.nama || '-'}</strong> • Batas Waktu:{' '}
            <strong>{formatDateTime(createdTicket.deadline)}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/semua-tugas')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Lihat di Daftar Tugas →
            </button>

            {createdTicket.pelaksana?.noHp && (
              <a
                href={generateWhatsAppUrl(createdTicket)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                📲 Kirim Surat Tugas ke WhatsApp {createdTicket.pelaksana.nama}
              </a>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Nama Tugas *
            </label>
            <input
              type="text"
              name="judul"
              value={formData.judul}
              onChange={handleChange}
              required
              placeholder="Contoh: Perbaikan & Cuci AC Ruang Nifas"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Lokasi Ruangan / Aset *
            </label>
            <input
              type="text"
              name="lokasi"
              value={formData.lokasi}
              onChange={handleChange}
              required
              placeholder="Contoh: Gedung Utama Lt. 2 - Kamar Nifas 3"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Divisi Tujuan *
            </label>
            <select
              name="divisiId"
              value={formData.divisiId}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="" disabled>
                -- Pilih Divisi --
              </option>
              {divisiList.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Tunjuk Staf Pelaksana *
            </label>
            <select
              name="pelaksanaId"
              value={formData.pelaksanaId}
              onChange={handleChange}
              required
              disabled={loadingOptions}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm"
            >
              <option value="">
                {loadingOptions ? 'Memuat daftar staf...' : '-- Pilih Staf Pelaksana --'}
              </option>
              {pelaksanaList.map((staf) => (
                <option key={staf.id} value={String(staf.id)}>
                  {staf.nama} {staf.noHp ? `(${staf.noHp})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Prioritas Tugas *
            </label>
            <select
              name="prioritas"
              value={formData.prioritas}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
            >
              <option value="LOW">Biasa (Low)</option>
              <option value="MEDIUM">Penting (Medium)</option>
              <option value="HIGH">Darurat / Segera (High)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1">
              Batas Waktu Pengerjaan (Tanggal & Jam) *
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Instruksi Detail Pengerjaan *
          </label>
          <textarea
            name="deskripsi"
            rows={4}
            value={formData.deskripsi}
            onChange={handleChange}
            required
            placeholder="Tuliskan instruksi pengerjaan dan standar hasil yang perlu difoto oleh staf saat selesai..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-lg shadow-sm transition"
          >
            {submitting ? 'Menyimpan...' : 'Terbitkan Tugas'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TambahTugas;