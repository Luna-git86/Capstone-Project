// Frontend/src/pages/Penguji/Tab2PreprocessingData.tsx
import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard } from './UatSharedBlocks';
import { formatNumId, type Tab2Data } from './uatSmTypes';

interface Tab2Props {
  data: Tab2Data | null;
  viewStep: number;
  liveNotes: Record<string, string>;
}

export const Tab2PreprocessingData: React.FC<Tab2Props> = ({ data, viewStep, liveNotes }) => {
  const [selectedPoliFilter, setSelectedPoliFilter] = useState<string>('SEMUA');

  if (!data || viewStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tab 2 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Pembersihan Data (1/3)</strong> di kanan atas untuk menghapus nama pasien, mengacak No. RM (hash+salt), serta merapikan label IGD &amp; &quot;-&quot;.
        </p>
      </div>
    );
  }

  const stage2 = data.stage2Summary ?? {
    rowsProcessed: 0,
    totalDays: 0,
    duplicates: 0,
    missingDays: 0,
    meanDaily: 0,
    maxDaily: 0,
    minDaily: 0,
    igdMergedCount: 0,
    penjaminDashReplacedCount: 0,
    uniquePatientsHashed: 0,
    uniqueDoctorsAnonymized: 0,
    outlierDaysFlagged: 0,
    primaryUnitsSharePct: 0,
    rareUnitsSharePct: 0,
  };
  const preprocessingSteps = Array.isArray(data.preprocessingSteps) ? data.preprocessingSteps : [];
  const privacyComparisons = Array.isArray(data.privacyComparisons) ? data.privacyComparisons : [];
  const sampleAnonymizedRows = Array.isArray(data.sampleAnonymizedRows) ? data.sampleAnonymizedRows : [];
  const dailySampleRows = Array.isArray(data.dailySampleRows) ? data.dailySampleRows : [];
  const poliklinikLoads = Array.isArray(data.poliklinikLoads) ? data.poliklinikLoads : [];
  const chronologicalSplit = Array.isArray(data.chronologicalSplit) ? data.chronologicalSplit : [];

  const filteredLoads =
    selectedPoliFilter === 'SEMUA'
      ? poliklinikLoads
      : poliklinikLoads.filter((u) => u.poliklinik === selectedPoliFilter);

  return (
    <div className="space-y-4">
      {/* Langkah 2.1: Eksekusi Pembersihan & Log 9 Tahapan Preprocessing */}
      {viewStep === 1 && (
        <StepSectionCard
          stepCode="Langkah 2.1"
          title="Pembersihan Data: Hapus Kolom, Hash+Salt & Normalisasi Label"
          subtitle="Baru di tahap ini dataset mentah dari Tab 1 dibersihkan dan diamankan."
          done={viewStep >= 1}
          ranLiveInfo={liveNotes.stage2_preprocessing}
        >
        <PanduanPengujiBox
          whatHappens="Menghapus nama pasien, menyamarkan No. RM dengan hash+salt, menyatukan IGD, mengubah '-' menjadi TIDAK TERCATAT, dan merekap per hari."
          stepsToCheck={[
            'Cek 4 kartu di bawah: 1.277 hari utuh (0 bolong), 0 data ganda, 20.284 No. RM unik ter-hash+salt, kisaran 8–80 pasien/hari.',
            'Cek tabel 9 Tahap Pembersihan & tabel Audit Sebelum vs Sesudah untuk memastikan tidak ada data pribadi yang lolos.',
            'Klik "Lihat Hasil Data Bersih →" di kanan atas.',
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#edf8f2] border border-[#ace2c5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#186b46]">Rentang Hari Utuh</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0f5c43] tabular-nums mt-0.5">
              {formatNumId(stage2.totalDays)} hari
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">
              {formatNumId(stage2.missingDays)} hari terlewat / bolong
            </p>
          </div>

          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">Cek Duplikat No. Rawat</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#1e8455] tabular-nums mt-0.5">
              {formatNumId(stage2.duplicates)} ganda
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              {formatNumId(stage2.rowsProcessed)} kunjungan unik &amp; valid
            </p>
          </div>

          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">No. RM Hash SHA-256 + Salt</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#18201c] tabular-nums mt-0.5">
              {formatNumId(stage2.uniquePatientsHashed)} unik
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              {formatNumId(stage2.igdMergedCount)} IGD + {formatNumId(stage2.penjaminDashReplacedCount)} &quot;-&quot; diseragamkan
            </p>
          </div>

          <div className="rounded-2xl bg-[#fff6f1] border border-[#ffd0b5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#d95d28]">Kisaran Pasien / Hari</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#18201c] tabular-nums mt-0.5">
              {stage2.minDaily} – {stage2.maxDaily}
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              Rata-rata {formatNumId(stage2.meanDaily, 1)} pasien/hari
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold text-[#18201c]">
              Log 9 Tahapan Pembersihan &amp; Preprocessing Data (Hasil Eksekusi 02_preprocessing.py)
            </span>
            <span className="text-[11px] font-bold text-[#0f5c43]">
              {formatNumId(stage2.outlierDaysFlagged)} hari lonjakan IQR ditandai tanpa dihapus
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                <th className="py-2 px-3 text-center">Tahap</th>
                <th className="py-2 px-3">Proses Pembersihan Data</th>
                <th className="py-2 px-3">Kolom / Bagian Terdampak</th>
                <th className="py-2 px-3 text-right">Baris Sesudah</th>
                <th className="py-2 px-3">Hasil Nyata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {preprocessingSteps.map((st) => (
                <tr key={st.stepKey} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43] tabular-nums">
                    {st.stepNo}
                  </td>
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">{st.title}</td>
                  <td className="py-2 px-3 text-[#3c4641]">{st.affectedColumns}</td>
                  <td className="py-2 px-3 text-right font-bold text-[#0f5c43] tabular-nums whitespace-nowrap">
                    {formatNumId(st.rowsAfter)}
                  </td>
                  <td className="py-2 px-3 font-semibold text-[#0f5c43]">{st.resultNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex items-center gap-2 text-xs font-extrabold text-[#18201c]">
            <ShieldCheck className="w-4 h-4 text-[#0f5c43]" />
            <span>Tabel Audit Pembersihan &amp; Penyamaran Identitas (Sebelum vs Sesudah)</span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                <th className="py-2.5 px-3">Jenis Data</th>
                <th className="py-2.5 px-3">Kondisi Awal (Mentah Tab 1)</th>
                <th className="py-2.5 px-3">Setelah Diproses di Tab 2</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {privacyComparisons.map((item) => (
                <tr key={item.field} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2.5 px-3 font-extrabold text-[#18201c]">{item.field}</td>
                  <td className="py-2.5 px-3 text-[#6b7770]">{item.beforeExample}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#0f5c43]">{item.afterExample}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StepSectionCard>
      )}

      {/* Langkah 2.2: Contoh Data Setelah Preprocessing & Rekap Harian Bersih */}
      {viewStep === 2 && (
        <StepSectionCard
          stepCode="Langkah 2.2"
          title="Hasil Data Setelah Dibersihkan & Rekap Harian (1.277 Hari)"
          subtitle="Membandingkan contoh baris bersih serta hasil akhir angka pasien per hari."
          done={viewStep >= 2}
        >
          <PanduanPengujiBox
            whatHappens="Membuktikan perubahan nyata dari data mentah Tab 1 menjadi data bersih siap hitung tanpa identitas pasien."
            stepsToCheck={[
              'Cek tabel 8 baris pertama: kolom Pasien sudah hilang, No. RM menjadi kode acak (hash), IGD menjadi UNIT IGD, dan "-" menjadi TIDAK TERCATAT.',
              'Cek tabel Rekap Harian Bersih di bawahnya: hanya berisi tanggal dan jumlah pasien per hari.',
              'Klik "Lihat Porsi Unit & Waktu Uji →" di kanan atas.',
            ]}
          />

          {sampleAnonymizedRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#18201c]">
                  Tabel Contoh Data Setelah Dibersihkan &amp; Disamarkan (8 Baris Tahap Antara)
                </span>
                <span className="text-[11px] font-bold text-[#0f5c43]">
                  Kolom Pasien dihapus • No. RM menjadi hash acak • IGD diseragamkan ke UNIT IGD • &quot;-&quot; menjadi TIDAK TERCATAT
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Jam</th>
                    <th className="py-2 px-3">Kode RM (Hash SHA-256)</th>
                    <th className="py-2 px-3">Poliklinik (Disatukan)</th>
                    <th className="py-2 px-3">Kode Dokter Anonim</th>
                    <th className="py-2 px-3">Penjamin (Dirapikan)</th>
                    <th className="py-2 px-3">Jenis</th>
                    <th className="py-2 px-3">Sumber Berkas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {sampleAnonymizedRows.map((row, idx) => (
                    <tr key={`${row.tanggal}-${row.poliklinik}-${idx}`} className="hover:bg-[#edf8f2]/40">
                      <td className="py-2 px-3 font-semibold tabular-nums whitespace-nowrap">{row.tanggal}</td>
                      <td className="py-2 px-3 tabular-nums whitespace-nowrap">{row.jam}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[#6b7770] whitespace-nowrap">
                        {row.rmHashPreview || '-'}
                      </td>
                      <td className="py-2 px-3 font-bold text-[#0f5c43] whitespace-nowrap">{row.poliklinik}</td>
                      <td className="py-2 px-3 font-semibold text-[#3c4641] whitespace-nowrap">{row.kodeDokter}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.penjamin}</td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.jenisKunjungan}</td>
                      <td className="py-2 px-3 text-[#6b7770] whitespace-nowrap">{row.sumberBerkas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dailySampleRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#edf8f2] px-3.5 py-2.5 border-b border-[#ace2c5] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#0f5c43]">
                  Tabel Data Olahan Akhir: Rekap Kunjungan Harian Bersih (10 Hari Terakhir dari {formatNumId(stage2.totalDays)} Hari)
                </span>
                <span className="text-[11px] font-bold text-[#186b46]">
                  Seluruh baris perorangan diringkas menjadi hitungan jumlah pasien harian tanpa identitas
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">Hari</th>
                    <th className="py-2 px-3">Status Hari</th>
                    <th className="py-2 px-3 text-right">Total Pasien Bersih</th>
                    <th className="py-2 px-3 text-right">Pasien Baru</th>
                    <th className="py-2 px-3 text-right">Pasien Lama</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {dailySampleRows.map((d) => (
                    <tr key={d.date} className="hover:bg-[#edf8f2]/40">
                      <td className="py-2 px-3 font-bold text-[#18201c] tabular-nums">{d.date}</td>
                      <td className="py-2 px-3 font-semibold text-[#3c4641]">{d.dayName}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            d.isWeekend ? 'bg-[#fff6f1] text-[#d95d28]' : 'bg-[#edf8f2] text-[#0f5c43]'
                          }`}
                        >
                          {d.isWeekend ? 'Akhir Pekan' : 'Hari Kerja'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                        {formatNumId(d.visitCount)} pasien
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-[#3c4641] tabular-nums">
                        {formatNumId(d.newPatients)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-[#3c4641] tabular-nums">
                        {formatNumId(d.returningPatients)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ApaArtinyaBox text="Tidak ada nama pasien, nomor rekam medis asli, atau nama dokter yang ikut terbawa ke model maupun tampilan website. Data siap pakai murni rekap jumlah harian." />
        </StepSectionCard>
      )}

      {/* Langkah 2.3: Porsi 7 Unit Bersih & Split Kronologis */}
      {viewStep === 3 && (
        <StepSectionCard
          stepCode="Langkah 2.3"
          title="Porsi 7 Unit Layanan Bersih & Pembagian Waktu Uji"
          subtitle="Melihat 7 unit hasil penggabungan IGD serta pembagian periode Latih–Validasi–Uji."
          done={viewStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Memeriksa beban kunjungan tiap unit layanan dan urutan waktu agar model tidak pernah mencontek data masa depan."
            stepsToCheck={[
              'Uji dropdown "Tampilkan Semua 7 Unit": pilih satu unit lalu kembalikan ke semua unit untuk memastikan saringan bekerja.',
              'Pastikan 4 unit utama menampung 98,44% beban RS, lalu cek tabel pembagian waktu hingga Uji Jan–Jun 2026 (181 hari).',
              'Klik "Lanjut ke Tab 3 →" di kanan atas.',
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#edf8f2] text-[#0f5c43] font-bold border border-[#ace2c5]">
                4 Unit Utama: {stage2.primaryUnitsSharePct}% beban RS
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f6f8f7] text-[#515c56] font-bold border border-[#dce7e0]">
                3 Unit Jarang: {stage2.rareUnitsSharePct}%
              </span>
            </div>
            <select
              aria-label="Filter Unit Layanan Tab 2"
              value={selectedPoliFilter}
              onChange={(e) => setSelectedPoliFilter(e.target.value)}
              className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-3 py-1.5 text-[#18201c]"
            >
              <option value="SEMUA">Tampilkan Semua 7 Unit</option>
              {poliklinikLoads.map((u) => (
                <option key={u.poliklinik} value={u.poliklinik}>
                  {u.poliklinik}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                  <th className="py-2.5 px-3">Unit / Poliklinik (Bersih)</th>
                  <th className="py-2.5 px-3 text-right">Total Pasien</th>
                  <th className="py-2.5 px-3 text-right">Rata-Rata / Hari</th>
                  <th className="py-2.5 px-3 text-right">Puncak / Hari</th>
                  <th className="py-2.5 px-3 text-right">Hari Kosong (%)</th>
                  <th className="py-2.5 px-3 text-right">Porsi Beban RS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {filteredLoads.map((u) => (
                  <tr key={u.poliklinik} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2.5 px-3 font-extrabold text-[#18201c]">{u.poliklinik}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                      {formatNumId(u.total_visits)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">{formatNumId(u.daily_mean, 2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold tabular-nums">{u.daily_max}</td>
                    <td className="py-2.5 px-3 text-right text-[#6b7770] tabular-nums">
                      {formatNumId(u.zero_days_pct ?? 0, 1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-[#186b46] tabular-nums">
                      {u.share_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Pembagian Urutan Waktu Kronologis (Anti-Contek Masa Depan)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Kelompok Periode</th>
                  <th className="py-2 px-3">Rentang Tanggal</th>
                  <th className="py-2 px-3 text-right">Jumlah Hari</th>
                  <th className="py-2 px-3">Fungsi Pengujian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {chronologicalSplit.map((blk) => (
                  <tr key={blk.phase} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2 px-3 font-extrabold text-[#18201c]">{blk.phase}</td>
                    <td className="py-2 px-3 font-bold text-[#0f5c43] tabular-nums">{blk.period}</td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums">{blk.days} hari</td>
                    <td className="py-2 px-3 text-[#3c4641]">{blk.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StepSectionCard>
      )}
    </div>
  );
};
