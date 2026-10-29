import { useEffect, useState } from 'react';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

type Ringkasan = {
  totalTiket: number;
  sesuaiSLA: number;
  terlambat: number;
  terlambatSelesai: number;
  belumSelesai: number;
  dalamSLA: number;
  tanpaDeadline: number;
  waktuSelesaiTidakTercatat: number;
  totalSelesaiTerukur: number;
  persentaseSLA: number;
  rataRataJam: number;
};

type TiketSLA = {
  id: number | string;
  judul: string;
  prioritas: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
  divisi: string;
  pembuat: string;
  pelaksana: string;
  statusSLA: string;
};

type LaporanSLAResponse = {
  ringkasan: Ringkasan;
  data: TiketSLA[];
};

const ringkasanAwal: Ringkasan = {
  totalTiket: 0,
  sesuaiSLA: 0,
  terlambat: 0,
  terlambatSelesai: 0,
  belumSelesai: 0,
  dalamSLA: 0,
  tanpaDeadline: 0,
  waktuSelesaiTidakTercatat: 0,
  totalSelesaiTerukur: 0,
  persentaseSLA: 0,
  rataRataJam: 0,
};

const statusLabel: Record<string, string> = {
  SESUAI_SLA: 'Sesuai SLA',
  TERLAMBAT: 'Terlambat',
  TERLAMBAT_SELESAI: 'Terlambat Selesai',
  BELUM_SELESAI: 'Belum Selesai',
  DALAM_SLA: 'Dalam SLA',
  TANPA_DEADLINE: 'Tanpa Deadline',
  WAKTU_SELESAI_TIDAK_TERCATAT: 'Waktu Selesai Tidak Tercatat',
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNumber = (value: number | null | undefined): string =>
  Number(value ?? 0).toLocaleString('id-ID');

const formatPercent = (value: number | null | undefined): string =>
  `${Number(value ?? 0).toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })}%`;

const getStatusLabel = (status: string): string =>
  statusLabel[status] ??
  status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) =>
    char.toUpperCase(),
  );

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SESUAI_SLA':
    case 'DALAM_SLA':
      return 'bg-green-100 text-green-700';

    case 'TERLAMBAT':
    case 'TERLAMBAT_SELESAI':
      return 'bg-red-100 text-red-700';

    case 'BELUM_SELESAI':
      return 'bg-yellow-100 text-yellow-700';

    case 'TANPA_DEADLINE':
    case 'WAKTU_SELESAI_TIDAK_TERCATAT':
      return 'bg-gray-100 text-gray-700';

    default:
      return 'bg-blue-100 text-blue-700';
  }
};

const getPeriodLabel = (periode: string): string => {
  if (periode === '7') return '7 Hari Terakhir';
  if (periode === '30') return '30 Hari Terakhir';
  if (periode === '90') return '90 Hari Terakhir';
  if (periode === '365') return '1 Tahun Terakhir';
  return `${periode} Hari Terakhir`;
};

