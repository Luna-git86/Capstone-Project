// Frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Ticket {
  id: number;
  judul: string;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  createdAt: string;
  pembuat?: { nama: string; role: string };
  pelaksana?: { nama: string };
  divisi?: { id: number; nama: string };
}

const Dashboard: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedDivisi, setSelectedDivisi] = useState<string>('SEMUA');
  const [loading, setLoading] = useState<boolean>(true);

  const userName = localStorage.getItem('userName') || 'Eksekutif';
  const userRole = localStorage.getItem('userRole') || 'DIREKTUR';

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setTickets(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal memuat data dasbor eksekutif:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  // Ambil daftar divisi unik secara dinamis dari data tiket
  const daftarDivisi = Array.from(
    new Set(tickets.map((t) => t.divisi?.nama).filter(Boolean))
  ) as string[];

  // Filter tiket berdasarkan divisi yang dipilih
  const filteredTickets =
    selectedDivisi === 'SEMUA'
      ? tickets
      : tickets.filter((t) => t.divisi?.nama === selectedDivisi);

  // Kalkulasi Metrik Secara Real-Time
  const now = new Date();
  const tugasAktif = filteredTickets.filter(
    (t) => t.status === 'MENUNGGU_TRIASE' || t.status === 'DIPROSES'
  );
  const tugasSelesai = filteredTickets.filter((t) => t.status === 'SELESAI');
  const tugasTerlambat = filteredTickets.filter(
    (t) =>
      t.status !== 'SELESAI' &&
      t.status !== 'DITOLAK' &&
      t.deadline &&
      new Date(t.deadline) < now
  );
  const tugasPrioritasTinggi = filteredTickets.filter(
    (t) => t.prioritas === 'HIGH' && t.status !== 'SELESAI'
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Tanpa Tenggat';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Filter Divisi Dinamis */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Eksekutif</h1>
          <p className="text-sm text-slate-500">
            Selamat datang, <span className="font-semibold text-slate-700">{userName}</span> ({userRole})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filterDivisi" className="text-sm font-medium text-slate-600">
            Filter per divisi:
          </label>
          <select
            id="filterDivisi"
            value={selectedDivisi}
            onChange={(e) => setSelectedDivisi(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="SEMUA">Semua Divisi</option>
            {daftarDivisi.map((div) => (
              <option key={div} value={div}>
                {div}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Kartu Ringkasan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Tugas Aktif</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{tugasAktif.length}</p>
          <p className="text-xs text-blue-600 mt-2 font-medium">Menunggu Triase & Diproses</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tugas Selesai</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{tugasSelesai.length}</p>
          <p className="text-xs text-emerald-600 mt-2 font-medium">
            {filteredTickets.length > 0
              ? `Tingkat penyelesaian ${Math.round((tugasSelesai.length / filteredTickets.length) * 100)}%`
              : 'Belum ada data tugas'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tugas Terlambat (Overdue)</p>
          <p className="text-3xl font-bold text-rose-600 mt-2">{tugasTerlambat.length}</p>
          <p className="text-xs text-rose-600 mt-2 font-medium">Melewati batas waktu SLA</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Prioritas Tinggi (High)</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{tugasPrioritasTinggi.length}</p>
          <p className="text-xs text-amber-600 mt-2 font-medium">Membutuhkan perhatian segera</p>
        </div>
      </div>

      {/* Panel Bawah: Capaian Terkini & Tabel Tugas Prioritas Tinggi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Capaian Terkini */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Capaian Terkini</h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full">
              {tugasSelesai.length} Selesai
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-4">Memuat data...</p>
          ) : tugasSelesai.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Belum ada tugas yang diselesaikan.
            </p>
          ) : (
            <div className="space-y-3">
              {tugasSelesai.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.judul}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.divisi?.nama || 'Lintas Divisi'} • Diselesaikan oleh{' '}
                      {item.pelaksana?.nama || 'Tim Teknis'}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    {item.prioritas}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Tabel Tugas Prioritas Tinggi & Menunggu Triase */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Pantauan Tugas Prioritas Tinggi & Triase
            </h2>
            <p className="text-xs text-slate-500">
              Daftar tugas aktif yang membutuhkan eskalasi atau pengawasan pimpinan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="py-3 px-3">ID & Nama Tugas</th>
                  <th className="py-3 px-3">Divisi</th>
                  <th className="py-3 px-3">Diajukan Oleh</th>
                  <th className="py-3 px-3">Prioritas</th>
                  <th className="py-3 px-3">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : tugasAktif.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tidak ada antrean tugas aktif saat ini.
                    </td>
                  </tr>
                ) : (
                  tugasAktif.slice(0, 6).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-medium text-slate-800">
                        <span className="text-xs text-blue-600 font-bold mr-1.5">
                          #T-{String(t.id).padStart(3, '0')}
                        </span>
                        {t.judul}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {t.divisi?.nama || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {t.pembuat?.nama || 'Sistem'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            t.prioritas === 'HIGH'
                              ? 'bg-rose-100 text-rose-700'
                              : t.prioritas === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {t.prioritas}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {formatDate(t.deadline)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;