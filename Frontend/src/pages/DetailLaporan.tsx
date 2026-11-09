import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

interface TicketData {
  id: number;
  judul: string;
  deskripsi: string;
  status: string;
  prioritas: string;
  divisiId: number;
  createdAt: string;
  fotoInstruksi?: string | null;
  catatanRevisi?: string | null;
  pembuatId?: number;
  pembuat?: { id?: number; nama: string; role: string; divisi?: { nama: string } };
  childTickets?: Array<{ id: number; judul: string; status: string; pelaksana?: { nama: string } }>;
}

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

export default function DetailLaporan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data User Login
  const userRole = getAuthRole() || 'STAF';
  const userString = localStorage.getItem('user') || '{}';
  const userObj = JSON.parse(userString);
  const currentUserId = userObj.id ? Number(userObj.id) : null;

  // Modal Penolakan State
  const [showTolakModal, setShowTolakModal] = useState(false);
  const [alasanTolak, setAlasanTolak] = useState('');

  // Mode Edit / Revisi State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    judul: '',
    deskripsi: '',
    fotoInstruksi: '',
  });

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const resTicket = await api.get(`/tickets/${id}`);
      const data = resTicket.data.data;
      setTicket(data);
      
      setEditForm({
        judul: data.judul || '',
        deskripsi: data.deskripsi || '',
        fotoInstruksi: data.fotoInstruksi || '',
      });
    } catch (error) {
      console.error('Gagal mengambil data:', error);
      alert('Gagal memuat detail laporan.');
    } finally {
      setLoading(false);
    }
  };

  const isAuthorizedKoor = userRole === 'KOORDINATOR' && ticket?.status === 'MENUNGGU_TRIASE';
  
  // Logika Kelonggaran Otorisasi Revisi: 
  // Berlaku jika user adalah pembuat laporan ATAU memiliki role STAF saat status tiket DITOLAK
  const isPembuatLaporan = Boolean(
    userRole === 'STAF' ||
    (currentUserId && Number(ticket?.pembuatId) === currentUserId) ||
    (currentUserId && Number(ticket?.pembuat?.id) === currentUserId)
  );

  const handleTolakSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasanTolak.trim()) return alert('Alasan penolakan wajib diisi.');

    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { 
        status: 'DITOLAK', 
        catatanRevisi: alasanTolak.trim() 
      });
      alert('Laporan berhasil ditolak dan dikembalikan ke pelapor.');
      setShowTolakModal(false);
      setAlasanTolak('');
      fetchDetail();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menolak laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImageToBase64(file);
        setEditForm(prev => ({ ...prev, fotoInstruksi: base64 }));
      } catch (err) {
        alert('Gagal memproses gambar.');
      }
    }
  };

  const handleKirimRevisi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.judul.trim() || !editForm.deskripsi.trim()) {
      return alert('Judul dan deskripsi wajib diisi.');
    }

    setIsSubmitting(true);
    try {
      // Menggunakan PATCH /tickets/:id/status yang diizinkan untuk Staf
      await api.patch(`/tickets/${id}/status`, {
        status: 'MENUNGGU_TRIASE',
        judul: editForm.judul,
        deskripsi: editForm.deskripsi,
        fotoInstruksi: editForm.fotoInstruksi || null,
      });

      alert('Laporan berhasil diperbarui dan dikirim ulang ke Koordinator!');
      setIsEditing(false);
      fetchDetail();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal memperbarui laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigasiKeTambahTugas = () => {
    if (!ticket) return;
    navigate('/tambah-tugas', {
      state: {
        ticketId: ticket.id,
        judul: ticket.judul,
        deskripsi: ticket.deskripsi,
        divisiId: ticket.divisiId,
        fotoInstruksi: ticket.fotoInstruksi
      }
    });
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium">Memuat rincian laporan...</div>;
  if (!ticket) return <div className="p-8 text-center text-rose-500 font-bold">Laporan tidak ditemukan.</div>;

  const totalChild = ticket.childTickets?.length || 0;
  const completedChild = ticket.childTickets?.filter(c => c.status === 'SELESAI').length || 0;
  const progressPercent = totalChild === 0 ? (ticket.status === 'SELESAI' ? 100 : 0) : Math.round((completedChild / totalChild) * 100);

  return (
    <div className="p-4 md:p-8 w-full min-h-screen bg-slate-50 flex justify-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="bg-sky-100 text-sky-700 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider">
                #T-{String(ticket.id).padStart(3, '0')}
              </span>
              <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                ticket.status === 'MENUNGGU_TRIASE' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                ticket.status === 'DITOLAK' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
              }`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">
              {isAuthorizedKoor ? 'Ruang Triase & Penugasan' : 'Detail Laporan Insiden'}
            </h1>
          </div>
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2">
            <span>Kembali</span>
          </button>
        </div>

        {/* INFORMASI LAPORAN AWAL */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Informasi Laporan Awal</h3>
            {ticket.status === 'DITOLAK' && isPembuatLaporan && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                Revisi Laporan Ini
              </button>
            )}
          </div>
          
          {isEditing ? (
            /* FORM EDIT MEMPERBAIKI LAPORAN */
            <form onSubmit={handleKirimRevisi} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Judul Masalah *</label>
                <input 
                  type="text" 
                  value={editForm.judul} 
                  onChange={(e) => setEditForm({ ...editForm, judul: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Deskripsi Detail *</label>
                <textarea 
                  rows={4} 
                  value={editForm.deskripsi} 
                  onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ganti Foto Bukti (Opsional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                />
                {editForm.fotoInstruksi && (
                  <img src={editForm.fotoInstruksi} alt="Preview Edit" className="mt-3 max-h-48 rounded-lg border border-slate-200 object-cover" />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Kirim Ulang Laporan'}
                </button>
              </div>
            </form>
          ) : (
            /* TAMPILAN LAPORAN NORMAL */
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Dilaporkan Oleh</p>
                  <p className="font-semibold text-slate-800 text-sm">{ticket.pembuat?.nama} <span className="text-slate-500">({ticket.pembuat?.role})</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Waktu Laporan</p>
                  <p className="font-semibold text-slate-800 text-sm">
                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.createdAt))}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Judul Masalah</p>
                  <p className="font-bold text-red-600 text-base">{ticket.judul}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6 mt-6">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Deskripsi Detail</p>
                  <div className="text-slate-700 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap min-h-[100px]">
                    {ticket.deskripsi}
                  </div>
                </div>
                
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Foto Bukti Instruksi</p>
                  {ticket.fotoInstruksi ? (
                    <a href={ticket.fotoInstruksi} target="_blank" rel="noreferrer">
                      <img src={ticket.fotoInstruksi} alt="Bukti Masalah" className="w-full max-h-[500px] object-cover rounded-xl border border-slate-200 hover:opacity-90 transition shadow-sm" />
                    </a>
                  ) : (
                    <div className="h-32 w-full bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs italic">
                      Tidak ada foto terlampir pada laporan ini
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* TOMBOL TRIASE / PENUGASAN KOORDINATOR */}
        {isAuthorizedKoor ? (
          <div className="bg-white p-6 md:p-8 rounded-2xl border-t-4 border-t-indigo-500 border-x border-b border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">Aksi Koordinator</h3>
              <p className="text-xs text-slate-500">Laporan ini memerlukan penanganan. Pilih untuk menugaskan staf atau menolak laporan.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button 
                type="button" 
                onClick={() => setShowTolakModal(true)} 
                className="w-full sm:w-auto px-5 py-2.5 bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl transition-colors text-xs shadow-sm"
              >
                Tolak & Kembalikan
              </button>
              <button 
                type="button" 
                onClick={handleNavigasiKeTambahTugas} 
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-xs shadow-sm flex items-center justify-center gap-2"
              >
                <span>Tugaskan Staf</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </button>
            </div>
          </div>
        ) : (
          /* TAMPILAN PROGRES DAN DITOLAK UNTUK NON-KOORDINATOR */
          <div className="bg-white p-6 md:p-8 rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-slate-200 shadow-sm flex flex-col h-full">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 border-b border-slate-100 pb-4 gap-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Status & Progres Pengerjaan</h3>
                <p className="text-slate-500 text-xs mt-1">Pantau perkembangan penyelesaian masalah ini.</p>
              </div>
              <div className="w-full md:w-1/2">
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                  <span>Persentase Penyelesaian</span>
                  <span className="text-emerald-600">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                  <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>
            </div>

            {ticket.childTickets && ticket.childTickets.length > 0 ? (
              <div className="space-y-3">
                {ticket.childTickets.map(child => (
                  <div key={child.id} onClick={() => navigate(`/detail-tugas/${child.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{child.judul}</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Staf Pelaksana: <span className="font-bold text-slate-700">{child.pelaksana?.nama || 'Belum ditunjuk'}</span></p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase whitespace-nowrap ${child.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {child.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 py-10">
                {ticket.status === 'MENUNGGU_TRIASE' ? (
                  <>
                    <div className="text-amber-500 mb-3 bg-amber-100 p-3 rounded-full">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Menunggu Analisis Koordinator</p>
                    <p className="text-xs text-slate-500 mt-1.5 text-center max-w-sm">Laporan ini telah diterima di sistem dan sedang menunggu koordinator untuk ditugaskan ke teknisi.</p>
                  </>
                ) : ticket.status === 'DITOLAK' ? (
                  <>
                    <div className="text-rose-500 mb-3 bg-rose-100 p-3 rounded-full">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </div>
                    <p className="font-bold text-rose-700 text-base">Laporan Ditolak / Perlu Revisi</p>
                    {ticket.catatanRevisi && (
                      <div className="mt-3 text-xs text-rose-800 bg-rose-50 p-4 rounded-xl border border-rose-200 max-w-md w-full text-center font-medium">
                        Catatan Koordinator: "{ticket.catatanRevisi}"
                      </div>
                    )}
                    {isPembuatLaporan && !isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="mt-5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition"
                      >
                        Revisi & Kirim Ulang Laporan Ini
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-blue-500 mb-3 bg-blue-100 p-3 rounded-full">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Tugas Sedang Dikerjakan</p>
                    <p className="text-xs text-slate-500 mt-1.5 text-center max-w-sm">Tiket ini sedang dikerjakan secara tunggal oleh staf operasional.</p>
                    <button onClick={() => navigate(`/detail-tugas/${ticket.id}`)} className="mt-5 px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition">Lihat Lembar Kerja Tugas</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL FORM PENOLAKAN */}
      {showTolakModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tolak & Kembalikan Laporan</h3>
            <p className="text-xs text-slate-500 mb-4">Berikan alasan jelas mengapa laporan ini dikembalikan agar pelapor dapat melakukan perbaikan.</p>
            
            <form onSubmit={handleTolakSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Alasan Penolakan / Catatan Revisi *</label>
                <textarea 
                  rows={4}
                  value={alasanTolak}
                  onChange={(e) => setAlasanTolak(e.target.value)}
                  placeholder="Misal: Foto lokasi kurang jelas, tolong lampirkan foto bagian alat yang rusak..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => { setShowTolakModal(false); setAlasanTolak(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:bg-slate-400"
                >
                  {isSubmitting ? 'Mengirim...' : 'Konfirmasi Penolakan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}