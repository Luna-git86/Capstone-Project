import { useEffect, useState } from 'react';
import api from '../services/api';

type Ringkasan = {
  totalTiket: number;
  sesuaiSLA: number;
  terlambat: number;
  terlambatSelesai: number;
  belumSelesai: number;
  dalamSLA: number;
  tanpaDeadline: number;
  waktuSelesaiTidakTercatat: number;
  totalSelesaiTerukur: number;
  persentaseSLA: number | null;
  rataRataJam: number | null;
};

type TiketSLA = {
  id: number;
  judul: string;
  prioritas: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
  divisi: string;
  pembuat: string;
  pelaksana: string;
  statusSLA: string;
};

const statusLabel: Record<string, string> = {
  SESUAI_SLA: 'Sesuai SLA',
  TERLAMBAT: 'Terlambat',
  DALAM_SLA: 'Dalam SLA',
  TANPA_DEADLINE: 'Tanpa deadline',
  WAKTU_SELESAI_TIDAK_TERCATAT: 'Waktu selesai tidak tercatat',
  DITOLAK: 'Ditolak',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LaporanSLA() {
  const [periode, setPeriode] = useState('30');
  const [prioritas, setPrioritas] = useState('SEMUA');
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [data, setData] = useState<TiketSLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/laporan-sla', { params: { periode, prioritas } })
      .then((response) => {
        if (!active) return;
        setRingkasan(response.data.ringkasan);
        setData(response.data.data || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Gagal memuat laporan SLA. Pastikan backend dan database berjalan.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [periode, prioritas]);

  const cards = [
    { label: 'Total tiket', value: ringkasan?.totalTiket ?? 0 },
    { label: 'Sesuai SLA (selesai)', value: ringkasan?.sesuaiSLA ?? 0 },
    { label: 'Tiket terlambat', value: ringkasan?.terlambat ?? 0 },
    { label: 'Belum selesai', value: ringkasan?.belumSelesai ?? 0 },
  ];

  return (
    <main className="w-full p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Laporan SLA</h1>
        <p className="mt-1 text-sm text-slate-500">Ringkasan kepatuhan tenggat waktu berdasarkan data tiket.</p>
      </header>

      <section className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Periode
          <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="30">30 hari terakhir</option>
            <option value="90">90 hari terakhir</option>
            <option value="180">180 hari terakhir</option>
            <option value="365">365 hari terakhir</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Prioritas
          <select value={prioritas} onChange={(e) => setPrioritas(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            <option value="SEMUA">Semua prioritas</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </label>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <p className="text-slate-500">Memuat laporan...</p> : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Persentase SLA tiket selesai terukur</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{ringkasan?.persentaseSLA == null ? '-' : `${ringkasan.persentaseSLA}%`}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Rata-rata durasi penyelesaian</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{ringkasan?.rataRataJam == null ? '-' : `${ringkasan.rataRataJam} jam`}</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-900">Perlu diperiksa</p>
              <p className="mt-2 text-sm text-amber-800">{(ringkasan?.tanpaDeadline ?? 0)} tiket tanpa deadline dan {(ringkasan?.waktuSelesaiTidakTercatat ?? 0)} tiket selesai tanpa waktu selesai tercatat.</p>
            </article>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-bold text-slate-900">Rincian tiket</h2>
              <p className="text-sm text-slate-500">Data sesuai periode dan prioritas yang dipilih.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {['ID / Judul', 'Prioritas', 'Divisi', 'Status tiket', 'Deadline', 'Selesai pada', 'Status SLA'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((ticket) => (
                    <tr key={ticket.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-3"><span className="font-semibold text-slate-900">#{ticket.id}</span><p className="mt-1 max-w-xs whitespace-normal text-slate-600">{ticket.judul}</p></td>
                      <td className="px-4 py-3">{ticket.prioritas}</td>
                      <td className="px-4 py-3">{ticket.divisi}</td>
                      <td className="px-4 py-3">{ticket.status.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(ticket.deadline)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(ticket.completedAt)}</td>
                      <td className="px-4 py-3"><span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabel[ticket.statusSLA] || ticket.statusSLA}</span></td>
                    </tr>
                  ))}
                  {data.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Belum ada tiket pada filter ini. Data dummy belum otomatis ditambahkan.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
