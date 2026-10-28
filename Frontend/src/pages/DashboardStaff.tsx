// Frontend/src/pages/DashboardStaff.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Ticket {
  id: number;
  judul: string;
  deskripsi: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  divisi?: { nama: string };
  pembuat?: { nama: string };
}

const DashboardStaff: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const userName = localStorage.getItem('userName') || 'Staf Pelaksana';

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tickets');
      setTickets(response.data.data || response.data || []);
    } catch (error) {
      console.error('Gagal mengambil daftar tugas staf:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const tugasAktif = tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK');
  const filteredTugas = tugasAktif.filter((t) =>
    t.judul.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ringkasan Dashboard Operasional
          </h1>
          <p className="text-sm text-slate-500">
            Selamat bertugas, <span className="font-semibold text-slate-700">{userName}</span>
          </p>
        </div>

        <input
          type="text"
          placeholder="Cari tugas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Ringkasan Angka Operasional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Tugas Aktif</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{tugasAktif.length}</p>
          <p className="text-xs text-slate-500 mt-1">Tugas operasional yang perlu ditindaklanjuti</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tugas Diselesaikan</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {tickets.filter((t) => t.status === 'SELESAI').length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Tercatat di riwayat penyelesaian</p>
        </div>
      </div>

      {/* Tabel Tugas Terkini (Tanpa Dummy Data) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Tugas Terkini</h2>
        <p className="text-xs text-slate-500 mb-4"> Daftar penugasan aktif Anda hari ini</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">ID Tugas</th>
                <th className="py-3 px-4">Nama Tugas</th>
                <th className="py-3 px-4">Divisi</th>
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Memuat tugas...
                  </td>
                </tr>
              ) : filteredTugas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada tugas aktif yang ditugaskan saat ini.
                  </td>
                </tr>
              ) : (
                filteredTugas.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-blue-600">
                      T-{String(t.id).padStart(3, '0')}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {t.judul}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {t.divisi?.nama || '-'}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700">
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardStaff;