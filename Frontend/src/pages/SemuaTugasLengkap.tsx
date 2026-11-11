// Frontend/src/pages/SemuaTugasLengkap.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getAuthRole } from '../utils/authStorage';
import TaskSubNav from '../components/TaskSubNav';

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
  pembuat?: { id: number; nama: string; noHp?: string; role?: string };
  penanggungJawab?: { id: number; nama: string; noHp?: string; role?: string } | null;
  pelaksana?: { id: number; nama: string; noHp?: string; role?: string } | null;
  divisi?: { id: number; nama: string } | null;
}

const SemuaTugasLengkap: React.FC = () => {
  const navigate = useNavigate();
  const userRole = getAuthRole() || 'STAF';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');

  const fetchTickets = async (isBackground = false) => {
    try {
      // Hanya aktifkan animasi loading jika ini muat awal (bukan di latar belakang)
      if (!isBackground) setLoading(true);
      
      const res = await api.get('/tickets?jenis=TUGAS');
      const data: Ticket[] = Array.isArray(res.data) ? res.data : res.data?.data || [];
      
      // React akan memperbarui Virtual DOM secara otomatis tanpa berkedip
      setTickets(data);
    } catch (err) {
      console.error('Gagal mengambil semua tugas', err);
    } finally {
      // Matikan animasi loading hanya jika ini muat awal
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Ambil data pertama kali saat halaman dibuka (dengan loading)
    fetchTickets(false);

    // 2. Setup Polling: Jalankan Fetch API setiap 10 detik di latar belakang
    const intervalId = setInterval(() => {
      fetchTickets(true);
    }, 10000); // 10 detik

    // 3. Cleanup: Bersihkan interval saat komponen dilepas agar tidak memory leak
    return () => clearInterval(intervalId);
  }, []);

  const counts = useMemo(() => {
    const active = tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK').length;
    const completed = tickets.filter((t) => t.status === 'SELESAI').length;
    return {
      total: tickets.length,
      active,
      completed,
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Filter status
      if (filterStatus === 'ARAHAN_PIMPINAN') {
        if (!['DIREKTUR', 'KADIV'].includes(t.pembuat?.role || '')) return false;
      } else if (filterStatus === 'AKTIF') {
        if (t.status === 'SELESAI' || t.status === 'DITOLAK') return false;
      } else if (filterStatus !== 'SEMUA') {
        if (t.status !== filterStatus) return false;
      }

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.judul.toLowerCase().includes(q);
        const matchId = `#t-${t.id}`.includes(q) || String(t.id).includes(q);
        const matchLoc = (t.lokasi || '').toLowerCase().includes(q);
        const matchPelaksana = (t.pelaksana?.nama || '').toLowerCase().includes(q);
        const matchDivisi = (t.divisi?.nama || '').toLowerCase().includes(q);
        return matchTitle || matchId || matchLoc || matchPelaksana || matchDivisi;
      }

      return true;
    });
  }, [tickets, filterStatus, searchQuery]);

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return { label: 'Menunggu Triase', bg: 'bg-amber-100 text-amber-800' };
      case 'DIPROSES':
        return { label: 'Sedang Dikerjakan', bg: 'bg-blue-100 text-blue-800' };
      case 'MENUNGGU_VALIDASI':
        return { label: 'Menunggu Validasi', bg: 'bg-purple-100 text-purple-800' };
      case 'HOLD_ESKALASI':
        return { label: 'Tertahan (Kendala)', bg: 'bg-rose-100 text-rose-800' };
      case 'SELESAI':
        return { label: 'Selesai', bg: 'bg-emerald-100 text-emerald-800' };
      case 'DITOLAK':
        return { label: 'Ditolak', bg: 'bg-slate-200 text-slate-700' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Halaman Inventaris Lengkap
            </span>
            <span className="text-xs text-slate-400">Semua Riwayat & Tugas Berjalan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Semua Tugas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Menampilkan seluruh inventaris penugasan rumah sakit dari yang aktif hingga yang telah selesai.
          </p>
        </div>

        {['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(userRole) && (
          <button
            type="button"
            onClick={() => navigate('/tambah-tugas')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>+ Buat Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Kontainer Dua Kolom: Side Menu Kecil + Konten Tabel Lengkap */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Side Menu Kecil */}
        <TaskSubNav
          currentTab="SEMUA"
          activeCount={counts.active}
          totalCount={counts.total}
          completedCount={counts.completed}
        />

        {/* Konten Kanan: Filter & Tabel Semua Tugas */}
        <div className="flex-1 w-full space-y-4">
          {/* Toolbar Search & Status Select */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari judul, #T-xxx, pelaksana, divisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-[11px] font-semibold">Cari:</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  x
                </button>
              )}
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SEMUA">Semua Status ({counts.total})</option>
              <option value="AKTIF">Tugas Aktif Saja ({counts.active})</option>
              <option value="SELESAI">Sudah Selesai ({counts.completed})</option>
              <option value="ARAHAN_PIMPINAN">Arahan Pimpinan (Direksi/Kadiv)</option>
              <option value="MENUNGGU_TRIASE">Menunggu Triase</option>
              <option value="DIPROSES">Sedang Dikerjakan</option>
              <option value="MENUNGGU_VALIDASI">Menunggu Validasi</option>
              <option value="HOLD_ESKALASI">Tertahan (Kendala)</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          {/* Tabel Lengkap */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase bg-slate-50 font-semibold tracking-wider">
                  <th className="py-3 px-4">ID & Judul Tugas</th>
                  <th className="py-3 px-4">Divisi & Lokasi</th>
                  <th className="py-3 px-4">Pelaksana / Ditugaskan</th>
                  <th className="py-3 px-4">Status & Prioritas</th>
                  <th className="py-3 px-4">Batas Waktu / Selesai</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Memuat seluruh daftar tugas...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada tugas ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const badge = getStatusBadge(t.status);
                    const isDireksi = t.pembuat?.role === 'DIREKTUR';
                    const isKadiv = t.pembuat?.role === 'KADIV';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              #T-{String(t.id).padStart(3, '0')}
                            </span>
                            {isDireksi && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                Arahan Direksi
                              </span>
                            )}
                            {isKadiv && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                                Arahan Divisi
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 text-xs">{t.judul}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{t.deskripsi}</p>
                        </td>

                        <td className="py-3 px-4 space-y-0.5">
                          <p className="font-semibold text-slate-800">{t.divisi?.nama || 'Lintas Divisi'}</p>
                          <p className="text-slate-500 text-[11px]">{t.lokasi || 'RSIA'}</p>
                        </td>

                        <td className="py-3 px-4 space-y-0.5">
                          <p className="font-semibold text-slate-800">{t.pelaksana?.nama || 'Belum Ditunjuk'}</p>
                          <p className="text-slate-500 text-[11px]">Dari: {t.pembuat?.nama || 'Pegawai'}</p>
                        </td>

                        <td className="py-3 px-4 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
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
                        </td>

                        <td className="py-3 px-4 space-y-0.5">
                          {t.deadline ? (
                            <p className="text-slate-700">
                              DL: {new Date(t.deadline).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          ) : (
                            <p className="text-slate-400 italic">Tanpa deadline</p>
                          )}
                          {t.completedAt && (
                            <p className="text-emerald-700 font-semibold text-[10px]">
                              Selesai: {new Date(t.completedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/detail-tugas/${t.id}`)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-300 transition-colors"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemuaTugasLengkap;