// Frontend/src/pages/Penguji/Tab6ProyeksiDashboard.tsx
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard, UatChartBox } from './UatSharedBlocks';
import {
  RSIA_UAT_COLORS,
  UAT_CHART_FONT,
  formatNumId,
  type Tab6Data,
} from './uatSmTypes';

interface Tab6Props {
  data: Tab6Data | null;
  viewStep: number;
  liveNotes: Record<string, string>;
}

export const Tab6ProyeksiDashboard: React.FC<Tab6Props> = ({ data, viewStep, liveNotes }) => {
  if (!data || !data.projection2026 || viewStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tab 6 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Lihat Proyeksi Jul–Des 2026 (1/3)</strong> di kanan atas untuk mengecek proyeksi dan kesiapan Dashboard Analisis Kunjungan.
        </p>
      </div>
    );
  }

  const monthlyH2Series = Array.isArray(data.monthlyH2Series) ? data.monthlyH2Series : [];
  const unitH2List = Array.isArray(data.unitH2List) ? data.unitH2List : [];
  const dashboardFiles = Array.isArray(data.dashboardFiles) ? data.dashboardFiles : [];
  const dashboardViews = Array.isArray(data.dashboardViews) ? data.dashboardViews : [];

  return (
    <div className="space-y-4">
      {/* Langkah 6.1 */}
      {viewStep === 1 && (
        <StepSectionCard
          stepCode="Langkah 6.1"
          title="Proyeksi Kunjungan Paruh Kedua 2026 (Jul–Des 2026)"
          subtitle="Membandingkan perkiraan bulanan kedua model dan beban 4 poliklinik utama."
          done={viewStep >= 1}
        >
        <PanduanPengujiBox
          whatHappens="Menampilkan perkiraan kunjungan 184 hari ke depan (Jul–Des 2026) untuk Total RS dan 4 poliklinik utama."
          stepsToCheck={[
            'Cek 3 kartu ringkasan: Proyeksi Jul–Des 2026 (3.798 pasien), Realisasi Jan–Jun 2026 (4.044), dan Estimasi Setahun (7.842).',
            'Bandingkan kedua batang berdampingan pada grafik bulanan (oranye = HistGB vs ungu = NB GLM), lalu cek angkanya pada tabel di bawah.',
            'Klik "Cek Kesiapan Data Dashboard →" di kanan atas.',
          ]}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#fff6f1] border border-[#ffd0b5] p-4">
            <p className="text-[11px] font-bold uppercase text-[#d95d28]">Proyeksi Jul–Des 2026 (184 Hari)</p>
            <p className="text-2xl font-extrabold text-[#d95d28] tabular-nums mt-1">
              {formatNumId(data.projection2026.h2Projected)} pasien
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">Sekitar 617–640 pasien per bulan</p>
          </div>
          <div className="rounded-2xl bg-[#edf8f2] border border-[#ace2c5] p-4">
            <p className="text-[11px] font-bold uppercase text-[#186b46]">Realisasi Jan–Jun 2026</p>
            <p className="text-2xl font-extrabold text-[#0f5c43] tabular-nums mt-1">
              {formatNumId(data.projection2026.h1Actual)} pasien
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">Data tercatat paruh pertama 2026</p>
          </div>
          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-4">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">Estimasi Setahun Penuh 2026</p>
            <p className="text-2xl font-extrabold text-[#18201c] tabular-nums mt-1">
              {formatNumId(data.projection2026.fullYearEst)} pasien
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              Rata-rata {formatNumId(data.projection2026.dailyMean, 1)} pasien/hari
            </p>
          </div>
        </div>

        {/* Grafik Bulanan Full Width dengan Grouped Bars (sama-sama batang berdampingan + label angka) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dce7e0] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-xs sm:text-sm font-extrabold text-[#18201c]">
                Grafik Perbandingan Perkiraan Bulanan Jul–Des 2026 (HistGB vs NB GLM)
              </p>
              <span className="text-[11px] font-semibold text-[#6b7770]">
                Batang oranye &amp; batang ungu sejajar per bulan agar mudah dibandingkan langsung
              </span>
            </div>
            <UatChartBox heightPx={310}>
              {({ width, height }) => (
                <BarChart
                  width={width}
                  height={height}
                  data={monthlyH2Series}
                  margin={{ top: 24, right: 16, left: 0, bottom: 6 }}
                  barGap={6}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={RSIA_UAT_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis, fontWeight: 600 }}
                  />
                  <YAxis
                    width={44}
                    domain={[0, (dataMax: number) => Math.ceil((dataMax + 90) / 50) * 50]}
                    tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                  />
                  <Tooltip
                    contentStyle={{ ...UAT_CHART_FONT, fontSize: '12px', borderRadius: '12px', borderColor: '#ace2c5' }}
                  />
                  <Legend
                    iconSize={12}
                    formatter={(v) => (
                      <span style={{ ...UAT_CHART_FONT, color: '#18201c', fontWeight: 600, fontSize: '12px' }}>
                        {v}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="histgb"
                    name="Proyeksi Utama (HistGB)"
                    fill={RSIA_UAT_COLORS.forecast}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  >
                    <LabelList
                      dataKey="histgb"
                      position="top"
                      style={{ ...UAT_CHART_FONT, fontSize: 11, fontWeight: 700, fill: '#b94818' }}
                    />
                  </Bar>
                  <Bar
                    dataKey="nbGlm"
                    name="Pembanding Statistik (NB GLM)"
                    fill={RSIA_UAT_COLORS.nbGlm}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  >
                    <LabelList
                      dataKey="nbGlm"
                      position="top"
                      style={{ ...UAT_CHART_FONT, fontSize: 11, fontWeight: 700, fill: '#4347b8' }}
                    />
                  </Bar>
                </BarChart>
              )}
            </UatChartBox>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Proyeksi 4 Poliklinik Utama (Jul–Des 2026)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Unit Layanan</th>
                  <th className="py-2 px-3 text-right">Estimasi 6 Bulan</th>
                  <th className="py-2 px-3 text-right">Rata-Rata / Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {unitH2List.map((u) => (
                  <tr key={u.poliklinik} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2.5 px-3 font-extrabold text-[#18201c]">{u.poliklinik}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#d95d28] tabular-nums">
                      {formatNumId(u.projectedH2)} pasien
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-[#3c4641] tabular-nums">
                      {formatNumId(u.dailyMeanH2, 2)} / hari
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <div className="bg-[#f6f8f7] px-3.5 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
            Tabel Rincian Perkiraan Kunjungan Bulanan (Juli–Desember 2026 • {data.projection2026.h2Days} Hari)
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                <th className="py-2 px-3">Bulan</th>
                <th className="py-2 px-3 text-right">Jumlah Hari</th>
                <th className="py-2 px-3 text-right">Perkiraan Utama (HistGB)</th>
                <th className="py-2 px-3 text-right">Pembanding (NB GLM)</th>
                <th className="py-2 px-3 text-right">Kisaran Bawah – Atas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {monthlyH2Series.map((m) => (
                <tr key={m.label} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">{m.label}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-[#6b7770]">{m.days} hari</td>
                  <td className="py-2 px-3 text-right font-extrabold text-[#d95d28] tabular-nums">
                    {formatNumId(m.histgb)} pasien
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-[#5a5fe0] tabular-nums">
                    {formatNumId(m.nbGlm)} pasien
                  </td>
                  <td className="py-2 px-3 text-right text-[#3c4641] tabular-nums">
                    {formatNumId(m.ciLow)} – {formatNumId(m.ciHigh)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[#edf8f2] font-extrabold text-[#0f5c43]">
                <td className="py-2.5 px-3">Total Paruh Kedua 2026</td>
                <td className="py-2.5 px-3 text-right tabular-nums">{data.projection2026.h2Days} hari</td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {formatNumId(data.projection2026.h2Projected)} pasien
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {formatNumId(monthlyH2Series.reduce((acc, m) => acc + m.nbGlm, 0))} pasien
                </td>
                <td className="py-2.5 px-3 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        </StepSectionCard>
      )}

      {/* Langkah 6.2 */}
      {viewStep === 2 && (
        <StepSectionCard
          stepCode="Langkah 6.2"
          title="Kesiapan 9 Paket Data Aman Dashboard RSIA"
          subtitle="Memastikan seluruh berkas grafik & angka siap tampil bebas identitas pasien."
          done={viewStep >= 2}
          ranLiveInfo={liveNotes.stage7_export}
        >
          <PanduanPengujiBox
            whatHappens="Menyiapkan 9 paket data ringkas untuk halaman Beranda dan Analisis Kunjungan."
            stepsToCheck={[
              'Pastikan status hijau tertulis "9 / 9 Paket Lengkap & Bebas Identitas" dan seluruh baris berstatus Siap.',
              'Klik "Lihat Panduan Uji Role →" di kanan atas.',
            ]}
          />
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#edf8f2] border border-[#93d1ae] px-3.5 py-2.5">
            <span className="text-xs font-extrabold text-[#0f5c43] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Status Kesiapan Data Website Dashboard:{' '}
              {data.allDashboardReady ? `${dashboardFiles.length} / ${dashboardFiles.length} Paket Lengkap & Bebas Identitas` : 'Sebagian Belum Terbentuk'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2 px-3 text-center">No.</th>
                  <th className="py-2 px-3">Nama Paket Data Web</th>
                  <th className="py-2 px-3">Berkas</th>
                  <th className="py-2 px-3 text-right">Ukuran</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {dashboardFiles.map((f, idx) => (
                  <tr key={f.file} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2 px-3 text-center font-bold text-[#0f5c43]">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-[#18201c]">{f.label}</td>
                    <td className="py-2 px-3 text-[#6b7770]">{f.file}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-[#3c4641]">{f.sizeKb} KB</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          f.ready ? 'bg-[#edf8f2] text-[#0f5c43]' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {f.ready ? 'Siap' : 'Kosong'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StepSectionCard>
      )}

      {/* Langkah 6.3 */}
      {viewStep === 3 && (
        <StepSectionCard
          stepCode="Langkah 6.3"
          title="Panduan Uji Dashboard Analisis Kunjungan (Direktur & Kadiv Medis)"
          subtitle="Ringkasan tampilan dan fungsi tombol saat penguji lanjut menguji role Direktur & Kadiv."
          done={viewStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Pengujian berlanjut dari akun Penguji ini ke akun Direktur dan Kadiv Pelayanan Medis di halaman Analisis Kunjungan."
            stepsToCheck={[
              'Keluar lalu login sebagai Direktur (081100000002): buka Analisis Kunjungan dan uji tombol Unit, Rentang Tanggal, Resolusi Waktu, Garis, ? Panduan, serta Jam Sibuk 24J sesuai tabel di bawah.',
              'Login sebagai Kadiv Pelayanan Medis (081100000007): pastikan hanya 6 unit medis yang tampil (tanpa Total RS & tanpa Laboratorium).',
              'Uji pembanding Kadiv Umum & IT (081100000003): pastikan menu Analisis Kunjungan tidak muncul dan akses ditolak.',
            ]}
          />
          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2.5 px-3">Bagian Tampilan Dashboard</th>
                  <th className="py-2.5 px-3">Sumber Berkas</th>
                  <th className="py-2.5 px-3">Ringkasan Angka yang Ditampilkan</th>
                  <th className="py-2.5 px-3">Halaman Tujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {dashboardViews.map((vw) => (
                  <tr key={vw.viewName} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2.5 px-3 font-extrabold text-[#0f5c43]">
                      <span className="inline-flex items-center gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                        {vw.viewName}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#6b7770]">{vw.sourceFile}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#18201c]">{vw.metricShown}</td>
                    <td className="py-2.5 px-3 font-bold text-[#186b46]">{vw.targetPage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Panduan Fungsi Tombol pada Halaman &quot;Analisis Kunjungan&quot; (Khusus Direktur &amp; Kadiv Pelayanan Medis)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Tombol / Kontrol di Layar</th>
                  <th className="py-2 px-3">Fungsinya Saat Diklik</th>
                  <th className="py-2 px-3">Keterangan Wewenang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Buka Analisis Kunjungan / Menu Analisis Kunjungan</td>
                  <td className="py-2 px-3 text-[#3c4641]">Membuka halaman grafik tren, beban poliklinik, dan proyeksi 2026.</td>
                  <td className="py-2 px-3 font-semibold text-[#18201c]">Hanya muncul untuk Direktur &amp; Kadiv Pelayanan Medis</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Kotak &quot;Unit:&quot;</td>
                  <td className="py-2 px-3 text-[#3c4641]">Mengganti seluruh angka KPI, grafik, penjamin, dan jam sibuk sesuai unit terpilih.</td>
                  <td className="py-2 px-3 font-semibold text-[#18201c]">Direktur: Total RS + 7 unit • Kadiv Medis: 6 unit medis saja</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Tombol Rentang Tanggal + &quot;Terapkan Rentang Tanggal&quot;</td>
                  <td className="py-2 px-3 text-[#3c4641]">Memilih periode cepat (Semua, Jan–Jun 2026, Proyeksi Jul–Des 2026), Tahun/Bulan/Minggu ke-, atau rentang tanggal bebas.</td>
                  <td className="py-2 px-3 text-[#6b7770]">Berlaku langsung ke KPI &amp; grafik</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Bulanan / Mingguan / Harian / Tahunan</td>
                  <td className="py-2 px-3 text-[#3c4641]">Mengubah tingkat kerapatan titik grafik dari rekap tahunan hingga angka per hari.</td>
                  <td className="py-2 px-3 text-[#6b7770]">Direkomendasikan Bulanan/Mingguan untuk rentang panjang</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Garis (4) &amp; ? Panduan</td>
                  <td className="py-2 px-3 text-[#3c4641]">Menyalakan/mematikan masing-masing garis grafik atau membuka ringkasan bantuan fungsi tombol.</td>
                  <td className="py-2 px-3 text-[#6b7770]">Menjaga grafik tetap mudah dibaca</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 font-extrabold text-[#0f5c43]">Grafik / Poliklinik / Jam Sibuk 24J (+ Buka Matriks 24 Jam →)</td>
                  <td className="py-2 px-3 text-[#3c4641]">Memperbesar salah satu panel: grafik utama, daftar porsi poliklinik &amp; penjamin, atau tabel jam kedatangan 24 jam.</td>
                  <td className="py-2 px-3 text-[#6b7770]">Membantu pembacaan nyaman di layar kecil/laptop</td>
                </tr>
              </tbody>
            </table>
          </div>

          <ApaArtinyaBox
            variant="orange"
            title="Siap Ditampilkan ke Dashboard Pimpinan & Berita Acara UAT"
            text="Lingkup Scientific Method berakhir pada penyajian angka kunjungan historis, jam sibuk, dan perkiraan Juli–Desember 2026 di menu Beranda dan Analisis Kunjungan. Sistem tidak membuat rekomendasi otomatis—kebijakan dan keputusan tetap diambil langsung oleh Direktur RSIA."
          />
        </StepSectionCard>
      )}
    </div>
  );
};
