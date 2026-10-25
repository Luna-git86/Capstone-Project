import { Link } from 'react-router-dom';

const summaryCards = [
  { label: 'Total Tiket', value: '128', note: 'Seluruh laporan', tone: 'blue', icon: '▤' },
  { label: 'Sedang Diproses', value: '34', note: 'Perlu pemantauan', tone: 'amber', icon: '◷' },
  { label: 'Selesai', value: '78', note: 'Tiket terselesaikan', tone: 'green', icon: '✓' },
  { label: 'Melewati SLA', value: '16', note: 'Perlu evaluasi', tone: 'red', icon: '!' },
];

const divisions = [
  { name: 'IT & Sistem Informasi', total: 32, done: 25, color: 'bg-sky-600' },
  { name: 'Sarana & Prasarana', total: 28, done: 20, color: 'bg-emerald-600' },
  { name: 'Pelayanan', total: 24, done: 17, color: 'bg-violet-600' },
  { name: 'Administrasi', total: 20, done: 16, color: 'bg-amber-500' },
];

const recentTickets = [
  { id: 'TKT-0128', title: 'Gangguan jaringan ruang administrasi', division: 'IT & Sistem Informasi', status: 'Diproses', priority: 'Tinggi' },
  { id: 'TKT-0127', title: 'Perbaikan pendingin ruang pelayanan', division: 'Sarana & Prasarana', status: 'Melewati SLA', priority: 'Tinggi' },
  { id: 'TKT-0126', title: 'Pembaruan perangkat komputer', division: 'IT & Sistem Informasi', status: 'Selesai', priority: 'Sedang' },
  { id: 'TKT-0125', title: 'Permintaan perbaikan fasilitas', division: 'Sarana & Prasarana', status: 'Diproses', priority: 'Sedang' },
];

const cardTone: Record<string, string> = {
  blue: 'bg-sky-50 border-sky-100 text-sky-700',
  amber: 'bg-amber-50 border-amber-100 text-amber-700',
  green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  red: 'bg-rose-50 border-rose-100 text-rose-700',
};

const statusTone: Record<string, string> = {
  'Diproses': 'bg-sky-100 text-sky-700',
  'Melewati SLA': 'bg-rose-100 text-rose-700',
  'Selesai': 'bg-emerald-100 text-emerald-700',
};

export default function DashboardDirektur() {
  return (
    <div className="min-h-full space-y-6 p-5 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-sky-700">Ringkasan Eksekutif</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">Dashboard Direktur</h1>
          <p className="mt-2 text-sm text-slate-500">Pantau tiket, penyelesaian tugas, dan kepatuhan SLA lintas divisi.</p>
        </div>
        <Link to="/performa" className="inline-flex w-fit items-center rounded-lg bg-[#003366] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#004b8d]">
          Lihat analisis performa <span className="ml-2">→</span>
        </Link>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Mode pratinjau:</strong> angka dan daftar di halaman ini masih data contoh. Dashboard belum mengambil data langsung dari database.
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className={`rounded-2xl border p-5 shadow-sm ${cardTone[card.tone]}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{card.label}</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-xl font-bold">{card.icon}</span>
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight">{card.value}</p>
            <p className="mt-2 text-xs font-medium opacity-80">{card.note}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Kinerja penyelesaian per divisi</h2>
              <p className="mt-1 text-sm text-slate-500">Contoh jumlah tiket yang selesai dibanding total tiket.</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Contoh</span>
          </div>
          <div className="space-y-5">
            {divisions.map((division) => {
              const percentage = Math.round((division.done / division.total) * 100);
              return (
                <div key={division.name}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">{division.name}</span>
                    <span className="whitespace-nowrap text-slate-500">{division.done}/{division.total} selesai · {percentage}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${division.color}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-bold text-slate-900">Perhatian direktur</h2>
          <p className="mt-1 text-sm text-slate-500">Hal yang perlu ditinjau berdasarkan contoh data.</p>
          <div className="mt-5 space-y-3">
            <div className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 font-bold text-rose-700">!</span>
              <div>
                <p className="font-semibold text-rose-900">Tiket melewati SLA</p>
                <p className="mt-1 text-sm text-rose-800">16 tiket contoh memerlukan pemeriksaan dan tindak lanjut.</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-bold text-amber-700">◷</span>
              <div>
                <p className="font-semibold text-amber-900">Tiket prioritas tinggi</p>
                <p className="mt-1 text-sm text-amber-800">Periksa penugasan dan hambatan penyelesaian pada tiket prioritas tinggi.</p>
              </div>
            </div>
            <Link to="/performa" className="inline-flex pt-1 text-sm font-semibold text-sky-700 hover:text-sky-900">
              Buka laporan performa lengkap <span className="ml-1">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tiket terkini</h2>
            <p className="mt-1 text-sm text-slate-500">Contoh daftar untuk membantu pemantauan lintas divisi.</p>
          </div>
          <Link to="/performa" className="text-sm font-semibold text-sky-700 hover:text-sky-900">Lihat analisis →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">ID / Ringkasan</th>
                <th className="px-5 py-3 font-semibold">Divisi</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Prioritas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTickets.map((ticket) => (
                <tr key={ticket.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="text-xs font-bold text-slate-500">{ticket.id}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{ticket.title}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{ticket.division}</td>
                  <td className="px-5 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[ticket.status]}`}>{ticket.status}</span></td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-700">{ticket.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
