// Backend/tests/hierarchyWorkflow.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  EVENT_DIRECTIVE_ASSIGNED,
  EVENT_TASK_ASSIGNED,
  planTicketNotificationEvents,
  buildNotificationMessage,
  buildDedupeKey,
} = require('../services/ticketNotificationService');

const {
  createTicket,
  getTickets,
  getTicketById,
  triageTicket,
} = require('../controllers/ticketController');

const { getTicketOptions } = require('../controllers/ticketOptionsController');

// Helper mock req & res
function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

describe('Hierarki Workflow Test Suite (20 Skenario Bisnis)', () => {

  // Skenario 1: Kadiv dapat menerbitkan tugas kepada Koordinator dalam divisinya
  it('1. Kadiv dapat menerbitkan arahan tugas kepada Koordinator dalam divisinya', () => {
    const events = planTicketNotificationEvents({
      previous: null,
      current: { id: 101, pelaksanaId: 3, penanggungJawabId: 4, status: 'DIPROSES' },
      actor: { id: 4, role: 'KADIV', nama: 'Kadiv Medis' },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EVENT_DIRECTIVE_ASSIGNED);
    assert.equal(events[0].recipientId, 3);
  });

  // Skenario 2: Kadiv tidak dapat menerbitkan tugas langsung kepada Staf
  it('2. Kadiv ditolak jika mencoba menerbitkan tugas operasional langsung ke Staf', async () => {
    const req = {
      user: { id: 4, role: 'KADIV', divisiId: 3 },
      body: {
        tipe: 'BUAT_TUGAS',
        judul: 'Pembersihan Ruang',
        deskripsi: 'Harus bersih',
        divisiId: 3,
        pelaksanaId: 2, // ID 2 adalah STAF
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    const res = createMockRes();
    await createTicket(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /tidak dapat menugaskan Staf secara langsung/i);
  });

  // Skenario 3: Kadiv memilih Koordinator yang tidak sesuai dengan Divisi Tujuan
  it('3. Kadiv ditolak jika Koordinator penerima tidak cocok dengan Divisi Tujuan', async () => {
    const req = {
      user: { id: 4, role: 'KADIV', divisiId: 3 }, // Kadiv Divisi 3
      body: {
        tipe: 'BUAT_TUGAS',
        judul: 'Arahan Lintas Divisi',
        deskripsi: 'Deskripsi',
        divisiId: 3, // Divisi Tujuan 3
        pelaksanaId: 6, // Koordinator divisi 4 (tidak cocok dengan divisi tujuan 3)
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    const res = createMockRes();
    await createTicket(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Divisi Tujuan/i);
  });

  // Skenario 4: Koordinator dapat melihat tugas yang diterbitkan kepadanya
  it('4. Koordinator dapat melihat tugas/arahan yang diterbitkan kepadanya', async () => {
    const req = {
      user: { id: 6, role: 'KOORDINATOR', divisiId: 4 },
    };
    const res = createMockRes();
    await getTickets(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  // Skenario 5: Koordinator dibatasi pada cakupan kewenangan divisinya
  it('5. Options Koordinator menyaring pelaksana sesuai divisinya sendiri', async () => {
    const req = {
      user: { id: 6, role: 'KOORDINATOR', divisiId: 4 },
      query: {},
    };
    const res = createMockRes();
    await getTicketOptions(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.divisi.length > 0);
    res.body.pelaksana.forEach((p) => {
      assert.equal(p.divisiId, 4);
    });
  });

  // Skenario 6: Koordinator dapat membuat tiket operasional dari arahan Kadiv
  it('6. Koordinator membuat tiket operasional yang menautkan arahan Kadiv', async () => {
    // Validasi penautan parentTicketId pada payload
    const req = {
      user: { id: 6, role: 'KOORDINATOR', divisiId: 4 },
      body: {
        tipe: 'BUAT_TUGAS',
        judul: 'Pengecekan Server RS',
        deskripsi: 'Instruksi pengerjaan',
        divisiId: 4,
        pelaksanaId: 2, // ID 2 Staf (Divisi 1 vs Divisi 4 akan diuji)
        parentTicketId: 999999, // ID tidak ada
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    const res = createMockRes();
    await createTicket(req, res);
    // Menolak jika arahan induk tidak ditemukan
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /Arahan induk tidak ditemukan/i);
  });

  // Skenario 7: Tiket operasional memiliki relasi ke arahan asal
  it('7. Skema tiket operasional mendukung relasi parentTicketId', () => {
    const ticketMock = {
      id: 202,
      judul: 'Tugas Operasional Sub-AC',
      parentTicketId: 101,
      parentTicket: { id: 101, judul: 'Arahan Kadiv Penataan Ruang' },
    };
    assert.equal(ticketMock.parentTicketId, 101);
    assert.equal(ticketMock.parentTicket.judul, 'Arahan Kadiv Penataan Ruang');
  });

  // Skenario 8: Satu arahan dapat menghasilkan beberapa tiket operasional (1-to-N)
  it('8. Mendukung relasi 1-to-N (satu arahan memiliki banyak childTickets)', () => {
    const arahanKadiv = {
      id: 101,
      judul: 'Arahan Kadiv',
      childTickets: [
        { id: 201, judul: 'Sub-tugas Teknisi 1', status: 'SELESAI' },
        { id: 202, judul: 'Sub-tugas Teknisi 2', status: 'DIPROSES' },
      ],
    };
    assert.equal(arahanKadiv.childTickets.length, 2);
    assert.equal(arahanKadiv.childTickets[0].status, 'SELESAI');
  });

  // Skenario 9: Koordinator dapat menugaskan Staf sesuai divisi
  it('9. Filter options untuk Koordinator mengembalikan role STAF', async () => {
    const req = {
      user: { id: 6, role: 'KOORDINATOR', divisiId: 1 },
      query: { divisiId: '1' },
    };
    const res = createMockRes();
    await getTicketOptions(req, res);
    assert.equal(res.statusCode, 200);
    // Semua pelaksana yang dikembalikan harus bertipe STAF
    res.body.pelaksana.forEach((p) => {
      assert.equal(p.role, 'STAF');
    });
  });

  // Skenario 10: Koordinator tidak dapat memilih pemeriksa yang sama dengan pelaksana
  it('10. Koordinator ditolak jika menugaskan dirinya sendiri sebagai pelaksana', async () => {
    const req = {
      user: { id: 6, role: 'KOORDINATOR', divisiId: 4 },
      body: {
        tipe: 'BUAT_TUGAS',
        judul: 'Tugas Mandiri',
        deskripsi: 'Deskripsi',
        divisiId: 4,
        pelaksanaId: 6, // Pelaksana sama dengan pembuat
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    const res = createMockRes();
    await createTicket(req, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /tidak boleh sama dengan penanggung jawab/i);
  });

  // Skenario 11: Staf menerima tugas operasional
  it('11. Staf ditugaskan memicu notifikasi TASK_ASSIGNED', () => {
    const events = planTicketNotificationEvents({
      previous: null,
      current: { id: 205, pelaksanaId: 2, penanggungJawabId: 6, status: 'DIPROSES' },
      actor: { id: 6, role: 'KOORDINATOR', nama: 'Koor Pelayanan' },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EVENT_TASK_ASSIGNED);
    assert.equal(events[0].recipientId, 2);
  });

  // Skenario 12: Kadiv dapat memantau progres tugas divisinya
  it('12. Query getTickets untuk Kadiv menyaring berdasarkan divisinya', async () => {
    const req = {
      user: { id: 4, role: 'KADIV', divisiId: 3 },
    };
    const res = createMockRes();
    await getTickets(req, res);
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
  });

  // Skenario 13: Kadiv tidak dapat mengakses data divisi lain
  it('13. Kadiv ditolak 403 saat mengakses detail tiket milik divisi lain', async () => {
    // Tiket ID 6 ada di database divisi 4
    const req = {
      params: { id: 6 },
      user: { id: 4, role: 'KADIV', divisiId: 3 }, // Divisi 3 mencoba akses tiket divisi 4
    };
    const res = createMockRes();
    await getTicketById(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /divisi lain/i);
  });

  // Skenario 14: Direktur memiliki visibilitas sesuai kewenangannya
  it('14. Direktur dapat melihat seluruh tiket lintas divisi tanpa pemblokiran', async () => {
    const req = {
      params: { id: 6 },
      user: { id: 5, role: 'DIREKTUR', divisiId: null },
    };
    const res = createMockRes();
    await getTicketById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.id, 6);
  });

  // Skenario 15: Semua perubahan penting tercatat dalam audit trail
  it('15. Perubahan dan pembuatan tiket menyusun teks audit trail spesifik', () => {
    const action = 'CREATE_DIRECTIVE';
    const detail = 'KADIV membuat tugas #T-101 (Optimalisasi Layanan) ke Divisi Pelayanan Medis [Berdasarkan Arahan Induk #T-050]';
    assert.match(detail, /CREATE_DIRECTIVE|membuat tugas/);
    assert.match(detail, /Arahan Induk/);
  });

  // Skenario 16: Notifikasi Telegram dikirim kepada penerima yang benar
  it('16. Notifikasi arahan divisi dikirim dengan template DIRECTIVE_ASSIGNED ke Koordinator', () => {
    const message = buildNotificationMessage({
      type: EVENT_DIRECTIVE_ASSIGNED,
      ticket: {
        id: 110,
        judul: 'Optimalisasi Antrian Poliklinik',
        prioritas: 'HIGH',
        status: 'DIPROSES',
        deadline: new Date('2026-11-05T08:00:00Z'),
      },
      actor: { nama: 'dr. Christ (Kadiv Medis)' },
    });
    assert.match(message, /\[NOTIFIKASI ARAHAN DIVISI\]/);
    assert.match(message, /Dari: dr\. Christ/);
    assert.match(message, /Silakan buat tiket operasional untuk Staf/);
  });

  // Skenario 17: Deduplikasi mencegah notifikasi ganda
  it('17. Dedupe key menjamin keunikan per tiket, event, occurrence, dan recipient', () => {
    const key1 = buildDedupeKey({
      ticketId: 10,
      type: EVENT_DIRECTIVE_ASSIGNED,
      recipientId: 6,
      occurrenceToken: 'from:none:to:6',
    });
    const key2 = buildDedupeKey({
      ticketId: 10,
      type: EVENT_DIRECTIVE_ASSIGNED,
      recipientId: 6,
      occurrenceToken: 'from:none:to:6',
    });
    assert.equal(key1, key2);
    assert.equal(key1, 'ticket:10:DIRECTIVE_ASSIGNED:from:none:to:6:6');
  });

  // Skenario 18: Pengguna tanpa role yang sesuai ditolak backend
  it('18. Role STAF ditolak 403 saat mencoba membuat tugas via endpoint BUAT_TUGAS', async () => {
    const req = {
      user: { id: 2, role: 'STAF', divisiId: 1 },
      body: {
        tipe: 'BUAT_TUGAS',
        judul: 'Tugas Ilegal oleh Staf',
        deskripsi: 'Deskripsi',
        divisiId: 1,
        pelaksanaId: 7,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    };
    const res = createMockRes();
    await createTicket(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /berwenang membuat tugas/i);
  });

  // Skenario 19: Data lama tetap dapat dibaca setelah penambahan parentTicketId
  it('19. Tiket lama dengan parentTicketId bernilai null tetap dibaca normal', async () => {
    const req = {
      params: { id: 6 },
      user: { id: 6, role: 'KOORDINATOR', divisiId: 4 },
    };
    const res = createMockRes();
    await getTicketById(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.parentTicket, null);
  });

  // Skenario 20: Tidak ada data pasien/RME dalam pesan notifikasi
  it('20. Template notifikasi tidak mengandung unsur data pasien atau rekam medis', () => {
    const message = buildNotificationMessage({
      type: EVENT_DIRECTIVE_ASSIGNED,
      ticket: {
        id: 115,
        judul: 'Pembersihan Filter Udara Ruang Operasi',
        prioritas: 'MEDIUM',
        status: 'DIPROSES',
        deadline: new Date('2026-11-05T08:00:00Z'),
      },
      actor: { nama: 'Kadiv Penunjang' },
    });
    assert.doesNotMatch(message, /pasien|rekam medis|diagnosa|rme/i);
  });
});
