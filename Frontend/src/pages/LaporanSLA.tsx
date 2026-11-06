// Frontend/src/pages/LaporanSLA.tsx
import { useEffect, useState } from 'react';
import api from '../services/api';
import { getAuthRole, getAuthToken } from '../utils/authStorage';

type Ringkasan = {
  totalTiket: number;
  sesuaiSLA: number;
  terlambat: number;
  persentaseSLA: number;
  rataRataDurasiJam: number;
};

type TiketSLA = {
  id: number;
  judul: string;
  lokasi: string;
  prioritas: string;
  status: string;
  divisiId: number;
  divisi: string;
  pelaksana: string;
  penanggungJawab: string;
  pembuat: string;
  deadline: string | null;
  deadlineFormatted: string;
  waktuPengumpulan: string | null;
  waktuPengumpulanFormatted: string;
  completedAt: string | null;
  completedAtFormatted: string;
  statusSLA: 'SESUAI_SLA' | 'TERLAMBAT';
  selisihKeterlambatanMenit: number;
  selisihKeterlambatanFormatted: string;
  durasiJam: number;
  isHistoricalFallback: boolean;
};

type Metadata = {
  periodeText: string;
  divisiText: string;
  targetDivisiId: number | null;
  tanggalCetak: string;
  roleAkses: string;
};

type Divisi = {
  id: number;
  nama: string;
};

export default function LaporanSLA() {
  const userRole = getAuthRole() || 'KADIV';
  const isDirekturAdmin = ['DIREKTUR', 'ADMIN'].includes(userRole);

  // Filter States
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [periode, setPeriode] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDivisi, setSelectedDivisi] = useState('SEMUA');
  const [prioritas, setPrioritas] = useState('SEMUA');
  const [statusSla, setStatusSla] = useState('SEMUA');

  // Data States
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [data, setData] = useState<TiketSLA[]>([]);
  const [daftarDivisi, setDaftarDivisi] = useState<Divisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const fetchLaporan = async () => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, string> = {};
      if (useCustomDate) {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      } else {
        params.periode = periode;
      }

      if (isDirekturAdmin && selectedDivisi !== 'SEMUA') {
        params.divisiId = selectedDivisi;
      }
      if (prioritas !== 'SEMUA') {
        params.prioritas = prioritas;
      }
      if (statusSla !== 'SEMUA') {
        params.statusSla = statusSla;
      }

      const response = await api.get('/laporan-sla', { params });
      setMetadata(response.data.metadata);
      setRingkasan(response.data.ringkasan);
      setData(response.data.data || []);
      if (response.data.daftarDivisi) {
        setDaftarDivisi(response.data.daftarDivisi);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Gagal memuat laporan SLA. Pastikan Anda memiliki hak akses.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLaporan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, useCustomDate, startDate, endDate, selectedDivisi, prioritas, statusSla]);

  const handleExport = (type: 'excel' | 'pdf') => {
    try {
      setIsExporting(type);
      const params = new URLSearchParams();
      const token = getAuthToken();
      if (token) params.set('token', token);

      if (useCustomDate) {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      } else {
        params.set('periode', periode);
      }
      if (isDirekturAdmin && selectedDivisi !== 'SEMUA') {
        params.set('divisiId', selectedDivisi);
      }
      if (prioritas !== 'SEMUA') {
        params.set('prioritas', prioritas);
      }
      if (statusSla !== 'SEMUA') {
        params.set('statusSla', statusSla);
      }

      // Gunakan URL endpoint yang didukung otentikasi query parameter & native browser download
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const downloadUrl = `${baseUrl}/laporan-sla/export/${type}?${params.toString()}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `Laporan_SLA_RSIA_${type.toUpperCase()}_${Date.now()}.${
          type === 'excel' ? 'xlsx' : 'pdf'
        }`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Error export SLA:', err);
      alert('Gagal mengekspor laporan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setTimeout(() => setIsExporting(null), 1000);
    }
  };

  return (
    <main className="w-full p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase rounded bg-indigo-100 text-indigo-800">
              SLA Monitoring
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Role: {userRole}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Laporan Kinerja SLA
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kepatuhan batas waktu penyelesaian tugas oleh Staf berbasis batas waktu (deadline) dan waktu pengumpulan.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={isExporting !== null || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            
            <span>{isExporting === 'excel' ? 'Mengekspor...' : 'Export Excel (.xlsx)'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white text-xs font-bold rounded-lg shadow-sm transition"
          >
            
            <span>{isExporting === 'pdf' ? 'Mengekspor...' : 'Export PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* FILTER SECTION */}
      <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Filter Laporan Kinerja
          </h3>
          <button
            type="button"
            onClick={() => setUseCustomDate(!useCustomDate)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
          >
            {useCustomDate ? 'Gunakan Pilihan Preset Hari' : 'Gunakan Rentang Tanggal Manual'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filter Periode */}
          {!useCustomDate ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preset Periode
              </label>
              <select
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="30">30 Hari Terakhir</option>
                <option value="90">90 Hari Terakhir</option>
                <option value="180">180 Hari Terakhir</option>
                <option value="365">1 Tahun Terakhir</option>
                <option value="ALL">Semua Periode</option>
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Selesai
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </>
          )}

          {/* Filter Divisi (Direktur/Admin can choose, Kadiv/Koordinator is locked) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Divisi
            </label>
            {isDirekturAdmin ? (
              <select
                value={selectedDivisi}
                onChange={(e) => setSelectedDivisi(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="SEMUA">Semua Divisi</option>
                {daftarDivisi.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nama}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                {metadata?.divisiText || 'Divisi Anda (Terkunci)'}
              </div>
            )}
          </div>

          {/* Filter Prioritas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Prioritas
            </label>
            <select
              value={prioritas}
              onChange={(e) => setPrioritas(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="SEMUA">Semua Prioritas</option>
              <option value="HIGH">High (Darurat)</option>
              <option value="MEDIUM">Medium (Penting)</option>
              <option value="LOW">Low (Biasa)</option>
            </select>
          </div>

          {/* Filter Kategori SLA */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ketepatan SLA
            </label>
            <select
              value={statusSla}
              onChange={(e) => setStatusSla(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
            >
              <option value="SEMUA">Semua Ketepatan</option>
              <option value="SESUAI_SLA">Tepat Waktu (Sesuai SLA)</option>
              <option value="TERLAMBAT">Terlambat (Melewati SLA)</option>
            </select>
          </div>
        </div>
      </section>

      {/* METADATA BANNER */}
      {metadata && (
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 bg-slate-100 px-4 py-2.5 rounded-lg border border-slate-200">
          <div>
            Cakupan: <strong>{metadata.divisiText}</strong> • Periode: <strong>{metadata.periodeText}</strong>
          </div>
          <div>
            Diperbarui: {metadata.tanggalCetak}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          Memuat perhitungan laporan SLA dari server...
        </div>
      ) : (
        <>
          {/* 5 KPI SUMMARY CARDS (Ketentuan UAT C) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Tugas Selesai
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {ringkasan?.totalTiket ?? 0}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Status Selesai Terverifikasi</p>
            </div>

            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Selesai Tepat Waktu
              </p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                {ringkasan?.sesuaiSLA ?? 0}
              </p>
              <p className="text-[11px] text-emerald-700 mt-1">Diserahkan &le; Deadline</p>
            </div>

            <div className="bg-rose-50 p-5 rounded-xl border border-rose-200 shadow-sm">
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Selesai Terlambat
              </p>
              <p className="text-3xl font-extrabold text-rose-600 mt-2">
                {ringkasan?.terlambat ?? 0}
              </p>
              <p className="text-[11px] text-rose-700 mt-1">Diserahkan &gt; Deadline</p>
            </div>

            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-200 shadow-sm">
              <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                Kepatuhan SLA
              </p>
              <p className="text-3xl font-extrabold text-indigo-600 mt-2">
                {ringkasan?.persentaseSLA ?? 0}%
              </p>
              <p className="text-[11px] text-indigo-700 mt-1">Rasio Tepat Waktu</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Rata-rata Durasi
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mt-2">
                {ringkasan?.rataRataDurasiJam ?? 0}
                <span className="text-sm font-semibold text-slate-500 ml-1">jam</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Dibuat s/d Diserahkan</p>
            </div>
          </div>

          {/* TABEL RINCIAN TUGAS */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rincian Tugas yang Masuk Laporan SLA ({data.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Berdasarkan waktu penyerahan pertama oleh Staf dan batas waktu pengerjaan.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">ID / Nama Tugas</th>
                    <th className="px-4 py-3">Divisi</th>
                    <th className="px-4 py-3">Pelaksana</th>
                    <th className="px-4 py-3">Prioritas</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Waktu Serah Staf</th>
                    <th className="px-4 py-3">Status SLA</th>
                    <th className="px-4 py-3">Keterlambatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <span className="font-bold text-indigo-700">
                          #T-{String(ticket.id).padStart(3, '0')}
                        </span>
                        <p className="font-semibold text-slate-800 mt-0.5 max-w-xs">
                          {ticket.judul}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {ticket.lokasi}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-700">
                        {ticket.divisi}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800">
                          {ticket.pelaksana}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                            ticket.prioritas === 'HIGH'
                              ? 'bg-rose-100 text-rose-700'
                              : ticket.prioritas === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {ticket.prioritas}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        {ticket.deadlineFormatted}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {ticket.waktuPengumpulanFormatted}
                        {ticket.isHistoricalFallback && (
                          <span
                            title="Menggunakan catatan verifikasi sebagai fallback karena riwayat log lawas tidak tersedia"
                            className="ml-1 text-[10px] text-slate-400 cursor-help"
                          >
                            *
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            ticket.statusSLA === 'SESUAI_SLA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {ticket.statusSLA === 'SESUAI_SLA' ? 'Tepat Waktu' : 'Terlambat'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {ticket.statusSLA === 'TERLAMBAT' ? (
                          <span className="text-rose-600 font-bold">
                            +{ticket.selisihKeterlambatanFormatted}
                          </span>
                        ) : (
                          <span className="text-emerald-700">-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {data.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                        Tidak ada tugas berstatus Selesai yang tercatat pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
