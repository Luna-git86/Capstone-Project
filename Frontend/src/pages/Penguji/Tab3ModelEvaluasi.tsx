// Frontend/src/pages/Penguji/Tab3ModelEvaluasi.tsx
import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Scale, TrendingDown } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard, UatChartBox } from './UatSharedBlocks';
import {
  RSIA_UAT_COLORS,
  UAT_CHART_FONT,
  formatNumId,
  type Tab3Data,
} from './uatSmTypes';

interface Tab3Props {
  data: Tab3Data | null;
  unlockedStep: number;
  liveNotes: Record<string, string>;
}

const MONTH_OPTIONS = [
  { val: 'ALL', label: 'Semua Uji (Jan–Jun 2026 • 181 Hari)' },
  { val: '2026-01', label: 'Januari 2026' },
  { val: '2026-02', label: 'Februari 2026' },
  { val: '2026-03', label: 'Maret 2026 (Ramadan & Idulfitri)' },
  { val: '2026-04', label: 'April 2026' },
  { val: '2026-05', label: 'Mei 2026' },
  { val: '2026-06', label: 'Juni 2026' },
];

export const Tab3ModelEvaluasi: React.FC<Tab3Props> = ({ data, unlockedStep, liveNotes }) => {
  const [selectedUnit, setSelectedUnit] = useState<string>('TOTAL');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-03');

  const chartPoints = useMemo(() => {
    if (!data) return [];
    const base = data.testSeriesByUnit[selectedUnit] || data.testSeriesByUnit.TOTAL || [];
    const filtered =
      selectedMonth === 'ALL' ? base : base.filter((pt) => pt.date.startsWith(selectedMonth));
    return filtered.map((pt) => ({
      ...pt,
      shortDate: `${pt.date.slice(8, 10)}/${pt.date.slice(5, 7)}`,
    }));
  }, [data, selectedUnit, selectedMonth]);

  if (!data || unlockedStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tahap 3 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Hitung (0/3)</strong> untuk melatih model dan melihat perbandingan ketepatannya di tahun 2026.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Langkah 3.1 */}
      <StepSectionCard
        stepCode="Langkah 3.1"
        title="Mengenal 3 Cara Menebak Kunjungan yang Diadu Secara Adil"
        subtitle="Program melatih model statistik (NB GLM) dan pembelajaran mesin (HistGradientBoosting), lalu mengadunya dengan cara manual meniru minggu lalu."
        done={unlockedStep >= 1}
        ranLiveInfo={liveNotes.stage4_modeling}
      >
        <PanduanPengujiBox
          whatHappens="Saat Mulai Hitung (0/3) diklik, sistem melatih 2 model prediksi (HistGradientBoosting dan Negative Binomial GLM) memakai data latih 2023–2025, lalu membandingkannya dengan cara manual Seasonal Naive."
          stepsToCheck={[
            'Pastikan proses pelatihan selesai tanpa error dan menampilkan 3 kartu penjelasan metode (HistGradientBoosting, Negative Binomial GLM, dan Seasonal Naive).',
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#ffd0b5] bg-[#fff6f1] p-4 space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#f47a45] text-white">
              <Award className="w-3.5 h-3.5" />
              Model Utama 1 (AI Pohon Keputusan)
            </span>
            <h4 className="text-sm font-extrabold text-[#18201c]">HistGradientBoosting</h4>
            <p className="text-xs text-[#3c4641] leading-relaxed">
              Belajar pola rumit hubungan antara jadwal hari dokter, libur nasional, dan tren sebulan terakhir secara fleksibel.
            </p>
          </div>
          <div className="rounded-2xl border border-[#c8cbfb] bg-[#f0f1fe] p-4 space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#5a5fe0] text-white">
              <Scale className="w-3.5 h-3.5" />
              Model Utama 2 (Statistik Cacah)
            </span>
            <h4 className="text-sm font-extrabold text-[#18201c]">Negative Binomial GLM</h4>
            <p className="text-xs text-[#3c4641] leading-relaxed">
              Metode statistik khusus untuk jumlah pasien yang variasinya tinggi dan tetap mampu menjaga perkiraan di unit yang sepi.
            </p>
          </div>
          <div className="rounded-2xl border border-[#dce7e0] bg-[#f6f8f7] p-4 space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#64748b] text-white">
              Patokan Cara Manual Lama
            </span>
            <h4 className="text-sm font-extrabold text-[#18201c]">Seasonal Naive (Minggu Lalu)</h4>
            <p className="text-xs text-[#3c4641] leading-relaxed">
              Menebak jumlah pasien hari ini persis sama dengan hari yang sama minggu lalu, tanpa menghitung tanggal merah atau tren turun-naik.
            </p>
          </div>
        </div>
      </StepSectionCard>

      {/* Langkah 3.2 */}
      {unlockedStep >= 2 && (
        <StepSectionCard
          stepCode="Langkah 3.2"
          title={`Hasil Adu Ketepatan di Data Uji (${data.testPeriod.start} s.d. ${data.testPeriod.end} • ${data.testPeriod.total_days} Hari)`}
          subtitle="Evaluasi adil pada 6 bulan pertama tahun 2026 yang belum pernah dipakai saat pelatihan."
          done={unlockedStep >= 2}
          ranLiveInfo={liveNotes.stage5_evaluation}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menguji ketiga metode secara objektif menggunakan 181 hari data Januari–Juni 2026 yang belum pernah dilihat saat pelatihan."
            stepsToCheck={[
              'Periksa spanduk pencapaian menunjukkan kesalahan prediksi turun 29,06% dibanding cara manual dengan model terbaik HistGradientBoosting.',
              'Bandingkan baris angka pada tabel: HistGradientBoosting (4,958 pasien/hari) dan NB GLM (4,985 pasien/hari) jauh lebih tepat dibanding Seasonal Naive (6,989 pasien/hari).',
              'Cek Tabel Perbandingan Ketepatan pada 4 Poliklinik Utama (IGD, OBGYN, Umum, Anak) di bagian bawah.',
            ]}
          />
          <div className="rounded-2xl bg-[#edf8f2] border border-[#93d1ae] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0f5c43] text-white flex items-center justify-center shrink-0">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-[#186b46]">Pencapaian Utama Model</p>
                <p className="text-base sm:text-lg font-extrabold text-[#0f5c43]">
                  Kesalahan Prediksi Turun {formatNumId(data.maeReductionPct, 2)}% dibanding Cara Manual
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-[#93d1ae] text-xs font-extrabold text-[#0f5c43] shrink-0">
              Terbaik: {data.bestModel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3">Rata-Rata Meleset / Hari (MAE)</th>
                  <th className="py-2.5 px-3">Kepekaan Lonjakan (RMSE)</th>
                  <th className="py-2.5 px-3">Persentase Selisih (WAPE)</th>
                  <th className="py-2.5 px-3">Penjelasan Mudah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {data.leaderboard.map((row, idx) => (
                  <tr key={row.key} className={idx === 0 ? 'bg-[#edf8f2]/60' : 'bg-white'}>
                    <td className="py-2.5 px-3">
                      <p className="font-extrabold text-[#18201c]">{row.model}</p>
                      <p className="text-[11px] text-[#6b7770]">{row.role}</p>
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-[#0f5c43] tabular-nums">
                      {formatNumId(row.mae, 3)} pasien
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#18201c] tabular-nums">
                      {formatNumId(row.rmse, 3)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#18201c] tabular-nums">
                      {formatNumId(row.wapePct, 2)}%
                    </td>
                    <td className="py-2.5 px-3 text-[#3c4641]">{row.plainMeaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-extrabold text-[#18201c]">Tabel Perbandingan Ketepatan pada 4 Poliklinik Utama (Uji 2026):</p>
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                    <th className="py-2.5 px-3">Unit Layanan</th>
                    <th className="py-2.5 px-3 text-right">HistGB (Meleset/Hari)</th>
                    <th className="py-2.5 px-3 text-right">NB GLM (Meleset/Hari)</th>
                    <th className="py-2.5 px-3 text-right">Manual Minggu Lalu</th>
                    <th className="py-2.5 px-3 text-right">Persentase Selisih</th>
                    <th className="py-2.5 px-3">Model Terbaik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {data.poliLeaderboard.map((p) => (
                    <tr key={p.poliklinik} className="hover:bg-[#edf8f2]/40">
                      <td className="py-2.5 px-3 font-extrabold text-[#18201c]">{p.poliklinik}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                        ±{formatNumId(p.histGbMae, 3)} pasien
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#5a5fe0] tabular-nums">
                        ±{formatNumId(p.nbGlmMae, 3)} pasien
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#6b7770] tabular-nums">
                        ±{formatNumId(p.naiveMae, 3)} pasien
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                        {formatNumId(p.bestWapePct, 2)}%
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
                          {p.bestModel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </StepSectionCard>
      )}

      {/* Langkah 3.3 */}
      {unlockedStep >= 3 && (
        <StepSectionCard
          stepCode="Langkah 3.3"
          title="Grafik & Tabel Harian Pasien Nyata vs Perkiraan Model (Uji 2026)"
          subtitle="Arahkan kursor ke garis grafik dan cocokkan angka hari demi hari pada tabel di bawahnya untuk memastikan akurasi model."
          done={unlockedStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menyusun grafik harian perbandingan jumlah pasien nyata di SIMRS versus hasil tebakan HistGB dan NB GLM selama masa uji Jan–Jun 2026."
            stepsToCheck={[
              'Ganti pilihan unit pada dropdown "Semua Unit RSIA (Total)" dan pilihan bulan pada dropdown "Maret 2026 (Ramadan & Idulfitri)".',
              'Arahkan kursor ke garis grafik, lalu cocokkan angkanya dengan Tabel Rincian Harian: Pasien Nyata vs Perkiraan di bawah grafik.',
            ]}
          />
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter Unit Grafik Tab 3"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-3 py-1.5 text-[#18201c]"
            >
              <option value="TOTAL">Semua Unit RSIA (Total)</option>
              {data.testSeriesUnits
                .filter((u) => u !== 'TOTAL')
                .map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
            </select>
            <select
              aria-label="Filter Bulan Uji Tab 3"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-3 py-1.5 text-[#18201c]"
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <UatChartBox heightPx={290} emptyText="Menyiapkan grafik uji 2026...">
            {({ width, height }) => (
              <ComposedChart width={width} height={height} data={chartPoints} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={RSIA_UAT_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="shortDate"
                  tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                  minTickGap={16}
                />
                <YAxis
                  width={38}
                  tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                />
                <Tooltip
                  contentStyle={{
                    ...UAT_CHART_FONT,
                    borderRadius: '14px',
                    borderColor: '#ace2c5',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconSize={12}
                  formatter={(v) => (
                    <span style={{ ...UAT_CHART_FONT, color: '#18201c', fontWeight: 600, fontSize: '12px' }}>
                      {v}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Pasien Nyata (SIMRS)"
                  stroke={RSIA_UAT_COLORS.actual}
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="histgb"
                  name="Perkiraan Utama (HistGB)"
                  stroke={RSIA_UAT_COLORS.forecast}
                  strokeWidth={2.3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="nbGlm"
                  name="Pembanding Statistik (NB GLM)"
                  stroke={RSIA_UAT_COLORS.nbGlm}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            )}
          </UatChartBox>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2 border-b border-[#dce7e0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-extrabold text-[#18201c]">
                Tabel Rincian Harian: Pasien Nyata vs Perkiraan ({selectedUnit === 'TOTAL' ? 'Semua Unit RSIA' : selectedUnit} • {chartPoints.length} Hari)
              </span>
              <span className="text-[11px] text-[#6b7770]">Geser ke bawah untuk memeriksa setiap tanggal</span>
            </div>
            <div className="max-h-64 overflow-y-auto tvlk-scroll">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-white border-b border-[#dce7e0] text-[#515c56] font-bold z-10">
                  <tr>
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3 text-right">Pasien Nyata (SIMRS)</th>
                    <th className="py-2 px-3 text-right">Perkiraan HistGB</th>
                    <th className="py-2 px-3 text-right">Pembanding NB GLM</th>
                    <th className="py-2 px-3 text-right">Selisih HistGB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {chartPoints.map((pt) => {
                    const predHgb = Math.round(pt.histgb);
                    const predNb = Math.round(pt.nbGlm);
                    const diff = pt.actual !== null ? Math.abs(pt.actual - predHgb) : null;
                    return (
                      <tr key={pt.date} className="hover:bg-[#edf8f2]/40">
                        <td className="py-2 px-3 font-bold text-[#18201c] tabular-nums">{pt.date}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                          {pt.actual !== null ? `${formatNumId(pt.actual)} pasien` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#d95d28] tabular-nums">
                          {formatNumId(predHgb)} pasien
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#5a5fe0] tabular-nums">
                          {formatNumId(predNb)} pasien
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#3c4641] tabular-nums">
                          {diff !== null ? `${diff} pasien` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ApaArtinyaBox text="Garis oranye (HistGB) dan ungu putus-putus (NB GLM) mampu mengikuti naik-turun pasien nyata dengan rapat, bahkan ketika pola kunjungan berubah saat bulan Ramadan dan libur Idulfitri Maret 2026." />
        </StepSectionCard>
      )}
    </div>
  );
};
