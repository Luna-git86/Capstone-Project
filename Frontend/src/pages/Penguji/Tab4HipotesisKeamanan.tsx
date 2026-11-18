// Frontend/src/pages/Penguji/Tab4HipotesisKeamanan.tsx
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard, UatChartBox } from './UatSharedBlocks';
import {
  RSIA_UAT_COLORS,
  UAT_CHART_FONT,
  formatNumId,
  type Tab4Data,
} from './uatSmTypes';

interface Tab4Props {
  data: Tab4Data | null;
  unlockedStep: number;
  liveNotes: Record<string, string>;
}

export const Tab4HipotesisKeamanan: React.FC<Tab4Props> = ({ data, unlockedStep, liveNotes }) => {
  const [selectedFigure, setSelectedFigure] = useState<string>('06_faktor_berpengaruh_feature_importance.png');
  const [figureBlobUrl, setFigureBlobUrl] = useState<string | null>(null);
  const [loadingFigure, setLoadingFigure] = useState<boolean>(false);

  const activeFigure =
    data?.figures.find((f) => f.file === selectedFigure) || data?.figures[0] || null;

  useEffect(() => {
    if (!activeFigure || unlockedStep < 2) return;
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
  }, [activeFigure, unlockedStep]);

  if (!data || unlockedStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tahap 4 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Hitung (0/3)</strong> untuk memeriksa pembuktian 3 hipotesis penelitian, peringkat faktor berpengaruh, dan uji keamanan privasi.
        </p>
      </div>
    );
  }

  const barData = data.featureImportance.map((item) => ({
    name: item.label.length > 34 ? `${item.label.slice(0, 32)}...` : item.label,
    importance: Number(item.importance.toFixed(4)),
  }));

  return (
    <div className="space-y-4">
      {/* Langkah 4.1 */}
      <StepSectionCard
        stepCode="Langkah 4.1"
        title="Pembuktian 3 Hipotesis Penelitian (Scientific Method)"
        subtitle="Seluruh dugaan awal penelitian diuji secara objektif terhadap data nyata tahun 2023–2026."
        done={unlockedStep >= 1}
      >
        <PanduanPengujiBox
          whatHappens="Sistem memeriksa ketiga dugaan utama penelitian menggunakan hasil uji data 2023–2026: pengaruh pola kalender/jadwal dokter (H1), keunggulan model vs cara manual (H2), dan faktor penentu terkuat (H3)."
          stepsToCheck={[
            'Periksa kolom Keputusan pada ketiga baris (H1, H2, H3) dan pastikan semuanya bertanda hijau DITERIMA beserta bukti angkanya.',
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

      {/* Langkah 4.2 */}
      {unlockedStep >= 2 && (
        <StepSectionCard
          stepCode="Langkah 4.2"
          title="Faktor Paling Berpengaruh & Galeri Grafik Hasil Penelitian"
          subtitle="Mengukur seberapa besar kesalahan prediksi meningkat apabila satu faktor dihilangkan, sekaligus meninjau 7 grafik laporan."
          done={unlockedStep >= 2}
          ranLiveInfo={liveNotes.stage6_visualization}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menghasilkan 7 grafik laporan resmi dan mengurutkan faktor mana yang paling menentukan ketepatan tebakan jumlah pasien."
            stepsToCheck={[
              'Lihat peringkat faktor pada grafik batang & tabel kiri: #1 Hari dalam Seminggu dan #2 Tanggal Merah & Cuti Bersama.',
              'Pada panel kanan "Pratinjau Grafik Laporan Resmi", coba pilih grafik lain lewat dropdown untuk memastikan semua grafik tergambar bersih.',
            ]}
          />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 rounded-2xl border border-[#dce7e0] bg-white p-3.5 space-y-3">
              <p className="text-xs font-extrabold text-[#18201c]">
                Peringkat Faktor Penentu Ketepatan Prediksi
              </p>
              <UatChartBox heightPx={230}>
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={barData}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={RSIA_UAT_COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ ...UAT_CHART_FONT, fontSize: 10, fill: RSIA_UAT_COLORS.axis }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={165}
                      tick={{ ...UAT_CHART_FONT, fontSize: 10, fill: '#18201c', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{ ...UAT_CHART_FONT, fontSize: '12px', borderRadius: '12px' }}
                    />
                    <Bar dataKey="importance" name="Dampak Ketepatan" fill={RSIA_UAT_COLORS.actual} radius={[0, 6, 6, 0]} />
                  </BarChart>
                )}
              </UatChartBox>
              <div className="overflow-x-auto rounded-xl border border-[#eef1ef]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                      <th className="py-1.5 px-2.5 text-center">#</th>
                      <th className="py-1.5 px-2.5">Nama Faktor</th>
                      <th className="py-1.5 px-2.5 text-right">Skor Pengaruh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {data.featureImportance.map((fi, idx) => (
                      <tr key={fi.code}>
                        <td className="py-1.5 px-2.5 text-center font-extrabold text-[#0f5c43]">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-semibold text-[#18201c]">{fi.label}</td>
                        <td className="py-1.5 px-2.5 text-right font-extrabold text-[#0f5c43] tabular-nums">
                          {fi.importance >= 0 ? `+${fi.importance.toFixed(4)}` : fi.importance.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-2xl border border-[#dce7e0] bg-white p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#18201c] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0f5c43]" />
                  Pratinjau Grafik Laporan Resmi
                </span>
                <select
                  aria-label="Pilih Gambar Laporan Tab 4"
                  value={activeFigure?.file || ''}
                  onChange={(e) => setSelectedFigure(e.target.value)}
                  className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-2.5 py-1.5 text-[#18201c] max-w-64 truncate"
                >
                  {data.figures.map((fig) => (
                    <option key={fig.file} value={fig.file}>
                      {fig.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-[#dce7e0] bg-[#f6f8f7] h-52 flex items-center justify-center overflow-hidden p-2">
                {loadingFigure ? (
                  <span className="text-xs text-[#6b7770] font-semibold">Memuat gambar laporan...</span>
                ) : figureBlobUrl ? (
                  <img
                    src={figureBlobUrl}
                    alt={activeFigure?.title || 'Grafik Laporan SM'}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-xs text-[#6b7770]">Gambar belum tersedia.</span>
                )}
              </div>
              {activeFigure && (
                <p className="text-[11px] text-[#3c4641] font-medium">{activeFigure.keyInsight}</p>
              )}
            </div>
          </div>
        </StepSectionCard>
      )}

      {/* Langkah 4.3 */}
      {unlockedStep >= 3 && (
        <StepSectionCard
          stepCode="Langkah 4.3"
          title="Pemeriksaan Otomatis Keamanan Privasi, Anti-Bocor & Kestabilan Harian"
          subtitle="Menjalankan 8 pemeriksaan otomatis untuk menjamin tidak ada kebocoran identitas pasien maupun data masa depan."
          done={unlockedStep >= 3}
          ranLiveInfo={liveNotes.stage8_integrity_test}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menjalankan 8 pemeriksaan otomatis dari skrip pengujian untuk menjamin nol nama pasien/No. RM/dokter yang lolos serta nol data masa depan yang bocor ke pelatihan."
            stepsToCheck={[
              'Pastikan 4 kartu jaminan utama bertanda LOLOS dan ke-8 lencana hasil pemeriksaan di bawahnya seluruhnya bertanda LOLOS.',
              'Lihat tabel rata-rata selisih per hari Senin–Minggu dan kotak kesimpulan di bagian bawah.',
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.integrityChecklist.map((chk) => (
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

          {data.latestIntegrityTests.length > 0 && (
            <div className="rounded-xl bg-[#f6f8f7] border border-[#dce7e0] p-3 flex flex-wrap gap-2">
              {data.latestIntegrityTests.map((t) => (
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
                  {data.dayOfWeekMetrics.map((d) => (
                    <th key={d.day} className="py-2 px-3 text-center">
                      {d.day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 font-bold text-[#18201c]">Rata-Rata Meleset</td>
                  {data.dayOfWeekMetrics.map((d) => (
                    <td key={d.day} className="py-2 px-3 text-center font-extrabold text-[#0f5c43] tabular-nums">
                      ±{formatNumId(d.mae, 2)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <ApaArtinyaBox text={data.residualDiagnostics.plainInterpretation} />
        </StepSectionCard>
      )}
    </div>
  );
};
