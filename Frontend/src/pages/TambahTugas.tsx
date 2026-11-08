// Frontend/src/pages/TambahTugas.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

// Fungsi kompresi gambar di browser
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
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Kualitas 70%
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const TambahTugas: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchParams] = useSearchParams();
  const preselectedTicketId = searchParams.get('ticketId') || '';
  const parentId = searchParams.get('parentId');
  const parentTitle = searchParams.get('parentTitle');

  const userRole = getAuthRole() || 'KOORDINATOR';
  const userDivisiId = getAuthDivisiId() || '';
  const currentUserId = getAuthUserId();

  const [incomingTickets, setIncomingTickets] = useState<IncomingTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(preselectedTicketId);
  
  // STATE MASTER DATA
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [allStaffList, setAllStaffList] = useState<Pelaksana[]>([]);
  const [pelaksanaList, setPelaksanaList] = useState<Pelaksana[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  // STATE FORM MULTI-DELEGASI
  const [formData, setFormData] = useState({
    judul: '',
    lokasi: '',
    deskripsi: '',
    prioritas: 'MEDIUM',
    divisiId: userDivisiId,
    pelaksanaIds: [] as string[], 
    deadline: '',
    fotoBukti: '', // State baru untuk menyimpan lampiran instruksi
  });

  // STATE DRAG & DROP FOTO
  const [isDragging, setIsDragging] = useState(false);
  const [previewName, setPreviewName] = useState('');

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
        const allTickets: IncomingTicket[] = Array.isArray(ticketRes.data) ? ticketRes.data : ticketRes.data?.data || [];
          
        const delegatableTickets = allTickets.filter((t) => {
          if (t.status === 'MENUNGGU_TRIASE') return true;
          if (userRole === 'KADIV') {
            const isAssignedToKadiv = !t.pelaksana || t.pelaksana.role === 'KADIV' || (currentUserId && String(t.pelaksana.id) === String(currentUserId));
            return t.pembuat?.role === 'DIREKTUR' && isAssignedToKadiv && t.status !== 'SELESAI';
          }
          if (userRole === 'KOORDINATOR') {
            const isAssignedToKoor = (currentUserId && String(t.pelaksana?.id) === String(currentUserId)) || t.pelaksana?.role === 'KOORDINATOR';
            const isDirective = ['KADIV', 'DIREKTUR'].includes(t.pembuat?.role || '');
            return isDirective && isAssignedToKoor && t.status !== 'SELESAI';
          }
          return false;
        });
        setIncomingTickets(delegatableTickets);

        if (preselectedTicketId) {
          const found = delegatableTickets.find((t) => String(t.id) === String(preselectedTicketId));
          if (found) {
            setFormData((prev) => ({
              ...prev,
              judul: found.judul,
              lokasi: found.lokasi || '',
              deskripsi: found.deskripsi,
              prioritas: found.prioritas || 'MEDIUM',
              divisiId: found.divisi?.id ? String(found.divisi.id) : prev.divisiId,
            }));
          }
        }
      } catch (e) {
        console.warn('Gagal memuat tiket masuk:', e);
      }

      try {
        const divRes = await api.get('/auth/divisi');
        const listDivisi: Divisi[] = divRes.data?.data || divRes.data || [];
        setDivisiList(listDivisi);
        if (!formData.divisiId && listDivisi.length > 0) {
          setFormData((prev) => ({ ...prev, divisiId: prev.divisiId || String(listDivisi[0].id) }));
        }
      } catch (e) {
        console.warn('Gagal memuat divisi:', e);
      }

      try {
        const staffRes = await api.get('/tickets/staff');
        setAllStaffList(staffRes.data?.data || staffRes.data || []);
      } catch (e) {
        try {
          const optRes = await api.get('/tickets/options');
          setAllStaffList(optRes.data?.pelaksana || []);
        } catch (errOpt) {
          console.warn('Gagal memuat staf:', errOpt);
        }
      }
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedTicketId, userRole, currentUserId]);

  const handleSelectIncomingTicket = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTicketId(val);
    if (!val) {
      setFormData((prev) => ({ ...prev, judul: '', lokasi: '', deskripsi: '' }));
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
        fotoBukti: '', // reset foto jika pilih dari list
      }));
      setPreviewName('');
    }
  };

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
        setPelaksanaList([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchPelaksanaByDivisi();
  }, [formData.divisiId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // --- HANDLERS UNTUK DRAG & DROP FOTO INSTRUKSI ---
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Mohon unggah file gambar (JPG/PNG).');
      return;
    }
    try {
      const base64Str = await compressImageToBase64(file);
      setFormData(prev => ({ ...prev, fotoBukti: base64Str }));
      setPreviewName(file.name);
    } catch (err) {
      alert('Gagal memproses gambar instruksi.');
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
    setFormData(prev => ({ ...prev, fotoBukti: '' }));
    setPreviewName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  // ----------------------------------------------------

  const togglePelaksana = (staffId: string) => {
    setFormData((prev) => {
      const isSelected = prev.pelaksanaIds.includes(staffId);
      if (isSelected) {
        return { ...prev, pelaksanaIds: prev.pelaksanaIds.filter((id) => id !== staffId) };
      } else {
        return { ...prev, pelaksanaIds: [...prev.pelaksanaIds, staffId] };
      }
    });
  };

  const hapusPelaksana = (staffId: string) => {
    setFormData((prev) => ({
      ...prev,
      pelaksanaIds: prev.pelaksanaIds.filter((id) => id !== staffId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pelaksanaIds.length === 0) {
      return setError('Anda wajib menunjuk minimal 1 pelaksana/staf untuk tugas ini.');
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
          fotoBukti: formData.fotoBukti || null, // Mengirimkan lampiran foto instruksi
        };

        if (parentId) {
          payload.parentTicketId = Number(parentId);
        }

        return api.post('/tickets', payload);
      });

      await Promise.all(promises);

      setSuccessCount(promises.length);
      setSelectedTicketId('');
      setFormData((prev) => ({
        ...prev,
        judul: '',
        lokasi: '',
        deskripsi: '',
        pelaksanaIds: [],
        deadline: '',
        fotoBukti: '',
      }));
      setPreviewName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat menerbitkan sebagian atau seluruh tugas.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStaff = allStaffList.filter((s) => !formData.divisiId || String(s.divisiId) === String(formData.divisiId));
  const staffToDisplay = pelaksanaList.length > 0 ? pelaksanaList : (filteredStaff.length > 0 ? filteredStaff : allStaffList);

  const pageTitle =
    userRole === 'DIREKTUR' ? 'Terbitkan Arahan Direksi' :
    userRole === 'KADIV' ? 'Terbitkan Arahan Divisi' :
    parentId ? 'Terbitkan Tiket Operasional Lapangan' :
    userRole === 'KOORDINATOR' ? 'Penugasan Tim Lapangan' : 'Pendelegasian Tugas';

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div>
        <span className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded border border-blue-200 uppercase tracking-wider">
          Wewenang Penugasan ({userRole})
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-3">
          {pageTitle}
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          {userRole === 'DIREKTUR' ? 'Menerbitkan arahan strategis rumah sakit kepada Kepala Divisi (Kadiv).'
            : userRole === 'KADIV' ? 'Menerbitkan target atau arahan divisi kepada Koordinator terkait.'
            : parentId ? `Anda sedang memecah arahan induk #T-${parentId} menjadi beberapa tiket operasional teknis.`
            : 'Pendelegasian tugas operasional kepada satu atau beberapa staf sekaligus.'}
        </p>
      </div>

      {parentId && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100 px-2 py-0.5 rounded">
              Tugas Turunan (Sub-Task)
            </span>
            <p className="text-sm font-bold text-indigo-950 mt-1">
              Sumber: #T-{String(parentId).padStart(3, '0')} {parentTitle ? `— ${parentTitle}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => navigate(`/detail-tugas/${parentId}`)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-sm transition">
            Lihat Tiket Induk
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      {successCount > 0 && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-emerald-900">
              Penugasan Massal Berhasil!
            </h3>
            <p className="text-xs font-medium text-emerald-800 mt-1">
              Sebanyak <strong>{successCount} tiket operasional baru</strong> telah diterbitkan secara paralel ke masing-masing staf.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/semua-tugas')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition">
            Lihat di Daftar Tugas
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        {['KADIV', 'KOORDINATOR'].includes(userRole) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Sumber Arahan / Keluhan Masuk
            </label>
            <select value={selectedTicketId} onChange={handleSelectIncomingTicket} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium">
              <option value="">-- Buat Penugasan Baru (Mandiri) --</option>
              {incomingTickets.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  [#T-{String(t.id).padStart(3, '0')}] {t.judul} ({t.lokasi || 'Tanpa lokasi'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Judul Tugas / Arahan *</label>
            <input type="text" name="judul" value={formData.judul} onChange={handleChange} required placeholder="Contoh: Perbaikan & Cuci AC Ruang Nifas" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lokasi / Area *</label>
            <input type="text" name="lokasi" value={formData.lokasi} onChange={handleChange} required placeholder="Contoh: Gedung Utama Lt. 2" className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tingkat Prioritas *</label>
            <select name="prioritas" value={formData.prioritas} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
              <option value="LOW">Biasa (Low)</option>
              <option value="MEDIUM">Penting (Medium)</option>
              <option value="HIGH">Darurat / Segera (High)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Batas Waktu Target *</label>
            <input type="datetime-local" name="deadline" value={formData.deadline} onChange={handleChange} required className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:border-blue-600" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instruksi Detail Pekerjaan *</label>
          <textarea name="deskripsi" rows={3} value={formData.deskripsi} onChange={handleChange} required placeholder="Tuliskan standar hasil kerja yang Anda harapkan..." className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 bg-slate-50 focus:border-blue-600 leading-relaxed" />
        </div>

        {/* ZONA UPLOAD FOTO REFERENSI/INSTRUKSI (DRAG & DROP) */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Lampiran Foto Referensi / Instruksi (Opsional)
          </label>
          
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            {formData.fotoBukti ? (
              <div className="w-full">
                <img src={formData.fotoBukti} alt="Preview Bukti" className="h-40 mx-auto object-cover rounded-lg border border-slate-200 shadow-sm mb-3" />
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
                <p className="text-sm font-bold text-slate-700 mb-1">Tarik & Lepas foto referensi ke sini</p>
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

        {/* SECTION MULTI-DELEGASI STAF */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Pemilihan Tim Pelaksana (Bisa Pilih Banyak)</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Divisi</label>
                <select name="divisiId" value={formData.divisiId} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700">
                  <option value="">-- Tampilkan Semua Divisi --</option>
                  {divisiList.map((d) => (<option key={d.id} value={String(d.id)}>{d.nama}</option>))}
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 h-64 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Daftar Tersedia</p>
                {loadingOptions ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">Memuat data...</p>
                ) : staffToDisplay.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">Tidak ada staf di divisi ini.</p>
                ) : (
                  <div className="space-y-2">
                    {staffToDisplay.map(staf => {
                      const isSelected = formData.pelaksanaIds.includes(String(staf.id));
                      return (
                        <div 
                          key={staf.id} 
                          onClick={() => togglePelaksana(String(staf.id))}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                          </div>
                          <div>
                            <p className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{staf.nama}</p>
                            <p className="text-[10px] text-slate-500">{staf.role}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Tim Ditugaskan</h4>
                  <span className="text-xs font-bold bg-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-full">
                    {formData.pelaksanaIds.length} Orang
                  </span>
                </div>
                
                {formData.pelaksanaIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-indigo-200 rounded-xl bg-white">
                    <p className="text-xs font-medium">Belum ada pelaksana terpilih.</p>
                    <p className="text-[10px]">Pilih dari daftar di sebelah kiri.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.pelaksanaIds.map(id => {
                      const stafInfo = allStaffList.find(s => String(s.id) === id);
                      if (!stafInfo) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 bg-white border border-indigo-200 shadow-sm pl-3 pr-1.5 py-1.5 rounded-full">
                          <div>
                            <p className="text-xs font-bold text-indigo-900 leading-tight">{stafInfo.nama}</p>
                            <p className="text-[9px] text-slate-500 uppercase">{stafInfo.divisi?.nama || 'Staf'}</p>
                          </div>
                          <button type="button" onClick={() => hapusPelaksana(id)} className="w-6 h-6 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full flex items-center justify-center transition">
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button type="submit" disabled={submitting || formData.pelaksanaIds.length === 0} className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-bold rounded-xl shadow-md transition-all">
            {submitting ? 'Memproses Penugasan...' : `Terbitkan Tugas ke ${formData.pelaksanaIds.length || '...'} Orang`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TambahTugas;