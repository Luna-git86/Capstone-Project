import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  sumber: 'STAF' | 'KADIV'; // Pembeda instruksi makro vs tiket biasa
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string };
  subTugas?: any[]; // Array untuk rincian breakdown Kadiv -> Koor
}

export default function DetailTugas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil Role User
  const userRole = localStorage.getItem('userRole') || 'STAF';
  const isKadivDir = ['KADIV', 'DIREKTUR'].includes(userRole);
  const isKoor = userRole === 'KOORDINATOR';
  const isStaf = userRole === 'STAF';

  // --- STATE UNTUK FORM AKSI ---
  // Staf
  const [laporanText, setLaporanText] = useState('');
  const [fotoBase64, setFotoBase64] = useState('');
  const [kendalaText, setKendalaText] = useState('');
  // Koordinator / Kadiv
  const [evaluasiNote, setEvaluasiNote] = useState('');
  const [showDelegasiForm, setShowDelegasiForm] = useState(false); // Koor Only

  useEffect(() => {
    // Simulasi Fetch Data
    const fetchDetail = async () => {
      setLoading(true);
      try {
        // NANTINYA: const response = await api.get(`/tickets/${id}`);
        
        // Data Dummy
        setTicket({
          id: Number(id) || 1,
          judul: 'Perbaikan Kompresor AC Utama Poli Gigi',
          lokasi: 'Poli Gigi (Lantai 2)',
          deskripsi: 'AC mati total, pasien kepanasan. Cek unit outdoor di dak atas.',
          prioritas: 'HIGH',
          status: 'MENUNGGU_VALIDASI', // Coba ubah ke 'DIPROSES' atau 'MENUNGGU_TRIASE' untuk tes UI
          deadline: '2026-11-05T15:00:00Z',
          sumber: 'STAF', // Tiket laporan masalah
          laporanPenyelesaian: 'Kompresor sudah diganti dengan unit baru dari gudang. Suhu normal 22C.',
          fotoBukti: 'https://via.placeholder.com/400x300.png?text=Foto+Bukti+Perbaikan', // Simulasi foto
          catatanRevisi: null,
          pembuat: { id: 101, nama: 'Suster Rini', role: 'PERAWAT' },
          pelaksana: { id: 2, nama: 'Anda (Staf)', role: 'STAF' },
        });
      } catch (error) {
        console.error('Gagal mengambil detail tugas', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // --- HANDLER AKSI STAF ---
  const handleLaporSelesai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoBase64) return alert('Foto bukti pekerjaan wajib diunggah!');
    alert(`Laporan dikirim: ${laporanText}`);
    // NANTINYA: api.patch(`/tickets/${id}/status`, { status: 'MENUNGGU_VALIDASI', laporanPenyelesaian: laporanText, fotoBukti: fotoBase64 })
    navigate('/semua-tugas');
  };

  const handleLaporKendala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendalaText) return alert('Tuliskan alasan kendala (Biaya/Alat).');
    alert(`Tugas di-Hold karena: ${kendalaText}`);
    navigate('/semua-tugas');
  };

  // --- HANDLER AKSI KOORDINATOR / KADIV ---
  const handleEvaluasi = async (keputusan: 'SELESAI' | 'DIPROSES') => {
    if (keputusan === 'DIPROSES' && !evaluasiNote) {
      return alert('Mohon tulis catatan revisi agar staf tahu apa yang harus diperbaiki.');
    }
    alert(`Tugas dinyatakan: ${keputusan}`);
    navigate('/semua-tugas');
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat detail tugas...</div>;
  if (!ticket) return <div className="p-8 text-center text-rose-500">Tugas tidak ditemukan.</div>;

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
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${ticket.prioritas === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{ticket.prioritas}</span>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-bold rounded">{ticket.status.replace('_', ' ')}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{ticket.judul}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (Detail Makro) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Informasi Instruksi</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Lokasi / Area</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">📍 {ticket.lokasi || 'Tidak ditentukan'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase">Batas Waktu (SLA)</p>
                <p className="font-bold text-rose-600 text-sm mt-0.5">⏰ {ticket.deadline ? new Date(ticket.deadline).toLocaleString('id-ID') : '-'}</p>
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Deskripsi Pekerjaan / Keluhan</p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
              {ticket.deskripsi}
            </div>
          </div>

          {/* MENAMPILKAN BUKTI KERJA JIKA ADA */}
          {(ticket.fotoBukti || ticket.laporanPenyelesaian) && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Hasil Eksekusi Lapangan</h3>
              
              {ticket.fotoBukti && (
                <div className="mb-4">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Foto Bukti</p>
                  <img src={ticket.fotoBukti} alt="Bukti Selesai" className="w-full max-h-64 object-cover rounded-lg border border-slate-200" />
                </div>
              )}
              
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Laporan Catatan Staf</p>
                <p className="text-sm text-slate-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100 italic">
                  "{ticket.laporanPenyelesaian}"
                </p>
              </div>
            </div>
          )}

          {ticket.catatanRevisi && (
             <div className="bg-rose-50 p-6 rounded-xl border border-rose-200 shadow-sm">
               <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-2">Catatan Evaluasi / Alasan Penolakan</h3>
               <p className="text-sm text-rose-700">{ticket.catatanRevisi}</p>
             </div>
          )}
        </div>

        {/* KOLOM KANAN (Aksi & Status Info) */}
        <div className="flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informasi Pihak Terlibat</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Pembuat:</span>
                <span className="font-semibold text-slate-800">{ticket.pembuat?.nama || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">Pelaksana:</span>
                <span className="font-semibold text-blue-700">{ticket.pelaksana?.nama || 'Belum Ditunjuk'}</span>
              </div>
            </div>
          </div>

          {/* =========================================
              PANEL AKSI (CONDITIONAL RENDERING RBAC) 
              ========================================= */}
          
          {/* PANEL AKSI STAF LAPANGAN */}
          {isStaf && (ticket.status === 'DIPROSES' || ticket.status === 'HOLD_ESKALASI') && (
            <div className="bg-white p-5 rounded-xl border-2 border-indigo-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Form Pelaporan Selesai</h3>
              
              <form onSubmit={handleLaporSelesai} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Unggah Foto Bukti *</label>
                  <input type="file" accept="image/*" onChange={() => setFotoBase64('base64_dummy_string')} className="w-full text-xs" required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Catatan Pekerjaan</label>
                  <textarea rows={2} value={laporanText} onChange={(e) => setLaporanText(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm" placeholder="Apa yang Anda perbaiki?" required />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded shadow">
                  Kirim & Tandai Selesai
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100">
                 <details className="group">
                    <summary className="text-xs font-bold text-amber-600 cursor-pointer list-none hover:underline">⚠️ Lapor Kendala Alat/Biaya</summary>
                    <form onSubmit={handleLaporKendala} className="mt-3 space-y-2">
                      <textarea rows={2} value={kendalaText} onChange={(e) => setKendalaText(e.target.value)} className="w-full p-2 border border-amber-200 bg-amber-50 rounded text-xs" placeholder="Contoh: AC harus diganti baru, anggaran kurang..." required />
                      <button type="submit" className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded">Ajukan Eskalasi</button>
                    </form>
                 </details>
              </div>
            </div>
          )}

          {/* PANEL AKSI KOORDINATOR (DELEGASI) */}
          {isKoor && ticket.status === 'MENUNGGU_TRIASE' && (
            <div className="bg-white p-5 rounded-xl border-2 border-blue-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-2">Tindakan Koordinator</h3>
              <button onClick={() => setShowDelegasiForm(!showDelegasiForm)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded mb-2">
                Tunjuk Teknisi (Delegasi)
              </button>
              {showDelegasiForm && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 italic mt-2">
                  (Form pemilihan staf dan pengaturan batas waktu tampil di sini)
                </div>
              )}
            </div>
          )}

          {/* PANEL EVALUASI (KOORDINATOR & KADIV) */}
          {(isKoor || isKadivDir) && ticket.status === 'MENUNGGU_VALIDASI' && (
            <div className="bg-white p-5 rounded-xl border-2 border-purple-100 shadow-sm">
              <h3 className="text-sm font-bold text-purple-800 mb-3 border-b border-purple-100 pb-2">Evaluasi Hasil Pengerjaan</h3>
              <p className="text-xs text-slate-500 mb-3">Mohon periksa foto bukti dari staf sebelum menutup tugas ini.</p>
              
              <textarea 
                rows={2} 
                value={evaluasiNote} 
                onChange={(e) => setEvaluasiNote(e.target.value)} 
                className="w-full p-2 border border-slate-300 rounded text-sm mb-3" 
                placeholder="Catatan persetujuan / alasan revisi..." 
              />
              
              <div className="flex flex-col gap-2">
                <button onClick={() => handleEvaluasi('SELESAI')} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded shadow">
                  ✅ Setujui (Tutup Tugas)
                </button>
                <button onClick={() => handleEvaluasi('DIPROSES')} className="w-full py-2 bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-sm rounded">
                  🔄 Tolak (Minta Staf Revisi)
                </button>
              </div>
            </div>
          )}
          
          {/* PANEL KADIV/DIREKTUR UNTUK ESKALASI TERTOLAK/TERTAHAN */}
          {isKadivDir && ticket.status === 'HOLD_ESKALASI' && (
             <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-sm">
               <h3 className="text-sm font-bold text-amber-800 mb-2">Tindakan Manajerial</h3>
               <p className="text-xs text-slate-600 mb-3">Tugas ini membutuhkan persetujuan anggaran/pihak ketiga.</p>
               <button onClick={() => navigate('/kadiv/eskalasi')} className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded shadow">
                  Proses Pengajuan Eskalasi
               </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}