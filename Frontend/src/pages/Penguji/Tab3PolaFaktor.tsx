// Frontend/src/pages/Penguji/Tab3PolaFaktor.tsx
import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard } from './UatSharedBlocks';
import { formatNumId, getUatHeatmapCellClass, type Tab3Data } from './uatSmTypes';

interface Tab3Props {
  data: Tab3Data | null;
  viewStep: number;
  liveNotes: Record<string, string>;
}

export const Tab3PolaFaktor: React.FC<Tab3Props> = ({ data, viewStep, liveNotes }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedHeatmapUnit, setSelectedHeatmapUnit] = useState<string>('TOTAL');
  const [showFullDay, setShowFullDay] = useState<boolean>(false);

  const holidaysFiltered = useMemo(() => {
    const list = Array.isArray(data?.holidaysList) ? data.holidaysList : [];
    return list.filter((h) => selectedYear === 'ALL' || h.year === selectedYear);
  }, [data, selectedYear]);

  const heatmapRows = useMemo(() => {
    const byUnit = data?.heatmapByUnit ?? {};
    return byUnit[selectedHeatmapUnit] || byUnit.TOTAL || [];
  }, [data, selectedHeatmapUnit]);

  const hoursList = useMemo(
    () => (showFullDay ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 15 }, (_, i) => i + 7)),
    [showFullDay]
  );

  const maxHeatVal = useMemo(() => {
    let m = 1;
    for (const r of heatmapRows) {
      for (const h of hoursList) {
        const v = r.hours?.[String(h)] || 0;
        if (v > m) m = v;
      }
    }
    return m;
  }, [heatmapRows, hoursList]);

  if (!data || !data.calendarAverages || viewStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tab 3 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Lihat Pola Hari &amp; Libur (1/3)</strong> di kanan atas untuk melihat pengaruh hari kerja, tanggal merah, dan peta jam sibuk RSIA.
        </p>
      </div>
    );
  }

  const features = Array.isArray(data.features) ? data.features : [];
  const sampleEngineeredRows = Array.isArray(data.sampleEngineeredRows) ? data.sampleEngineeredRows : [];
  const heatmapUnits = Array.isArray(data.heatmapUnits) ? data.heatmapUnits : [];

  return (
    <div className="space-y-4">
      {/* Langkah 3.1 */}
      {viewStep === 1 && (
        <StepSectionCard
          stepCode="Langkah 3.1"
          title="Pola Kunjungan Hari Kerja vs Akhir Pekan & Hari Libur"
          subtitle="Membandingkan kepadatan pasien saat jadwal praktik rutin dibanding hari libur."
          done={viewStep >= 1}
        >
        <PanduanPengujiBox
          whatHappens="Membuktikan jumlah pasien sangat dipengaruhi hari praktik dokter dan tanggal merah."
          stepsToCheck={[
            'Bandingkan 3 angka rata-rata pada tabel: Hari Kerja (33,31 pasien) lebih ramai daripada Akhir Pekan (23,75) dan Hari Libur (26,62).',
            'Klik "Susun 14 Faktor Prediksi →" di kanan atas.',
          ]}
        />
        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                <th className="py-2.5 px-3">Kondisi Hari</th>
                <th className="py-2.5 px-3 text-right">Rata-Rata Pasien / Hari</th>
                <th className="py-2.5 px-3">Situasi Operasional RSIA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              <tr className="bg-[#edf8f2]/50">
                <td className="py-2.5 px-3 font-extrabold text-[#0f5c43]">Hari Kerja (Senin–Jumat)</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                  {formatNumId(data.calendarAverages.workday, 2)} pasien
                </td>
                <td className="py-2.5 px-3 text-[#3c4641]">Poliklinik rutin buka sesuai jadwal dokter spesialis</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-extrabold text-[#18201c]">Akhir Pekan (Sabtu–Minggu)</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#18201c] tabular-nums">
                  {formatNumId(data.calendarAverages.weekend, 2)} pasien
                </td>
                <td className="py-2.5 px-3 text-[#3c4641]">Layanan didominasi IGD &amp; poliklinik terbatas</td>
              </tr>
              <tr className="bg-[#fff6f1]/70">
                <td className="py-2.5 px-3 font-extrabold text-[#d95d28]">Hari Libur Nasional / Cuti</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[#d95d28] tabular-nums">
                  {formatNumId(data.calendarAverages.holiday, 2)} pasien
                </td>
                <td className="py-2.5 px-3 text-[#3c4641]">Poliklinik terjadwal tutup, namun Unit IGD tetap siaga 24 jam</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ApaArtinyaBox text="Jumlah pasien sangat bergantung pada jadwal hari praktik dokter dan tanggal merah. Karena itu faktor kalender wajib menjadi bagian utama perhitungan prediksi." />
        </StepSectionCard>
      )}

      {/* Langkah 3.2 */}
      {viewStep === 2 && (
        <StepSectionCard
          stepCode="Langkah 3.2"
          title={`${data.featureCount ?? 14} Faktor Kalender & Riwayat Bebas Contek (Horizon ${data.horizonDays ?? 7} Hari)`}
          subtitle="Menyusun faktor kalender dan riwayat kunjungan minimal 7 hari ke belakang."
          done={viewStep >= 2}
          ranLiveInfo={liveNotes.stage3_features}
        >
          <PanduanPengujiBox
            whatHappens="Menyiapkan 14 informasi penentu prediksi dari kalender, libur nasional, dan data minggu-minggu sebelumnya (tanpa mencontek hari besok)."
            stepsToCheck={[
              'Cek tabel 14 Faktor Penentu dan kotak peringatan orange di bawahnya (jumlah dokter hari-H sengaja dikecualikan).',
              'Cek tabel 10 baris contoh di bagian bawah untuk memastikan seluruh kolom faktor terisi angka.',
              'Klik "Lihat Libur & Jam Sibuk →" di kanan atas.',
            ]}
          />
          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2.5 px-3 text-center">No.</th>
                  <th className="py-2.5 px-3">Nama Faktor Penentu</th>
                  <th className="py-2.5 px-3">Kelompok</th>
                  <th className="py-2.5 px-3">Kegunaan untuk Perkiraan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {features.map((ft) => (
                  <tr key={ft.code} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43] tabular-nums">{ft.no}</td>
                    <td className="py-2 px-3 font-extrabold text-[#18201c]">{ft.label}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#edf8f2] text-[#186b46] border border-[#ace2c5]">
                        {ft.group}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#3c4641]">{ft.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ApaArtinyaBox variant="orange" title="Jaminan Tidak Mencontek Data Besok" text={data.excludedColumnsNote || ''} />

          {sampleEngineeredRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
                Tabel Contoh Data Olahan Lengkap dengan Faktor Penentu (10 Hari Terakhir yang Masuk ke Model)
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Hari</th>
                    <th className="py-2 px-3 text-right">Pasien Nyata</th>
                    <th className="py-2 px-3 text-center">Kode Hari</th>
                    <th className="py-2 px-3 text-center">Akhir Pekan</th>
                    <th className="py-2 px-3 text-center">Libur</th>
                    <th className="py-2 px-3 text-center">Ramadan</th>
                    <th className="py-2 px-3 text-right">Pasien H-7</th>
                    <th className="py-2 px-3 text-right">Rata-Rata 7H</th>
                    <th className="py-2 px-3 text-right">Rata-Rata 28H</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {sampleEngineeredRows.map((r) => (
                    <tr key={r.date} className="hover:bg-[#edf8f2]/40">
                      <td className="py-2 px-3 font-bold tabular-nums whitespace-nowrap">{r.date}</td>
                      <td className="py-2 px-3 font-semibold text-[#3c4641]">{r.dayName}</td>
                      <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                        {formatNumId(r.visitCount)}
                      </td>
                      <td className="py-2 px-3 text-center tabular-nums">{r.dayOfWeek}</td>
                      <td className="py-2 px-3 text-center">{r.isWeekend === 1 ? 'Ya' : 'Tidak'}</td>
                      <td className="py-2 px-3 text-center">{r.isHoliday === 1 ? 'Ya' : 'Tidak'}</td>
                      <td className="py-2 px-3 text-center">{r.isRamadan === 1 ? 'Ya' : 'Tidak'}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.lag7 ?? '-'}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.rollingMean7d !== null ? formatNumId(r.rollingMean7d, 1) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.rollingMean28d !== null ? formatNumId(r.rollingMean28d, 1) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </StepSectionCard>
      )}

      {/* Langkah 3.3 */}
      {viewStep === 3 && (
        <StepSectionCard
          stepCode="Langkah 3.3"
          title="Peta Jam Sibuk per Unit & Daftar Libur Nasional"
          subtitle="Menguji filter jam kunjungan 24 jam per unit dan kalender tanggal merah."
          done={viewStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Mengecek jam padat kunjungan per poliklinik dan daftar hari libur resmi tahun 2023–2026."
            stepsToCheck={[
              'Pada Matriks Jam Kedatangan: pilih unit di dropdown (mis. UNIT IGD atau OBGYN), lalu klik "Tampilkan 24 Jam".',
              'Pada panel Daftar Tanggal Merah di bawahnya: ubah dropdown Tahun Libur (mis. ke "Semua Tahun").',
              'Klik "Lanjut ke Tab 4 →" di kanan atas.',
            ]}
          />
          <div className="space-y-4">
            {/* Peta Jam Sibuk - Full Width agar 24 kolom jam lega & terbaca jelas */}
            <div className="rounded-2xl border border-[#dce7e0] p-4 space-y-3 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#18201c] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#0f5c43]" />
                  Matriks Jam Kedatangan Pasien
                </span>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Pilih Unit Matriks Jam Sibuk"
                    value={selectedHeatmapUnit}
                    onChange={(e) => setSelectedHeatmapUnit(e.target.value)}
                    className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1 text-[#18201c]"
                  >
                    <option value="TOTAL">Semua Unit RSIA</option>
                    {heatmapUnits
                      .filter((u) => u !== 'TOTAL')
                      .map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowFullDay((p) => !p)}
                    className="px-2.5 py-1 rounded-lg tvlk-btn-soft text-[11px] font-bold transition"
                  >
                    {showFullDay ? 'Fokus Jam 07–21' : 'Tampilkan 24 Jam'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto tvlk-scroll">
                <table className="w-full border-collapse text-center min-w-140">
                  <thead>
                    <tr>
                      <th className="p-1 text-[10px] font-bold text-[#6b7770] text-left">Hari / Jam</th>
                      {hoursList.map((h) => (
                        <th key={h} className="p-1 text-[10px] font-bold text-[#6b7770] tabular-nums">
                          {String(h).padStart(2, '0')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {heatmapRows.map((row) => (
                      <tr key={row.day_name}>
                        <td className="p-1.5 pr-3 text-[11px] font-bold text-[#18201c] text-left whitespace-nowrap">
                          {row.day_name}
                        </td>
                        {hoursList.map((h) => {
                          const val = row.hours?.[String(h)] || 0;
                          return (
                            <td
                              key={h}
                              title={`${row.day_name} ${String(h).padStart(2, '0')}:00 — ${formatNumId(val)} pasien`}
                              className={`p-1.5 text-[11px] border border-white rounded-xs tabular-nums ${getUatHeatmapCellClass(
                                val,
                                maxHeatVal
                              )}`}
                            >
                              {val > 0 ? val : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daftar Libur - Full Width di bawah */}
            <div className="rounded-2xl border border-[#dce7e0] p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#18201c] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#0f5c43]" />
                  Tanggal Merah &amp; Cuti Terdeteksi ({holidaysFiltered.length})
                </span>
                <select
                  aria-label="Filter Tahun Libur"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-lg px-2.5 py-1 text-[#18201c]"
                >
                  <option value="2026">Tahun 2026</option>
                  <option value="2025">Tahun 2025</option>
                  <option value="2024">Tahun 2024</option>
                  <option value="2023">Tahun 2023</option>
                  <option value="ALL">Semua Tahun (2023–2026)</option>
                </select>
              </div>
              <div className="max-h-60 overflow-y-auto tvlk-scroll divide-y divide-[#eef1ef] text-xs pr-1">
                {holidaysFiltered.map((h) => (
                  <div key={`${h.date}-${h.name}`} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#18201c]">{h.name}</span>
                    <span className="font-bold text-[#0f5c43] tabular-nums shrink-0">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </StepSectionCard>
      )}
    </div>
  );
};
