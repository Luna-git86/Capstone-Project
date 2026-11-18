// Frontend/src/pages/Penguji/Tab1DataPrivasi.tsx
import React, { useState } from 'react';
import { FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';
import api from '../../services/api';
import { ApaArtinyaBox, PanduanPengujiBox, StepSectionCard } from './UatSharedBlocks';
import { formatNumId, type ExcelInspectionResult, type Tab1Data } from './uatSmTypes';

interface Tab1Props {
  data: Tab1Data | null;
  unlockedStep: number;
  liveNotes: Record<string, string>;
}

export const Tab1DataPrivasi: React.FC<Tab1Props> = ({ data, unlockedStep, liveNotes }) => {
  const [selectedPoliFilter, setSelectedPoliFilter] = useState<string>('SEMUA');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<ExcelInspectionResult | null>(null);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState('');

  if (!data || unlockedStep < 1) {
    return (
      <div className="tvlk-card rounded-2xl p-6 text-center space-y-2">
        <p className="text-sm font-extrabold text-[#18201c]">Tahap 1 Belum Dimulai</p>
        <p className="text-xs text-[#6b7770]">
          Klik tombol hijau <strong className="text-[#0f5c43]">Mulai Hitung (0/3)</strong> di atas untuk memulai pemeriksaan data kunjungan SIMRS RSIA.
        </p>
      </div>
    );
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError('');
    setExcelResult(null);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploadingExcel(true);
        const res = await api.post('/uat-sm/check-excel', {
          fileName: file.name,
          contentBase64: String(reader.result || ''),
        });
        setExcelResult(res.data?.inspection || null);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Gagal memeriksa format file Excel.';
        setExcelError(msg);
      } finally {
        setUploadingExcel(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredLoads =
    selectedPoliFilter === 'SEMUA'
      ? data.poliklinikLoads
      : data.poliklinikLoads.filter((u) => u.poliklinik === selectedPoliFilter);

  return (
    <div className="space-y-4">
      {/* Langkah 1.1 */}
      <StepSectionCard
        stepCode="Langkah 1.1"
        title="Baca & Cek Kelengkapan Data SIMRS (2023–2026)"
        subtitle="Program membaca keempat berkas registrasi rawat jalan RSIA dan mengecek kelengkapan tanggal serta duplikat."
        done={unlockedStep >= 1}
        ranLiveInfo={liveNotes.stage1_understanding}
      >
        <PanduanPengujiBox
          whatHappens="Saat tombol Mulai Hitung (0/3) diklik, sistem memuat ke-4 file Excel mentah SIMRS RSIA (Januari 2023 s.d. Juni 2026) untuk mengecek kecocokan kolom, rentang tanggal, data ganda, dan menyensor identitas pasien/dokter sebelum ditampilkan."
          stepsToCheck={[
            'Pastikan 4 kartu angka menunjukkan 39.042 pasien, 1.277 hari utuh, 0 ganda, dan kisaran 8–80 pasien/hari.',
            'Periksa 4 berkas Excel pada tabel pertama; pastikan seluruhnya berstatus "Kolom Sesuai & Lengkap".',
            'Lihat Tabel Contoh Data Mentah Asli SIMRS (8 Baris): pastikan kolom sensitif sudah disensor, sedangkan ketidakkonsistenan asli ("IGD" vs "Unit IGD" dan penjamin "-") masih terlihat sebelum tahap pembersihan.',
            '(Opsional) Klik tombol "Pilih File Excel / CSV" bila ingin menguji format file sendiri tanpa mengubah data resmi RSIA.',
          ]}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#edf8f2] border border-[#ace2c5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#186b46]">Total Kunjungan</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#0f5c43] tabular-nums mt-0.5">
              {formatNumId(data.kpi.totalVisits)} pasien
            </p>
            <p className="text-[11px] text-[#3c4641] mt-0.5">Periode Jan 2023 – Jun 2026</p>
          </div>
          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">Rentang Hari Utuh</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#18201c] tabular-nums mt-0.5">
              {formatNumId(data.kpi.totalDays)} hari
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              {formatNumId(data.kpi.missingDays)} hari terlewat / bolong
            </p>
          </div>
          <div className="rounded-2xl bg-[#f6f8f7] border border-[#dce7e0] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#6b7770]">Data Ganda / Kosong</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#1e8455] tabular-nums mt-0.5">
              {formatNumId(data.kpi.duplicates)} ganda
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">Seluruh baris valid & bersih</p>
          </div>
          <div className="rounded-2xl bg-[#fff6f1] border border-[#ffd0b5] p-3.5">
            <p className="text-[11px] font-bold uppercase text-[#d95d28]">Kisaran Pasien / Hari</p>
            <p className="text-xl sm:text-2xl font-extrabold text-[#18201c] tabular-nums mt-0.5">
              {data.kpi.minDaily} – {data.kpi.maxDaily}
            </p>
            <p className="text-[11px] text-[#6b7770] mt-0.5">
              Rata-rata {formatNumId(data.kpi.meanDaily, 1)} pasien/hari
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                <th className="py-2.5 px-3">Nama Berkas Excel SIMRS</th>
                <th className="py-2.5 px-3">Jumlah Kunjungan</th>
                <th className="py-2.5 px-3">Tanggal Awal – Akhir</th>
                <th className="py-2.5 px-3">Keterangan Kualitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ef]">
              {data.files.map((f) => (
                <tr key={f.fileName} className="hover:bg-[#edf8f2]/40">
                  <td className="py-2.5 px-3 font-bold text-[#18201c]">{f.fileName}</td>
                  <td className="py-2.5 px-3 font-extrabold text-[#0f5c43] tabular-nums">
                    {formatNumId(f.rows)} baris
                  </td>
                  <td className="py-2.5 px-3 text-[#3c4641] tabular-nums">
                    {f.dateMin} s.d. {f.dateMax}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#edf8f2] text-[#0f5c43]">
                      {f.columnsVerified && f.natDates === 0 ? 'Kolom Sesuai & Lengkap' : 'Perlu Cek'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contoh Data Mentah SIMRS (Sebelum Diolah — Kolom Identitas Disensor) */}
        {data.sampleRawRows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#fff6f1] px-3.5 py-2.5 border-b border-[#ffd0b5] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-[#18201c]">
                Tabel Contoh Data Mentah Asli SIMRS (8 Baris Sampel Excel 2023–2026 Sebelum Diolah)
              </span>
              <span className="text-[11px] font-bold text-[#d95d28]">
                Identitas pribadi disensor otomatis oleh server • Perhatikan &quot;IGD&quot; / &quot;Unit IGD&quot; &amp; penjamin &quot;-&quot;
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Sumber Berkas</th>
                  <th className="py-2 px-3">No. Rawat</th>
                  <th className="py-2 px-3">Tgl Reg</th>
                  <th className="py-2 px-3">Jam</th>
                  <th className="py-2 px-3">No. RM (Mentah)</th>
                  <th className="py-2 px-3">Pasien (Mentah)</th>
                  <th className="py-2 px-3">Dokter (Mentah)</th>
                  <th className="py-2 px-3">Poliklinik Asli</th>
                  <th className="py-2 px-3">Penjamin Asli</th>
                  <th className="py-2 px-3">Jenis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {data.sampleRawRows.map((row, idx) => (
                  <tr key={`${row.sumberBerkas}-${row.tglReg}-${row.jam}-${idx}`} className="hover:bg-[#fff6f1]/40">
                    <td className="py-2 px-3 text-[#6b7770] whitespace-nowrap">{row.sumberBerkas}</td>
                    <td className="py-2 px-3 tabular-nums text-[#3c4641] whitespace-nowrap">{row.noRawatMask}</td>
                    <td className="py-2 px-3 font-semibold tabular-nums whitespace-nowrap">{row.tglReg}</td>
                    <td className="py-2 px-3 tabular-nums whitespace-nowrap">{row.jam}</td>
                    <td className="py-2 px-3 text-[#98a39d] italic whitespace-nowrap">{row.noRmMask}</td>
                    <td className="py-2 px-3 text-[#98a39d] italic whitespace-nowrap">{row.pasienMask}</td>
                    <td className="py-2 px-3 text-[#98a39d] italic whitespace-nowrap">{row.dokterMask}</td>
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
                    <td className="py-2 px-3">{row.jenisKunjungan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Opsional: Simulasi Unggah File Excel Sendiri (Aman tanpa menimpa data resmi RSIA) */}
        <div className="rounded-2xl border border-dashed border-[#93d1ae] bg-[#f6f8f7] p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#0f5c43]" />
              <div>
                <p className="text-xs font-extrabold text-[#18201c]">
                  Uji Coba Cek Berkas Excel Sendiri (Opsional)
                </p>
                <p className="text-[11px] text-[#6b7770]">
                  Unggah file .xlsx / .csv uji jika ingin mengecek kecocokan kolom. Data resmi RSIA tidak akan tertimpa dan identitas pasien tidak disimpan.
                </p>
              </div>
            </div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl tvlk-btn-soft text-xs font-bold transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingExcel ? 'Memeriksa...' : 'Pilih File Excel / CSV'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
                disabled={uploadingExcel}
              />
            </label>
          </div>
          {excelError && <p className="text-xs font-semibold text-rose-700">{excelError}</p>}
          {excelResult && (
            <div className="rounded-xl bg-white border border-[#dce7e0] p-3 text-xs space-y-2">
              <p className="font-bold text-[#0f5c43]">
                Hasil Pemeriksaan Berkas ({excelFileName}): {formatNumId(excelResult.totalRows)} baris terbaca
              </p>
              <p className="text-[#3c4641]">
                Status Kolom Wajib:{' '}
                <strong>{excelResult.isFormatCompatible ? 'Semua Cocok' : 'Sebagian Kurang'}</strong>{' '}
                ({excelResult.matchedColumns.join(', ')})
                {excelResult.dateMin && excelResult.dateMax
                  ? ` • Rentang Tanggal: ${excelResult.dateMin} s.d. ${excelResult.dateMax}`
                  : ''}
              </p>
              {excelResult.sampleRows && excelResult.sampleRows.length > 0 && (
                <div className="overflow-x-auto pt-1">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#f6f8f7] border-b border-[#dce7e0] text-[#515c56] font-bold">
                        <th className="py-1.5 px-2">Tanggal</th>
                        <th className="py-1.5 px-2">Jam</th>
                        <th className="py-1.5 px-2">Poliklinik</th>
                        <th className="py-1.5 px-2">Penjamin</th>
                        <th className="py-1.5 px-2">Jenis Kunjungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef1ef]">
                      {excelResult.sampleRows.map((sr, i) => (
                        <tr key={`${sr.tanggal}-${sr.jam}-${i}`}>
                          <td className="py-1.5 px-2 tabular-nums font-semibold">{sr.tanggal}</td>
                          <td className="py-1.5 px-2 tabular-nums">{sr.jam}</td>
                          <td className="py-1.5 px-2 font-bold text-[#0f5c43]">{sr.poliklinik}</td>
                          <td className="py-1.5 px-2">{sr.penjamin}</td>
                          <td className="py-1.5 px-2">{sr.jenisKunjungan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-[#6b7770]">{excelResult.privacyNote}</p>
            </div>
          )}
        </div>

        {/* Tabel Ringkasan Penjamin & Jenis Kunjungan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-7 overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Ringkasan Penjamin Pasien (2023–Jun 2026)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Penjamin Pembayaran</th>
                  <th className="py-2 px-3 text-right">Jumlah Kunjungan</th>
                  <th className="py-2 px-3 text-right">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {data.penjaminDistribution.map((pj) => (
                  <tr key={pj.penjamin} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2 px-3 font-bold text-[#18201c]">{pj.penjamin}</td>
                    <td className="py-2 px-3 text-right font-extrabold text-[#0f5c43] tabular-nums">
                      {formatNumId(pj.count)}
                    </td>
                    <td className="py-2 px-3 text-right text-[#3c4641] tabular-nums">{pj.sharePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-5 overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3 py-2 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Jenis Kunjungan (Baru vs Lama)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3">Jenis Kunjungan</th>
                  <th className="py-2 px-3 text-right">Jumlah</th>
                  <th className="py-2 px-3 text-right">Porsi (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {data.visitTypeDistribution.map((vt) => (
                  <tr key={vt.jenis} className="hover:bg-[#edf8f2]/40">
                    <td className="py-2 px-3 font-bold text-[#18201c]">Pasien {vt.jenis}</td>
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

        <ApaArtinyaBox text="Seluruh data SIMRS selama 3,5 tahun sudah lengkap dan bersih tanpa ada tanggal yang hilang atau pencatatan ganda, sehingga aman dijadikan bahan perhitungan prediksi." />
      </StepSectionCard>

      {/* Langkah 1.2 */}
      {unlockedStep >= 2 && (
        <StepSectionCard
          stepCode="Langkah 1.2"
          title="Pembersihan & Penyamaran Identitas Pasien / Dokter"
          subtitle="Sebelum diolah menjadi angka statistik, kolom yang tidak dipakai dibuang, identitas pribadi disembunyikan, dan penamaan unit diseragamkan."
          done={unlockedStep >= 2}
          ranLiveInfo={liveNotes.stage2_preprocessing}
        >
          <PanduanPengujiBox
            whatHappens="Sistem mengolah dataset mentah dari Langkah 1.1 secara bertahap: (1) membuang kolom yang tidak dibutuhkan model, (2) menyembunyikan No. RM menjadi kode acak dan mengganti nama dokter dengan kode anonim, (3) menyeragamkan nama IGD serta penjamin '-', lalu (4) meringkas seluruh kunjungan menjadi hitungan total pasien harian."
            stepsToCheck={[
              'Periksa Tabel Urutan Proses Pembuangan Kolom & Penyembunyian Data di bawah untuk melihat kolom mana yang dihapus atau disamarkan.',
              'Bandingkan dengan Tabel Contoh Data Setelah Dibersihkan & Disamarkan (8 Baris): kolom Pasien sudah hilang, "IGD" menyatu menjadi UNIT IGD, dan "-" berubah menjadi TIDAK TERCATAT.',
              'Gulir ke Tabel Data Olahan Akhir: Rekap Kunjungan Harian Bersih (10 Hari) untuk memastikan data akhir murni angka kunjungan per tanggal tanpa identitas individu.',
            ]}
          />

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] text-xs font-extrabold text-[#18201c]">
              Tabel Urutan Proses Pembuangan Kolom &amp; Penyembunyian Data (Mentah → Siap Olah)
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2 px-3 text-center">Urutan</th>
                  <th className="py-2 px-3">Langkah Pengolahan Data</th>
                  <th className="py-2 px-3">Kolom yang Terdampak</th>
                  <th className="py-2 px-3">Hasil Akhirnya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43]">1</td>
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">Buang Kolom Tidak Terpakai</td>
                  <td className="py-2 px-3 text-[#3c4641]">Pasien, No. Rawat (setelah cek ganda)</td>
                  <td className="py-2 px-3 font-semibold text-[#0f5c43]">Kolom dihapus permanen karena tidak memengaruhi perkiraan jumlah harian</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43]">2</td>
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">Sembunyikan Nomor Rekam Medis</td>
                  <td className="py-2 px-3 text-[#3c4641]">No. RM</td>
                  <td className="py-2 px-3 font-semibold text-[#0f5c43]">Diubah menjadi kode acak satu arah untuk menghitung pasien baru vs lama</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43]">3</td>
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">Sembunyikan &amp; Lepas Nama Dokter</td>
                  <td className="py-2 px-3 text-[#3c4641]">Dokter</td>
                  <td className="py-2 px-3 font-semibold text-[#0f5c43]">Diganti kode anonim DOKTER_01 dst., lalu dilepas saat menjadi rekap harian</td>
                </tr>
                <tr className="hover:bg-[#edf8f2]/40">
                  <td className="py-2 px-3 text-center font-extrabold text-[#0f5c43]">4</td>
                  <td className="py-2 px-3 font-extrabold text-[#18201c]">Seragamkan Label &amp; Rekap Harian</td>
                  <td className="py-2 px-3 text-[#3c4641]">Poliklinik (&quot;IGD&quot;), Penjamin (&quot;-&quot;)</td>
                  <td className="py-2 px-3 font-semibold text-[#0f5c43]">Disatukan ke UNIT IGD &amp; TIDAK TERCATAT, lalu dihitung per tanggal (1.277 hari)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
            <div className="bg-[#f6f8f7] px-3.5 py-2.5 border-b border-[#dce7e0] flex items-center gap-2 text-xs font-extrabold text-[#18201c]">
              <ShieldCheck className="w-4 h-4 text-[#0f5c43]" />
              <span>Tabel Audit Pembersihan & Penyamaran Identitas (Sebelum vs Sesudah)</span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white border-b border-[#eef1ef] text-[#515c56] font-bold">
                  <th className="py-2.5 px-3">Jenis Data</th>
                  <th className="py-2.5 px-3">Kondisi Awal (Mentah)</th>
                  <th className="py-2.5 px-3">Setelah Diproses Sistem</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ef]">
                {data.privacyComparisons.map((item) => (
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

          {data.sampleAnonymizedRows.length > 0 && (
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
                    <th className="py-2 px-3">Kode RM (Hash Aman)</th>
                    <th className="py-2 px-3">Poliklinik (Disatukan)</th>
                    <th className="py-2 px-3">Kode Dokter Anonim</th>
                    <th className="py-2 px-3">Penjamin (Dirapikan)</th>
                    <th className="py-2 px-3">Jenis</th>
                    <th className="py-2 px-3">Sumber Berkas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ef]">
                  {data.sampleAnonymizedRows.map((row, idx) => (
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

          {data.dailySampleRows.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-[#dce7e0]">
              <div className="bg-[#edf8f2] px-3.5 py-2.5 border-b border-[#ace2c5] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-extrabold text-[#0f5c43]">
                  Tabel Data Olahan Akhir: Rekap Kunjungan Harian Bersih (10 Hari Terakhir dari {formatNumId(data.kpi.totalDays)} Hari)
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
                  {data.dailySampleRows.map((d) => (
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

          <ApaArtinyaBox text="Tidak ada nama pasien, nomor rekam medis asli, atau nama dokter yang ikut terbawa ke model maupun tampilan website. Data yang diproses murni rekap jumlah harian." />
        </StepSectionCard>
      )}

      {/* Langkah 1.3 */}
      {unlockedStep >= 3 && (
        <StepSectionCard
          stepCode="Langkah 1.3"
          title="Porsi 7 Unit Layanan & Pembagian Waktu Uji Berurutan"
          subtitle="Memisahkan 4 unit ramai utama vs 3 unit jarang, serta membagi data secara kronologis agar model tidak mencontek masa depan."
          done={unlockedStep >= 3}
        >
          <PanduanPengujiBox
            whatHappens="Sistem mengelompokkan 7 unit layanan RSIA menurut kepadatan kunjungan dan membagi 1.277 hari menjadi urutan waktu Latih → Validasi → Uji 2026 → Proyeksi H2 2026."
            stepsToCheck={[
              'Coba pilih salah satu unit pada dropdown "Tampilkan Semua 7 Unit" lalu kembalikan ke semua unit untuk memastikan saringan tabel bekerja.',
              'Pastikan 4 unit utama (UNIT IGD, POLIKLINIK OBGYN, POLIKLINIK UMUM, POLIKLINIK ANAK) menampung 98,44% beban kunjungan RS.',
              'Periksa Tabel Pembagian Urutan Waktu Kronologis (878 hari Latih, 184 hari Validasi, 181 hari Uji 2026, dan 184 hari Proyeksi H2 2026).',
            ]}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#edf8f2] text-[#0f5c43] font-bold border border-[#ace2c5]">
                4 Unit Utama: {data.kpi.primaryUnitsSharePct}% beban RS
              </span>
              <span className="px-3 py-1 rounded-full bg-[#f6f8f7] text-[#515c56] font-bold border border-[#dce7e0]">
                3 Unit Jarang: {data.kpi.rareUnitsSharePct}%
              </span>
            </div>
            <select
              aria-label="Filter Unit Layanan Tab 1"
              value={selectedPoliFilter}
              onChange={(e) => setSelectedPoliFilter(e.target.value)}
              className="text-xs font-bold bg-[#f6f8f7] border border-[#dce7e0] rounded-xl px-3 py-1.5 text-[#18201c]"
            >
              <option value="SEMUA">Tampilkan Semua 7 Unit</option>
              {data.poliklinikLoads.map((u) => (
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
                  <th className="py-2.5 px-3">Unit / Poliklinik</th>
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
                {data.chronologicalSplit.map((blk) => (
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
