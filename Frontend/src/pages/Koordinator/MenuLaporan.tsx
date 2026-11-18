// Frontend/src/pages/MenuLaporan.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Eye,
  FileText,
  Filter,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react';
import api from '../../services/api';

interface Divisi {
  id: number;
  nama: string;
}

interface Ticket {
  id: number;
  judul: string;
  lokasi?: string | null;
  status: 'MENUNGGU_TRIASE' | 'DIPROSES' | 'MENUNGGU_VALIDASI' | 'HOLD_ESKALASI' | 'SELESAI' | 'DITOLAK';
  createdAt?: string;
  divisi?: { id?: number; nama: string };
  pembuat?: { id?: number; nama: string };
  pelapor?: { id?: number; nama: string };
}

export default function AntreanLaporan() {
  const [daftarLaporan, setDaftarLaporan] = useState<Ticket[]>([]);
  const [divisiList, setDivisiList] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'MENUNGGU' | 'RIWAYAT'>('MENUNGGU');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivisi, setFilterDivisi] = useState('Semua');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, divisiRes] = await Promise.all([
          api.get('/tickets?jenis=LAPORAN'),
          api.get('/auth/divisi').catch(() => ({ data: [] })),
        ]);

        setDaftarLaporan(ticketRes.data?.data || ticketRes.data || []);
        setDivisiList(divisiRes.data?.data || divisiRes.data || []);
      } catch (error) {
        console.error('Gagal mengambil data laporan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Gabungkan daftar divisi dari API + divisi unik dari data laporan jika API belum lengkap
  const opsiDivisi = useMemo(() => {
    const map = new Map<string, string>();
    divisiList.forEach((d) => {
      if (d.nama) map.set(d.nama, d.nama);
    });
    daftarLaporan.forEach((l) => {
      if (l.divisi?.nama) map.set(l.divisi.nama, l.divisi.nama);
    });
    return Array.from(map.values());
  }, [divisiList, daftarLaporan]);

  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: 'Menunggu Evaluasi',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      case 'DIPROSES':
        return {
          label: 'Diproses',
          badge: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'Menunggu Validasi',
          badge: 'bg-purple-50 text-purple-800 border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'Terkendala (Hold)',
          badge: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
        };
      case 'SELESAI':
        return {
          label: 'Selesai',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'DITOLAK':
        return {
          label: 'Ditolak',
          badge: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-500',
        };
      default:
        return {
          label: status.replace('_', ' '),
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const isLaporanBaru = (createdAt?: string) => {
    if (!createdAt) return false;
    const selisihJam = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return selisihJam <= 24;
  };

  const activeStatuses = ['MENUNGGU_TRIASE', 'DIPROSES', 'MENUNGGU_VALIDASI', 'HOLD_ESKALASI'];
  const historyStatuses = ['SELESAI', 'DITOLAK'];

  const dataTertampil = useMemo(() => {
    return daftarLaporan.filter((laporan) => {
      if (activeTab === 'MENUNGGU' && !activeStatuses.includes(laporan.status)) return false;
      if (activeTab === 'RIWAYAT' && !historyStatuses.includes(laporan.status)) return false;

      if (filterDivisi !== 'Semua' && laporan.divisi?.nama !== filterDivisi) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
        const namaPelapor = (laporan.pembuat?.nama || laporan.pelapor?.nama || '').toLowerCase();
        const matchJudul = (laporan.judul || '').toLowerCase().includes(q);
        const matchLokasi = (laporan.lokasi || '').toLowerCase().includes(q);
        const formattedId = `t-${String(laporan.id).padStart(3, '0')}`;
        const matchId = formattedId.includes(q) || String(laporan.id).includes(q);
        if (!matchJudul && !matchLokasi && !matchId && !namaPelapor) return false;
      }

      return true;
    });
  }, [daftarLaporan, activeTab, filterDivisi, searchQuery]);

  const jumlahLaporanAktif = daftarLaporan.filter((l) => activeStatuses.includes(l.status)).length;
  const jumlahLaporanSelesai = daftarLaporan.filter((l) => historyStatuses.includes(l.status)).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen space-y-6 pb-28 md:pb-12">
      {/* Header Halaman */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-brand-deep border border-emerald-200 uppercase tracking-wider mb-1.5">
            Triase & Tindak Lanjut
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Laporan Masuk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau keluhan fasilitas dari unit layanan dan distribusikan menjadi penugasan teknis.
          </p>
        </div>
      </div>

      {/* Kontainer Utama */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs flex flex-col overflow-hidden">
        {/* Toolbar Tab, Pencarian & Filter Divisi */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
          {/* Sub-Tab */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200/90 shadow-2xs w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('MENUNGGU')}
              className={`flex-1 lg:flex-none px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                activeTab === 'MENUNGGU'
                  ? 'bg-brand-deep text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Laporan Aktif ({jumlahLaporanAktif})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('RIWAYAT')}
              className={`flex-1 lg:flex-none px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                activeTab === 'RIWAYAT'
                  ? 'bg-brand-deep text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Riwayat Tiket ({jumlahLaporanSelesai})
            </button>
          </div>

          {/* Search & Dropdown Filter Divisi */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Cari ID, masalah, lokasi, pelapor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-8 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-deep transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative sm:w-64">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={filterDivisi}
                onChange={(e) => setFilterDivisi(e.target.value)}
                className="w-full h-10 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-deep transition truncate"
              >
                <option value="Semua">Semua Divisi Tujuan</option>
                {opsiDivisi.map((namaDiv) => (
                  <option key={namaDiv} value={namaDiv}>
                    {namaDiv}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Daftar Laporan */}
        <div className="w-full overflow-x-auto min-h-[360px]">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead className="bg-slate-50/70 border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-6 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Tiket & Waktu
                </th>
                <th className="py-3.5 px-6 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-2/5">
                  Masalah & Lokasi
                </th>
                <th className="py-3.5 px-6 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Pelapor & Divisi Tujuan
                </th>
                <th className="py-3.5 px-6 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="py-3.5 px-6 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400 font-semibold text-xs">
                    <div className="w-7 h-7 border-3 border-brand-deep border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat daftar laporan masuk...
                  </td>
                </tr>
              ) : dataTertampil.length > 0 ? (
                dataTertampil.map((laporan) => {
                  const isBaru = isLaporanBaru(laporan.createdAt);
                  const statusMeta = getStatusMeta(laporan.status);
                  const namaPelapor = laporan.pembuat?.nama || laporan.pelapor?.nama || 'Staf Unit';

                  return (
                    <tr
                      key={laporan.id}
                      onClick={() => navigate(`/detail-laporan/${laporan.id}`)}
                      className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    >
                      {/* Kolom 1: ID Tiket & Tanggal */}
                      <td className="py-4 px-6 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-brand-deep">
                            #T-{String(laporan.id).padStart(3, '0')}
                          </span>
                          {isBaru && activeTab === 'MENUNGGU' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500 text-white tracking-wider">
                              BARU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {laporan.createdAt
                              ? new Intl.DateTimeFormat('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }).format(new Date(laporan.createdAt))
                              : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Kolom 2: Judul Masalah & Lokasi */}
                      <td className="py-4 px-6 align-top">
                        <p className="text-sm font-bold text-slate-800 group-hover:text-brand-deep transition line-clamp-2">
                          {laporan.judul}
                        </p>
                        {laporan.lokasi && (
                          <div className="inline-flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="line-clamp-1">{laporan.lokasi}</span>
                          </div>
                        )}
                      </td>

                      {/* Kolom 3: Pelapor & Divisi */}
                      <td className="py-4 px-6 align-top">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{namaPelapor}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 mt-1 bg-slate-100/80 px-2 py-0.5 rounded-md">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{laporan.divisi?.nama || 'Belum Ditentukan'}</span>
                        </div>
                      </td>

                      {/* Kolom 4: Badge Status */}
                      <td className="py-4 px-6 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusMeta.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* Kolom 5: Tombol Aksi */}
                      <td className="py-4 px-6 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/detail-laporan/${laporan.id}`);
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 ${
                            activeTab === 'MENUNGGU'
                              ? 'bg-brand-deep hover:opacity-95 text-white shadow-xs'
                              : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{activeTab === 'MENUNGGU' ? 'Tinjau' : 'Detail'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                        <FileText className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-bold text-sm text-slate-600">Tidak ada laporan ditemukan</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery || filterDivisi !== 'Semua'
                          ? 'Coba ubah kata kunci pencarian atau pilih divisi lain.'
                          : 'Belum ada data laporan pada kategori ini.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}