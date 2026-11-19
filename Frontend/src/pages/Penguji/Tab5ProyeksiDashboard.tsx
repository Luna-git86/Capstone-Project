// Frontend/src/pages/Penguji/Tab5ProyeksiDashboard.tsx
import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
  type Tab5Data,
} from './uatSmTypes';

interface Tab5Props {
  data: Tab5Data | null;
  unlockedStep: number;
  liveNotes: Record<string, string>;
}

export const Tab5ProyeksiDashboard: React.FC<Tab5Props> = ({ data, unlockedStep, liveNotes }) => {
  if (!data || unlockedStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tahap 5 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Hitung (0/3)</strong> untuk melihat proyeksi Juli–Desember 2026 dan kesiapan data tampil pada Website Dashboard RSIA.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Langkah 5.1 */}
      <StepSectionCard
        stepCode="Langkah 5.1"
        title="Proyeksi Kunjungan Paruh Kedua 2026 (Juli–Desember 2026)"
        subtitle="Perkiraan beban kunjungan untuk 184 hari ke depan secara keseluruhan maupun pada 4 poliklinik utama RSIA."
        done={unlockedStep >= 1}
      >
        <PanduanPengujiBox
          whatHappens="Sistem menghitung perkiraan jumlah pasien untuk 184 hari pada paruh kedua tahun 2026 (Juli–Desember 2026) baik untuk Total RS maupun pada 4 poliklinik utama."
          stepsToCheck={[
            'Periksa 3 kartu ringkasan: Proyeksi Jul–Des 2026 (3.798 pasien), Realisasi Jan–Jun 2026 (4.044 pasien), dan Estimasi Setahun Penuh 2026 (7.842 pasien).',
            'Cek grafik perkiraan bulanan Jul–Des 2026 serta dua tabel rincian (per poliklinik utama & per bulan) di bawahnya.',
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-2xl border border-[#dce7e0] bg-white p-3.5">
            <p className="text-xs font-extrabold text-[#18201c] mb-2">
              Grafik Perkiraan Bulanan Jul–Des 2026 (HistGB vs NB GLM)
            </p>
            <UatChartBox heightPx={240}>
              {({ width, height }) => (
                <ComposedChart width={width} height={height} data={data.monthlyH2Series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={RSIA_UAT_COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                  />
                  <YAxis
                    width={42}
                    tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                  />
                  <Tooltip
                    contentStyle={{ ...UAT_CHART_FONT, fontSize: '12px', borderRadius: '12px' }}
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
                    barSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="nbGlm"
                    name="Pembanding (NB GLM)"
                    stroke={RSIA_UAT_COLORS.nbGlm}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              )}
            </UatChartBox>
          </div>

          <div className="lg:col-span-5 overflow-x-auto rounded-2xl border border-[#dce7e0]">
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
                {data.unitH2List.map((u) => (
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

        {/* Tabel Proyeksi Bulanan Jul-Des 2026 */}
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
              {data.monthlyH2Series.map((m) => (
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
                  {formatNumId(data.monthlyH2Series.reduce((acc, m) => acc + m.nbGlm, 0))} pasien
                </td>
                <td className="py-2.5 px-3 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </StepSectionCard>

      {/* Langkah 5.2 */}
      {unlockedStep >= 2 && (
        <StepSectionCard
          stepCode="Langkah 5.2"
          title="Pengiriman 9 Paket Data Rekap Aman ke Website Dashboard RSIA"
          subtitle="Memastikan seluruh angka proyeksi, beban poliklinik, dan jam sibuk telah siap ditampilkan di Dashboard RSIA tanpa satu pun data pribadi."
          done={unlockedStep >= 2}
          ranLiveInfo={liveNotes.stage7_export}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menyaring kembali seluruh keluaran dan mengekspor 9 paket data ringkas yang bebas identitas pasien ke folder Dashboard RSIA."
            stepsToCheck={[
              'Pastikan status bertuliskan "9 / 9 Paket Lengkap & Bebas Identitas" dan seluruh 9 baris pada tabel berstatus hijau "Siap".',
            ]}
          />
          <div className="flex items-center justify-between gap-2 rounded-xl bg-[#edf8f2] border border-[#93d1ae] px-3.5 py-2.5">
            <span className="text-xs font-extrabold text-[#0f5c43] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Status Kesiapan Data Website Dashboard:{' '}
              {data.allDashboardReady ? `${data.dashboardFiles.length} / ${data.dashboardFiles.length} Paket Lengkap & Bebas Identitas` : 'Sebagian Belum Terbentuk'}
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
                {data.dashboardFiles.map((f, idx) => (
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

      {/* Langkah 5.3 */}
      {unlockedStep >= 3 && (
        <StepSectionCard
          stepCode="Langkah 5.3"
          title="Tampilan Akhir Data pada Dashboard Analisis Kunjungan RSIA"
          subtitle="Hasil akhir Scientific Method ditampilkan berupa angka ringkas, grafik tren, dan proyeksi kunjungan di Dashboard agar Direktur dapat mengambil keputusan secara langsung."
          done={unlockedStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Menampilkan pemetaan akhir bagian mana saja dari hasil Scientific Method yang muncul di menu Beranda dan Analisis Kunjungan RSIA, serta fungsi tiap tombol kontrolnya."
            stepsToCheck={[
              'Cocokkan ke-5 baris pada Tabel Tampilan Akhir Data dengan tampilan asli ketika Anda login sebagai Direktur (081100000002) atau Kadiv Pelayanan Medis (081100000007).',
              'Gunakan Tabel Panduan Fungsi Tombol Analisis Kunjungan di bawah sebagai acuan saat mencoba dropdown Unit, rentang tanggal, resolusi waktu, Garis, dan Jam Sibuk 24J.',
              'Pastikan Kadiv di luar Pelayanan Medis (seperti Kadiv Umum & IT 081100000003 atau Kadiv Penunjang Medis 081100000008) TIDAK dapat membuka menu Analisis Kunjungan.',
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
                {data.dashboardViews.map((vw) => (
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
