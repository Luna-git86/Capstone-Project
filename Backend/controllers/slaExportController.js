// Backend/controllers/slaExportController.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { getSlaReportData } = require('./slaController');

// 1. Export Excel (.xlsx)
const exportExcelSla = async (req, res) => {
  try {
    const { metadata, ringkasan, data } = await getSlaReportData(req);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RSIA Qurrata A\'yun E-Ticketing';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Laporan Kinerja SLA', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // Judul Utama
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'RSIA QURRATA A\'YUN SAMARINDA';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0B2447' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 24;

    worksheet.mergeCells('A2:J2');
    const subTitle = worksheet.getCell('A2');
    subTitle.value = 'LAPORAN KINERJA SERVICE LEVEL AGREEMENT (SLA)';
    subTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E293B' } };
    subTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    worksheet.mergeCells('A3:J3');
    const metaCell = worksheet.getCell('A3');
    metaCell.value = `Periode: ${metadata.periodeText}   |   Divisi: ${metadata.divisiText}   |   Dicetak: ${metadata.tanggalCetak}`;
    metaCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
    metaCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]); // Blank line

    // Ringkasan KPI
    worksheet.addRow(['RINGKASAN KINERJA TUGAS SELESAI']);
    worksheet.getCell(`A${worksheet.lastRow.number}`).font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF0B2447' } };

    const kpiRows = [
      ['Total Tugas Selesai Terukur', ringkasan.totalTiket],
      ['Selesai Tepat Waktu', ringkasan.sesuaiSLA],
      ['Selesai Terlambat', ringkasan.terlambat],
      ['Pencapaian Kepatuhan SLA', `${ringkasan.persentaseSLA}%`],
      ['Rata-rata Durasi Pengerjaan', `${ringkasan.rataRataDurasiJam} jam`],
    ];

    kpiRows.forEach((r) => {
      const row = worksheet.addRow(r);
      row.getCell(1).font = { name: 'Arial', size: 10, bold: true };
      row.getCell(2).font = { name: 'Arial', size: 10 };
    });

    worksheet.addRow([]); // Blank line

    // Header Tabel Rincian
    const tableHeaders = [
      'No',
      'ID Tiket',
      'Nama Tugas',
      'Divisi',
      'Pelaksana',
      'Prioritas',
      'Deadline',
      'Waktu Pengumpulan Staf',
      'Status SLA',
      'Selisih Keterlambatan',
    ];

    const headerRow = worksheet.addRow(tableHeaders);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B2447' },
      };
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Isi Data
    data.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1,
        `#T-${String(item.id).padStart(3, '0')}`,
        item.judul,
        item.divisi,
        item.pelaksana,
        item.prioritas,
        item.deadlineFormatted,
        item.waktuPengumpulanFormatted,
        item.statusSLA === 'SESUAI_SLA' ? 'Tepat Waktu' : 'Terlambat',
        item.selisihKeterlambatanFormatted,
      ]);

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.font = { name: 'Arial', size: 9 };
        if ([1, 2, 6, 9].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        if (colNumber === 9) {
          if (item.statusSLA === 'SESUAI_SLA') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } };
          } else {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFDC2626' } };
          }
        }
      });
    });

    // Auto fit width
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 8;
        if (len > maxLength) maxLength = len;
      });
      column.width = Math.min(Math.max(maxLength + 3, 10), 38);
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_SLA_${Date.now()}.xlsx"`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Error exportExcelSla:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      message: error.message || 'Gagal mengekspor laporan Excel.',
    });
  }
};

