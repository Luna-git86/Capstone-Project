// Frontend/src/pages/Kadiv/DashboardKadiv.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Ticket {
  id: number;
  judul: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  pembuat?: { nama: string };
  pelaksana?: { nama: string };
  divisi?: { nama: string };
}

const DashboardKadiv: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const userName = localStorage.getItem('userName') || 'Kepala Divisi';

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const response = await api.get('/tickets');
        setTickets(response.data.data || response.data || []);
      } catch (error) {
        console.error('Gagal mengambil data tiket Kadiv:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const now = new Date();
  const menungguTriase = tickets.filter((t) => t.status === 'MENUNGGU_TRIASE');
  const sedangDiproses = tickets.filter((t) => t.status === 'DIPROSES');
  const tugasSelesai = tickets.filter((t) => t.status === 'SELESAI');
  const tugasTerlambat = tickets.filter(
    (t) =>
      t.status !== 'SELESAI' &&
      t.status !== 'DITOLAK' &&
      t.deadline &&
      new Date(t.deadline) < now
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Belum ditentukan';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Manajerial (Kepala Divisi)
          </h1>
          <p className="text-sm text-slate-500">
            Selamat bertugas, <span className="font-semibold text-slate-700">{userName}</span> — Panel Evaluasi, Triase & Pendelegasian Tugas
          </p>
        </div>
        <Link
          to="/semua-tugas"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
        >
          Buka Panel Triase & Delegasi
        </Link>
      </div>

      {/* 4 Kartu Ringkasan Manajerial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Menunggu Triase</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{menungguTriase.length}</p>
          <p className="text-xs text-slate-500 mt-2">Perlu validasi & delegasi staf</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Tugas Aktif</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{sedangDiproses.length}</p>
          <p className="text-xs text-slate-500 mt-2">Sedang dikerjakan oleh staf</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tugas Selesai</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{tugasSelesai.length}</p>
          <p className="text-xs text-slate-500 mt-2">Telah diselesaikan</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Melewati Tenggat (Overdue)</p>
          <p className="text-3xl font-bold text-rose-600 mt-2">{tugasTerlambat.length}</p>
          <p className="text-xs text-slate-500 mt-2">Perlu evaluasi / eskalasi</p>
        </div>
      </div>

      {/* Tabel Tugas Menunggu Triase / Evaluasi */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Total Tugas Menunggu Triase & Evaluasi
            </h2>
            <p className="text-xs text-slate-500">
              Daftar laporan masuk yang memerlukan penentuan urgensi dan penunjukan staf pelaksana
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
            {menungguTriase.length} Antrean Baru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <th className="py-3 px-4">ID & Nama Tugas</th>
                <th className="py-3 px-4">Diajukan Oleh</th>
                <th className="py-3 px-4">Pelaksana Saat Ini</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Prioritas</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Memuat antrean tugas...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada tiket tugas yang masuk ke divisi Anda.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <span className="text-xs font-bold text-blue-600 mr-2">
                        #T-{String(t.id).padStart(3, '0')}
                      </span>
                      {t.judul}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {t.pembuat?.nama || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {t.pelaksana?.nama || (
                        <span className="text-amber-600 italic text-xs">
                          Belum didelegasikan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDate(t.deadline)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
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
                      <span
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded ${
                          t.status === 'MENUNGGU_TRIASE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : t.status === 'DIPROSES'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
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

export default DashboardKadiv;