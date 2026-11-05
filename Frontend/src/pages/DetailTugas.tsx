import { getAuthRole } from '../utils/authStorage';
// Frontend/src/pages/DetailTugas.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

// --- TIPE DATA ---
interface TicketDetail {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  laporanPenyelesaian: string | null;
  fotoBukti: string | null;
  catatanRevisi: string | null;
  pembuat?: { id: number; nama: string; role: string };
  penanggungJawab?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string };
  divisi?: { id: number; nama: string };
  parentTicket?: {
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    pembuat?: { id: number; nama: string; role: string };
  } | null;
  childTickets?: Array<{
    id: number;
    judul: string;
    status: string;
    prioritas: string;
    deadline: string | null;
    completedAt: string | null;
    pelaksana?: { id: number; nama: string; role: string };
  }>;
}

interface Divisi { id: number; nama: string; }
interface StaffUser { id: number; nama: string; noHp: string; role: string; divisiId: number | null; divisi?: { id: number; nama: string }; }

// Fungsi kompresi foto otomatis di browser
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

export default function DetailTugas() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil Role User
  const userRole = getAuthRole() || 'STAF';
  const isKadivDir = ['KADIV', 'DIREKTUR'].includes(userRole);
  const isKoor = userRole === 'KOORDINATOR';
  const isKadiv = userRole === 'KADIV';
  const isAtasan = isKoor || isKadivDir;
  const isStaf = userRole === 'STAF';

  // --- STATE DATA MASTER (Untuk Delegasi) ---
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  // --- STATE UNTUK FORM AKSI ---
  // 1. Staf (Lapor Selesai / Kendala)
  const [laporanText, setLaporanText] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [kendalaText, setKendalaText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Koordinator / Kadiv (Evaluasi)
  const [evaluasiNote, setEvaluasiNote] = useState('');
  
  // 3. Koordinator (Delegasi / Buat Tugas)
  const [showDelegasiForm, setShowDelegasiForm] = useState(false);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  // --- MENGAMBIL DATA TIKET DARI DATABASE ---
  const fetchDetail = async () => {
    setLoading(true);
    try {
      // 1. Ambil detail tiket
      const response = await api.get(`/tickets/${id}`);
      const ticketData = response.data.data;
      setTicket(ticketData);

      // 2. Jika user adalah atasan dan tiket butuh triase, ambil data Divisi & Staf untuk form
      if (isAtasan) {
        const [divRes, staffRes] = await Promise.all([
          api.get('/auth/divisi'),
          api.get('/tickets/staff'),
        ]);
        setDivisiList(divRes.data.data || []);
        setStaffList(staffRes.data.data || []);

        // Pre-fill form delegasi dari data tiket existing
        setTriageForm({
          divisiId: ticketData.divisi?.id ? String(ticketData.divisi.id) : '',
          prioritas: ticketData.prioritas || 'MEDIUM',
          pelaksanaId: ticketData.pelaksana?.id ? String(ticketData.pelaksana.id) : '',
          deadline: toDateTimeLocalInput(ticketData.deadline),
          catatanRevisi: ticketData.catatanRevisi || '',
        });
      }
    } catch (error: any) {
      console.error('Gagal mengambil detail tugas', error);
      alert(error.response?.data?.message || 'Gagal memuat data tugas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Format ke input datetime-local
  const toDateTimeLocalInput = (isoStr: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // --- HANDLER AKSI DATABASE ---

  // 1. Staf: Unggah & Proses Foto
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      setFotoBase64(compressed);
    } catch (err) {
      alert('Gagal memproses foto.');
    }
  };

  // 2. Staf: Lapor Selesai
  const handleLaporSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoBase64) return alert('Foto bukti pekerjaan wajib diunggah!');
    try {
      setIsSubmitting(true);
      await api.patch(`/tickets/${id}/status`, { 
        status: 'MENUNGGU_VALIDASI', 
        laporanPenyelesaian: laporanText, 
        fotoBukti: fotoBase64 
      });
      alert('Laporan penyelesaian berhasil dikirim!');
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirim laporan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Staf: Lapor Kendala (Eskalasi)
  const handleLaporKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendalaText) return alert('Tuliskan alasan kendala (Biaya/Alat).');
    try {
      setIsSubmitting(true);
      await api.patch(`/tickets/${id}/status`, { 
        status: 'HOLD_ESKALASI', 
        catatanRevisi: kendalaText 
      });
      alert('Status tugas berhasil diubah menjadi HOLD (Eskalasi)');
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirim laporan kendala.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Koordinator/Kadiv: Evaluasi
  const handleEvaluasi = async (keputusan: 'SELESAI' | 'DIPROSES') => {
    if (keputusan === 'DIPROSES' && !evaluasiNote.trim()) {
      return alert('Mohon tulis catatan revisi agar staf tahu apa yang harus diperbaiki.');
    }
    try {
      setIsSubmitting(true);
      await api.patch(`/tickets/${id}/status`, { 
        status: keputusan, 
        catatanRevisi: evaluasiNote.trim() || null 
      });
      alert(`Tugas berhasil dinyatakan: ${keputusan}`);
      navigate('/semua-tugas');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan hasil evaluasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Koordinator: Tunjuk Staf / Buat Tugas (Triase)
  const handleDelegasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.put(`/tickets/${id}/triage`, {
        divisiId: Number(triageForm.divisiId),
        prioritas: triageForm.prioritas,
        pelaksanaId: Number(triageForm.pelaksanaId),
        deadline: new Date(triageForm.deadline).toISOString(),
        status: 'DIPROSES',
        catatanRevisi: triageForm.catatanRevisi,
      });
      alert('Tugas berhasil didelegasikan!');
      fetchDetail(); // Reload detail tugas
      setShowDelegasiForm(false);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan pendelegasian tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Memuat rincian tugas dari server...</div>;
  if (!ticket) return <div className="p-8 text-center text-rose-500 font-bold">Tugas tidak ditemukan atau terjadi kesalahan server.</div>;

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50 max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Header & Navigasi */}
      <div>
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-2 mb-4 transition-colors">
          <span>← Kembali ke Daftar</span>
        </button>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-indigo-700 text-sm">#T-{String(ticket.id).padStart(3, '0')}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${ticket.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-700' : ticket.prioritas === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{ticket.prioritas}</span>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-bold rounded">{ticket.status.replace('_', ' ')}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{ticket.judul}</h1>
          </div>
        </div>
      </div>

      {/* BANNER RELASI ARAHAN INDUK (JIKA ADA) */}
      {ticket.parentTicket && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              Ditugaskan Berdasarkan Arahan Induk
            </span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              #T-{String(ticket.parentTicket.id).padStart(3, '0')} — {ticket.parentTicket.judul}
            </p>
            <p className="text-xs text-slate-500">
              Diterbitkan oleh: {ticket.parentTicket.pembuat?.nama || 'Pimpinan'} ({ticket.parentTicket.pembuat?.role || '-'})
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/detail-tugas/${ticket.parentTicket?.id}`)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            Buka Arahan Induk →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (Detail Makro & Hasil) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Informasi Instruksi</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Lokasi / Area</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{ticket.lokasi || 'Tidak ditentukan'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Batas Waktu (SLA)</p>
                <p className={`font-bold text-sm mt-0.5 ${ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'SELESAI' ? 'text-rose-600' : 'text-slate-800'}`}>
                  {ticket.deadline ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(ticket.deadline)) : 'Belum diatur'}
                </p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Deskripsi Pekerjaan / Keluhan</p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.deskripsi}
            </div>
          </div>

          {/* MENAMPILKAN TIKET OPERASIONAL TURUNAN (SUB-TUGAS STAF) */}
          {ticket.childTickets && ticket.childTickets.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider">
                  Tiket Operasional Lapangan ({ticket.childTickets.length})
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {ticket.childTickets.filter(c => c.status === 'SELESAI').length} dari {ticket.childTickets.length} Selesai
                </span>
              </div>

              <div className="space-y-3">
                {ticket.childTickets.map((child) => (
                  <div
                    key={child.id}
                    onClick={() => navigate(`/detail-tugas/${child.id}`)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700">#T-{String(child.id).padStart(3, '0')}</span>
                        <span className="text-xs font-bold text-slate-800">{child.judul}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Pelaksana: <strong>{child.pelaksana?.nama || 'Belum ada'}</strong> • Batas: {child.deadline ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(child.deadline)) : '-'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      child.status === 'SELESAI'
                        ? 'bg-emerald-100 text-emerald-800'
                        : child.status === 'MENUNGGU_VALIDASI'
                        ? 'bg-purple-100 text-purple-800'
                        : child.status === 'DIPROSES'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {child.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menampilkan bukti hasil kerja */}
          {(ticket.fotoBukti || ticket.laporanPenyelesaian) && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Hasil Eksekusi Lapangan</h3>
              
              {ticket.fotoBukti && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Foto Bukti</p>
                  <img src={ticket.fotoBukti} alt="Bukti Selesai" className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-slate-50" />
                </div>
              )}
              
              {ticket.laporanPenyelesaian && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Laporan Catatan Staf</p>
                  <p className="text-sm text-slate-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 italic">
                    "{ticket.laporanPenyelesaian}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Menampilkan evaluasi atasan / kendala staf */}
          {ticket.catatanRevisi && (
             <div className={`${ticket.status === 'HOLD_ESKALASI' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'} p-6 rounded-xl border shadow-sm`}>
               <h3 className={`text-sm font-bold ${ticket.status === 'HOLD_ESKALASI' ? 'text-amber-800' : 'text-rose-800'} uppercase tracking-wider mb-2`}>
                 {ticket.status === 'HOLD_ESKALASI' ? 'Catatan Kendala (Hold)' : 'Catatan Evaluasi / Revisi'}
               </h3>
               <p className={`text-sm ${ticket.status === 'HOLD_ESKALASI' ? 'text-amber-700' : 'text-rose-700'}`}>{ticket.catatanRevisi}</p>
             </div>
          )}
        </div>

        {/* KOLOM KANAN (Informasi Pihak & Form Aksi) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informasi Pihak Terlibat</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Pembuat:</span>
                <span className="font-semibold text-slate-800">{ticket.pembuat?.nama || '-'} ({ticket.pembuat?.role || '-'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Penanggung Jawab:</span>
                <span className="font-semibold text-indigo-700">{ticket.penanggungJawab?.nama || '-'}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Penerima / Pelaksana:</span>
                <span className="font-semibold text-emerald-700">{ticket.pelaksana?.nama || 'Belum Ditunjuk'} ({ticket.pelaksana?.role || '-'})</span>
              </div>
            </div>
          </div>

          {/* =========================================
              PANEL TINDAK LANJUT KOORDINATOR (ARAHAN KADIV -> TIKET OPERASIONAL STAF)
              ========================================= */}
          {isKoor && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-xl border border-indigo-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-indigo-900">
                Tindak Lanjut Koordinator
              </h3>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Terbitkan tugas operasional kepada Staf pelaksana berdasarkan tugas atau arahan ini.
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/tambah-tugas?parentId=${ticket.id}&parentTitle=${encodeURIComponent(
                      ticket.judul
                    )}`
                  )
                }
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <span>+ Terbitkan Tiket Operasional untuk Staf</span>
              </button>
            </div>
          )}

          {/* =========================================
              PANEL AKSI (CONDITIONAL RENDERING RBAC) 
              ========================================= */}
          
          {/* A. PANEL AKSI STAF LAPANGAN (Kirim Bukti / Lapor Kendala) */}
          {isStaf && (ticket.status === 'DIPROSES' || ticket.status === 'HOLD_ESKALASI') && (
            <div className="bg-white p-5 rounded-xl border-2 border-indigo-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Lapor Pekerjaan Selesai</h3>
              
              <form onSubmit={handleLaporSelesai} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Unggah Foto Bukti *</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700" required />
                  {fotoBase64 && <img src={fotoBase64} alt="Preview" className="mt-2 h-20 rounded border border-slate-200" />}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Catatan Penyelesaian</label>
                  <textarea rows={3} value={laporanText} onChange={(e) => setLaporanText(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="Contoh: AC sudah normal kembali..." required />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded shadow transition-colors">
                  {isSubmitting ? 'Mengirim...' : 'Kirim & Tandai Selesai'}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100">
                 <details className="group">
                    <summary className="text-xs font-bold text-amber-600 cursor-pointer list-none hover:underline">Lapor Kendala Alat/Biaya</summary>
                    <form onSubmit={handleLaporKendala} className="mt-3 space-y-2">
                      <textarea rows={2} value={kendalaText} onChange={(e) => setKendalaText(e.target.value)} className="w-full p-2 border border-amber-200 bg-amber-50 rounded text-xs" placeholder="Kenapa tugas tidak bisa diselesaikan?" required />
                      <button type="submit" disabled={isSubmitting} className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded">Ajukan Eskalasi Kendala</button>
                    </form>
                 </details>
              </div>
            </div>
          )}

          {/* B. PANEL KOORDINATOR & KADIV (DELEGASI TUGAS / TRIASE / DELEGASI ULANG) */}
          {(isKoor || isKadiv) && (ticket.status === 'MENUNGGU_TRIASE' || ticket.status === 'DIPROSES' || ticket.status === 'HOLD_ESKALASI') && (
            <div className="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-2">
                {isKadiv ? 'Pendelegasian Tugas (Kepala Divisi)' : 'Pendelegasian Tugas (Koordinator)'}
              </h3>
              
              {!showDelegasiForm ? (
                <button onClick={() => setShowDelegasiForm(true)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded shadow-sm">
                  {ticket.status === 'MENUNGGU_TRIASE'
                    ? 'Buat Tugas / Tunjuk Pelaksana'
                    : (isKadiv ? 'Delegasikan ke Koordinator' : 'Delegasikan Ulang / Ganti Pelaksana')}
                </button>
              ) : (
                <form onSubmit={handleDelegasiSubmit} className="space-y-3 mt-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Divisi Pelaksana</label>
                    <select value={triageForm.divisiId} onChange={(e) => setTriageForm({ ...triageForm, divisiId: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded text-xs">
                      <option value="">-- Pilih Divisi --</option>
                      {divisiList.map((d) => (<option key={d.id} value={String(d.id)}>{d.nama}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isKadiv ? 'Pilih Koordinator' : 'Pilih Staf Pelaksana'}
                    </label>
                    <select value={triageForm.pelaksanaId} onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded text-xs">
                      <option value="">{isKadiv ? '-- Pilih Koordinator --' : '-- Pilih Staf --'}</option>
                      {staffList.filter((s) => !triageForm.divisiId || String(s.divisiId) === String(triageForm.divisiId)).map((s) => (<option key={s.id} value={String(s.id)}>{s.nama}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Waktu (Deadline)</label>
                    <input type="datetime-local" value={triageForm.deadline} onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                    <select value={triageForm.prioritas} onChange={(e) => setTriageForm({ ...triageForm, prioritas: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded text-xs">
                      <option value="LOW">Low (Biasa)</option>
                      <option value="MEDIUM">Medium (Menengah)</option>
                      <option value="HIGH">High (Darurat)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                    <textarea rows={2} value={triageForm.catatanRevisi} onChange={(e) => setTriageForm({ ...triageForm, catatanRevisi: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded text-xs" placeholder="Instruksi spesifik..."></textarea>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowDelegasiForm(false)} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm">
                      {isSubmitting ? 'Menyimpan...' : (ticket.status === 'MENUNGGU_TRIASE' ? 'Terbitkan Tugas' : 'Simpan Delegasi')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* C. PANEL EVALUASI (KOORDINATOR & KADIV) */}
          {isAtasan && ticket.status === 'MENUNGGU_VALIDASI' && (
            <div className="bg-white p-5 rounded-xl border-2 border-purple-200 shadow-sm">
              <h3 className="text-sm font-bold text-purple-800 mb-3 border-b border-purple-100 pb-2">Evaluasi Hasil Pekerjaan</h3>
              <p className="text-xs text-slate-500 mb-3">Mohon periksa foto bukti laporan dari staf di sebelah kiri sebelum menutup tugas ini.</p>
              
              <textarea 
                rows={2} 
                value={evaluasiNote} 
                onChange={(e) => setEvaluasiNote(e.target.value)} 
                className="w-full p-2 border border-slate-300 rounded text-sm mb-3" 
                placeholder="Catatan jika disetujui / alasan jika minta direvisi..." 
              />
              
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEvaluasi('SELESAI')} disabled={isSubmitting} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded shadow">
                  Setujui & Tutup Tugas
                </button>
                <button onClick={() => handleEvaluasi('DIPROSES')} disabled={isSubmitting} className="w-full py-2 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-sm rounded">
                  Tolak (Minta Staf Revisi)
                </button>
              </div>
            </div>
          )}
          
          {/* D. PANEL KADIV/DIREKTUR UNTUK ESKALASI (Tugas Terkendala) */}
          {isKadivDir && ticket.status === 'HOLD_ESKALASI' && (
             <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
               <h3 className="text-sm font-bold text-amber-800 mb-2">Tindakan Manajerial</h3>
               <p className="text-xs text-slate-600 mb-3">Tugas ini membutuhkan persetujuan anggaran tambahan atau pihak ketiga (vendor).</p>
               <button onClick={() => navigate('/daftar-eskalasi-kadiv')} className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded shadow">
                  Proses Pengajuan Eskalasi
               </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
