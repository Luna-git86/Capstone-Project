// Frontend/src/pages/Penguji/Tab1MuatDataMentah.tsx
import React from 'react';
import { CheckCircle2, Database } from 'lucide-react';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard } from './UatSharedBlocks';
import { formatNumId, type Tab1Data } from './uatSmTypes';

interface Tab1Props {
  data: Tab1Data | null;
  viewStep: number;
  liveNotes: Record<string, string>;
}

export const Tab1MuatDataMentah: React.FC<Tab1Props> = ({ data, viewStep, liveNotes }) => {
  if (!data || viewStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tab 1 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Muat Data Mentah (1/2)</strong> di kanan atas untuk memuat 4 file Excel mentah RSIA apa adanya.
        </p>
      </div>
    );
  }

  const loadSum = data.loadSummary ?? {
    status: 'BELUM',
    filesExpected: 4,
    filesLoaded: 0,
    totalRowsLoaded: 0,
    totalColumns: 9,
    allColumnsMatched: false,
    dateStart: '-',
    dateEnd: '-',
    totalDays: 0,
    totalMonths: 0,
    preprocessingApplied: false,
    hashingApplied: false,
    saltingApplied: false,
    labelNormalizationApplied: false,
  };
  const files = Array.isArray(data.files) ? data.files : [];
  const rawColumns = Array.isArray(data.rawColumns) ? data.rawColumns : [];
  const sampleRawRows = Array.isArray(data.sampleRawRows) ? data.sampleRawRows : [];
  const rawPoliDist = Array.isArray(data.rawPoliklinikDistribution) ? data.rawPoliklinikDistribution : [];
  const penjaminDist = Array.isArray(data.penjaminDistribution) ? data.penjaminDistribution : [];
  const visitTypeDist = Array.isArray(data.visitTypeDistribution) ? data.visitTypeDistribution : [];
  const totalNullCells = rawColumns.reduce((acc, col) => acc + (col.nullCount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Langkah 1.1: Murni Cek Keberhasilan Load & Jumlah Data */}
      {viewStep === 1 && (
        <StepSectionCard
          stepCode="Langkah 1.1"
          title="Hasil Muat 4 File Excel Mentah SIMRS (2023–Jun 2026)"
          subtitle="Mengecek keberhasilan load dan jumlah data mentah sebelum dibersihkan."
          done={viewStep >= 1}
          ranLiveInfo={liveNotes.stage1_understanding}
        >
        <PanduanPengujiBox
          whatHappens="Memastikan keempat file Excel mentah terbaca utuh tanpa preprocessing apa pun."
          stepsToCheck={[
            'Cek 4 kartu di bawah: Status Load = BERHASIL (4/4 file), Data = 39.042 baris, Struktur = 9 kolom, dan Preprocessing = Belum Dilakukan.',
            'Cek tabel 4 file Excel di bawahnya: pastikan semua berstatus "Berhasil Dimuat" dan 0 tanggal kosong.',
            'Klik "Lihat Struktur & Sampel Mentah →" di kanan atas untuk melihat isi datanya.',
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#edf8f2] border border-[#ace2c5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#186b46]">Status Load Dataset</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0f5c43] tabular-nums mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{loadSum.status}</span>
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">
              {loadSum.filesLoaded} dari {loadSum.filesExpected} berkas Excel terbaca
            </p>
          </div>

          <div className="rounded-2xl bg-[#edf8f2] border border-[#ace2c5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#186b46]">Data Berhasil Di-load</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0f5c43] tabular-nums mt-0.5">
              {formatNumId(loadSum.totalRowsLoaded)} baris
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">
              {loadSum.dateStart} s.d. {loadSum.dateEnd} ({loadSum.totalMonths} bln)
            </p>
          </div>

          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">Struktur Kolom Mentah</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#18201c] tabular-nums mt-0.5">
              {loadSum.totalColumns} kolom asli
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              {loadSum.allColumnsMatched ? 'Header seragam' : 'Perlu cek header'} • {formatNumId(totalNullCells)} sel kosong
            </p>
          </div>

          <div className="rounded-2xl bg-[#fff6f1] border border-[#ffd0b5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#d95d28]">Status Preprocessing</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#d95d28] mt-0.5">
              {loadSum.preprocessingApplied ? 'Sudah Diolah' : 'Belum Dilakukan'}
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">
              Belum hash/salt, belum ubah &quot;-&quot;
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
          <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-extrabold text-[#18201c] flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#0f5c43]" />
              <span>Tabel Status Muat 4 Berkas Excel Mentah SIMRS (Hasil Load Data)</span>
            </span>
            <span className="text-[11px] font-bold text-[#0f5c43]">
              Total berhasil dimuat: {formatNumId(loadSum.totalRowsLoaded)} baris mentah
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#dce7e0] text-[#515c56] font-bold">
                <th className="py-2.5 px-3">Nama Berkas Excel SIMRS</th>
                <th className="py-2.5 px-3">Status Load</th>
                <th className="py-2.5 px-3 text-right">Data Berhasil Di-load</th>
                <th className="py-2.5 px-3 text-center">Kolom Asli</th>
                <th className="py-2.5 px-3 text-right">Ukuran File</th>
                <th className="py-2.5 px-3">Rentang Tanggal Asli</th>
                <th className="py-2.5 px-3 text-right">Tanggal Kosong (NaT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {files.map((f) => (
                <tr key={f.fileName} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2.5 px-3 font-bold text-[#18201c] whitespace-nowrap">{f.fileName}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#edf8f2] text-[#0f5c43] border border-[#ace2c5]">
                      {f.columnsVerified ? f.status : 'Perlu Cek Header'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums whitespace-nowrap">
                    {formatNumId(f.rows)} baris
                  </td>
                  <td className="py-2.5 px-3 text-center tabular-nums text-[#3c4641] whitespace-nowrap">
                    {f.columnsCount} kolom
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#6b7770] whitespace-nowrap">
                    {f.fileSizeKb != null ? `${formatNumId(f.fileSizeKb, 1)} KB` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-[#3c4641] tabular-nums whitespace-nowrap">
                    {f.dateMin} s.d. {f.dateMax}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#3c4641] whitespace-nowrap">
                    {formatNumId(f.natDates)} baris
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#edf8f2]/70 border-t border-[#ace2c5] font-extrabold text-[#0f5c43]">
                <td className="py-2 px-3">Total Gabungan ({files.length} Berkas)</td>
                <td className="py-2 px-3">100% Berhasil</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatNumId(loadSum.totalRowsLoaded)} baris</td>
                <td className="py-2 px-3 text-center tabular-nums">{loadSum.totalColumns} kolom</td>
                <td className="py-2 px-3" />
                <td className="py-2 px-3 tabular-nums">
                  {loadSum.dateStart} s.d. {loadSum.dateEnd}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">0 NaT</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </StepSectionCard>
      )}

      {/* Langkah 1.2: Inspeksi Struktur Kolom & Dataset Mentah Sebelum Preprocessing */}
      {viewStep === 2 && (
        <StepSectionCard
          stepCode="Langkah 1.2"
          title="Struktur 9 Kolom & Isi Data Mentah Asli (Belum Diubah)"
          subtitle="Melihat kolom dan nilai mentah asli dari Excel sebelum dibersihkan pada Tab 2."
          done={viewStep >= 2}
        >
          <PanduanPengujiBox
            whatHappens="Menampilkan isi mentah apa adanya (belum hapus nama, belum hash/salt No. RM, dan label belum diseragamkan)."
            stepsToCheck={[
              'Cek tabel 9 Kolom Asli dan Tabel Contoh 8 Baris Mentah: kolom No. RM, Pasien, Dokter, Poliklinik, dan Penjamin masih asli dari Excel.',
              'Perhatikan di bagian bawah: "IGD" (3.572) & "Unit IGD" (8.692) masih terpisah, dan penjamin "-" (346 baris) masih utuh.',
              'Klik "Lanjut ke Tab 2 →" di kanan atas untuk mulai membersihkan data.',
            ]}
          />

          {rawColumns.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#18201c]">
                  Struktur 9 Kolom Asli Dataset Mentah SIMRS (Belum Dihapus / Belum Diubah)
                </span>
                <span className="text-[11px] font-bold text-[#6b7770]">
                  Seluruh 9 kolom Excel masih utuh tersimpan di data mentah
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                    <th className="py-2 px-3 text-center">No</th>
                    <th className="py-2 px-3">Nama Kolom Asli Excel</th>
                    <th className="py-2 px-3">Tipe Data Terbaca</th>
                    <th className="py-2 px-3 text-right">Nilai Kosong (NaN)</th>
                    <th className="py-2 px-3">Kondisi Mentah Saat Ini</th>
                    <th className="py-2 px-3">Status Tahap 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {rawColumns.map((col, idx) => (
                    <tr key={col.name} className="hover:bg-[#edf8f2]/40">
                      <td className="py-2 px-3 text-center font-bold text-[#0f5c43] tabular-nums">{idx + 1}</td>
                      <td className="py-2 px-3 font-extrabold text-[#18201c] whitespace-nowrap">{col.name}</td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[#6b7770] whitespace-nowrap">{col.dtype}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-[#3c4641] whitespace-nowrap">
                        {formatNumId(col.nullCount)}
                      </td>
                      <td className="py-2 px-3 text-[#3c4641]">{col.roleInRaw}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fff6f1] text-[#d95d28] border border-[#ffd0b5]">
                          {col.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sampleRawRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#fff6f1] px-3.5 py-2.5 border-b border-[#ffd0b5] flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[#18201c]">
                  Tabel Contoh Dataset Mentah Asli SIMRS (8 Baris Sampel Excel 2023–2026 Apa Adanya)
                </span>
                <span className="text-[11px] font-bold text-[#d95d28]">
                  100% isi mentah asli Excel • Belum dihapus, belum di-hash/salt, &quot;IGD&quot; &amp; &quot;-&quot; belum diubah
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                    <th className="py-2 px-3">Sumber Berkas</th>
                    <th className="py-2 px-3">No. Rawat</th>
                    <th className="py-2 px-3">Tgl Reg</th>
                    <th className="py-2 px-3">Jam</th>
                    <th className="py-2 px-3">No. RM</th>
                    <th className="py-2 px-3">Pasien</th>
                    <th className="py-2 px-3">Poliklinik</th>
                    <th className="py-2 px-3">Dokter</th>
                    <th className="py-2 px-3">Penjamin</th>
                    <th className="py-2 px-3">Jns Kunjungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {sampleRawRows.map((row, idx) => (
                    <tr key={`${row.sumberBerkas}-${row.tglReg}-${row.jam}-${idx}`} className="hover:bg-[#fff6f1]/40">
                      <td className="py-2 px-3 text-[#6b7770] whitespace-nowrap">{row.sumberBerkas}</td>
                      <td className="py-2 px-3 tabular-nums text-[#3c4641] whitespace-nowrap">{row.noRawatRaw}</td>
                      <td className="py-2 px-3 font-semibold tabular-nums whitespace-nowrap">{row.tglReg}</td>
                      <td className="py-2 px-3 tabular-nums whitespace-nowrap">{row.jam}</td>
                      <td className="py-2 px-3 font-mono tabular-nums text-[#18201c] whitespace-nowrap">{row.noRmRaw}</td>
                      <td className="py-2 px-3 font-semibold text-[#18201c] whitespace-nowrap">{row.pasienRaw}</td>
                      <td className="py-2 px-3 font-bold whitespace-nowrap">
                        <span
                          className={
                            row.poliklinikRaw === 'IGD' || row.poliklinikRaw === 'Unit IGD'
                              ? 'px-2 py-0.5 rounded-full bg-[#fff6f1] text-[#d95d28] border border-[#ffd0b5] text-[11px]'
                              : 'text-[#18201c]'
                          }
                        >
                          {row.poliklinikRaw}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#3c4641] whitespace-nowrap">{row.dokterRaw}</td>
                      <td className="py-2 px-3 font-semibold whitespace-nowrap">
                        <span
                          className={
                            row.penjaminRaw === '-'
                              ? 'px-2 py-0.5 rounded-full bg-[#fff6f1] text-[#d95d28] border border-[#ffd0b5] text-[11px]'
                              : 'text-[#3c4641]'
                          }
                        >
                          {row.penjaminRaw}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.jenisKunjungan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-4">
            {rawPoliDist.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
                <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
                  Poliklinik Mentah ({rawPoliDist.length} Label — IGD &amp; Unit IGD Masih Terpisah)
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                      <th className="py-2 px-3">Label Poliklinik Asli</th>
                      <th className="py-2 px-3 text-right">Baris</th>
                      <th className="py-2 px-3 text-right">Porsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {rawPoliDist.map((pl) => {
                      const isSplitIgd = pl.poliklinik === 'IGD' || pl.poliklinik === 'Unit IGD';
                      return (
                        <tr key={pl.poliklinik} className="hover:bg-[#edf8f2]/40">
                          <td className="py-2 px-3 font-bold text-[#18201c]">
                            <span>{pl.poliklinik}</span>
                            {isSplitIgd && (
                              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff6f1] text-[#d95d28] border border-[#ffd0b5]">
                                Terpisah di data mentah
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                            {formatNumId(pl.count)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#3c4641] tabular-nums">{pl.sharePct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
                <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
                  Penjamin Mentah (Nilai &quot;-&quot; Masih Asli)
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                      <th className="py-2 px-3">Penjamin Asli</th>
                      <th className="py-2 px-3 text-right">Baris</th>
                      <th className="py-2 px-3 text-right">Porsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {penjaminDist.map((pj) => (
                      <tr key={pj.penjamin} className="hover:bg-[#edf8f2]/40">
                        <td className="py-2 px-3 font-bold text-[#18201c]">
                          <span>{pj.penjamin}</span>
                          {pj.penjamin === '-' && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff6f1] text-[#d95d28] border border-[#ffd0b5]">
                              Belum diubah
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                          {formatNumId(pj.count)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#3c4641] tabular-nums">{pj.sharePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
                <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
                  Jenis Kunjungan Mentah
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                      <th className="py-2 px-3">Nilai Asli</th>
                      <th className="py-2 px-3 text-right">Baris</th>
                      <th className="py-2 px-3 text-right">Porsi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eef1ef]">
                    {visitTypeDist.map((vt) => (
                      <tr key={vt.jenis} className="hover:bg-[#edf8f2]/40">
                        <td className="py-2 px-3 font-bold text-[#18201c]">{vt.jenis}</td>
                        <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                          {formatNumId(vt.count)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#3c4641] tabular-nums">{vt.sharePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <ApaArtinyaBox text="Data mentah sudah lengkap (39.042 baris) dan siap dibersihkan pada Tab 2." />
        </StepSectionCard>
      )}
    </div>
  );
};
