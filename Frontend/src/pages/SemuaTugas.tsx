// Frontend/src/pages/SemuaTugas.tsx
import React, { useEffect, useState } from 'react';
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

interface Divisi {
  id: number;
  nama: string;
}

interface StaffUser {
  id: number;
  nama: string;
  noHp: string;
  role: string;
  divisiId: number | null;
  divisi?: { id: number; nama: string };
}

// Fungsi kompresi foto otomatis di sisi browser agar upload Base64 cepat & tidak melebihi batas payload server
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
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('SEMUA');

  // 1. Modal Buat Tugas dari Tiket Masalah (Koordinator / Kadiv / Direktur)
  const [selectedTriage, setSelectedTriage] = useState<Ticket | null>(null);
  const [triageForm, setTriageForm] = useState({
    divisiId: '',
    prioritas: 'MEDIUM',
    pelaksanaId: '',
    deadline: '',
    catatanRevisi: '',
  });

  // 2. Modal Lapor Selesai + Upload Foto Bukti (Staf)
  const [reportTarget, setReportTarget] = useState<Ticket | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportPhoto, setReportPhoto] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // 3. Modal Evaluasi Foto & Laporan (Koordinator / Kadiv / Direktur)
  const [evalTarget, setEvalTarget] = useState<Ticket | null>(null);
  const [evalNote, setEvalNote] = useState('');

  // 4. Modal Lapor Kendala Biaya / Alat (Staf)
  const [escalateTarget, setEscalateTarget] = useState<Ticket | null>(null);
  const [escalateNote, setEscalateNote] = useState('');

  const userRole = localStorage.getItem('userRole') || 'STAF';
  const isAdmin = userRole === 'ADMIN';
  const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketRes, divRes, staffRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/auth/divisi'),
        api.get('/tickets/staff'),
      ]);
      setTickets(ticketRes.data.data || []);
      setDivisiList(divRes.data.data || []);
      setStaffList(staffRes.data.data || []);
    } catch (err) {
      console.error('Gagal memuat daftar tugas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format Tanggal & Jam (Hingga Menit)
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Belum diatur';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // Konversi ISO Date ke format input datetime-local (YYYY-MM-DDTHH:mm)
  const toDateTimeLocalInput = (isoStr: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Simpan Buat Tugas dari Tiket Masalah
  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTriage) return;

    try {
      await api.put(`/tickets/${selectedTriage.id}/triage`, {
        divisiId: Number(triageForm.divisiId),
        prioritas: triageForm.prioritas,
        pelaksanaId: Number(triageForm.pelaksanaId),
        deadline: new Date(triageForm.deadline).toISOString(),
        status: 'DIPROSES',
        catatanRevisi: triageForm.catatanRevisi,
      });
      setSelectedTriage(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan penugasan.');
    }
  };

  // Pilih & Kompres Foto Bukti
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      setReportPhoto(compressed);
    } catch (err) {
      alert('Gagal memproses foto.');
    }
  };

  // Kirim Laporan Penyelesaian + Foto oleh Staf (Status -> MENUNGGU_VALIDASI)
  const handleStaffReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    if (!reportPhoto) {
      alert('Silakan pilih foto bukti penyelesaian tugas terlebih dahulu.');
      return;
    }

    try {
      setSubmittingReport(true);
      await api.patch(`/tickets/${reportTarget.id}/status`, {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: reportText,
        fotoBukti: reportPhoto,
      });
      setReportTarget(null);
      setReportText('');
      setReportPhoto('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengirim laporan penyelesaian.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Keputusan Evaluasi oleh Atasan (Setujui -> SELESAI, atau Revisi -> DIPROSES)
  const handleEvaluationDecision = async (decision: 'SELESAI' | 'DIPROSES') => {
    if (!evalTarget) return;
    if (decision === 'DIPROSES' && !evalNote.trim()) {
      alert('Tuliskan catatan evaluasi/revisi agar staf mengetahui bagian yang harus diperbaiki.');
      return;
    }

    try {
      await api.patch(`/tickets/${evalTarget.id}/status`, {
        status: decision,
        catatanRevisi: evalNote.trim() || null,
      });
      setEvalTarget(null);
      setEvalNote('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil evaluasi.');
    }
  };

  // Simpan Lapor Kendala Biaya
  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateTarget) return;
    try {
      await api.patch(`/tickets/${escalateTarget.id}/status`, {
        status: 'HOLD_ESKALASI',
        catatanRevisi: escalateNote,
      });
      setEscalateTarget(null);
      setEscalateNote('');
      fetchData();
    } catch (err) {
      alert('Gagal mengirim laporan kendala.');
    }
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: 'Tiket Masalah (Menunggu Dibuatkan Tugas)',
          cls: 'bg-amber-100 text-amber-800 border border-amber-300',
        };
      case 'DIPROSES':
        return {
          label: 'Sedang Dikerjakan',
          cls: 'bg-blue-100 text-blue-700',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'Menunggu Evaluasi Foto & Hasil',
          cls: 'bg-purple-100 text-purple-800 border border-purple-300',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Tertahan (Kendala Biaya / Alat)',
          cls: 'bg-rose-100 text-rose-700 border border-rose-300',
        };
      case 'SELESAI':
        return {
          label: 'Selesai (Tervalidasi)',
          cls: 'bg-emerald-100 text-emerald-700',
        };
      default:
        return { label: status, cls: 'bg-slate-100 text-slate-700' };
    }
  };

  const getWhatsAppLink = (t: Ticket) => {
    const rawPhone = t.pelaksana?.noHp || '';
    let wa = rawPhone.replace(/[\s\-]/g, '');
    if (wa.startsWith('0')) wa = '62' + wa.slice(1);
    const msg = encodeURIComponent(
      `*[TUGAS E-TICKETING RSIA QURRATA A'YUN]*\n` +
        `No. Tiket: #T-${String(t.id).padStart(3, '0')}\n` +
        `Tugas: ${t.judul}\n` +
        `Lokasi: ${t.lokasi || '-'}\n` +
        `Batas Waktu: *${formatDateTime(t.deadline)}*\n` +
        `Keterangan: ${t.deskripsi}\n\n` +
        `Setelah selesai, mohon unggah foto bukti pekerjaan di sistem E-Ticketing.`
    );
    return `https://wa.me/${wa}?text=${msg}`;
  };

  const filteredTickets =
    filterStatus === 'SEMUA'
      ? tickets
      : tickets.filter((t) => t.status === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Daftar Tiket Masalah, Tugas & Evaluasi
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Mode Pantau Admin — Melihat seluruh daftar tiket, batas waktu pengerjaan, dan foto hasil kerja.'
              : 'Kelola tiket masalah menjadi tugas, laporkan penyelesaian dengan bukti foto, dan evaluasi hasil kerja.'}
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700"
        >
          <option value="SEMUA">Semua Status ({tickets.length})</option>
          <option value="MENUNGGU_TRIASE">Tiket Masalah (Belum Dibuatkan Tugas)</option>
          <option value="DIPROSES">Sedang Dikerjakan</option>
          <option value="MENUNGGU_VALIDASI">Menunggu Evaluasi Foto</option>
          <option value="HOLD_ESKALASI">Tertahan (Kendala Biaya/Alat)</option>
          <option value="SELESAI">Selesai (Tervalidasi)</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
              <th className="py-3.5 px-4">Tiket & Deskripsi</th>
              <th className="py-3.5 px-4">Lokasi & Batas Waktu (Jam)</th>
              <th className="py-3.5 px-4">Divisi & Petugas</th>
              <th className="py-3.5 px-4">Status & Bukti Kerja</th>
              {!isAdmin && <th className="py-3.5 px-4 text-right">Tindakan</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 5} className="py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 5} className="py-8 text-center text-slate-400">
                  Belum ada data tiket atau tugas pada kategori ini.
                </td>
              </tr>
            ) : (
              filteredTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const isOverdue =
                  t.deadline &&
                  t.status !== 'SELESAI' &&
                  new Date(t.deadline) < new Date();

                return (
                  <tr key={t.id} className="hover:bg-slate-50 align-top">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 text-xs">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            t.prioritas === 'HIGH'
                              ? 'bg-rose-100 text-rose-700'
                              : t.prioritas === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {t.prioritas}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 mt-1">{t.judul}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{t.deskripsi}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Pengaju: <strong>{t.pembuat?.nama || '-'}</strong> ({t.pembuat?.role})
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-xs space-y-1">
                      <p className="font-semibold text-slate-800">
                        📍 {t.lokasi || '-'}
                      </p>
                      <p
                        className={`font-medium ${
                          isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                        }`}
                      >
                        ⏰ Batas Waktu: {formatDateTime(t.deadline)}
                      </p>
                      {isOverdue && (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded">
                          Melewati Batas Waktu!
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs space-y-1">
                      <p className="font-bold text-slate-800">
                        Divisi: {t.divisi?.nama || '-'}
                      </p>
                      <p className="text-slate-600">
                        Pemberi Tugas:{' '}
                        <span className="font-semibold text-indigo-700">
                          {t.penanggungJawab?.nama || 'Menunggu Koordinator/Kadiv'}
                        </span>
                      </p>
                      <p className="text-slate-600">
                        Pelaksana:{' '}
                        <span className="font-semibold text-emerald-700">
                          {t.pelaksana?.nama || 'Belum Ditunjuk'}
                        </span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4 space-y-1.5">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-bold rounded ${badge.cls}`}
                      >
                        {badge.label}
                      </span>

                      {t.laporanPenyelesaian && (
                        <p className="text-xs text-slate-700 bg-slate-100 p-2 rounded border border-slate-200">
                          <strong>Laporan Staf:</strong> {t.laporanPenyelesaian}
                        </p>
                      )}

                      {t.fotoBukti && (
                        <div>
                          <img
                            src={t.fotoBukti}
                            alt="Bukti Penyelesaian"
                            className="w-20 h-16 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-90"
                            onClick={() => {
                              setEvalTarget(t);
                              setEvalNote(t.catatanRevisi || '');
                            }}
                          />
                        </div>
                      )}

                      {t.catatanRevisi && (
                        <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                          <strong>Catatan Evaluasi / Kendala:</strong> {t.catatanRevisi}
                        </p>
                      )}
                    </td>

                    {!isAdmin && (
                      <td className="py-3.5 px-4 text-right space-y-1.5">
                        {/* Aksi untuk Koordinator, Kadiv, Direktur */}
                        {isAtasan && (
                          <div className="flex flex-col items-end gap-1.5">
                            {t.status !== 'SELESAI' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTriage(t);
                                  setTriageForm({
                                    divisiId: t.divisi?.id ? String(t.divisi.id) : '',
                                    prioritas: t.prioritas,
                                    pelaksanaId: t.pelaksana?.id
                                      ? String(t.pelaksana.id)
                                      : '',
                                    deadline: toDateTimeLocalInput(t.deadline),
                                    catatanRevisi: t.catatanRevisi || '',
                                  });
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md"
                              >
                                📋 Buat Tugas & Atur Jam
                              </button>
                            )}

                            {t.status === 'MENUNGGU_VALIDASI' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEvalTarget(t);
                                  setEvalNote(t.catatanRevisi || '');
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-md shadow-sm"
                              >
                                🔍 Evaluasi Foto & Hasil
                              </button>
                            )}

                            {t.pelaksana?.noHp && t.status !== 'SELESAI' && (
                              <a
                                href={getWhatsAppLink(t)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md"
                              >
                                📲 Kirim WA Staf
                              </a>
                            )}
                          </div>
                        )}

                        {/* Aksi untuk Staf Pelaksana (Lapor Selesai + Kirim Foto) */}
                        {(t.status === 'DIPROSES' || t.status === 'HOLD_ESKALASI') && (
                          <div className="flex flex-col items-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setReportTarget(t);
                                setReportText(t.laporanPenyelesaian || '');
                                setReportPhoto(t.fotoBukti || '');
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md shadow-sm"
                            >
                              📷 Lapor Selesai (Kirim Foto)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEscalateTarget(t);
                                setEscalateNote(t.catatanRevisi || '');
                              }}
                              className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-md"
                            >
                              ⚠️ Lapor Kendala / Biaya
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

      {/* MODAL 1: Buat Tugas & Atur Jam dari Tiket Masalah (Koordinator / Kadiv / Direktur) */}
      {selectedTriage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Buat Tugas dari Tiket #T-{String(selectedTriage.id).padStart(3, '0')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedTriage.judul}</p>
            </div>

            <form onSubmit={handleTriageSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Divisi Tujuan *
                </label>
                <select
                  value={triageForm.divisiId}
                  onChange={(e) =>
                    setTriageForm({ ...triageForm, divisiId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">-- Pilih Divisi --</option>
                  {divisiList.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Tunjuk Staf Pelaksana *
                </label>
                <select
                  value={triageForm.pelaksanaId}
                  onChange={(e) =>
                    setTriageForm({ ...triageForm, pelaksanaId: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">-- Pilih Staf --</option>
                  {staffList
                    .filter(
                      (s) =>
                        !triageForm.divisiId ||
                        String(s.divisiId) === String(triageForm.divisiId)
                    )
                    .map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.nama} ({s.divisi?.nama || s.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Prioritas Tugas *
                </label>
                <select
                  value={triageForm.prioritas}
                  onChange={(e) =>
                    setTriageForm({ ...triageForm, prioritas: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="LOW">Biasa (Low)</option>
                  <option value="MEDIUM">Penting (Medium)</option>
                  <option value="HIGH">Darurat / Segera (High)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Batas Waktu Pengerjaan (Tanggal & Jam) *
                </label>
                <input
                  type="datetime-local"
                  value={triageForm.deadline}
                  onChange={(e) =>
                    setTriageForm({ ...triageForm, deadline: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Instruksi Tambahan untuk Staf
                </label>
                <textarea
                  rows={2}
                  value={triageForm.catatanRevisi}
                  onChange={(e) =>
                    setTriageForm({ ...triageForm, catatanRevisi: e.target.value })
                  }
                  placeholder="Catatan instruksi pengerjaan..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTriage(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Terbitkan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Pelaporan Penyelesaian Tugas + Upload Foto Bukti (Oleh Staf) */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Laporan Penyelesaian Tugas #T-{String(reportTarget.id).padStart(3, '0')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Unggah foto bukti hasil pekerjaan Anda untuk dievaluasi oleh Koordinator / Kepala Divisi.
              </p>
            </div>

            <form onSubmit={handleStaffReportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  1. Unggah Foto Bukti Pekerjaan *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  required={!reportPhoto}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {reportPhoto && (
                  <img
                    src={reportPhoto}
                    alt="Preview Bukti"
                    className="mt-2 w-full h-44 object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  2. Keterangan Bagaimana Tugas Diselesaikan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Contoh: Filter AC sudah dicuci dan pipa pembuangan yang tersumbat sudah dibersihkan, suhu kembali normal..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg"
                >
                  {submittingReport ? 'Mengirim...' : 'Kirim Laporan & Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Evaluasi Foto & Laporan Penyelesaian (Oleh Koordinator / Kadiv / Direktur) */}
      {evalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Evaluasi Hasil Pengerjaan #T-{String(evalTarget.id).padStart(3, '0')}
              </h3>
              <p className="text-xs text-slate-500">
                Dikerjakan oleh: <strong>{evalTarget.pelaksana?.nama || '-'}</strong>
              </p>
            </div>

            {evalTarget.fotoBukti ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700 uppercase">
                  Foto Bukti Penyelesaian:
                </p>
                <img
                  src={evalTarget.fotoBukti}
                  alt="Bukti Penyelesaian"
                  className="w-full max-h-64 object-contain bg-slate-100 rounded-lg border border-slate-200"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Tidak ada foto terlampir.</p>
            )}

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Laporan Penyelesaian Staf:</p>
              <p className="text-slate-600">
                {evalTarget.laporanPenyelesaian || 'Tidak ada keterangan.'}
              </p>
            </div>

            {isAtasan && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Catatan Evaluasi / Alasan Revisi (Wajib diisi jika meminta revisi)
                  </label>
                  <textarea
                    rows={2}
                    value={evalNote}
                    onChange={(e) => setEvalNote(e.target.value)}
                    placeholder="Tuliskan hasil pemeriksaan atau bagian yang perlu diperbaiki ulang..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEvalTarget(null)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvaluationDecision('DIPROSES')}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg"
                  >
                    🔄 Minta Revisi / Kerjakan Ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvaluationDecision('SELESAI')}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    ✅ Setujui & Nyatakan Selesai
                  </button>
                </div>
              </div>
            )}

            {!isAtasan && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setEvalTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Lapor Kendala Biaya / Alat */}
      {escalateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">
              Lapor Kendala Alat / Butuh Biaya
            </h3>
            <form onSubmit={handleEscalateSubmit} className="space-y-3">
              <textarea
                rows={3}
                required
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                placeholder="Contoh: Kompresor AC rusak dan harus diganti baru..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEscalateTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
                >
                  Kirim Kendala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SemuaTugas;