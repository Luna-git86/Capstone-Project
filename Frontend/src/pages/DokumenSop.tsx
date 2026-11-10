// Frontend/src/pages/DokumenSop.tsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

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
  status?: string; 
}

export default function DokumenSop() {
  const [sops, setSops] = useState<SopItem[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  
  const [selectedDivisi, setSelectedDivisi] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'AKTIF' | 'ARSIP'>('AKTIF');
  const [loading, setLoading] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null); 
  const [originalSop, setOriginalSop] = useState<SopItem | null>(null);

  const [previewItem, setPreviewItem] = useState<SopItem | null>(null);

  const [formData, setFormData] = useState({
    nomorSop: '',
    judul: '',
    divisiId: '',
    deskripsi: '',
    fileUrl: '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const userRole = getAuthRole() || 'STAF';
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

  const processFile = (file: File) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type)) {
      alert('Mohon unggah file dalam format PDF atau Word (.doc / .docx).');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { 
       alert('Ukuran file terlalu besar. Maksimal 5MB.');
       return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setFormData(prev => ({ ...prev, fileUrl: reader.result as string }));
      setFileName(file.name);
    };
    reader.onerror = () => {
      alert('Gagal memproses file dokumen.');
    };
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const removeFile = () => {
    setFormData(prev => ({ ...prev, fileUrl: '' }));
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeFormModal = () => {
    setIsModalOpen(false);
    setEditId(null);
    setOriginalSop(null);
    setFormData({ nomorSop: '', judul: '', divisiId: '', deskripsi: '', fileUrl: '' });
    setFileName('');
    setError('');
  };

  const handleEditClick = (item: SopItem) => {
    setEditId(item.id);
    setOriginalSop(item);
    setFormData({
      nomorSop: item.nomorSop,
      judul: item.judul,
      divisiId: item.divisi?.id ? String(item.divisi.id) : '',
      deskripsi: item.deskripsi || '',
      fileUrl: item.fileUrl || '',
    });
    setFileName(item.fileUrl ? 'Dokumen Tersimpan (Abaikan jika tidak diubah)' : '');
    setIsModalOpen(true);
  };

  const handleToggleArchive = async (item: SopItem) => {
    const isCurrentlyArchived = item.status === 'ARSIP';
    const actionText = isCurrentlyArchived ? 'memulihkan' : 'mengarsipkan';
    const newStatus = isCurrentlyArchived ? 'AKTIF' : 'ARSIP';
    
    if (!window.confirm(`Apakah Anda yakin ingin ${actionText} SOP ini?`)) return;

    try {
      await api.patch(`/tickets/sops/${item.id}`, { status: newStatus });
      setSops(prev => prev.map(s => s.id === item.id ? { ...s, status: newStatus } : s));
      setMessage(`SOP berhasil ${isCurrentlyArchived ? 'dipulihkan' : 'diarsipkan'}.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(`Gagal ${actionText} SOP.`);
    }
  };

  const handleDeletePermanent = async (item: SopItem) => {
    if (!window.confirm(`PERHATIAN: Apakah Anda yakin ingin menghapus permanen SOP "${item.judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      await api.delete(`/tickets/sops/${item.id}`);
      setSops(prev => prev.filter(s => s.id !== item.id));
      setMessage('Dokumen SOP berhasil dihapus permanen.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus dokumen SOP secara permanen.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      let autoRevisi = 'Terbitan Awal';
      
      if (editId && originalSop) {
        const revString = originalSop.revisi; 
        const match = revString.match(/Rev\.(\d+)/i);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          autoRevisi = `Telah Direvisi (Rev.${nextNum})`;
        } else {
          autoRevisi = 'Telah Direvisi (Rev.1)';
        }
      }

      const payload = {
        ...formData,
        revisi: autoRevisi,
        divisiId: formData.divisiId ? Number(formData.divisiId) : null,
      };

      if (editId) {
        await api.put(`/tickets/sops/${editId}`, payload);
        setMessage('Dokumen SOP berhasil diperbarui!');
      } else {
        await api.post('/tickets/sops', payload);
        setMessage('Dokumen SOP berhasil diterbitkan!');
      }
      
      closeFormModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan dokumen SOP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadFile = (item: SopItem) => {
    if (!item.fileUrl) return;
    let extension = '';
    if (item.fileUrl.includes('application/pdf')) extension = '.pdf';
    else if (item.fileUrl.includes('openxmlformats')) extension = '.docx';
    else if (item.fileUrl.includes('msword')) extension = '.doc';

    const safeName = item.nomorSop.replace(/[\/\\]/g, '_');
    const link = document.createElement('a');
    link.href = item.fileUrl;
    link.download = `SOP_${safeName}${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDocument = (item: SopItem) => {
    if (!item.fileUrl) return;

    if (item.fileUrl.includes('application/pdf')) {
      if (item.fileUrl.startsWith('data:')) {
        try {
          const byteString = atob(item.fileUrl.split(',')[1]);
          const mimeString = item.fileUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          const blob = new Blob([ab], { type: mimeString });
          const blobUrl = URL.createObjectURL(blob);
          
          const newTab = window.open(blobUrl, '_blank');
          if (!newTab) alert('Pop-up diblokir oleh browser. Izinkan pop-up untuk melihat dokumen ini.');
        } catch (e) {
          alert('Gagal membuka dokumen PDF.');
        }
      } else {
        window.open(item.fileUrl, '_blank');
      }
    } else {
      setPreviewItem(item); 
    }
  };

  const filteredSops = sops.filter((s) => {
    const isArchived = s.status === 'ARSIP';
    const matchTab = activeTab === 'AKTIF' ? !isArchived : isArchived;
    const matchDivisi = selectedDivisi === 'SEMUA' || String(s.divisi?.id) === selectedDivisi;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      s.judul.toLowerCase().includes(searchLower) || 
      s.nomorSop.toLowerCase().includes(searchLower) ||
      (s.deskripsi && s.deskripsi.toLowerCase().includes(searchLower));
    
    return matchTab && matchDivisi && matchSearch;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dokumen & Sosialisasi SOP</h1>
          <p className="text-sm text-slate-500 mt-1">Katalog Standar Operasional Prosedur (SOP) resmi RSIA Qurrata A'yun.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedDivisi}
            onChange={(e) => setSelectedDivisi(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SEMUA">Semua Divisi ({sops.length})</option>
            {divisiList.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.nama}</option>
            ))}
          </select>

          {canManageSop && (
            <button
              onClick={() => { setEditId(null); setIsModalOpen(true); }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Tambah SOP
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-4 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
          {message}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('AKTIF')}
              className={`flex-1 sm:px-6 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'AKTIF' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              SOP Aktif
            </button>
            <button 
              onClick={() => setActiveTab('ARSIP')}
              className={`flex-1 sm:px-6 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ARSIP' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Diarsipkan
            </button>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari Judul atau Nomor SOP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                <th className="p-4 pl-6">Nomor SOP</th>
                <th className="p-4">Judul & Deskripsi</th>
                <th className="p-4">Divisi & Revisi</th>
                <th className="p-4">Diterbitkan Oleh</th>
                <th className="p-4 text-center min-w-[200px]">Aksi / Tautan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-slate-500">Memuat katalog dokumen SOP...</td></tr>
              ) : filteredSops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-sm text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      {searchQuery ? 'Dokumen tidak ditemukan untuk pencarian ini.' : `Belum ada dokumen SOP yang ${activeTab === 'ARSIP' ? 'diarsipkan' : 'diterbitkan'} pada kategori ini.`}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSops.map((item) => (
                  <tr key={item.id} className="group hover:bg-blue-50/50 transition-colors">
                    <td className="p-4 pl-6 border-l-4 border-transparent group-hover:border-blue-500 font-mono font-bold text-blue-700 text-xs whitespace-nowrap">
                      {item.nomorSop}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 text-sm group-hover:text-blue-900 transition-colors">{item.judul}</p>
                      {item.deskripsi && <p className="text-xs text-slate-500 mt-1 max-w-md line-clamp-2">{item.deskripsi}</p>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">{item.divisi?.nama || 'Lintas Divisi (Umum)'}</span>
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">{item.revisi}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">{item.pengaju?.nama || 'Manajemen RSIA'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        
                        {item.fileUrl ? (
                          <button
                            onClick={() => handleViewDocument(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition-transform active:scale-95 shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            Lihat
                          </button>
                        ) : (
                          <span className="inline-block px-3 py-1.5 bg-slate-100 text-slate-400 text-[10px] font-medium rounded-lg whitespace-nowrap border border-slate-200">
                            Tidak Ada File
                          </span>
                        )}

                        {canManageSop && (
                          <>
                            <button 
                              onClick={() => handleEditClick(item)}
                              title="Edit SOP"
                              className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-lg shadow-sm transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>

                            {/* Tombol Arsip / Pulihkan (Warna abu-abu jika aktif, hijau jika diarsipkan) */}
                            <button 
                              onClick={() => handleToggleArchive(item)}
                              title={activeTab === 'AKTIF' ? 'Arsipkan SOP' : 'Pulihkan SOP'}
                              className={`p-2 shadow-sm rounded-lg border transition-colors ${
                                activeTab === 'AKTIF' 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                              }`}
                            >
                              {activeTab === 'AKTIF' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                              )}
                            </button>

                            {/* Tombol Hapus Permanen (Hanya tampil di tab Arsip) */}
                            {activeTab === 'ARSIP' && (
                              <button 
                                onClick={() => handleDeletePermanent(item)}
                                title="Hapus Permanen"
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg shadow-sm transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            )}
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewItem && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{previewItem.nomorSop}</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{previewItem.revisi}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 truncate max-w-xl">{previewItem.judul}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { handleDownloadFile(previewItem); setPreviewItem(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Unduh Dokumen
                </button>
                <button onClick={() => setPreviewItem(null)} className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-lg transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-center p-10 py-16 text-slate-500">
              <div className="bg-blue-50 text-blue-500 p-4 rounded-full mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Pratinjau File Word Tidak Tersedia</h4>
              <p className="text-sm max-w-md text-center text-slate-600 leading-relaxed">
                Browser Anda tidak mendukung pratinjau dokumen berformat Microsoft Word (.doc / .docx) secara langsung. 
                <br/><br/>
                Silakan klik tombol <strong>Unduh Dokumen</strong> di atas untuk membaca panduan SOP ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && canManageSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editId ? 'Perbarui Dokumen SOP' : 'Unggah SOP Baru'}</h2>
                <p className="text-[11px] text-slate-500 mt-1">{editId ? 'Ubah informasi atau unggah file baru untuk menimpa dokumen lama.' : 'Pilih divisi dan unggah dokumen SOP terbaru.'}</p>
              </div>
              <button onClick={closeFormModal} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              <form id="sopForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nomor Dokumen SOP *</label>
                    <input type="text" required value={formData.nomorSop} onChange={(e) => setFormData({ ...formData, nomorSop: e.target.value })} placeholder="Contoh: SOP/RSIA-IT/001" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Divisi Terkait</label>
                    <select value={formData.divisiId} onChange={(e) => setFormData({ ...formData, divisiId: e.target.value })} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Lintas Divisi (Umum)</option>
                      {divisiList.map((d) => (
                        <option key={d.id} value={String(d.id)}>{d.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Judul SOP *</label>
                  <input type="text" required value={formData.judul} onChange={(e) => setFormData({ ...formData, judul: e.target.value })} placeholder="Contoh: Penanganan Gangguan AC" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Unggah File SOP (PDF / Word)
                  </label>
                  
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    {formData.fileUrl ? (
                      <div className="w-full flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                         <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`${fileName.toLowerCase().includes('.doc') ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'} p-2 rounded`}>
                               {fileName.toLowerCase().includes('.doc') ? (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                               ) : (
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                               )}
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate">{fileName || 'Dokumen Tersimpan'}</span>
                         </div>
                        <button type="button" onClick={removeFile} className="ml-2 text-rose-500 hover:text-rose-700 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <svg className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                        </svg>
                        <p className="text-xs font-bold text-slate-700 mb-1">Tarik & Lepas file PDF / Word ke sini</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50">
                          Pilih File
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".pdf, .doc, .docx, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Catatan Perubahan / Ringkasan</label>
                  <textarea rows={3} value={formData.deskripsi} onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })} placeholder="Jelaskan pokok SOP atau bagian yang diperbarui pada revisi ini..." className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button type="button" onClick={closeFormModal} className="px-5 py-2.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-white transition-colors">
                Batal
              </button>
              <button type="submit" form="sopForm" disabled={submitting} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-sm transition-colors">
                {submitting ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Simpan Dokumen SOP'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}