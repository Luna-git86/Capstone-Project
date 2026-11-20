// Frontend/src/pages/Penguji/Tab5HipotesisKeamanan.tsx
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, ChevronLeft, ChevronRight, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard, UatChartBox } from './UatSharedBlocks';
import {
  RSIA_UAT_COLORS,
  UAT_CHART_FONT,
  formatNumId,
  type Tab5Data,
} from './uatSmTypes';

interface Tab5Props {
  data: Tab5Data | null;
  viewStep: number;
  liveNotes: Record<string, string>;
}

export const Tab5HipotesisKeamanan: React.FC<Tab5Props> = ({ data, viewStep, liveNotes }) => {
  const [selectedFigure, setSelectedFigure] = useState<string>('06_faktor_berpengaruh_feature_importance.png');
  const [figureBlobUrl, setFigureBlobUrl] = useState<string | null>(null);
  const [loadingFigure, setLoadingFigure] = useState<boolean>(false);

  const figures = Array.isArray(data?.figures) ? data.figures : [];
  const activeFigure =
    figures.find((f) => f.file === selectedFigure) || figures[0] || null;

  useEffect(() => {
    if (!activeFigure || viewStep !== 2) return;
    let cancelled = false;
    let currentObjUrl: string | null = null;

    const loadImg = async () => {
      try {
        setLoadingFigure(true);
        const res = await api.get(`/uat-sm/figure/${encodeURIComponent(activeFigure.file)}`, {
          responseType: 'blob',
        });
        if (cancelled) return;
        currentObjUrl = URL.createObjectURL(res.data);
        setFigureBlobUrl(currentObjUrl);
      } catch {
        if (!cancelled) setFigureBlobUrl(null);
      } finally {
        if (!cancelled) setLoadingFigure(false);
      }
    };

    loadImg();
    return () => {
      cancelled = true;
      if (currentObjUrl) URL.revokeObjectURL(currentObjUrl);
    };
  }, [activeFigure, viewStep]);

  if (!data || !Array.isArray(data.hypotheses) || viewStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tab 5 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Cek 3 Hipotesis Penelitian (1/3)</strong> di kanan atas untuk mengecek pembuktian hipotesis, grafik laporan penuh, dan 8 uji keamanan.
        </p>
      </div>
    );
  }

  const featureImportance = Array.isArray(data.featureImportance) ? data.featureImportance : [];
  const integrityChecklist = Array.isArray(data.integrityChecklist) ? data.integrityChecklist : [];
  const latestIntegrityTests = Array.isArray(data.latestIntegrityTests) ? data.latestIntegrityTests : [];
  const dayOfWeekMetrics = Array.isArray(data.dayOfWeekMetrics) ? data.dayOfWeekMetrics : [];
  const activeFigIdx = Math.max(0, figures.findIndex((f) => f.file === activeFigure?.file));

  const barData = featureImportance.map((item) => ({
    name: item.label.length > 38 ? `${item.label.slice(0, 36)}...` : item.label,
    importance: Number(item.importance.toFixed(4)),
  }));

  return (
    <div className="space-y-4">
      {/* Langkah 5.1 */}
      {viewStep === 1 && (
        <StepSectionCard
          stepCode="Langkah 5.1"
          title="Pembuktian 3 Hipotesis Penelitian"
          subtitle="Menguji tiga dugaan penelitian berdasarkan data nyata tahun 2023–2026."
          done={viewStep >= 1}
        >
        <PanduanPengujiBox
          whatHappens="Memastikan ketiga hipotesis penelitian terbukti benar (DITERIMA)."
          stepsToCheck={[
            'Cek kolom Keputusan pada baris H1, H2, dan H3 — semuanya harus bertanda hijau DITERIMA.',
            'Klik "Lihat Grafik Laporan →" di kanan atas.',
          ]}
        />
        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                <th className="py-2.5 px-3">Hipotesis</th>
                <th className="py-2.5 px-3">Pernyataan Dugaan</th>
                <th className="py-2.5 px-3">Bukti Angka Hasil Uji</th>
                <th className="py-2.5 px-3 text-center">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {data.hypotheses.map((h) => (
                <tr key={h.code} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2.5 px-3 font-extrabold text-[#0f5c43] whitespace-nowrap">
                    {h.code} • {h.title}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#18201c]">{h.claim}</td>
                  <td className="py-2.5 px-3 text-[#3c4641]">{h.evidence}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#0f5c43] text-white">
                      {h.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </StepSectionCard>
      )}

      {/* Langkah 5.2 */}
      {viewStep === 2 && (
        <StepSectionCard
          stepCode="Langkah 5.2"
          title="Faktor Paling Berpengaruh & Galeri Grafik Laporan Resmi"
          subtitle="Melihat urutan faktor terpenting dan seluruh grafik laporan dalam ukuran penuh."
          done={viewStep >= 2}
          ranLiveInfo={liveNotes.stage6_visualization}
        >
          <PanduanPengujiBox
            whatHappens="Menunjukkan faktor penentu utama ketepatan prediksi dan galeri 7 grafik laporan resmi."
            stepsToCheck={[
              'Cek bagian atas: peringkat #1 faktor terpenting adalah Hari dalam Seminggu (jadwal dokter), lalu #2 Tanggal Merah.',
              'Gulir sedikit ke kotak Pratinjau Grafik Laporan Resmi di bawahnya: pilih grafik melalui dropdown atau tombol panah kiri/kanan agar grafik tampil lebar dan jelas.',
              'Klik "Jalankan 8 Uji Privasi →" di kanan atas.',
            ]}
          />
          <div className="space-y-5">
            {/* Panel 1: Faktor Penentu - Full Width */}
            <div className="rounded-2xl border border-[#dce7e0] bg-white p-4 space-y-3">
              <p className="text-xs font-extrabold text-[#18201c]">
                Peringkat Faktor Penentu Ketepatan Prediksi
              </p>
              <UatChartBox heightPx={260}>
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={barData}
                    layout="vertical"
                    margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={RSIA_UAT_COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: RSIA_UAT_COLORS.axis }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={215}
                      tick={{ ...UAT_CHART_FONT, fontSize: 11, fill: '#18201c', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{ ...UAT_CHART_FONT, fontSize: '12px', borderRadius: '12px' }}
                    />
                    <Bar dataKey="importance" name="Dampak Ketepatan" fill={RSIA_UAT_COLORS.actual} radius={[0, 6, 6, 0]} />
                  </BarChart>
                )}
              </UatChartBox>
              <div className="overflow-x-auto rounded-xl border border-[#eef1ef]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                      <th className="py-2 px-3 text-center">#</th>
                      <th className="py-2 px-3">Nama Faktor</th>
                      <th className="py-2 px-3 text-right">Skor Pengaruh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {featureImportance.map((fi, idx) => (
                      <tr key={fi.code} className="hover:bg-[#edf8f2]/40">
                        <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-[#18201c]">{fi.label}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                          {fi.importance >= 0 ? `+${fi.importance.toFixed(4)}` : fi.importance.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 2: Pratinjau Grafik Laporan Resmi - Stacked Full Width Besar & Jelas */}
            <div className="rounded-2xl border border-[#dce7e0] bg-white p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#0f5c43]" />
                  <span className="text-xs sm:text-sm font-extrabold text-[#18201c]">
                    Pratinjau Grafik Laporan Resmi
                  </span>
                  {figures.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
                      {activeFigIdx + 1} / {figures.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="Grafik Sebelumnya"
                    disabled={figures.length <= 1}
                    onClick={() => {
                      const prevIdx = (activeFigIdx - 1 + figures.length) % figures.length;
                      if (figures[prevIdx]) setSelectedFigure(figures[prevIdx].file);
                    }}
                    className="p-1.5 rounded-xl tvlk-btn-soft disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <select
                    aria-label="Pilih Gambar Laporan Tab 5"
                    value={activeFigure?.file || ''}
                    onChange={(e) => setSelectedFigure(e.target.value)}
                    className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-3 py-1.5 text-[#18201c] max-w-xs sm:max-w-md truncate"
                  >
                    {figures.map((fig, idx) => (
                      <option key={fig.file} value={fig.file}>
                        {idx + 1}. {fig.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Grafik Berikutnya"
                    disabled={figures.length <= 1}
                    onClick={() => {
                      const nextIdx = (activeFigIdx + 1) % figures.length;
                      if (figures[nextIdx]) setSelectedFigure(figures[nextIdx].file);
                    }}
                    className="p-1.5 rounded-xl tvlk-btn-soft disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[#dce7e0] bg-[#f8faf9] min-h-[380px] sm:min-h-[480px] flex items-center justify-center overflow-hidden p-3 sm:p-4">
                {loadingFigure ? (
                  <span className="text-xs text-[#6b7770] font-semibold">Memuat gambar laporan...</span>
                ) : figureBlobUrl ? (
                  <img
                    src={figureBlobUrl}
                    alt={activeFigure?.title || 'Grafik Laporan SM'}
                    className="w-full max-h-[540px] object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-xs text-[#6b7770]">Gambar belum tersedia.</span>
                )}
              </div>
              {activeFigure && (
                <p className="text-xs text-[#18201c] font-semibold bg-[#edf8f2]/70 border border-[#dce7e0] rounded-xl px-3 py-2">
                  <strong className="text-[#0f5c43]">Ringkasan Grafik:</strong> {activeFigure.keyInsight}
                </p>
              )}
            </div>
          </div>
        </StepSectionCard>
      )}

      {/* Langkah 5.3 */}
      {viewStep === 3 && (
        <StepSectionCard
          stepCode="Langkah 5.3"
          title="8 Uji Otomatis Keamanan Privasi & Anti-Bocor"
          subtitle="Memastikan tidak ada identitas pribadi pasien maupun bocoran data masa depan."
          done={viewStep >= 3}
          ranLiveInfo={liveNotes.stage8_integrity_test}
        >
          <PanduanPengujiBox
            whatHappens="Menjalankan pemeriksaan otomatis terhadap seluruh data dan model prediksi."
            stepsToCheck={[
              'Pastikan seluruh 4 kartu jaminan dan 8 hasil uji otomatis bertanda LOLOS.',
              'Klik "Lanjut ke Tab 6 →" di kanan atas.',
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {integrityChecklist.map((chk) => (
              <div
                key={chk.id}
                className={`rounded-xl border p-3 flex items-start gap-2.5 ${
                  chk.passed ? 'bg-[#edf8f2] border-[#93d1ae]' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${chk.passed ? 'text-[#0f5c43]' : 'text-rose-600'}`} />
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#18201c]">{chk.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white text-[#0f5c43] border border-[#ace2c5]">
                      {chk.passed ? 'LOLOS' : 'GAGAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#3c4641]">{chk.description}</p>
                </div>
              </div>
            ))}
          </div>

          {latestIntegrityTests.length > 0 && (
            <div className="rounded-xl bg-[#f6f8f7] border border-[#dce7e0] p-3 flex flex-wrap gap-2">
              {latestIntegrityTests.map((t) => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#ace2c5] text-[11px] font-bold text-[#0f5c43]"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {t.name}: {t.status}
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Hari</th>
                  {dayOfWeekMetrics.map((d) => (
                    <th key={d.day} className="py-2 px-3 text-center">
                      {d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#18201c]">Rata-Rata Meleset</td>
                  {dayOfWeekMetrics.map((d) => (
                    <td key={d.day} className="py-2 px-3 text-center font-extrabold text-[#0f5c43] tabular-nums">
                      ±{formatNumId(d.mae, 2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <ApaArtinyaBox text={data.residualDiagnostics?.plainInterpretation || ''} />
        </StepSectionCard>
      )}
    </div>
  );
};
