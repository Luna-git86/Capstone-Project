// Frontend/src/pages/Koordinator/DashboardKoordinator.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUserName, getAuthRole, getAuthDivisiNama } from '../../utils/authStorage';
import api from '../../services/api';

interface Ticket {
  id: number;
  judul: string;
  lokasi?: string | null;
  jenisTiket?: 'TUGAS' | 'LAPORAN';
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI' | 'SELESAI' | 'DITOLAK';
  deadline: string | null;
  createdAt?: string;
  divisi?: { nama: string };
  pelaksana?: { nama: string };
  pembuat?: { nama: string };
}

const DashboardKoordinator: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const userName = getAuthUserName('Koordinator Unit');
  const userRole = getAuthRole();
  const userDivisi = getAuthDivisiNama();

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

  const daftarTugas = useMemo(
    () => tickets.filter((t) => t.jenisTiket !== 'LAPORAN'),
    [tickets]
  );

  const laporanMasuk = useMemo(
    () => tickets.filter((t) => t.jenisTiket === 'LAPORAN'),
    [tickets]
  );

  const tugasPrioritasTinggi = useMemo(() => {
    const now = new Date();
    return daftarTugas.filter(
      (t) =>
        t.status !== 'SELESAI' &&
        t.status !== 'DITOLAK' &&
        (t.prioritas === 'HIGH' || Boolean(t.deadline && new Date(t.deadline) < now))
    );
  }, [daftarTugas]);

  const filteredTickets = daftarTugas.filter(
    (t) =>
      t.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.divisi?.nama || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLaporan = laporanMasuk
    .filter(
      (l) =>
        l.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.lokasi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.pembuat?.nama || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, 5);

  return (
    <div className="p-4 sm:p-6 pb-24 md:pb-6 space-y-5 sm:space-y-6">
      {/* Header Judul, Info Divisi & Baris Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 sm:gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-brand-deep border border-emerald-200 text-[11px] font-bold">
            <span>{userRole}</span>
            <span>•</span>
            <span>{userDivisi}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-snug">
            Ringkasan Dashboard Koordinator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Selamat bertugas, <span className="font-semibold text-slate-700">{userName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
          <input
            type="text"
            placeholder="Cari tugas atau laporan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 sm:w-64 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
          />
          <Link
            to="/tambah-tugas"
            className="px-3.5 sm:px-4 py-2.5 bg-brand-deep hover:opacity-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition whitespace-nowrap shrink-0"
          >
            + Tambah Tugas
          </Link>
        </div>
      </div>

      {/* Kartu Ringkasan Koordinator (Grid 2x2 di Mobile, 4 Kolom di Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Total Tugas</p>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">{daftarTugas.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Terdaftar di unit</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Belum Dikerjakan</p>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {daftarTugas.filter((t) => t.status === 'MENUNGGU_TRIASE').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Menunggu staf mulai</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Prioritas Tinggi</p>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {tugasPrioritasTinggi.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Mendesak & lewat SLA
            </p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <p className="text-xs sm:text-sm font-semibold text-slate-500">Tugas Selesai</p>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {daftarTugas.filter((t) => t.status === 'SELESAI').length}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">Tuntas diverifikasi</p>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom Berdampingan: Rangkuman Laporan Masuk (Kiri) & Tugas Terkini (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KIRI (5 Kolom): Tabel Kecil Rangkuman Laporan Masuk */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Laporan Masuk</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                  {laporanMasuk.filter((l) => l.status === 'MENUNGGU_TRIASE').length} Baru
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Rangkuman keluhan terbaru
              </p>
            </div>
            <Link
              to="/menu-laporan"
              className="text-xs font-bold text-brand-deep hover:underline whitespace-nowrap"
            >
              Semua ({laporanMasuk.length}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Keluhan & Lokasi</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      Memuat laporan...
                    </td>
                  </tr>
                ) : filteredLaporan.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400">
                      Belum ada laporan masuk.
                    </td>
                  </tr>
                ) : (
                  filteredLaporan.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => navigate(`/detail-laporan/${l.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-deep whitespace-nowrap">
                        #L-{String(l.id).padStart(3, '0')}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800 line-clamp-1">{l.judul}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {l.lokasi || '-'} • {l.pembuat?.nama || '-'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            l.status === 'MENUNGGU_TRIASE'
                              ? 'bg-amber-50 text-amber-800'
                              : l.status === 'SELESAI'
                              ? 'bg-emerald-50 text-emerald-700'
                              : l.status === 'DITOLAK'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {l.status === 'MENUNGGU_TRIASE'
                            ? 'MENUNGGU EVALUASI'
                            : l.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* KANAN (7 Kolom): Tabel Rangkuman Tugas Terkini */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Tugas Terkini</h2>
              <p className="text-xs text-slate-500">
                5 tugas terbaru yang sedang berjalan
              </p>
            </div>
            <Link
              to="/semua-tugas"
              className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap"
            >
              Semua ({daftarTugas.length}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Tugas & Pelaksana</th>
                  <th className="py-2.5 px-3">Prioritas</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Memuat daftar tugas...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      Belum ada data tugas.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.slice(0, 5).map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/detail-tugas/${t.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 whitespace-nowrap">
                        T-{String(t.id).padStart(3, '0')}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-800 line-clamp-1">{t.judul}</p>
                        <p className="text-[11px] text-slate-400">
                          {t.pelaksana?.nama || 'Menunggu Delegasi'}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            t.prioritas === 'HIGH'
                              ? 'bg-rose-50 text-rose-700'
                              : t.prioritas === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.prioritas}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            t.status === 'MENUNGGU_TRIASE'
                              ? 'bg-amber-50 text-amber-800'
                              : t.status === 'DIPROSES'
                              ? 'bg-blue-50 text-blue-700'
                              : t.status === 'MENUNGGU_VALIDASI'
                              ? 'bg-indigo-50 text-indigo-700'
                              : t.status === 'HOLD_ESKALASI'
                              ? 'bg-rose-50 text-rose-700'
                              : t.status === 'SELESAI'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.status === 'MENUNGGU_TRIASE'
                            ? 'BELUM DIKERJAKAN'
                            : t.status === 'DIPROSES'
                            ? 'SEDANG DIKERJAKAN'
                            : t.status === 'MENUNGGU_VALIDASI'
                            ? 'MENUNGGU VALIDASI'
                            : t.status === 'HOLD_ESKALASI'
                            ? 'ADA KENDALA'
                            : t.status.replace('_', ' ')}
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
    </div>
  );
};

export default DashboardKoordinator;