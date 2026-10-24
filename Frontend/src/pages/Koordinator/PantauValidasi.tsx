import { useState } from 'react';

// --- DUMMY DATA TUGAS YANG PERLU DIVALIDASI ---
const daftarValidasi = [
  {
    id: 'TSK-088',
    namaTugas: 'Perbaikan AC Poli Anak',
    staf: 'Budi Santoso (Teknisi AC)',
    tanggalSelesai: '28 Ags 2026, 14:30',
    catatanStaf: 'Freon sudah diisi ulang dan filter dibersihkan. Suhu ruangan kini stabil di 22°C.',
    buktiFoto: 'foto_perbaikan_ac_1.jpg',
    status: 'Menunggu Validasi'
  },
  {
    id: 'TSK-085',
    namaTugas: 'Pengecekan Panel Listrik Utama',
    staf: 'Muhammad Hafidz (Teknisi Listrik)',
    tanggalSelesai: '28 Ags 2026, 11:15',
    catatanStaf: 'MCB utama sudah dikencangkan dan tidak ada korsleting.',
    buktiFoto: 'panel_listrik_ok.jpg',
    status: 'Menunggu Validasi'
  },
  {
    id: 'TSK-080',
    namaTugas: 'Penggantian Pipa Wastafel IGD',
    staf: 'Andi (Plambing)',
    tanggalSelesai: '27 Ags 2026, 16:00',
    catatanStaf: 'Pipa PVC yang bocor telah diganti baru.',
    buktiFoto: 'wastafel_igd.jpg',
    status: 'Selesai'
  }
];

export default function PantauValidasi() {
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [modalType, setModalType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [feedbackCatatan, setFeedbackCatatan] = useState('');

  // Handle Buka Modal Aksi
  const handleOpenModal = (task: any, type: 'APPROVE' | 'REJECT') => {
    setSelectedTask(task);
    setModalType(type);
    setFeedbackCatatan('');
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
    setModalType(null);
  };

  return (
    <div className="p-8 w-full min-h-screen bg-slate-50 flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pantau & Validasi Kinerja Tim</h1>
        <p className="text-slate-500 text-sm mt-1">Periksa hasil pekerjaan lapangan yang diajukan oleh Staf sebelum tugas resmi ditutup</p>
      </div>

      {/* Kontainer Utama */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Daftar Pengajuan Penyelesaian</h3>
            <p className="text-sm text-slate-500">Menampilkan tugas dengan status Menunggu Validasi dan Riwayat</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[950px]">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">ID & Nama Tugas</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Staf Pelaksana</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu Pengajuan</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {daftarValidasi.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="text-xs font-bold text-slate-400">{item.id}</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">{item.namaTugas}</div>
                  </td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-700">{item.staf}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-500">{item.tanggalSelesai}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.status === 'Menunggu Validasi' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {item.status === 'Menunggu Validasi' ? (
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(item, 'APPROVE')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          Setujui
                        </button>
                        <button 
                          onClick={() => handleOpenModal(item, 'REJECT')}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          Minta Revisi
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md">
                        Telah Disetujui
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL POPUP VALIDASI / REVISI --- */}
      {modalType && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header Modal */}
            <div className={`p-6 text-white ${modalType === 'APPROVE' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              <h3 className="text-lg font-bold">
                {modalType === 'APPROVE' ? 'Setujui & Tutup Tugas' : 'Kirim Catatan Revisi ke Staf'}
              </h3>
              <p className="text-xs opacity-90 mt-1">{selectedTask.id} • {selectedTask.namaTugas}</p>
            </div>

            {/* Body Modal */}
            <div className="p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Catatan Pengerjaan dari Staf:</p>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  "{selectedTask.catatanStaf}"
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Bukti Lampiran:</p>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">📎 {selectedTask.buktiFoto}</span>
                  <button className="text-indigo-600 font-bold hover:underline">Lihat Foto</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalType === 'APPROVE' ? 'Catatan Tambahan (Opsional)' : 'Alasan Revisi / Bagian yang Kurang <span className="text-red-500">*</span>'}
                </label>
                <textarea 
                  rows={3}
                  value={feedbackCatatan}
                  onChange={(e) => setFeedbackCatatan(e.target.value)}
                  placeholder={modalType === 'APPROVE' ? 'Cth: Kerja bagus, pertahankan.' : 'Cth: Rapikan kembali kabel di bawah unit AC...'}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={handleCloseModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-white transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  alert(`Tindakan berhasil disimpan untuk tugas ${selectedTask.id}!`);
                  handleCloseModal();
                }}
                className={`px-5 py-2 text-white font-bold rounded-xl text-sm shadow-sm transition-colors ${modalType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {modalType === 'APPROVE' ? 'Konfirmasi Selesai' : 'Kirim Permintaan Revisi'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}