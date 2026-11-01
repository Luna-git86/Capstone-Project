// Frontend/src/pages/DokumenSop.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Divisi {
  id: number;
  nama: string;
}

interface SopItem {
  id: number;
  nomorSop: string;
  judul: string;
  revisi: string;
  deskripsi: string | null;
  fileUrl: string | null;
  updatedAt: string;
  divisi?: { id: number; nama: string } | null;
  pengaju?: { nama: string; role: string };
}

const DokumenSop: React.FC = () => {
  const [sops, setSops] = useState<SopItem[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [selectedDivisi, setSelectedDivisi] = useState<string>('SEMUA');
  const [loading, setLoading] = useState<boolean>(true);

  const [formData, setFormData] = useState({
    nomorSop: '',
    judul: '',
    revisi: 'Revisi 1',
    divisiId: '',
    deskripsi: '',
    fileUrl: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const userRole = localStorage.getItem('userRole') || 'STAF';
  const canManageSop = ['DIREKTUR', 'KADIV'].includes(userRole);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sopRes, divRes] = await Promise.all([
        api.get('/tickets/sops'),
        api.get('/auth/divisi'),
      ]);
      setSops(sopRes.data.data || []);
      setDivisiList(divRes.data.data || []);
    } catch (err) {
      console.error('Gagal memuat data SOP:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const res = await api.post('/tickets/sops', {
        ...formData,
        divisiId: formData.divisiId ? Number(formData.divisiId) : null,
      });
      setMessage(res.data.message || 'Dokumen SOP berhasil diterbitkan!');
      setFormData({
        nomorSop: '',
        judul: '',
        revisi: 'Revisi 1',
        divisiId: '',
        deskripsi: '',
        fileUrl: '',
      });
      fetchData();
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal menyimpan dokumen SOP.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSops =
    selectedDivisi === 'SEMUA'
      ? sops
      : sops.filter((s) => String(s.divisi?.id) === selectedDivisi);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dokumen & Sosialisasi SOP Rumah Sakit
          </h1>
          <p className="text-sm text-slate-500">
            Katalog Standar Operasional Prosedur (SOP) resmi RSIA Qurrata A'yun beserta riwayat revisi terbaru untuk pedoman kerja seluruh pegawai.
          </p>
        </div>

        <select
          value={selectedDivisi}
          onChange={(e) => setSelectedDivisi(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700"
        >
          <option value="SEMUA">Semua Divisi ({sops.length})</option>
          {divisiList.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.nama}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <div className="p-4 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 text-sm font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canManageSop && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Unggah / Revisi Dokumen SOP
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan Nomor SOP yang sama jika ingin memperbarui dokumen lama ke Revisi berikutnya.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nomor Dokumen SOP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nomorSop}
                  onChange={(e) =>
                    setFormData({ ...formData, nomorSop: e.target.value })
                  }
                  placeholder="Contoh: SOP/RSIA-IT/001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Judul SOP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.judul}
                  onChange={(e) =>
                    setFormData({ ...formData, judul: e.target.value })
                  }
                  placeholder="Contoh: Penanganan Gangguan AC & Fasilitas Medis"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Versi Revisi *
                  </label>
                  <select
                    value={formData.revisi}
                    onChange={(e) =>
                      setFormData({ ...formData, revisi: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  >
                    <option value="Terbitan Awal (Rev. 0)">Terbitan Awal (Rev. 0)</option>
                    <option value="Revisi 1">Revisi 1</option>
                    <option value="Revisi 2">Revisi 2</option>
                    <option value="Revisi 3">Revisi 3</option>
                    <option value="Revisi 4">Revisi 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Divisi Terkait
                  </label>
                  <select
                    value={formData.divisiId}
                    onChange={(e) =>
                      setFormData({ ...formData, divisiId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="">Lintas Divisi (Umum)</option>
                    {divisiList.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tautan File SOP (PDF / Drive)
                </label>
                <input
                  type="url"
                  value={formData.fileUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, fileUrl: e.target.value })
                  }
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Ringkasan Prosedur / Catatan Perubahan Revisi
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Jelaskan pokok SOP atau bagian yang diperbarui pada revisi ini..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition"
              >
                {submitting ? 'Menerbitkan...' : 'Simpan & Sosialisasikan SOP'}
              </button>
            </form>
          </div>
        )}

        <div className={canManageSop ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Daftar Dokumen SOP Berlaku
            </h2>

            {loading ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Memuat katalog dokumen SOP...
              </p>
            ) : filteredSops.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                Belum ada dokumen SOP yang diterbitkan pada kategori ini.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredSops.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-600">
                          {item.nomorSop}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                          {item.revisi}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded">
                          {item.divisi?.nama || 'Lintas Divisi'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {item.judul}
                      </h3>
                      {item.deskripsi && (
                        <p className="text-xs text-slate-600">{item.deskripsi}</p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        Diterbitkan/Diperbarui:{' '}
                        {new Date(item.updatedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        oleh {item.pengaju?.nama || 'Manajemen RSIA'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                        >
                          📥 Baca / Unduh SOP
                        </a>
                      ) : (
                        <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-lg whitespace-nowrap">
                          Tersedia di Sistem
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DokumenSop;