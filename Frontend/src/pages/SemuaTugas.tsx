// Frontend/src/pages/SemuaTugas.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Ticket {
  id: number;
  judul: string;
  lokasi: string | null;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status:
    | 'MENUNGGU_TRIASE'
    | 'DIPROSES'
    | 'MENUNGGU_VALIDASI'
    | 'HOLD_ESKALASI'
    | 'SELESAI'
    | 'DITOLAK';
  deadline: string | null;
  completedAt: string | null;
  laporanPenyelesaian: string | null;
  fotoBukti: string | null;
  catatanRevisi: string | null;
  pembuat?: { id: number; nama: string; noHp: string; role: string };
  penanggungJawab?: { id: number; nama: string; noHp: string; role: string } | null;
  pelaksana?: { id: number; nama: string; noHp: string; role: string } | null;
  divisi?: { id: number; nama: string } | null;
}

// Fungsi kompresi foto otomatis
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

const SemuaTugas: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // STATE UNTUK TAB & FILTER
  const [activeTab, setActiveTab] = useState<'AKTIF' | 'RIWAYAT'>('AKTIF');
  const [filterStatus, setFilterStatus] = useState('SEMUA');

  // Modal Lapor Selesai (Staf)
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Modal Evaluasi (Koordinator/Kadiv/Direktur)
  const [evalTarget, setEvalTarget] = useState<Ticket | null>(null);
  const [evalNote, setEvalNote] = useState('');

  // Modal Lapor Kendala (Staf)
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote] = useState('');

  const userRole = localStorage.getItem('userRole') || 'STAF';
  const userId = Number(localStorage.getItem('userId')) || 0;
  const isAdmin = userRole === 'ADMIN';
  const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole);
  const isStaff = !isAdmin && !isAtasan;

  const fetchData = async () => {
    try {
      setLoading(true);
      const ticketRes = await api.get('/tickets');
      setTickets(ticketRes.data.data || []);
    } catch (err) {
      console.error('Gagal memuat daftar tugas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Belum diatur';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // HANDLER API UNTUK AKSI DI HALAMAN INI
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file); setReportPhoto(compressed);
    } catch (err) { alert('Gagal memproses foto.'); }
  };

  const handleStaffReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    if (!reportPhoto) { alert('Silakan pilih foto bukti terlebih dahulu.'); return; }
    try {
      setSubmittingReport(true);
      await api.patch(`/tickets/${reportTarget.id}/status`, { status: 'MENUNGGU_VALIDASI', laporanPenyelesaian: reportText, fotoBukti: reportPhoto });
      setReportTarget(null); setReportText(''); setReportPhoto(''); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal mengirim laporan.'); } 
    finally { setSubmittingReport(false); }
  };

  const handleEvaluationDecision = async (decision: 'SELESAI' | 'DIPROSES') => {
    if (!evalTarget) return;
    if (decision === 'DIPROSES' && !evalNote.trim()) { alert('Tuliskan catatan revisi.'); return; }
    try {
      await api.patch(`/tickets/${evalTarget.id}/status`, { status: decision, catatanRevisi: evalNote.trim() || null });
      setEvalTarget(null); setEvalNote(''); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Gagal menyimpan hasil evaluasi.'); }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateTarget) return;
    try {
      await api.patch(`/tickets/${escalateTarget.id}/status`, { status: 'HOLD_ESKALASI', catatanRevisi: escalateNote });
      setEscalateTarget(null); setEscalateNote(''); fetchData();
    } catch (err) { alert('Gagal mengirim laporan kendala.'); }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE': return { label: 'Tiket Masalah', cls: 'bg-amber-100 text-amber-800' };
      case 'DIPROSES': return { label: 'Sedang Dikerjakan', cls: 'bg-blue-100 text-blue-700' };
      case 'MENUNGGU_VALIDASI': return { label: 'Menunggu Evaluasi', cls: 'bg-purple-100 text-purple-800' };
      case 'HOLD_ESKALASI': return { label: 'Tertahan (Kendala)', cls: 'bg-rose-100 text-rose-700' };
      case 'SELESAI': return { label: 'Selesai', cls: 'bg-emerald-100 text-emerald-700' };
      case 'DITOLAK': return { label: 'Ditolak / Dibatalkan', cls: 'bg-slate-200 text-slate-700' };
      default: return { label: status, cls: 'bg-slate-100 text-slate-700' };
    }
  };

  const getWhatsAppLink = (t: Ticket) => {
    const rawPhone = t.pelaksana?.noHp || '';
    let wa = rawPhone.replace(/[\s\-]/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    const msg = encodeURIComponent(`*[TUGAS E-TICKETING RSIA]*\nNo. Tiket: #T-${String(t.id).padStart(3, '0')}\nTugas: ${t.judul}\nBatas Waktu: *${formatDateTime(t.deadline)}*\n`);
    return `https://wa.me/${wa}?text=${msg}`;
  };

  // LOGIKA SMART FILTER
  const filteredTickets = tickets.filter((t) => {
    if (isStaff && t.pelaksana?.id !== userId) return false;
    const isCompletedOrRejected = ['SELESAI', 'DITOLAK'].includes(t.status);
    if (activeTab === 'AKTIF' && isCompletedOrRejected) return false;
    if (activeTab === 'RIWAYAT' && !isCompletedOrRejected) return false;
    if (filterStatus !== 'SEMUA' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daftar Tiket Masalah, Tugas & Evaluasi</h1>
          <p className="text-sm text-slate-500">Kelola tiket masalah menjadi tugas, laporkan penyelesaian dengan bukti foto, dan evaluasi hasil kerja.</p>
        </div>
        {isAtasan && (
          <button 
            onClick={() => navigate('/tambah-tugas')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Tambah Tugas Baru
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* DESAIN TAB & FILTER */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-slate-200 bg-white gap-4">
          <div className="flex bg-slate-50 p-1 rounded-lg w-full sm:w-auto border border-slate-100">
             <button 
               onClick={() => { setActiveTab('AKTIF'); setFilterStatus('SEMUA'); }}
               className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'AKTIF' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Tugas Aktif
             </button>
             <button 
               onClick={() => { setActiveTab('RIWAYAT'); setFilterStatus('SEMUA'); }}
               className={`flex-1 sm:flex-none px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'RIWAYAT' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Riwayat Tugas
             </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700"
          >
            <option value="SEMUA">Semua Status pada Kategori ini</option>
            {activeTab === 'AKTIF' && (
              <>
                <option value="MENUNGGU_TRIASE">Belum Dibuatkan Tugas</option>
                <option value="DIPROSES">Sedang Dikerjakan</option>
                <option value="MENUNGGU_VALIDASI">Menunggu Evaluasi Foto</option>
                <option value="HOLD_ESKALASI">Tertahan Kendala</option>
              </>
            )}
            {activeTab === 'RIWAYAT' && (
              <>
                 <option value="SELESAI">Selesai (Tervalidasi)</option>
                 <option value="DITOLAK">Ditolak / Dibatalkan</option>
              </>
            )}
          </select>
        </div>

        {/* TABEL DATA */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                <th className="py-3.5 px-4">Tiket & Deskripsi</th>
                <th className="py-3.5 px-4">Lokasi & Batas Waktu</th>
                <th className="py-3.5 px-4">Divisi & Petugas</th>
                <th className="py-3.5 px-4">Status & Bukti Kerja</th>
                {!isAdmin && <th className="py-3.5 px-4 text-right tracking-wider w-36">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : filteredTickets.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-medium">Belum ada data tiket.</td></tr>
              ) : (
                filteredTickets.map((t) => {
                  const badge = getStatusBadge(t.status);
                  const isOverdue = t.deadline && t.status !== 'SELESAI' && new Date(t.deadline) < new Date();
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 align-top">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 text-xs">#T-{String(t.id).padStart(3, '0')}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${t.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-700' : t.prioritas === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{t.prioritas}</span>
                        </div>
                        <p className="font-bold text-slate-800 mt-1">{t.judul}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{t.deskripsi}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Pengaju: <strong>{t.pembuat?.nama || '-'}</strong> ({t.pembuat?.role})</p>
                      </td>

                      <td className="py-3.5 px-4 text-xs space-y-1">
                        <p className="font-semibold text-slate-800">📍 {t.lokasi || '-'}</p>
                        <p className={`font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>⏰ Batas Waktu: {formatDateTime(t.deadline)}</p>
                        {isOverdue && <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded">Melewati Batas Waktu!</span>}
                      </td>

                      <td className="py-3.5 px-4 text-xs space-y-1">
                        <p className="font-bold text-slate-800">Divisi: {t.divisi?.nama || '-'}</p>
                        <p className="text-slate-600">Pemberi: <span className="font-semibold text-indigo-700">{t.penanggungJawab?.nama || '-'}</span></p>
                        <p className="text-slate-600">Pelaksana: <span className="font-semibold text-emerald-700">{t.pelaksana?.nama || 'Belum Ditunjuk'}</span></p>
                      </td>

                      <td className="py-3.5 px-4 space-y-1.5">
                        <span className={`inline-block px-2.5 py-1 text-[11px] font-bold tracking-wide rounded uppercase ${badge.cls}`}>{badge.label}</span>
                        {t.laporanPenyelesaian && <p className="text-xs text-slate-700 bg-slate-100 p-2 rounded border border-slate-200 mt-1"><strong>Laporan Staf:</strong> {t.laporanPenyelesaian}</p>}
                        {t.fotoBukti && (
                          <div className="mt-1">
                            <img src={t.fotoBukti} alt="Bukti" className="w-20 h-16 object-cover rounded border border-slate-300 cursor-pointer" onClick={() => { setEvalTarget(t); setEvalNote(t.catatanRevisi || ''); }} />
                          </div>
                        )}
                        {t.catatanRevisi && <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 mt-1"><strong>Evaluasi/Kendala:</strong> {t.catatanRevisi}</p>}
                      </td>

                      {!isAdmin && (
                        <td className="py-3.5 px-4 text-right space-y-1.5">
                          
                          {/* TOMBOL LIHAT DETAIL MENGARAH KE DetailTugas.tsx */}
                          <button 
                             onClick={() => navigate(`/detail-tugas/${t.id}`)}
                             className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold rounded-md shadow-sm w-full mb-1 transition-colors"
                          >
                             Lihat Detail
                          </button>

                          {/* Tombol Koordinator / Kadiv */}
                          {isAtasan && activeTab === 'AKTIF' && (
                            <div className="flex flex-col items-end gap-1.5">
                              {t.status === 'MENUNGGU_VALIDASI' && (
                                <button type="button" onClick={() => { setEvalTarget(t); setEvalNote(t.catatanRevisi || ''); }} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md shadow-sm w-full">
                                  Evaluasi Hasil
                                </button>
                              )}
                              {t.pelaksana?.noHp && t.status !== 'SELESAI' && (
                                <a href={getWhatsAppLink(t)} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md w-full text-center block">
                                  Kirim WA Staf
                                </a>
                              )}
                            </div>
                          )}

                          {/* Tombol Staf Lapangan */}
                          {isStaff && activeTab === 'AKTIF' && (t.status === 'DIPROSES' || t.status === 'HOLD_ESKALASI') && (
                            <div className="flex flex-col items-end gap-1.5 pt-1">
                              <button type="button" onClick={() => { setReportTarget(t); setReportText(t.laporanPenyelesaian || ''); setReportPhoto(t.fotoBukti || ''); }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm w-full">
                                Lapor Selesai
                              </button>
                              <button type="button" onClick={() => { setEscalateTarget(t); setEscalateNote(t.catatanRevisi || ''); }} className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-md w-full">
                                Lapor Kendala
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3 MODAL (Report, Evaluasi, Escalate) */}
      {/* ========================================================= */}

      {/* Modal 1: Lapor Selesai (Staf) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Laporan Selesai #T-{String(reportTarget.id).padStart(3, '0')}</h3>
            <form onSubmit={handleStaffReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Bukti *</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} required={!reportPhoto} className="w-full text-xs" />
                {reportPhoto && <img src={reportPhoto} alt="Preview" className="mt-2 w-full h-44 object-cover rounded-lg border" />}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan *</label>
                <textarea rows={3} required value={reportText} onChange={(e) => setReportText(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setReportTarget(null)} className="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" disabled={submittingReport} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg">{submittingReport ? 'Mengirim...' : 'Kirim Laporan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Evaluasi (Atasan) */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Evaluasi Pekerjaan #T-{String(evalTarget.id).padStart(3, '0')}</h3>
            {evalTarget.fotoBukti && <img src={evalTarget.fotoBukti} alt="Bukti" className="w-full max-h-64 object-contain bg-slate-100 rounded-lg border" />}
            <p className="text-sm bg-slate-50 p-3 rounded-lg border">"{evalTarget.laporanPenyelesaian}"</p>
            {isAtasan && (
              <div className="space-y-3 pt-2">
                <textarea rows={2} value={evalNote} onChange={(e) => setEvalNote(e.target.value)} placeholder="Catatan evaluasi/revisi..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEvalTarget(null)} className="px-3 py-2 text-xs font-semibold bg-slate-100 rounded-lg">Batal</button>
                  <button type="button" onClick={() => handleEvaluationDecision('DIPROSES')} className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded-lg">Minta Revisi</button>
                  <button type="button" onClick={() => handleEvaluationDecision('SELESAI')} className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg">Setujui Selesai</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 3: Lapor Kendala */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Lapor Kendala</h3>
            <form onSubmit={handleEscalateSubmit} className="space-y-3">
              <textarea rows={3} required value={escalateNote} onChange={(e) => setEscalateNote(e.target.value)} placeholder="Contoh: AC harus diganti baru..." className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEscalateTarget(null)} className="px-4 py-2 text-xs font-semibold bg-slate-100 rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg">Kirim Kendala</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemuaTugas;