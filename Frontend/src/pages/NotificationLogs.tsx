import { useEffect, useState } from 'react';
import api from '../services/api';

type LogItem = {
  id: number;
  ticketId: number;
  ticketTitle: string;
  recipientName: string;
  recipientRole: string;
  type: string;
  status: string;
  message: string;
  attempts: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
};

export default function NotificationLogs() {
  const [data, setData] = useState<LogItem[]>([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/notification-logs', {
          params: status === 'ALL' ? {} : { status },
        });
        if (active) setData(Array.isArray(response.data.data) ? response.data.data : []);
      } catch (e: any) {
        if (active) setError(e.response?.data?.message || 'Gagal memuat log notifikasi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [status]);

  const fmt = (value: string | null) => value
    ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
    : '-';

  return (
    <main className="mx-auto w-full max-w-7xl p-6 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Log Notifikasi</h1>
        <p className="mt-1 text-sm text-slate-500">Riwayat pengiriman, penerima, status, dan kendala notifikasi SLA.</p>
      </header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-sm text-slate-600">Total ditampilkan: <strong>{data.length}</strong></span>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="ALL">Semua status</option>
          <option value="SENT">Terkirim</option>
          <option value="FAILED">Gagal</option>
          <option value="PENDING">Menunggu</option>
        </select>
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-8 text-center text-slate-500">Memuat log...</p> : (
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Tiket</th><th className="px-4 py-3">Penerima</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Percobaan</th><th className="px-4 py-3">Kendala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => <tr key={item.id} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">{fmt(item.sentAt || item.createdAt)}</td>
                <td className="px-4 py-3"><strong>#{item.ticketId}</strong><div className="max-w-xs text-slate-500">{item.ticketTitle}</div></td>
                <td className="px-4 py-3">{item.recipientName}<div className="text-xs text-slate-500">{item.recipientRole}</div></td>
                <td className="px-4 py-3">{item.type.replaceAll('_', ' ')}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' : item.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                <td className="px-4 py-3">{item.attempts}</td>
                <td className="max-w-xs whitespace-normal px-4 py-3 text-red-700">{item.errorMessage || '-'}</td>
              </tr>)}
              {data.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-500">Belum ada log notifikasi.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
