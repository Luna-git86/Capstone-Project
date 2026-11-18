// Frontend/src/pages/Penguji/Tab2PolaFaktor.tsx
import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard } from './UatSharedBlocks';
import { formatNumId, getUatHeatmapCellClass, type Tab2Data } from './uatSmTypes';

interface Tab2Props {
  data: Tab2Data | null;
  unlockedStep: number;
  liveNotes: Record<string, string>;
}

export const Tab2PolaFaktor: React.FC<Tab2Props> = ({ data, unlockedStep, liveNotes }) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedHeatmapUnit, setSelectedHeatmapUnit] = useState<string>('TOTAL');
  const [showFullDay, setShowFullDay] = useState<boolean>(false);

  const holidaysFiltered = useMemo(() => {
    if (!data) return [];
    return data.holidaysList.filter((h) => selectedYear === 'ALL' || h.year === selectedYear);
  }, [data, selectedYear]);

  const heatmapRows = useMemo(() => {
    if (!data) return [];
    return data.heatmapByUnit[selectedHeatmapUnit] || data.heatmapByUnit.TOTAL || [];
  }, [data, selectedHeatmapUnit]);

  const hoursList = useMemo(
    () => (showFullDay ? Array.from({ length: 24 }, (_, i) => i) : Array.from({ length: 15 }, (_, i) => i + 7)),
    [showFullDay]
  );

  const maxHeatVal = useMemo(() => {
    let m = 1;
    for (const r of heatmapRows) {
      for (const h of hoursList) {
        const v = r.hours[String(h)] || 0;
        if (v > m) m = v;
      }
    }
    return m;
  }, [heatmapRows, hoursList]);

  if (!data || unlockedStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tahap 2 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Hitung (0/3)</strong> untuk melihat pola hari kerja, jam sibuk, dan 14 faktor penentu prediksi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Langkah 2.1 */}
      <StepSectionCard
        stepCode="Langkah 2.1"
        title="Pola Kunjungan Hari Kerja vs Akhir Pekan & Hari Libur"
        subtitle="Melihat perbedaan rata-rata kunjungan harian yang dipengaruhi jadwal praktik dokter dan tanggal merah."
        done={unlockedStep >= 1}
      >
        <PanduanPengujiBox
          whatHappens="Sistem membandingkan rata-rata jumlah pasien per hari saat Hari Kerja (Senin–Jumat), Akhir Pekan (Sabtu–Minggu), dan Hari Libur Nasional."
          stepsToCheck={[
            'Bandingkan angka rata-rata pada tabel: Hari Kerja (33,31 pasien), Akhir Pekan (23,75 pasien), dan Hari Libur Nasional (26,62 pasien).',
            'Pastikan tampak perbedaan jelas antara hari praktik dokter reguler dengan hari libur.',
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
                <td className="py-2.5 px-3 text-[#3c4641]">Layanan didominasi IGD & poliklinik terbatas</td>
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

      {/* Langkah 2.2 */}
      {unlockedStep >= 2 && (
        <StepSectionCard
          stepCode="Langkah 2.2"
          title={`Pembuatan ${data.featureCount} Faktor Kalender & Riwayat Bebas Contek (Horizon ${data.horizonDays} Hari)`}
          subtitle="Skrip menyusun daftar faktor kalender dan riwayat kunjungan 7–28 hari ke belakang tanpa pernah mengintip data hari berikutnya."
          done={unlockedStep >= 2}
          ranLiveInfo={liveNotes.stage3_features}
        >
          <PanduanPengujiBox
            whatHappens="Sistem menyusun 14 angka penentu dari kalender, libur nasional, dan catatan kunjungan minimal 7 hari ke belakang (H-7 s.d. H-28) agar siap dipakai melatih model perkiraan."
            stepsToCheck={[
              'Periksa Tabel 14 Faktor Penentu dan kotak orange Jaminan Tidak Mencontek Data Besok (kolom jumlah dokter hari-H tidak dipakai sebagai input model).',
              'Lihat Tabel Contoh Data Olahan Lengkap dengan Faktor Penentu (10 Hari) di bawah untuk mengecek angka riil hasil olahan tiap tanggal (Pasien H-7, Rata-Rata 7H, dll.).',
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
                {data.features.map((ft) => (
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

          <ApaArtinyaBox variant="orange" title="Jaminan Tidak Mencontek Data Besok" text={data.excludedColumnsNote} />

          {data.sampleEngineeredRows.length > 0 && (
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
                  {data.sampleEngineeredRows.map((r) => (
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

      {/* Langkah 2.3 */}
      {unlockedStep >= 3 && (
        <StepSectionCard
          stepCode="Langkah 2.3"
          title="Uji Daftar Libur Nasional Otomatis & Pola Jam Sibuk per Unit"
          subtitle="Penguji dapat memfilter tahun untuk melihat daftar tanggal merah Indonesia (SKB 3 Menteri) dan memilih unit untuk melihat jam padatnya."
          done={unlockedStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Sistem memuat daftar tanggal merah resmi Indonesia (2023–2026) dan mengelompokkan kedatangan pasien berdasarkan hari dan jam kunjungan."
            stepsToCheck={[
              'Di panel kiri, ubah dropdown tahun dari "Tahun 2026" ke "Semua Tahun (2023–2026)" untuk mengecek daftar tanggal merah.',
              'Di panel kanan, pilih unit pada dropdown "Semua Unit RSIA" (misalnya POLIKLINIK OBGYN atau UNIT IGD) dan tekan tombol "Tampilkan 24 Jam" / "Fokus Jam 07–21".',
            ]}
          />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Daftar Libur */}
            <div className="xl:col-span-5 rounded-2xl border border-[#dce7e0] p-3.5 space-y-3 bg-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#18201c] flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-[#0f5c43]" />
                  Tanggal Merah & Cuti Terdeteksi ({holidaysFiltered.length})
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

            {/* Peta Jam Sibuk */}
            <div className="xl:col-span-7 rounded-2xl border border-[#dce7e0] p-3.5 space-y-3 bg-white">
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
                    {data.heatmapUnits
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
                        <td className="p-1 pr-2 text-[11px] font-bold text-[#18201c] text-left whitespace-nowrap">
                          {row.day_name}
                        </td>
                        {hoursList.map((h) => {
                          const val = row.hours[String(h)] || 0;
                          return (
                            <td
                              key={h}
                              title={`${row.day_name} ${String(h).padStart(2, '0')}:00 — ${formatNumId(val)} pasien`}
                              className={`p-1 text-[10px] border border-white rounded-xs tabular-nums ${getUatHeatmapCellClass(
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
          </div>
        </StepSectionCard>
      )}
    </div>
  );
};
