// Frontend/src/pages/DetailTugas.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';

// --- TIPE DATA ---
interface TicketLog {
  id: number;
  statusSebelumnya: string | null;
  statusBaru: string;
  catatan: string | null;
  createdAt: string;
  user: { id: number; nama: string; role: string };
}

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
  pelaksana?: { id: number; nama: string; noHp?: string; role: string };
  divisi?: { id: number; nama: string };
  logs?: TicketLog[]; // Array riwayat log aktivitas dari backend
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

  // Role
  const userRole = getAuthRole() || 'STAF';
  const isKadivDir = ['KADIV', 'DIREKTUR'].includes(userRole);
  const isKadiv = userRole === 'KADIV';
  const isKoor = userRole === 'KOORDINATOR';
  const isAtasan = isKoor || isKadivDir;
  const isStaf = userRole === 'STAF';

  // Data Master Delegasi
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);

  // State Form
  const [laporanText, setLaporanText] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [kendalaText, setKendalaText] = useState('');
  const [evaluasiNote, setEvaluasiNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showDelegasiForm, setShowDelegasiForm] = useState(false);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  const fetchDetail = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await api.get(`/tickets/${id}`);
      const ticketData = response.data.data;
      setTicket(ticketData);

      if (isAtasan && !isBackground) {
        const [divRes, staffRes] = await Promise.all([
          api.get('/auth/divisi'),
          api.get('/tickets/staff'),
        ]);
        setDivisiList(divRes.data.data || divRes.data || []);
        setStaffList(staffRes.data.data || staffRes.data || []);

        setTriageForm({
          divisiId: ticketData.divisi?.id ? String(ticketData.divisi.id) : '',
          prioritas: ticketData.prioritas || 'MEDIUM',
          pelaksanaId: ticketData.pelaksana?.id ? String(ticketData.pelaksana.id) : '',
          deadline: toDateTimeLocalInput(ticketData.deadline),
          catatanRevisi: ticketData.catatanRevisi || '',
        });
      }
    } catch (error: any) {
      if (!isBackground) {
        console.error('Gagal mengambil detail tugas', error);
        alert(error.response?.data?.message || 'Gagal memuat data tugas.');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail(false);
      const intervalId = setInterval(() => fetchDetail(true), 10000);
      return () => clearInterval(intervalId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toDateTimeLocalInput = (isoStr: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE': return { label: 'Menunggu Triase', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'DIPROSES': return { label: 'Sedang Dikerjakan', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'MENUNGGU_VALIDASI': return { label: 'Menunggu Evaluasi', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'HOLD_ESKALASI': return { label: 'Tertahan (Kendala)', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'SELESAI': return { label: 'Selesai', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'DITOLAK': return { label: 'Ditolak / Dibatalkan', bg: 'bg-slate-200 text-slate-700 border-slate-300' };
      default: return { label: status, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const getWhatsAppLink = (noHp?: string, msg?: string) => {
    if (!noHp) return '#';
    let wa = noHp.replace(/[\s\-]/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    return `https://wa.me/${wa}?text=${encodeURIComponent(msg || 'Halo, terkait tugas E-Ticketing...')}`;
  };

  // HANDLERS
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFotoBase64(await compressImageToBase64(file));
  };

  const handleLaporSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoBase64) return alert('Foto bukti pekerjaan wajib diunggah!');
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status: 'MENUNGGU_VALIDASI', laporanPenyelesaian: laporanText, fotoBukti: fotoBase64 });
      alert('Laporan penyelesaian dikirim!');
      navigate('/semua-tugas');
    } catch (error: any) { alert(error.response?.data?.message || 'Gagal mengirim laporan.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleLaporKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendalaText) return alert('Tuliskan alasan kendala.');
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status: 'HOLD_ESKALASI', catatanRevisi: kendalaText });
      alert('Tugas ditahan (Eskalasi)');
      navigate('/semua-tugas');
    } catch (error: any) { alert(error.response?.data?.message || 'Gagal mengirim kendala.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleEvaluasi = async (keputusan: 'SELESAI' | 'DIPROSES') => {
    if (keputusan === 'DIPROSES' && !evaluasiNote.trim()) return alert('Tulis catatan revisi untuk staf.');
    setIsSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status: keputusan, catatanRevisi: evaluasiNote.trim() || null });
      alert(`Tugas ${keputusan === 'SELESAI' ? 'disetujui' : 'dikembalikan untuk direvisi'}.`);
      navigate('/semua-tugas');
    } catch (error: any) { alert(error.response?.data?.message || 'Gagal menyimpan evaluasi.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDelegasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/tickets/${id}/triage`, {
        divisiId: Number(triageForm.divisiId), prioritas: triageForm.prioritas, pelaksanaId: Number(triageForm.pelaksanaId),
        deadline: new Date(triageForm.deadline).toISOString(), status: 'DIPROSES', catatanRevisi: triageForm.catatanRevisi,
      });
      alert('Tugas berhasil didelegasikan!');
      setShowDelegasiForm(false);
      fetchDetail(true); 
    } catch (error: any) { alert(error.response?.data?.message || 'Gagal menyimpan pendelegasian.'); } 
    finally { setIsSubmitting(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Memuat rincian tugas...</div>;
  if (!ticket) return <div className="p-8 text-center text-rose-500 font-bold">Tugas tidak ditemukan.</div>;

  const badge = getStatusBadge(ticket.status);
  const isOverdue = ticket.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'SELESAI';
  
  // Kalkulasi Progress Sub-Tugas (Khusus Arahan Induk)
  const totalChild = ticket.childTickets?.length || 0;
  const completedChild = ticket.childTickets?.filter(c => c.status === 'SELESAI').length || 0;
  const progressPercent = totalChild === 0 ? 0 : Math.round((completedChild / totalChild) * 100);
  
  // Kalkulasi Total Revisi
  const jumlahRevisi = ticket.logs ? ticket.logs.filter(log => log.statusBaru === 'DIPROSES' && log.statusSebelumnya === 'MENUNGGU_VALIDASI').length : 0;

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50 max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* HEADER */}
      <div>
        <button onClick={() => navigate(-1)} className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-4 transition-colors">
          <span>KEMBALI KE DAFTAR</span>
        </button>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                #T-{String(ticket.id).padStart(3, '0')}
              </span>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${badge.bg}`}>
                {badge.label}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${ticket.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-700' : ticket.prioritas === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                Prioritas: {ticket.prioritas}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{ticket.judul}</h1>
          </div>
        </div>
      </div>

      {/* BANNER ARAHAN INDUK */}
      {ticket.parentTicket && (
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-100 px-2 py-0.5 rounded">
              Sumber Arahan
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1.5">
              #T-{String(ticket.parentTicket.id).padStart(3, '0')} — {ticket.parentTicket.judul}
            </p>
          </div>
          <button onClick={() => navigate(`/detail-tugas/${ticket.parentTicket?.id}`)} className="px-4 py-2 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition-colors">
            Lihat Tiket Induk
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* KOLOM KIRI (KONTEN UTAMA) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Detail Informasi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Informasi Instruksi</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Lokasi / Area</p>
                <p className="font-semibold text-slate-800 text-sm mt-1">{ticket.lokasi || 'Tidak ditentukan'}</p>
              </div>
              
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">SLA / Batas Waktu</p>
                {ticket.deadline ? (
                  <div className="mt-1 flex items-center gap-3">
                    <p className={`font-bold text-sm ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(ticket.deadline))}
                    </p>
                    {isOverdue && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded animate-pulse">Melewati Batas</span>}
                  </div>
                ) : (
                  <p className="font-semibold text-slate-500 text-sm mt-1 italic">Belum diatur</p>
                )}
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Deskripsi Pekerjaan</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {ticket.deskripsi}
            </div>
          </div>

          {/* MINI DASHBOARD SUB-TUGAS */}
          {ticket.childTickets && ticket.childTickets.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-5 border-b border-slate-100 pb-4 gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Delegasi Operasional</h3>
                  <p className="text-xl font-bold text-slate-800 mt-1">Status Proyek: {progressPercent}% Selesai</p>
                </div>
                <div className="w-full sm:w-1/3">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Progres Keseluruhan</span>
                    <span>{completedChild} / {totalChild} Tiket</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ticket.childTickets.map((child) => (
                  <div key={child.id} onClick={() => navigate(`/detail-tugas/${child.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-700">#T-{String(child.id).padStart(3, '0')}</span>
                        <span className="text-sm font-bold text-slate-800">{child.judul}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Pelaksana: <span className="font-bold text-slate-700">{child.pelaksana?.nama || 'Belum ada'}</span></p>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase whitespace-nowrap ${child.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {child.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BUKTI HASIL KERJA */}
          {(ticket.fotoBukti || ticket.laporanPenyelesaian) && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Laporan Hasil Pekerjaan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ticket.fotoBukti && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Foto Dokumentasi</p>
                    <img src={ticket.fotoBukti} alt="Bukti" className="w-full h-48 object-cover rounded-xl border border-slate-200 shadow-sm hover:object-contain transition-all" />
                  </div>
                )}
                {ticket.laporanPenyelesaian && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Catatan Pelaksana</p>
                    <p className="text-sm text-slate-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100 leading-relaxed">
                      "{ticket.laporanPenyelesaian}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOG AKTIVITAS (Khusus Atasan & Tersedia Data) */}
          {isAtasan && ticket.logs && ticket.logs.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Log Aktivitas & Riwayat Revisi</h3>
                {jumlahRevisi > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded">
                    Total Ditolak/Revisi: {jumlahRevisi} Kali
                  </span>
                )}
              </div>
              
              <div className="space-y-0 text-sm pl-2">
                {ticket.logs.map((log, index) => {
                  const isLast = index === ticket.logs!.length - 1;
                  return (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 ring-4 ring-blue-50"></div>
                        {!isLast && <div className="w-px h-full bg-slate-200 my-1"></div>}
                      </div>
                      <div className="pb-6 w-full">
                        <p className="font-bold text-slate-800 text-sm">
                          {log.user.nama} <span className="text-[10px] text-slate-500 font-bold uppercase ml-1 border border-slate-200 px-1.5 py-0.5 rounded">{log.user.role}</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1 mb-1.5">
                          {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(log.createdAt))}
                        </p>
                        <p className="text-xs text-slate-600">
                          Mengubah status menjadi <span className="font-bold text-slate-800">{log.statusBaru.replace('_', ' ')}</span>
                        </p>
                        {log.catatan && (
                          <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic leading-relaxed">
                            "{log.catatan}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATATAN KENDALA (Jika status masih Hold) */}
          {ticket.catatanRevisi && ticket.status === 'HOLD_ESKALASI' && (
             <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm">
               <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Catatan Kendala (Hold Eskalasi)</h3>
               <p className="text-sm font-medium text-amber-700">{ticket.catatanRevisi}</p>
             </div>
          )}
        </div>

        {/* KOLOM KANAN (SIDEBAR AKSI & INFO) */}
        <div className="flex flex-col gap-5 sticky top-6">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pihak Terlibat</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Dibuat Oleh</p>
                <p className="font-bold text-slate-800">{ticket.pembuat?.nama || '-'} <span className="text-slate-500 font-normal">({ticket.pembuat?.role || '-'})</span></p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Penanggung Jawab (Supervisor)</p>
                <p className="font-bold text-indigo-700">{ticket.penanggungJawab?.nama || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pelaksana Teknis</p>
                <p className="font-bold text-emerald-700">{ticket.pelaksana?.nama || 'Belum Ditunjuk'}</p>
              </div>
            </div>

            {isAtasan && ticket.pelaksana?.noHp && ticket.status === 'DIPROSES' && (
              <a 
                href={getWhatsAppLink(ticket.pelaksana.noHp, `Halo ${ticket.pelaksana.nama}, saya ingin menanyakan progres tiket #T-${String(ticket.id).padStart(3, '0')} (${ticket.judul}).`)}
                target="_blank" rel="noreferrer"
                className="mt-5 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <span>Hubungi staf terkait</span>
              </a>
            )}
          </div>

          {/* A. STAF: LAPOR SELESAI */}
          {isStaf && (ticket.status === 'DIPROSES' || ticket.status === 'HOLD_ESKALASI') && (
            <div className="bg-white p-5 rounded-2xl border-2 border-blue-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Lapor Pekerjaan Selesai</h3>
              <form onSubmit={handleLaporSelesai} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unggah Foto Bukti *</label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700" required />
                  {fotoBase64 && <img src={fotoBase64} alt="Preview" className="mt-2 h-24 rounded-lg border border-slate-200 object-cover" />}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Penyelesaian</label>
                  <textarea rows={3} value={laporanText} onChange={(e) => setLaporanText(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50" placeholder="Jelaskan apa yang diperbaiki..." required />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition">
                  {isSubmitting ? 'Mengirim...' : 'Kirim & Tandai Selesai'}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100">
                 <details className="group">
                    <summary className="text-[10px] font-bold text-amber-600 uppercase cursor-pointer list-none hover:underline flex items-center justify-between">
                      Lapor Kendala Biaya / Alat
                    </summary>
                    <form onSubmit={handleLaporKendala} className="mt-3 space-y-2">
                      <textarea rows={2} value={kendalaText} onChange={(e) => setKendalaText(e.target.value)} className="w-full p-2.5 border border-amber-200 bg-amber-50 rounded-xl text-xs" placeholder="Apa kendalanya?" required />
                      <button type="submit" disabled={isSubmitting} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm">Ajukan Eskalasi Penundaan</button>
                    </form>
                 </details>
              </div>
            </div>
          )}

          {/* B. ATASAN: DELEGASI / BUAT TUGAS TURUNAN */}
          {(isKoor || isKadiv) && (ticket.status === 'MENUNGGU_TRIASE' || ticket.status === 'DIPROSES') && (
            <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-1">Pendelegasian Tugas</h3>
              <p className="text-[10px] text-slate-500 mb-4">{ticket.status === 'MENUNGGU_TRIASE' ? 'Tentukan staf pelaksana untuk masalah ini.' : 'Anda dapat mendelegasikan ulang tugas ini jika perlu.'}</p>
              
              {ticket.childTickets !== undefined ? (
                <button onClick={() => navigate(`/tambah-tugas?parentId=${ticket.id}&parentTitle=${encodeURIComponent(ticket.judul)}`)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
                   Buat Tiket Turunan Baru
                </button>
              ) : (
                !showDelegasiForm ? (
                  <button onClick={() => setShowDelegasiForm(true)} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm">
                    Set Pelaksana & Batas Waktu
                  </button>
                ) : (
                  <form onSubmit={handleDelegasiSubmit} className="space-y-3 mt-2 border-t border-slate-100 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Divisi Pelaksana *</label>
                      <select value={triageForm.divisiId} onChange={(e) => setTriageForm({ ...triageForm, divisiId: e.target.value, pelaksanaId: '' })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs">
                        <option value="">-- Pilih Divisi --</option>
                        {divisiList.map((d) => (<option key={d.id} value={String(d.id)}>{d.nama}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Staf / Pelaksana *</label>
                      <select value={triageForm.pelaksanaId} onChange={(e) => setTriageForm({ ...triageForm, pelaksanaId: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs">
                        <option value="">-- Pilih Pelaksana --</option>
                        {staffList.filter((s) => !triageForm.divisiId || String(s.divisiId) === String(triageForm.divisiId)).map((s) => (<option key={s.id} value={String(s.id)}>{s.nama}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Batas Waktu *</label>
                      <input type="datetime-local" value={triageForm.deadline} onChange={(e) => setTriageForm({ ...triageForm, deadline: e.target.value })} required className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-xs" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowDelegasiForm(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                      <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Delegasi'}
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          )}

          {/* C. ATASAN: EVALUASI HASIL KERJA */}
          {isAtasan && ticket.status === 'MENUNGGU_VALIDASI' && (
            <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 shadow-sm">
              <h3 className="text-sm font-bold text-purple-800 mb-2 border-b border-purple-100 pb-2">Evaluasi Akhir</h3>
              <p className="text-[10px] text-slate-500 mb-3">Tinjau foto bukti sebelum memberikan persetujuan.</p>
              
              <textarea rows={2} value={evaluasiNote} onChange={(e) => setEvaluasiNote(e.target.value)} className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-xl text-xs mb-3" placeholder="Tuliskan alasan revisi di sini (jika menolak)..." />
              
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEvaluasi('SELESAI')} disabled={isSubmitting} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  Setujui (Tugas Selesai)
                </button>
                <button onClick={() => handleEvaluasi('DIPROSES')} disabled={isSubmitting} className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl transition">
                  Tolak (Minta Direvisi)
                </button>
              </div>
            </div>
          )}
          
          {/* D. KADIV/DIREKTUR: ESKALASI */}
          {isKadivDir && ticket.status === 'HOLD_ESKALASI' && (
             <div className="bg-amber-50 p-5 rounded-2xl border-2 border-amber-300 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                 <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                 </span>
                 <h3 className="text-sm font-bold text-amber-900">Perlu Keputusan Manajerial</h3>
               </div>
               
               <p className="text-xs text-amber-800 mb-4 bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/50">
                 Tugas ini dilaporkan terkendala oleh pelaksana (Alat rusak / Butuh biaya).
               </p>
               
               <button onClick={() => navigate('/daftar-eskalasi-kadiv')} className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm">
                  Proses Pengajuan Eskalasi
               </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}