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
  const canManageSop = ['DIREKTUR', 'KADIV', 'ADMIN'].includes(userRole);

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

  // --- HANDLER MODAL FORM (CREATE & UPDATE) ---
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setFormData({ id: '', judul: '', kategori: 'K3 & Keselamatan', versi: 'v1.0', deskripsi: '', status: 'Aktif' });
    setUploadFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (doc: Dokumen) => {
    setModalMode('EDIT');
    setFormData({ 
      id: doc.id, 
      judul: doc.judul, 
      kategori: doc.kategori, 
      versi: doc.versi, 
      deskripsi: doc.deskripsi || '',
      status: doc.status
    });
    setUploadFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // NANTINYA: Gunakan FormData dan kirim via api.post (Create) atau api.put (Edit)
    console.log(`Menyimpan Dokumen (${modalMode}):`, formData, uploadFile);
    alert(`Dokumen SOP berhasil ${modalMode === 'CREATE' ? 'ditambahkan' : 'diperbarui'}!`);
    setIsModalOpen(false);
    
    // NANTINYA: Refresh list dokumen -> fetchDokumen()
  };

  // --- HANDLER ARCHIVE/DELETE ---
  const handleDelete = (id: string) => {
    if (window.confirm(`Anda yakin ingin mengarsipkan/menghapus dokumen ${id}?`)) {
      alert(`Dokumen ${id} berhasil diarsipkan (Simulasi).`);
      // NANTINYA: await api.delete(`/sop/${id}`) lalu refresh state[cite: 3]
    }
  };

  // Helper Warna Status[cite: 3]
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aktif': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Diarsipkan': return 'bg-slate-100 text-slate-600 border border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

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
        {/* Form Unggah / Pembaruan Revisi SOP (Khusus Direktur, Kadiv & Admin) */}
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

        {/* Daftar Katalog SOP untuk Dibaca & Diunduh Seluruh Pegawai */}
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

      {/* --- MODAL FORM (HANYA MUNCUL JIKA isModalOpen TRUE) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === 'CREATE' ? 'Upload Dokumen SOP Baru' : 'Edit Metadata SOP'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="sopForm" onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                
                {modalMode === 'EDIT' && (
                  <div className="bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-2 rounded-lg border border-amber-200">
                    SOP ID: {formData.id}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Judul Dokumen <span className="text-red-500">*</span></label>
                  <input 
                    type="text" required
                    value={formData.judul}
                    onChange={(e) => setFormData({...formData, judul: e.target.value})}
                    placeholder="Contoh: Prosedur Keselamatan Kerja IGD"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Kategori <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={formData.kategori}
                      onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="K3 & Keselamatan">K3 & Keselamatan</option>
                      <option value="Sarpras">Sarpras</option>
                      <option value="Alat Medis">Alat Medis</option>
                      <option value="Umum & Administrasi">Umum & Administrasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Versi <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required
                      value={formData.versi}
                      onChange={(e) => setFormData({...formData, versi: e.target.value})}
                      placeholder="Contoh: v1.0"
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {modalMode === 'EDIT' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status Dokumen</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Diarsipkan">Arsipkan (Nonaktif)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    {modalMode === 'CREATE' ? 'Upload File Baru' : 'Timpa dengan File Baru (Opsional)'}
                  </label>
                  <input 
                    type="file" 
                    onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    accept=".pdf,.doc,.docx"
                    required={modalMode === 'CREATE'}
                  />
                  <p className="text-xs text-slate-400 mt-1">Hanya menerima format PDF atau Word (Maks 10MB).</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Deskripsi / Catatan Perubahan (Opsional)</label>
                  <textarea 
                    rows={3}
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    placeholder="Tuliskan catatan singkat mengenai dokumen ini..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-100 transition-colors">
                Batal
              </button>
              <button type="submit" form="sopForm" className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors">
                {modalMode === 'CREATE' ? 'Simpan Dokumen' : 'Perbarui Metadata'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DokumenSop;