export default function LaporanSLA() {
  const [periode, setPeriode] = useState('30');
  const [prioritas, setPrioritas] = useState('SEMUA');
  const [ringkasan, setRingkasan] = useState<Ringkasan>(ringkasanAwal);
  const [data, setData] = useState<TiketSLA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let aktif = true;

    const fetchLaporan = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/laporan-sla', {
          params: { periode, prioritas },
        });

        if (!aktif) return;

        const hasil = response.data as LaporanSLAResponse;

        setRingkasan(hasil.ringkasan ?? ringkasanAwal);
        setData(Array.isArray(hasil.data) ? hasil.data : []);
      } catch (err) {
        console.error('Gagal mengambil laporan SLA:', err);

        if (aktif) {
          setError(
            'Laporan SLA gagal dimuat. Periksa koneksi ke server dan coba lagi.',
          );
          setRingkasan(ringkasanAwal);
          setData([]);
        }
      } finally {
        if (aktif) setLoading(false);
      }
    };

    void fetchLaporan();

    return () => {
      aktif = false;
    };
  }, [periode, prioritas]);

  const exportExcel = () => {
    if (data.length === 0) {
      window.alert('Tidak ada data tiket untuk diekspor.');
      return;
    }

    const tanggalCetak = new Date().toLocaleString('id-ID');

    const workbook = XLSX.utils.book_new();

    // ==========================================
    // SHEET 1: RINGKASAN SLA
    // ==========================================

    const ringkasanData: (string | number)[][] = [
      ['LAPORAN SERVICE LEVEL AGREEMENT (SLA)'],
      ['Laporan kinerja penyelesaian tiket'],
      [],
      ['Periode', getPeriodLabel(periode)],
      [
        'Filter Prioritas',
        prioritas === 'SEMUA' ? 'Semua Prioritas' : prioritas,
      ],
      ['Tanggal Ekspor', tanggalCetak],
      [],
      ['INDIKATOR', 'NILAI'],
      ['Total Tiket', ringkasan.totalTiket],
      ['Sesuai SLA', ringkasan.sesuaiSLA],
      ['Terlambat', ringkasan.terlambat],
      ['Terlambat Selesai', ringkasan.terlambatSelesai],
      ['Belum Selesai', ringkasan.belumSelesai],
      ['Dalam SLA', ringkasan.dalamSLA],
      ['Tanpa Deadline', ringkasan.tanpaDeadline],
      [
        'Waktu Selesai Tidak Tercatat',
        ringkasan.waktuSelesaiTidakTercatat,
      ],
      ['Total Selesai Terukur', ringkasan.totalSelesaiTerukur],
      ['Persentase SLA', `${ringkasan.persentaseSLA}%`],
      ['Rata-rata Waktu Penyelesaian (Jam)', ringkasan.rataRataJam],
    ];

    const sheetRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData);

    sheetRingkasan['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    ];

    sheetRingkasan['!cols'] = [
      { wch: 38 },
      { wch: 28 },
    ];

    sheetRingkasan['!rows'] = [
      { hpt: 34 },
      { hpt: 24 },
      { hpt: 10 },
    ];

    const rentangRingkasan = XLSX.utils.decode_range(
      sheetRingkasan['!ref'] ?? 'A1:B1',
    );

    for (
      let row = rentangRingkasan.s.r;
      row <= rentangRingkasan.e.r;
      row++
    ) {
      for (
        let col = rentangRingkasan.s.c;
        col <= rentangRingkasan.e.c;
        col++
      ) {
        const alamat = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheetRingkasan[alamat];

        if (!cell) continue;

        cell.s = {
          font: {
            name: 'Aptos',
            sz: 11,
            color: { rgb: '243247' },
          },
          alignment: {
            vertical: 'center',
            wrapText: true,
          },
          border: {
            bottom: {
              style: 'thin',
              color: { rgb: 'DCE3ED' },
            },
          },
        };

        if (row === 0) {
          cell.s = {
            fill: { fgColor: { rgb: '17365D' } },
            font: {
              name: 'Aptos Display',
              bold: true,
              sz: 16,
              color: { rgb: 'FFFFFF' },
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        } else if (row === 1) {
          cell.s = {
            fill: { fgColor: { rgb: 'DCE6F1' } },
            font: {
              name: 'Aptos',
              italic: true,
              sz: 10,
              color: { rgb: '44546A' },
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        } else if (row === 7) {
          cell.s = {
            fill: { fgColor: { rgb: '305496' } },
            font: {
              bold: true,
              color: { rgb: 'FFFFFF' },
              sz: 11,
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        } else if (row >= 8) {
          cell.s = {
            fill: {
              fgColor: {
                rgb: row % 2 === 0 ? 'FFFFFF' : 'F3F6FA',
              },
            },
            font: {
              name: 'Aptos',
              sz: 11,
              color: { rgb: '243247' },
              bold: col === 1,
            },
            alignment: {
              vertical: 'center',
              wrapText: true,
              horizontal: col === 1 ? 'center' : 'left',
            },
            border: {
              bottom: {
                style: 'thin',
                color: { rgb: 'DCE3ED' },
              },
            },
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(
      workbook,
      sheetRingkasan,
      'Ringkasan SLA',
    );

    // ==========================================
    // SHEET 2: RINCIAN TIKET
    // ==========================================

    const headerRincian = [
      'ID Tiket',
      'Judul',
      'Prioritas',
      'Divisi',
      'Status Tiket',
      'Deadline',
      'Tanggal Dibuat',
      'Tanggal Selesai',
      'Pembuat',
      'Pelaksana',
      'Status SLA',
    ];

    const rincianData = data.map((ticket) => [
      ticket.id,
      ticket.judul || '-',
      ticket.prioritas || '-',
      ticket.divisi || '-',
      (ticket.status || '-').replaceAll('_', ' '),
      formatDate(ticket.deadline),
      formatDate(ticket.createdAt),
      formatDate(ticket.completedAt),
      ticket.pembuat || '-',
      ticket.pelaksana || '-',
      getStatusLabel(ticket.statusSLA || ''),
    ]);

    const sheetRincian = XLSX.utils.aoa_to_sheet([
      ['RINCIAN LAPORAN SLA'],
      [`Periode: ${getPeriodLabel(periode)} | Prioritas: ${prioritas}`],
      [`Tanggal Ekspor: ${tanggalCetak}`],
      [],
      headerRincian,
      ...rincianData,
    ]);

    sheetRincian['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    ];

    sheetRincian['!cols'] = [
      { wch: 13 },
      { wch: 34 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
      { wch: 28 },
    ];

    sheetRincian['!autofilter'] = {
      ref: `A5:K${5 + rincianData.length}`,
    };

    sheetRincian['!freeze'] = {
      xSplit: 0,
      ySplit: 5,
      topLeftCell: 'A6',
      activePane: 'bottomLeft',
      state: 'frozen',
    };

    const rentangRincian = XLSX.utils.decode_range(
      sheetRincian['!ref'] ?? 'A1:K5',
    );

    for (
      let row = rentangRincian.s.r;
      row <= rentangRincian.e.r;
      row++
    ) {
      for (
        let col = rentangRincian.s.c;
        col <= rentangRincian.e.c;
        col++
      ) {
        const alamat = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheetRincian[alamat];

        if (!cell) continue;

        if (row === 0) {
          cell.s = {
            fill: { fgColor: { rgb: '17365D' } },
            font: {
              name: 'Aptos Display',
              bold: true,
              sz: 16,
              color: { rgb: 'FFFFFF' },
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        } else if (row === 1 || row === 2) {
          cell.s = {
            fill: { fgColor: { rgb: 'DCE6F1' } },
            font: {
              name: 'Aptos',
              sz: 10,
              color: { rgb: '44546A' },
            },
            alignment: {
              vertical: 'center',
              wrapText: true,
            },
          };
        } else if (row === 4) {
          cell.s = {
            fill: { fgColor: { rgb: '305496' } },
            font: {
              name: 'Aptos',
              bold: true,
              sz: 10,
              color: { rgb: 'FFFFFF' },
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
            border: {
              top: {
                style: 'thin',
                color: { rgb: '17365D' },
              },
              bottom: {
                style: 'thin',
                color: { rgb: '17365D' },
              },
            },
          };
        } else if (row >= 5) {
          const statusSLA = data[row - 5]?.statusSLA;

          let warnaStatus = 'FFFFFF';

          if (
            statusSLA === 'SESUAI_SLA' ||
            statusSLA === 'DALAM_SLA'
          ) {
            warnaStatus = 'E2F0D9';
          } else if (
            statusSLA === 'TERLAMBAT' ||
            statusSLA === 'TERLAMBAT_SELESAI'
          ) {
            warnaStatus = 'FCE4D6';
          } else if (statusSLA === 'BELUM_SELESAI') {
            warnaStatus = 'FFF2CC';
          } else if (
            statusSLA === 'TANPA_DEADLINE' ||
            statusSLA === 'WAKTU_SELESAI_TIDAK_TERCATAT'
          ) {
            warnaStatus = 'E7E6E6';
          }

          cell.s = {
            fill: {
              fgColor: {
                rgb:
                  col === 10
                    ? warnaStatus
                    : row % 2 === 0
                      ? 'FFFFFF'
                      : 'F3F6FA',
              },
            },
            font: {
              name: 'Aptos',
              sz: 10,
              color: { rgb: '243247' },
              bold: col === 10,
            },
            alignment: {
              vertical: 'center',
              wrapText: true,
            },
            border: {
              bottom: {
                style: 'thin',
                color: { rgb: 'DCE3ED' },
              },
            },
          };
        }
      }
    }

    if (!sheetRincian['!rows']) {
      sheetRincian['!rows'] = [];
    }

    sheetRincian['!rows'][0] = { hpt: 34 };
    sheetRincian['!rows'][1] = { hpt: 22 };
    sheetRincian['!rows'][2] = { hpt: 22 };
    sheetRincian['!rows'][4] = { hpt: 32 };

    for (let row = 5; row < 5 + rincianData.length; row++) {
      sheetRincian['!rows'][row] = { hpt: 28 };
    }

    XLSX.utils.book_append_sheet(
      workbook,
      sheetRincian,
      'Rincian Tiket',
    );

    const tanggalFile = new Date().toISOString().slice(0, 10);
    const namaFile =
      `Laporan-SLA-${periode}-hari-${prioritas}-${tanggalFile}.xlsx`;

    XLSX.writeFile(workbook, namaFile);
  };

  // ==========================================
  // EKSPOR PDF
  // ==========================================

  const exportPDF = () => {
    if (data.length === 0) {
      window.alert('Tidak ada data tiket untuk diekspor.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const tanggalCetak = new Date().toLocaleString('id-ID');

    doc.setFillColor(23, 54, 93);
    doc.rect(0, 0, 297, 29, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text('LAPORAN SERVICE LEVEL AGREEMENT (SLA)', 14, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
      `Periode: ${getPeriodLabel(periode)} | Prioritas: ${prioritas}`,
      14,
      21,
    );

    doc.setTextColor(50, 60, 75);
    doc.setFontSize(9);
    doc.text(`Tanggal ekspor: ${tanggalCetak}`, 14, 36);

    autoTable(doc, {
      startY: 41,
      head: [['Indikator', 'Nilai', 'Indikator', 'Nilai']],
      body: [
        [
          'Total Tiket',
          formatNumber(ringkasan.totalTiket),
          'Sesuai SLA',
          formatNumber(ringkasan.sesuaiSLA),
        ],
        [
          'Terlambat',
          formatNumber(ringkasan.terlambat),
          'Terlambat Selesai',
          formatNumber(ringkasan.terlambatSelesai),
        ],
        [
          'Belum Selesai',
          formatNumber(ringkasan.belumSelesai),
          'Dalam SLA',
          formatNumber(ringkasan.dalamSLA),
        ],
        [
          'Tanpa Deadline',
          formatNumber(ringkasan.tanpaDeadline),
          'Selesai Terukur',
          formatNumber(ringkasan.totalSelesaiTerukur),
        ],
        [
          'Persentase SLA',
          formatPercent(ringkasan.persentaseSLA),
          'Rata-rata Penyelesaian',
          `${formatNumber(ringkasan.rataRataJam)} jam`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [48, 84, 150],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [243, 246, 250],
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        lineColor: [220, 227, 237],
        lineWidth: 0.2,
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 9,
      head: [
        [
          'ID',
          'Judul Tiket',
          'Prioritas',
          'Divisi',
          'Status Tiket',
          'Deadline',
          'Tanggal Dibuat',
          'Tanggal Selesai',
          'Pembuat',
          'Pelaksana',
          'Status SLA',
        ],
      ],
      body: data.map((ticket) => [
        String(ticket.id),
        ticket.judul || '-',
        ticket.prioritas || '-',
        ticket.divisi || '-',
        (ticket.status || '-').replaceAll('_', ' '),
        formatDate(ticket.deadline),
        formatDate(ticket.createdAt),
        formatDate(ticket.completedAt),
        ticket.pembuat || '-',
        ticket.pelaksana || '-',
        getStatusLabel(ticket.statusSLA || ''),
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [48, 84, 150],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [243, 246, 250],
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [220, 227, 237],
        lineWidth: 0.2,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 35 },
        2: { cellWidth: 17 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 23 },
        6: { cellWidth: 23 },
        7: { cellWidth: 23 },
        8: { cellWidth: 24 },
        9: { cellWidth: 24 },
        10: { cellWidth: 26 },
      },
      didParseCell: (hookData) => {
        if (
          hookData.section === 'body' &&
          hookData.column.index === 10
        ) {
          const status = data[hookData.row.index]?.statusSLA;

          if (
            status === 'SESUAI_SLA' ||
            status === 'DALAM_SLA'
          ) {
            hookData.cell.styles.fillColor = [226, 240, 217];
            hookData.cell.styles.textColor = [39, 91, 46];
          } else if (
            status === 'TERLAMBAT' ||
            status === 'TERLAMBAT_SELESAI'
          ) {
            hookData.cell.styles.fillColor = [252, 228, 214];
            hookData.cell.styles.textColor = [156, 48, 36];
          } else if (status === 'BELUM_SELESAI') {
            hookData.cell.styles.fillColor = [255, 242, 204];
            hookData.cell.styles.textColor = [125, 91, 0];
          } else {
            hookData.cell.styles.fillColor = [231, 230, 230];
            hookData.cell.styles.textColor = [70, 70, 70];
          }
        }
      },
      margin: {
        top: 12,
        left: 10,
        right: 10,
        bottom: 15,
      },
      didDrawPage: () => {
        const tinggiHalaman = doc.internal.pageSize.getHeight();
        const lebarHalaman = doc.internal.pageSize.getWidth();

        doc.setFontSize(8);
        doc.setTextColor(120, 130, 145);

        doc.text(
          'Laporan SLA - Sistem E-Ticketing',
          10,
          tinggiHalaman - 7,
        );

        doc.text(
          `Halaman ${doc.getCurrentPageInfo().pageNumber}`,
          lebarHalaman - 10,
          tinggiHalaman - 7,
          { align: 'right' },
        );
      },
    });

    const tanggalFile = new Date().toISOString().slice(0, 10);

    doc.save(
      `Laporan-SLA-${periode}-hari-${prioritas}-${tanggalFile}.pdf`,
    );
  };

  // ==========================================
  // TAMPILAN HALAMAN
  // ==========================================

  const cards = [
    {
      label: 'Total Tiket',
      value: ringkasan.totalTiket,
      color: 'border-blue-500',
      text: 'text-blue-700',
    },
    {
      label: 'Sesuai SLA',
      value: ringkasan.sesuaiSLA,
      color: 'border-green-500',
      text: 'text-green-700',
    },
    {
      label: 'Terlambat',
      value: ringkasan.terlambat,
      color: 'border-red-500',
      text: 'text-red-700',
    },
    {
      label: 'Belum Selesai',
      value: ringkasan.belumSelesai,
      color: 'border-yellow-500',
      text: 'text-yellow-700',
    },
    {
      label: 'Persentase SLA',
      value: formatPercent(ringkasan.persentaseSLA),
      color: 'border-indigo-500',
      text: 'text-indigo-700',
    },
    {
      label: 'Rata-rata Penyelesaian',
      value: `${formatNumber(ringkasan.rataRataJam)} jam`,
      color: 'border-purple-500',
      text: 'text-purple-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Laporan SLA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ringkasan kinerja penyelesaian tiket berdasarkan Service
            Level Agreement.
          </p>
        </div>

        {/* Filter dan tombol ekspor */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="periode"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Periode Laporan
              </label>

              <select
                id="periode"
                value={periode}
                onChange={(event) => setPeriode(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="7">7 Hari Terakhir</option>
                <option value="30">30 Hari Terakhir</option>
                <option value="90">90 Hari Terakhir</option>
                <option value="365">1 Tahun Terakhir</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="prioritas"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Prioritas Tiket
              </label>

              <select
                id="prioritas"
                value={prioritas}
                onChange={(event) => setPrioritas(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="SEMUA">Semua Prioritas</option>
                <option value="RENDAH">Rendah</option>
                <option value="SEDANG">Sedang</option>
                <option value="TINGGI">Tinggi</option>
                <option value="KRITIS">Kritis</option>
              </select>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={exportPDF}
                disabled={loading || !!error || data.length === 0}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ekspor PDF
              </button>

              <button
                type="button"
                onClick={exportExcel}
                disabled={loading || !!error || data.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ekspor Excel
              </button>
            </div>
          </div>
        </div>

        {/* Pesan loading dan error */}
        {loading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Memuat laporan SLA...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Kartu ringkasan */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-xl border border-gray-200 border-l-4 ${card.color} bg-white p-5 shadow-sm`}
                >
                  <p className="text-sm font-medium text-gray-500">
                    {card.label}
                  </p>

                  <p className={`mt-3 text-2xl font-bold ${card.text}`}>
                    {typeof card.value === 'number'
                      ? formatNumber(card.value)
                      : card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Informasi tambahan */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">
                  Terlambat Selesai
                </p>
                <p className="mt-2 text-xl font-bold text-red-700">
                  {formatNumber(ringkasan.terlambatSelesai)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">
                  Tanpa Deadline
                </p>
                <p className="mt-2 text-xl font-bold text-gray-800">
                  {formatNumber(ringkasan.tanpaDeadline)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="text-sm text-gray-500">
                  Waktu Selesai Tidak Tercatat
                </p>
                <p className="mt-2 text-xl font-bold text-gray-800">
                  {formatNumber(
                    ringkasan.waktuSelesaiTidakTercatat,
                  )}
                </p>
              </div>
            </div>

            {/* Tabel rincian tiket */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Rincian Tiket
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatNumber(data.length)} tiket ditemukan
                  </p>
                </div>
              </div>

              {data.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-medium text-gray-700">
                    Tidak ada data tiket
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Coba ubah periode atau filter prioritas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1200px] w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Judul Tiket</th>
                        <th className="px-4 py-3">Prioritas</th>
                        <th className="px-4 py-3">Divisi</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Deadline</th>
                        <th className="px-4 py-3">Tanggal Dibuat</th>
                        <th className="px-4 py-3">Tanggal Selesai</th>
                        <th className="px-4 py-3">Pelaksana</th>
                        <th className="px-4 py-3">Status SLA</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {data.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                            {ticket.id}
                          </td>

                          <td className="max-w-xs px-4 py-3 text-gray-800">
                            {ticket.judul || '-'}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {ticket.prioritas || '-'}
                          </td>

                          <td className="px-4 py-3">
                            {ticket.divisi || '-'}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {(ticket.status || '-').replaceAll('_', ' ')}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(ticket.deadline)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(ticket.createdAt)}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(ticket.completedAt)}
                          </td>

                          <td className="px-4 py-3">
                            {ticket.pelaksana || '-'}
                          </td>

                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                ticket.statusSLA,
                              )}`}
                            >
                              {getStatusLabel(ticket.statusSLA || '')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}