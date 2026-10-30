import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- TIPE DATA ---
interface Dokumen {
  id: string;
  judul: string;
  kategori: string;
  versi: string;
  tanggalUpdate: string;
  status: 'Aktif' | 'Diarsipkan';
  fileUrl: string;
  deskripsi?: string; // Tambahan untuk keperluan Edit
}

export default function DokumenSop() {
  const navigate = useNavigate();
  const [dokumenList, setDokumenList] = useState<Dokumen[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Tab & Pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('AKTIF'); // AKTIF | ARSIP

  // State untuk Modal Form (Create & Update)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  
  // State Input Form
  const [formData, setFormData] = useState({
    id: '',
    judul: '',
    kategori: 'K3 & Keselamatan',
    versi: 'v1.0',
    deskripsi: '',
    status: 'Aktif'
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Ambil role dari localStorage[cite: 3]
  const currentRole = localStorage.getItem('userRole') || 'STAF';
  // Logika Hak Akses: Hanya Kadiv dan Direktur yang bisa CRUD[cite: 3]
  const canManageSop = ['KADIV', 'DIREKTUR'].includes(currentRole);

  // --- MENGAMBIL DATA (READ) ---
  useEffect(() => {
    const fetchDokumen = async () => {
      setLoading(true);
      try {
        // NANTINYA: const response = await api.get('/sop');
        // setDokumenList(response.data);
        
        // Data Dummy Sementara[cite: 3]
        const mockData: Dokumen[] = [
          { id: 'SOP-001', judul: 'Prosedur Isolasi Kelistrikan IGD', kategori: 'K3 & Keselamatan', versi: 'v2.1', tanggalUpdate: '2026-10-25', status: 'Aktif', fileUrl: '#', deskripsi: 'Panduan mematikan panel utama IGD.' },
          { id: 'SOP-002', judul: 'Standar Kalibrasi Alat Radiologi', kategori: 'Alat Medis', versi: 'v1.4', tanggalUpdate: '2026-10-20', status: 'Aktif', fileUrl: '#', deskripsi: 'Kalibrasi rutin mesin X-Ray.' },
          { id: 'SOP-004', judul: 'Prosedur Pembersihan AC Sentral', kategori: 'Sarpras', versi: 'v1.0', tanggalUpdate: '2025-05-15', status: 'Diarsipkan', fileUrl: '#', deskripsi: 'Pembersihan AC usang.' },
        ];
        setDokumenList(mockData);
      } catch (error) {
        console.error("Gagal memuat dokumen SOP", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDokumen();
  }, []);

  // --- FILTER DATA ---
  const dataTertampil = dokumenList.filter(doc => {
    const matchesSearch = doc.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'AKTIF') return doc.status === 'Aktif';
    if (activeTab === 'ARSIP') return doc.status === 'Diarsipkan';
    
    return true;
  });

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
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6 relative">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dokumen SOP & Referensi</h1>
          <p className="text-slate-500 text-sm mt-1">Pusat panduan standar operasional untuk operasional teknis rumah sakit</p>
        </div>
        
        {/* Tombol Tambah (HANYA UNTUK KADIV/DIREKTUR)[cite: 3] */}
        {canManageSop && (
          <button 
            onClick={handleOpenCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Upload SOP Baru
          </button>
        )}
      </div>

      {/* Kontainer Utama Tabel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Toolbar: Tabs & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('AKTIF')}
              className={`px-5 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === 'AKTIF' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              SOP Aktif
            </button>
            {/* Tab Arsip hanya relevan untuk pengelola[cite: 3] */}
            {canManageSop && (
              <button 
                onClick={() => setActiveTab('ARSIP')}
                className={`px-5 py-2 text-sm font-bold rounded-md transition-colors whitespace-nowrap ${activeTab === 'ARSIP' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                Arsip Lama
              </button>
            )}
          </div>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Cari ID atau judul dokumen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500" 
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
        
        {/* Area Tabel */}
        <div className="w-full overflow-x-auto min-h-[400px]">
          <table className="w-full text-left min-w-[950px]">
            <thead className="bg-[#f8fafc] border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">ID & Judul Dokumen</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Versi & Tanggal</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold text-sm">
                     Memuat data dokumen...
                   </td>
                 </tr>
              ) : dataTertampil.length > 0 ? (
                dataTertampil.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-800 line-clamp-2">{doc.judul}</div>
                      <div className="text-xs font-semibold text-indigo-600 mt-1">{doc.id}</div>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-600">{doc.kategori}</td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-slate-700">{doc.versi}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Updated: {doc.tanggalUpdate}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        {/* Tombol Download (Semua Role) */}
                        <button className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                          Unduh
                        </button>
                        
                        {/* Tombol CRUD Tambahan (Hanya Pengelola)[cite: 3] */}
                        {canManageSop && (
                           <>
                             <button 
                               onClick={() => handleOpenEditModal(doc)}
                               className="bg-white border border-slate-200 hover:text-indigo-600 text-slate-400 p-2 rounded-lg transition-colors shadow-sm"
                               title="Edit Metadata"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                             </button>
                             <button 
                               onClick={() => handleDelete(doc.id)}
                               className="bg-white border border-slate-200 hover:text-rose-600 text-slate-400 p-2 rounded-lg transition-colors shadow-sm"
                               title="Arsipkan / Hapus"
                             >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             </button>
                           </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="py-12 text-center text-slate-500 font-semibold text-sm">
                      Tidak ada dokumen yang sesuai.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
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
}