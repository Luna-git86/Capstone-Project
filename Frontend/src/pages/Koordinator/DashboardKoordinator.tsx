// Frontend/src/pages/Koordinator/DashboardKoordinator.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Ticket {
  id: number;
  judul: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  divisi?: { nama: string };
  pelaksana?: { nama: string };
}

const DashboardKoordinator: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const userName = localStorage.getItem('userName') || 'Koordinator Unit';

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setTickets(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal mengambil data tiket Koordinator:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(
    (t) =>
      t.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.divisi?.nama || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Baris Pencarian & Tombol Pintas Tambah Tugas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ringkasan Dashboard Koordinator
          </h1>
          <p className="text-sm text-slate-500">
            Selamat bertugas, <span className="font-semibold text-slate-700">{userName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Cari tugas, divisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <Link
            to="/tambah-tugas"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition whitespace-nowrap"
          >
            + Tambah Tugas
          </Link>
        </div>
      </div>

      {/* Kartu Ringkasan Koordinator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Tugas Terdaftar</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{tickets.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Menunggu Triase</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">
            {tickets.filter((t) => t.status === 'MENUNGGU_TRIASE').length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tugas Selesai</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {tickets.filter((t) => t.status === 'SELESAI').length}
          </p>
        </div>
      </div>

      {/* Tabel Tugas Terkini */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Tugas Terkini</h2>
        <p className="text-xs text-slate-500 mb-4">
          Daftar laporan tugas tim yang sedang berjalan
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">ID Tugas</th>
                <th className="py-3 px-4">Nama Tugas</th>
                <th className="py-3 px-4">Divisi Tujuan</th>
                <th className="py-3 px-4">Pelaksana</th>
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Memuat daftar tugas...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada data tugas yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => (
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
                    <td className="py-3 px-4 text-slate-600">
                      {t.pelaksana?.nama || 'Menunggu Delegasi'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
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

export default DashboardKoordinator;