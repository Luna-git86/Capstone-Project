// Frontend/src/pages/PeformaAnalisis.tsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Ticket {
  id: number;
  judul: string;
  prioritas: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
  divisi?: { id: number; nama: string } | null;
}

interface DivisiStat {
  namaDivisi: string;
  totalTugas: number;
  selesai: number;
  aktif: number;
  tepatWaktu: number;
  terlambat: number;
  persentaseSLA: number;
}

const PeformaAnalisis: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/tickets');
        const data: Ticket[] = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setTickets(data);
      } catch (err) {
        console.error('Gagal memuat data analisis performa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  const totalTugas = tickets.length;
  const tugasSelesai = tickets.filter((t) => t.status === 'SELESAI');
  const tugasAktif = tickets.filter(
    (t) => t.status !== 'SELESAI' && t.status !== 'DITOLAK'
  );

  const selesaiTepatWaktu = tugasSelesai.filter((t) => {
    if (!t.deadline) return true;
    const selesaiDate = t.completedAt ? new Date(t.completedAt) : new Date();
    return selesaiDate <= new Date(t.deadline);
  });

  const persentaseSLATotal =
    tugasSelesai.length > 0
      ? Math.round((selesaiTepatWaktu.length / tugasSelesai.length) * 100)
      : 100;

  // Hitung rata-rata jam penyelesaian dari database nyata
  const durasiJamList = tugasSelesai
    .filter((t) => t.createdAt && t.completedAt)
    .map((t) => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.completedAt as string).getTime();
      return Math.max(0.1, (end - start) / (1000 * 60 * 60));
    });

  const rataRataJam =
    durasiJamList.length > 0
      ? (
          durasiJamList.reduce((acc, curr) => acc + curr, 0) /
          durasiJamList.length
        ).toFixed(1)
      : '0.0';

  // Pengelompokan performa berdasarkan Divisi RSIA nyata
  const divisiMap = new Map<string, DivisiStat>();
  tickets.forEach((t) => {
    const namaDivisi = t.divisi?.nama || 'Lintas Divisi / Umum';
    if (!divisiMap.has(namaDivisi)) {
      divisiMap.set(namaDivisi, {
        namaDivisi,
        totalTugas: 0,
        selesai: 0,
        aktif: 0,
        tepatWaktu: 0,
        terlambat: 0,
        persentaseSLA: 100,
      });
    }

    const stat = divisiMap.get(namaDivisi)!;
    stat.totalTugas += 1;

    if (t.status === 'SELESAI') {
      stat.selesai += 1;
      const selesaiTime = t.completedAt ? new Date(t.completedAt) : new Date();
      if (!t.deadline || selesaiTime <= new Date(t.deadline)) {
        stat.tepatWaktu += 1;
      } else {
        stat.terlambat += 1;
      }
    } else if (t.status !== 'DITOLAK') {
      stat.aktif += 1;
      if (t.deadline && new Date(t.deadline) < new Date()) {
        stat.terlambat += 1;
      }
    }

    stat.persentaseSLA =
      stat.selesai > 0
        ? Math.round((stat.tepatWaktu / stat.selesai) * 100)
        : 100;
  });

  const divisiStats = Array.from(divisiMap.values()).sort(
    (a, b) => b.totalTugas - a.totalTugas
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Analisis Performa & Kepatuhan SLA Divisi RSIA Qurrata A'yun
        </h1>
        <p className="text-sm text-slate-500">
          Data analitik real-time yang dihitung langsung dari riwayat tiket dan penyelesaian tugas di database.
        </p>
      </div>

      {/* Kartu Ringkasan Utama */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Kepatuhan SLA Rumah Sakit
          </p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {persentaseSLATotal}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {selesaiTepatWaktu.length} dari {tugasSelesai.length} tugas selesai tepat waktu
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Total Tiket & Tugas
          </p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{totalTugas}</p>
          <p className="text-xs text-slate-400 mt-1">
            {tugasAktif.length} aktif • {tugasSelesai.length} selesai
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Rata-Rata Waktu Penyelesaian
          </p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {rataRataJam} <span className="text-base font-medium">Jam</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Dihitung dari waktu lapor hingga disetujui selesai
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            Divisi Terpantau
          </p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">
            {divisiStats.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Unit kerja aktif di RSIA Qurrata A'yun
          </p>
        </div>
      </div>

      {/* Tabel & Grafik Bar Performa Per Divisi */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800">
          Perbandingan Kinerja Penyelesaian Tugas per Divisi
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            Memuat data analitik dari database...
          </p>
        ) : divisiStats.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Belum ada data tiket di database untuk dianalisis.
          </p>
        ) : (
          <div className="space-y-4">
            {divisiStats.map((d) => (
              <div
                key={d.namaDivisi}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">
                      {d.namaDivisi}
                    </p>
                    <p className="text-xs text-slate-500">
                      Total: <strong>{d.totalTugas}</strong> tugas ({d.selesai} selesai,{' '}
                      {d.aktif} aktif, {d.terlambat} terlambat)
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      d.persentaseSLA >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : d.persentaseSLA >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Skor SLA: {d.persentaseSLA}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.persentaseSLA >= 85
                        ? 'bg-emerald-500'
                        : d.persentaseSLA >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${d.persentaseSLA}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PeformaAnalisis;