// 2. Export PDF (.pdf)
const exportPdfSla = async (req, res) => {
  try {
    const { metadata, ringkasan, data } = await getSlaReportData(req);

    const doc = new PDFDocument({ margin: 35, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    const pdfBufferPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Judul Header
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#0B2447').text('RSIA QURRATA A\'YUN SAMARINDA', { align: 'center' });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text('LAPORAN KINERJA SERVICE LEVEL AGREEMENT (SLA)', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748B').text(`Periode: ${metadata.periodeText}   |   Divisi: ${metadata.divisiText}   |   Dicetak: ${metadata.tanggalCetak}`, { align: 'center' });
    doc.moveDown(0.6);

    // Garis Pemisah
    doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(35, doc.y).lineTo(805, doc.y).stroke();
    doc.moveDown(0.6);

    // Ringkasan KPI Cards
    const kpiY = doc.y;
    const cardWidth = 145;
    const cardHeight = 40;

    // Card 1: Total
    doc.rect(35, kpiY, cardWidth, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('TOTAL TUGAS SELESAI', 45, kpiY + 7);
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text(String(ringkasan.totalTiket), 45, kpiY + 20);

    // Card 2: Tepat Waktu
    doc.rect(190, kpiY, cardWidth, cardHeight).fillAndStroke('#ECFDF5', '#A7F3D0');
    doc.fillColor('#065F46').fontSize(7.5).font('Helvetica').text('SELESAI TEPAT WAKTU', 200, kpiY + 7);
    doc.fillColor('#059669').fontSize(13).font('Helvetica-Bold').text(String(ringkasan.sesuaiSLA), 200, kpiY + 20);

    // Card 3: Terlambat
    doc.rect(345, kpiY, cardWidth, cardHeight).fillAndStroke('#FEF2F2', '#FECACA');
    doc.fillColor('#991B1B').fontSize(7.5).font('Helvetica').text('SELESAI TERLAMBAT', 355, kpiY + 7);
    doc.fillColor('#DC2626').fontSize(13).font('Helvetica-Bold').text(String(ringkasan.terlambat), 355, kpiY + 20);

    // Card 4: Pencapaian SLA
    doc.rect(500, kpiY, cardWidth, cardHeight).fillAndStroke('#EFF6FF', '#BFDBFE');
    doc.fillColor('#1E40AF').fontSize(7.5).font('Helvetica').text('PENCAPAIAN SLA', 510, kpiY + 7);
    doc.fillColor('#2563EB').fontSize(13).font('Helvetica-Bold').text(`${ringkasan.persentaseSLA}%`, 510, kpiY + 20);

    // Card 5: Durasi
    doc.rect(655, kpiY, 150, cardHeight).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('RATA-RATA DURASI', 665, kpiY + 7);
    doc.fillColor('#0F172A').fontSize(13).font('Helvetica-Bold').text(`${ringkasan.rataRataDurasiJam} jam`, 665, kpiY + 20);

    doc.y = kpiY + 52;

    // Header Tabel
    doc.rect(35, doc.y, 770, 18).fill('#0B2447');
    doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
    const tableTop = doc.y + 5;
    doc.text('No', 40, tableTop, { width: 25 });
    doc.text('ID Tiket', 70, tableTop, { width: 45 });
    doc.text('Nama Tugas', 120, tableTop, { width: 180 });
    doc.text('Divisi', 305, tableTop, { width: 95 });
    doc.text('Pelaksana', 405, tableTop, { width: 95 });
    doc.text('Prioritas', 505, tableTop, { width: 45 });
    doc.text('Deadline', 555, tableTop, { width: 85 });
    doc.text('Waktu Serah', 645, tableTop, { width: 85 });
    doc.text('Status SLA', 735, tableTop, { width: 65 });

    doc.y = tableTop + 15;

    // Baris Data Tabel
    data.forEach((item, index) => {
      if (doc.y > 530) {
        doc.addPage();
        doc.y = 35;
      }

      const rowY = doc.y;
      if (index % 2 === 0) {
        doc.rect(35, rowY - 2, 770, 16).fill('#F8FAFC');
      }

      doc.fillColor('#334155').fontSize(7.5).font('Helvetica');
      doc.text(String(index + 1), 40, rowY, { width: 25 });
      doc.text(`#T-${String(item.id).padStart(3, '0')}`, 70, rowY, { width: 45 });
      doc.text(String(item.judul || '-').substring(0, 35), 120, rowY, { width: 180 });
      doc.text(String(item.divisi || '-'), 305, rowY, { width: 95 });
      doc.text(String(item.pelaksana || '-'), 405, rowY, { width: 95 });
      doc.text(String(item.prioritas || '-'), 505, rowY, { width: 45 });
      doc.text(String(item.deadlineFormatted || '-'), 555, rowY, { width: 85 });
      doc.text(String(item.waktuPengumpulanFormatted || '-'), 645, rowY, { width: 85 });

      if (item.statusSLA === 'SESUAI_SLA') {
        doc.fillColor('#059669').font('Helvetica-Bold').text('Tepat Waktu', 735, rowY, { width: 65 });
      } else {
        doc.fillColor('#DC2626').font('Helvetica-Bold').text('Terlambat', 735, rowY, { width: 65 });
      }

      doc.y = rowY + 16;
    });

    if (data.length === 0) {
      doc.moveDown(1);
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Oblique').text('Tidak ada tugas berstatus Selesai yang tercatat pada filter ini.', { align: 'center' });
    }

    doc.end();

    const pdfBuffer = await pdfBufferPromise;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Laporan_SLA_${Date.now()}.pdf"`
    );

    return res.end(pdfBuffer);
  } catch (error) {
    console.error('Error exportPdfSla:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      message: error.message || 'Gagal mengekspor laporan PDF.',
    });
  }
};

module.exports = {
  exportExcelSla,
  exportPdfSla,
};
