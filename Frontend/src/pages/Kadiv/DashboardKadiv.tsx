// Frontend/src/pages/DashboardKadiv.tsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Inbox,
  Layers,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import { getAuthDivisiNama, getAuthUserName, isKadivIT } from '../../utils/authStorage';

interface TicketItem {
  id: number;
  judul: string;
  jenisTiket?: 'TUGAS' | 'LAPORAN';
  lokasi?: string | null;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status:
    | 'MENUNGGU_TRIASE'
    | 'DIPROSES'
    | 'MENUNGGU_VALIDASI'
    | 'HOLD_ESKALASI'
    | 'SELESAI'
    | 'DITOLAK';
  deadline: string | null;
  createdAt: string;
  pembuat?: { id: number; nama: string; role: string };
  pelaksana?: { id: number; nama: string; role: string } | null;
  divisi?: { id: number; nama: string } | null;
}

interface UserProfile {
  id: number;
  nama: string;
  role: string;
  divisi?: { id: number; nama: string } | null;
}

type QueueFilter =
  | 'ALL_ACTION'
  | 'MENUNGGU_TRIASE'
  | 'DIPROSES'
  | 'MENUNGGU_VALIDASI'
  | 'HOLD_ESKALASI';

export default function DashboardKadiv() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('ALL_ACTION');

  const fetchDashboardData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [ticketsRes, profileRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/auth/me').catch(() => ({ data: null })),
      ]);

      const rawTickets: TicketItem[] = Array.isArray(ticketsRes.data)
        ? ticketsRes.data
        : ticketsRes.data?.data || [];

      setTickets(rawTickets);

      if (profileRes?.data) {
        setProfile(profileRes.data?.data || profileRes.data);
      }
    } catch (error) {
      if (!isBackground) {
        console.error('Gagal memuat data dashboard Kadiv:', error);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => fetchDashboardData(true), 12000);
    return () => clearInterval(interval);
  }, []);

  const namaKadiv = profile?.nama || getAuthUserName('Kepala Divisi');
  const namaDivisi = profile?.divisi?.nama || getAuthDivisiNama('Divisi');
  const userIsKadivIT = isKadivIT('KADIV', namaDivisi);

  // Filter tiket aktif saja (mengabaikan SELESAI & DITOLAK)
  const activeTickets = useMemo(() => {
    return tickets.filter((t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK');
  }, [tickets]);

  // 4 Metrik KPI Utama Kadiv
  const kpi = useMemo(() => {
    const now = new Date();
    const perluTriase = activeTickets.filter((t) => t.status === 'MENUNGGU_TRIASE');
    const sedangDikerjakan = activeTickets.filter((t) => t.status === 'DIPROSES');
    const menungguEvaluasi = activeTickets.filter((t) => t.status === 'MENUNGGU_VALIDASI');
    const kendalaEskalasi = activeTickets.filter((t) => t.status === 'HOLD_ESKALASI');
    const selesaiTugasCount = tickets.filter(
      (t) => t.status === 'SELESAI' && (t.jenisTiket || 'TUGAS') === 'TUGAS'
    ).length;
    const overdue = activeTickets.filter(
      (t) =>
        t.status !== 'MENUNGGU_VALIDASI' &&
        Boolean(t.deadline && new Date(t.deadline) < now)
    );

    return {
      perluTriaseCount: perluTriase.length,
      sedangDikerjakanCount: sedangDikerjakan.length,
      menungguEvaluasiCount: menungguEvaluasi.length,
      kendalaEskalasiCount: kendalaEskalasi.length,
      selesaiTugasCount,
      overdueCount: overdue.length,
      totalActionNeeded: userIsKadivIT
        ? perluTriase.length + sedangDikerjakan.length + kendalaEskalasi.length
        : perluTriase.length + menungguEvaluasi.length + kendalaEskalasi.length,
    };
  }, [activeTickets, tickets, userIsKadivIT]);

  // Daftar antrean yang butuh keputusan Kadiv
  const actionQueueTickets = useMemo(() => {
    const targetStatuses = userIsKadivIT
      ? ['MENUNGGU_TRIASE', 'DIPROSES', 'HOLD_ESKALASI']
      : ['MENUNGGU_TRIASE', 'MENUNGGU_VALIDASI', 'HOLD_ESKALASI'];
    const list = activeTickets.filter((t) => targetStatuses.includes(t.status));

    if (activeFilter === 'ALL_ACTION') return list;
    return list.filter((t) => t.status === activeFilter);
  }, [activeTickets, activeFilter, userIsKadivIT]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Belum ditentukan';
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  const getStatusBadge = (status: TicketItem['status']) => {
    switch (status) {
      case 'MENUNGGU_TRIASE':
        return {
          label: userIsKadivIT ? 'LAPORAN MASUK' : 'PERLU TRIASE',
          style: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'DIPROSES':
        return {
          label: 'SEDANG DIKERJAKAN',
          style: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'MENUNGGU_VALIDASI':
        return {
          label: 'MENUNGGU EVALUASI',
          style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
      case 'HOLD_ESKALASI':
        return {
          label: 'KENDALA / ESKALASI',
          style: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      default:
        return {
          label: status,
          style: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const getPriorityBadge = (prioritas: TicketItem['prioritas']) => {
    switch (prioritas) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const handleOpenTicket = (ticket: TicketItem) => {
    if (ticket.jenisTiket === 'LAPORAN') {
      navigate(`/detail-laporan/${ticket.id}`);
    } else {
      navigate(`/detail-tugas/${ticket.id}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-12">
      {/* 1. HEADER MANAJERIAL KADIV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {userIsKadivIT
              ? 'Dashboard Kepala Divisi IT & SIMRS'
              : 'Dashboard Manajerial (Kepala Divisi)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selamat bertugas, <strong className="text-slate-700">{namaKadiv}</strong> (KADIV •{' '}
            {namaDivisi}) —{' '}
            {userIsKadivIT
              ? 'Panel Pembuatan Laporan Tugas Mandiri & Penanganan Langsung Laporan IT.'
              : 'Panel Triase, Evaluasi & Tindak Lanjut Tugas Divisi.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {userIsKadivIT && (
            <button
              type="button"
              onClick={() => navigate('/menu-laporan')}
              className="h-11 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm rounded-2xl transition flex items-center gap-2"
            >
              <Inbox className="w-4 h-4 text-[#0f5c43]" />
              <span>Laporan Masuk IT</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/tambah-tugas')}
            className="h-11 px-4 bg-white hover:bg-slate-50 text-[#0f5c43] border border-[#0f5c43]/30 font-bold text-xs sm:text-sm rounded-2xl transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{userIsKadivIT ? 'Buat Laporan Tugas Mandiri' : 'Buat Tugas'}</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(userIsKadivIT ? '/riwayat' : '/semua-tugas')}
            className="h-11 px-5 bg-[#0f5c43] hover:bg-[#0b4633] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>{userIsKadivIT ? 'Riwayat Tugas Selesai' : 'Semua Tugas Divisi'}</span>
          </button>
        </div>
      </div>

      {/* 2. EMPAT KARTU KPI KEPUTUSAN HARIAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kartu 1: Perlu Triase / Laporan Masuk */}
        <button
          type="button"
          onClick={() =>
            setActiveFilter((prev) =>
              prev === 'MENUNGGU_TRIASE' ? 'ALL_ACTION' : 'MENUNGGU_TRIASE'
            )
          }
          className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
            activeFilter === 'MENUNGGU_TRIASE'
              ? 'border-amber-400 ring-2 ring-amber-200'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500">
              {userIsKadivIT ? 'Laporan Masuk IT' : 'Perlu Triase & Delegasi'}
            </span>
            <ClipboardList className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600 mt-3">
            {kpi.perluTriaseCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            {userIsKadivIT
              ? 'Menunggu penanganan langsung Kadiv IT'
              : 'Menunggu penunjukan staf & SLA'}
          </span>
        </button>

        {/* Kartu 2: Sedang Dikerjakan (Kadiv IT) / Menunggu Evaluasi (Kadiv Lain) */}
        <button
          type="button"
          onClick={() =>
            setActiveFilter((prev) => {
              const target = userIsKadivIT ? 'DIPROSES' : 'MENUNGGU_VALIDASI';
              return prev === target ? 'ALL_ACTION' : target;
            })
          }
          className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
            activeFilter === (userIsKadivIT ? 'DIPROSES' : 'MENUNGGU_VALIDASI')
              ? 'border-indigo-400 ring-2 ring-indigo-200'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500">
              {userIsKadivIT ? 'Sedang Dikerjakan' : 'Menunggu Evaluasi'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 mt-3">
            {userIsKadivIT ? kpi.sedangDikerjakanCount : kpi.menungguEvaluasiCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            {userIsKadivIT
              ? 'Arahan / laporan yang sedang ditangani'
              : 'Bukti pekerjaan siap ditinjau'}
          </span>
        </button>

        {/* Kartu 3: Kendala / Eskalasi */}
        <button
          type="button"
          onClick={() =>
            setActiveFilter((prev) =>
              prev === 'HOLD_ESKALASI' ? 'ALL_ACTION' : 'HOLD_ESKALASI'
            )
          }
          className={`bg-white p-5 rounded-3xl border text-left shadow-xs hover:shadow-md transition flex flex-col justify-between ${
            activeFilter === 'HOLD_ESKALASI'
              ? 'border-rose-400 ring-2 ring-rose-200'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500">Kendala / Eskalasi</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-extrabold text-rose-600 mt-3">
            {kpi.kendalaEskalasiCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            Butuh arahan biaya, alat, atau SLA
          </span>
        </button>

        {/* Kartu 4: Laporan Tugas Selesai (Kadiv IT) / Tugas Terlambat (Kadiv Lain) */}
        <button
          type="button"
          onClick={() => navigate(userIsKadivIT ? '/riwayat' : '/semua-tugas')}
          className="bg-white p-5 rounded-3xl border border-slate-200/90 text-left shadow-xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500">
              {userIsKadivIT ? 'Laporan Tugas Selesai' : 'Tugas Terlambat'}
            </span>
            {userIsKadivIT ? (
              <CheckCircle2 className="w-4 h-4 text-[#0f5c43]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <p
            className={`text-3xl font-extrabold mt-3 ${
              userIsKadivIT ? 'text-[#0f5c43]' : 'text-slate-900'
            }`}
          >
            {userIsKadivIT ? kpi.selesaiTugasCount : kpi.overdueCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            {userIsKadivIT
              ? 'Laporan tugas mandiri IT berstatus selesai'
              : 'Melewati batas waktu pengerjaan'}
          </span>
        </button>
      </div>

      {/* 3. TABEL LEBAR PENUH: ANTREAN KEPUTUSAN KEPALA DIVISI */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {userIsKadivIT
                ? 'Antrean Pekerjaan & Laporan Masuk IT'
                : 'Monitoring Antrean Divisi'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {userIsKadivIT
                ? 'Rangkuman laporan masalah IT yang masuk serta arahan aktif yang siap ditangani mandiri.'
                : 'Rangkuman tiket divisi yang sedang menunggu penunjukan staf, proses evaluasi, atau respon kendala.'}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold self-start sm:self-auto shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{actionQueueTickets.length} Antrean</span>
          </span>
        </div>

        {/* Filter Tab Cepat */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center gap-2">
          {(userIsKadivIT
            ? [
                { key: 'ALL_ACTION', label: `Semua Antrean (${kpi.totalActionNeeded})` },
                { key: 'MENUNGGU_TRIASE', label: `Laporan Masuk (${kpi.perluTriaseCount})` },
                { key: 'DIPROSES', label: `Sedang Dikerjakan (${kpi.sedangDikerjakanCount})` },
                { key: 'HOLD_ESKALASI', label: `Kendala / Eskalasi (${kpi.kendalaEskalasiCount})` },
              ]
            : [
                { key: 'ALL_ACTION', label: `Semua Antrean (${kpi.totalActionNeeded})` },
                { key: 'MENUNGGU_TRIASE', label: `Perlu Triase (${kpi.perluTriaseCount})` },
                { key: 'MENUNGGU_VALIDASI', label: `Menunggu Evaluasi (${kpi.menungguEvaluasiCount})` },
                { key: 'HOLD_ESKALASI', label: `Kendala / Eskalasi (${kpi.kendalaEskalasiCount})` },
              ]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as QueueFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === tab.key
                  ? 'bg-[#0f5c43] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2 text-slate-400 text-xs font-bold">
            <div className="w-7 h-7 border-3 border-[#0f5c43] border-t-transparent rounded-full animate-spin mx-auto" />
            <span>Memuat antrean keputusan...</span>
          </div>
        ) : actionQueueTickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#0f5c43] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Tidak Ada Antrean Tertunda</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Seluruh tiket yang membutuhkan triase, evaluasi, maupun tindak lanjut kendala telah ditangani.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                  <th className="py-3.5 px-5">ID & Nama Tugas</th>
                  <th className="py-3.5 px-4">Diajukan Oleh</th>
                  <th className="py-3.5 px-4">Pelaksana Saat Ini</th>
                  <th className="py-3.5 px-4">Deadline</th>
                  <th className="py-3.5 px-4">Prioritas</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {actionQueueTickets.map((item) => {
                  const statusBadge = getStatusBadge(item.status);
                  const isOverdue =
                    item.status !== 'MENUNGGU_VALIDASI' &&
                    Boolean(item.deadline && new Date(item.deadline) < new Date());

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenTicket(item)}
                      className="hover:bg-slate-50/90 cursor-pointer transition group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-[#0f5c43]">
                            #{item.jenisTiket === 'LAPORAN' ? 'L' : 'T'}-
                            {String(item.id).padStart(3, '0')}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-[#0f5c43] transition">
                            {item.judul}
                          </span>
                        </div>
                        {item.lokasi && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Lokasi: {item.lokasi}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-700">
                          {item.pembuat?.nama || '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.pelaksana?.nama ? (
                          <span className="font-semibold text-slate-700">
                            {item.pelaksana.nama}
                          </span>
                        ) : (
                          <span className="italic font-semibold text-amber-600">
                            Belum didelegasikan
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={
                            isOverdue
                              ? 'font-bold text-rose-600'
                              : 'font-medium text-slate-600'
                          }
                        >
                          {formatDate(item.deadline)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-extrabold uppercase ${getPriorityBadge(
                            item.prioritas
                          )}`}
                        >
                          {item.prioritas}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-extrabold uppercase ${statusBadge.style}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0f5c43] group-hover:underline">
                          <span>Tinjau</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}