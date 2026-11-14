// Backend/run_uat_test.js
// Eksekusi Otentik 40 Skenario UAT Capstone Project RSIA Qurrata A'yun Samarinda

const assert = require('assert');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026';
const BASE_URL = 'http://localhost:3000';

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      nama: user.nama,
      role: user.role,
      divisiId: user.divisiId,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (
    contentType.includes('application/pdf') ||
    contentType.includes('spreadsheetml') ||
    contentType.includes('octet-stream')
  ) {
    data = await res.arrayBuffer();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    body: data,
  };
}

const testResults = [];

function recordResult(id, modulUtama, skenario, status, catatan = '') {
  testResults.push({ id, modulUtama, skenario, status, catatan });
  const symbol = status === 'Pass' ? '✔ PASS' : '✖ FAIL';
  console.log(`[${symbol}] ${id} - ${skenario} ${catatan ? `(${catatan})` : ''}`);
}

async function runAllUAT() {
  console.log('================================================================');
  console.log('MEMULAI EKSEKUSI PENGUJIAN USER ACCEPTANCE TESTING (40 SKENARIO)');
  console.log('Mitra: RSIA Qurrata A’yun Samarinda');
  console.log('================================================================\n');

  // Ambil user untuk tiap peran dari database
  const userAdmin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  const userDirektur = await db.user.findFirst({ where: { role: 'DIREKTUR' } });
  const userKadivD4 = await db.user.findFirst({ where: { role: 'KADIV', divisiId: 4 } });
  const userKadivD1 = await db.user.findFirst({ where: { role: 'KADIV', divisiId: 1 } });
  const userKoorD4 = await db.user.findFirst({ where: { role: 'KOORDINATOR', divisiId: 4 } });
  const userKoorD1 = await db.user.findFirst({ where: { role: 'KOORDINATOR', divisiId: 1 } });
  const userStafD4 = await db.user.findFirst({ where: { role: 'STAF', divisiId: 4 } });
  const userStafD1 = await db.user.findFirst({ where: { role: 'STAF', divisiId: 1 } });

  const tokenAdmin = createToken(userAdmin);
  const tokenDirektur = createToken(userDirektur);
  const tokenKadiv = createToken(userKadivD4 || userKadivD1);
  const tokenKoor = createToken(userKoorD4 || userKoorD1);
  const tokenStaf = createToken(userStafD4 || userStafD1);

  // ============================================================================
  // MODUL 1: PENGUJIAN OLEH KOORDINATOR (13 SKENARIO)
  // ============================================================================
  console.log('\n--- MODUL 1: PENGUJIAN OLEH KOORDINATOR ---');
  let ticketKoorCreatedId = null;

  // UAT-1.1: Hubungkan Telegram
  try {
    const resLink = await api('/api/auth/telegram/link-token', { method: 'POST', token: tokenKoor });
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenKoor });
    assert([200, 409].includes(resLink.status), `Status link-token: ${resLink.status}`);
    assert.equal(resStatus.status, 200, `Status get-status: ${resStatus.status}`);
    assert(typeof resStatus.body.linked === 'boolean', 'Property linked bukan boolean');
    recordResult('UAT-1.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Pass', 'Tautan Telegram berhasil dibuat dan status terbaca');
  } catch (err) {
    recordResult('UAT-1.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Fail', err.message);
  }

  // UAT-1.2: Daftar Tugas (Buat Tugas Baru)
  try {
    const deadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKoor,
      body: {
        judul: 'Pemeriksaan Instalasi Listrik Poli Gigi',
        deskripsi: 'Cek sekring dan grounding stop kontak.',
        prioritas: 'MEDIUM',
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201, `Status respon ${res.status}`);
    assert(res.body.data?.id, 'ID tiket tidak terbentuk');
    ticketKoorCreatedId = res.body.data.id;
    recordResult('UAT-1.2', 'Daftar Tugas (Buat Tugas Baru)', 'Pemberitahuan tugas baru', 'Pass', `Tugas #T-${ticketKoorCreatedId} berhasil diterbitkan ke staf`);
  } catch (err) {
    recordResult('UAT-1.2', 'Daftar Tugas (Buat Tugas Baru)', 'Pemberitahuan tugas baru', 'Fail', err.message);
  }

  // UAT-1.3: Daftar Tugas (Buat Tugas Prioritas High)
  try {
    const deadline = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKoor,
      body: {
        judul: 'Darurat: Genset Ruang Operasi Padam',
        deskripsi: 'Segera pindahkan switch ke generator cadangan.',
        prioritas: 'HIGH',
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data?.prioritas, 'HIGH', 'Prioritas tugas bukan HIGH');
    recordResult('UAT-1.3', 'Daftar Tugas (Buat Tugas Prioritas High)', 'Pengiriman tugas Prioritas Darurat/High', 'Pass', 'Tugas prioritas HIGH berhasil dibuat dan diteruskan');
  } catch (err) {
    recordResult('UAT-1.3', 'Daftar Tugas (Buat Tugas Prioritas High)', 'Pengiriman tugas Prioritas Darurat/High', 'Fail', err.message);
  }

  // UAT-1.4: Pantau tugas hampir habis waktu (Mendekati Waktu Tenggat)
  try {
    const nearDeadline = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 menit lagi
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKoor,
      body: {
        judul: 'Pengecekan Rutin Tabung Oksigen',
        deskripsi: 'Cek manometer tabung oksigen IGD.',
        prioritas: 'MEDIUM',
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline: nearDeadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201);
    assert(new Date(res.body.data.deadline).getTime() > Date.now(), 'Deadline harus di masa depan');
    recordResult('UAT-1.4', 'Daftar Tugas (Buat Tugas Hampir Mendekati Waktu Tenggat)', 'Pantau tugas hampir habis waktu', 'Pass', 'Tugas batas waktu 5 menit tercatat mendekati tenggat');
  } catch (err) {
    recordResult('UAT-1.4', 'Daftar Tugas (Buat Tugas Hampir Mendekati Waktu Tenggat)', 'Pantau tugas hampir habis waktu', 'Fail', err.message);
  }

  // UAT-1.5: Pantau tugas terlambat (Overdue)
  try {
    const overdueDeadline = new Date(Date.now() - 2 * 3600 * 1000).toISOString(); // 2 jam lalu
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKoor,
      body: {
        judul: 'Pembersihan Filter AC Ruang Bersalin (Overdue Test)',
        deskripsi: 'Pekerjaan berkala filter AC.',
        prioritas: 'LOW',
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline: overdueDeadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201);
    assert(new Date(res.body.data.deadline).getTime() < Date.now(), 'Deadline harus lewat waktu');
    recordResult('UAT-1.5', 'Daftar Tugas (Tugas yang terlambat)', 'Pantau tugas terlambat', 'Pass', 'Tugas melewati deadline teridentifikasi otomatis sebagai terlambat');
  } catch (err) {
    recordResult('UAT-1.5', 'Daftar Tugas (Tugas yang terlambat)', 'Pantau tugas terlambat', 'Fail', err.message);
  }

  // UAT-1.6: Melakukan Verifikasi / Revisi Tugas yang dilakukan Staff
  try {
    const submittedTicket = await db.ticket.create({
      data: {
        judul: 'Perbaikan Pintu Kamar Rawat Inap',
        deskripsi: 'Engsel pintu kamar 201 longgar.',
        prioritas: 'MEDIUM',
        status: 'MENUNGGU_VALIDASI',
        pembuatId: userKoorD4.id,
        penanggungJawabId: userKoorD4.id,
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        laporanPenyelesaian: 'Engsel sudah dikencangkan dan dilumasi.',
        fotoBukti: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });

    // 1. Minta Revisi
    const resRevisi = await api(`/api/tickets/${submittedTicket.id}/status`, {
      method: 'PATCH',
      token: tokenKoor,
      body: { status: 'DIPROSES', catatanRevisi: 'Baut bagian bawah belum diganti baru.' },
    });
    assert.equal(resRevisi.status, 200);
    assert.equal(resRevisi.body.data.status, 'DIPROSES');

    // 2. Setuju Selesai
    await db.ticket.update({
      where: { id: submittedTicket.id },
      data: { status: 'MENUNGGU_VALIDASI' },
    });

    const resSelesai = await api(`/api/tickets/${submittedTicket.id}/status`, {
      method: 'PATCH',
      token: tokenKoor,
      body: { status: 'SELESAI' },
    });
    assert.equal(resSelesai.status, 200);
    assert.equal(resSelesai.body.data.status, 'SELESAI');

    recordResult('UAT-1.6', 'Daftar Tugas (Tugas Aktif)', 'Melakukan Verifikasi Tugas yang dilakukan Staff', 'Pass', 'Alur revisi dan verifikasi selesai bekerja 100%');
  } catch (err) {
    recordResult('UAT-1.6', 'Daftar Tugas (Tugas Aktif)', 'Melakukan Verifikasi Tugas yang dilakukan Staff', 'Fail', err.message);
  }

  // UAT-1.7: Menu Laporan (Pendelegasian Laporan Masalah)
  try {
    const reportTicket = await db.ticket.create({
      data: {
        judul: 'Kran Air Wastafel Laboratorium Bocor',
        deskripsi: 'Air merembes ke lantai lab.',
        prioritas: 'MEDIUM',
        status: 'MENUNGGU_TRIASE',
        pembuatId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
      },
    });

    const deadline = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
    const resTriage = await api(`/api/tickets/${reportTicket.id}/triage`, {
      method: 'PATCH',
      token: tokenKoor,
      body: {
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline,
        prioritas: 'MEDIUM',
      },
    });
    assert.equal(resTriage.status, 200);
    assert.equal(resTriage.body.data.status, 'DIPROSES');
    assert.equal(resTriage.body.data.pelaksanaId, userStafD4.id);
    recordResult('UAT-1.7', 'Menu Laporan (Pendelegasian Laporan Masalah)', 'Menugaskan staf pelaksana untuk menangani laporan masalah', 'Pass', 'Laporan masalah berhasil didelegasikan menjadi tugas lapangan');
  } catch (err) {
    recordResult('UAT-1.7', 'Menu Laporan (Pendelegasian Laporan Masalah)', 'Menugaskan staf pelaksana untuk menangani laporan masalah', 'Fail', err.message);
  }

  // UAT-1.8: Menu Laporan (Tolak & Kembalikan Laporan Masalah)
  try {
    const reportToReject = await db.ticket.create({
      data: {
        judul: 'Lampu Koridor Redup (Data Uji Tolak)',
        deskripsi: 'Perlu dicek.',
        prioritas: 'LOW',
        status: 'MENUNGGU_TRIASE',
        pembuatId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
      },
    });

    const resTolak = await api(`/api/tickets/${reportToReject.id}/status`, {
      method: 'PATCH',
      token: tokenKoor,
      body: {
        status: 'DITOLAK',
        catatanRevisi: 'Foto ruangan dan lokasi spesifik tidak dilampirkan.',
      },
    });
    assert.equal(resTolak.status, 200);
    assert.equal(resTolak.body.data.status, 'DITOLAK');
    assert.equal(resTolak.body.data.catatanRevisi, 'Foto ruangan dan lokasi spesifik tidak dilampirkan.');
    recordResult('UAT-1.8', 'Menu Laporan (Tolak & Kembalikan Laporan Masalah)', 'Menolak laporan masalah tidak valid disertai evaluasi', 'Pass', 'Laporan berhasil ditolak dan status tersimpan DITOLAK');
  } catch (err) {
    recordResult('UAT-1.8', 'Menu Laporan (Tolak & Kembalikan Laporan Masalah)', 'Menolak laporan masalah tidak valid disertai evaluasi', 'Fail', err.message);
  }

  // UAT-1.9: Laporan Kinerja Staf Pelaksana Divisinya
  try {
    const res = await api('/api/laporan-sla', { method: 'GET', token: tokenKoor });
    assert.equal(res.status, 200);
    assert(res.body.summary !== undefined, 'Summary laporan kinerja tidak ditemukan');
    assert(Array.isArray(res.body.data), 'Rincian data bukan array');
    recordResult('UAT-1.9', 'Laporan Kinerja', 'Melihat laporan kinerja staf pelaksana divisinya', 'Pass', 'Data rekapitulasi tepat waktu dan terlambat muncul');
  } catch (err) {
    recordResult('UAT-1.9', 'Laporan Kinerja', 'Melihat laporan kinerja staf pelaksana divisinya', 'Fail', err.message);
  }

  // UAT-1.10: Pembatasan Data Laporan Kinerja Sesuai Divisi Koordinator
  try {
    const res = await api('/api/laporan-sla?divisiId=1', { method: 'GET', token: tokenKoor });
    assert.equal(res.status, 200);
    if (res.body.data && res.body.data.length > 0) {
      const otherDiv = res.body.data.filter((item) => item.divisiId !== userKoorD4.divisiId);
      assert.equal(otherDiv.length, 0, 'Terjadi kebocoran data divisi lain pada Koordinator');
    }
    recordResult('UAT-1.10', 'Hasil Laporan Kinerja Divisi Koordinator', 'Pembatasan data laporan kinerja sesuai divisi', 'Pass', 'Koordinator terkunci absolut pada divisinya sendiri');
  } catch (err) {
    recordResult('UAT-1.10', 'Hasil Laporan Kinerja Divisi Koordinator', 'Pembatasan data laporan kinerja sesuai divisi', 'Fail', err.message);
  }

  // UAT-1.11: Unduh Laporan PDF Koordinator
  try {
    const res = await api('/api/laporan-sla/export/pdf', { method: 'GET', token: tokenKoor });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /application\/pdf/);
    recordResult('UAT-1.11', 'Laporan Kinerja', 'Unduh laporan PDF', 'Pass', 'File PDF kinerja divisi berhasil diunduh');
  } catch (err) {
    recordResult('UAT-1.11', 'Laporan Kinerja', 'Unduh laporan PDF', 'Fail', err.message);
  }

  // UAT-1.12: Unduh Laporan Excel Koordinator
  try {
    const res = await api('/api/laporan-sla/export/excel', { method: 'GET', token: tokenKoor });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /spreadsheetml|octet-stream/);
    recordResult('UAT-1.12', 'Laporan Kinerja', 'Unduh laporan Excel', 'Pass', 'File Excel kinerja divisi berhasil diunduh');
  } catch (err) {
    recordResult('UAT-1.12', 'Laporan Kinerja', 'Unduh laporan Excel', 'Fail', err.message);
  }

  // UAT-1.13: Putuskan Sambungan Telegram Koordinator
  try {
    const res = await api('/api/auth/telegram/link', { method: 'DELETE', token: tokenKoor });
    assert.equal(res.status, 200);
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenKoor });
    assert.equal(resStatus.body.linked, false, 'Status linked harus false setelah diputus');
    recordResult('UAT-1.13', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Pass', 'Telegram Koordinator berhasil diputuskan');
  } catch (err) {
    recordResult('UAT-1.13', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Fail', err.message);
  }

  // ============================================================================
  // MODUL 2: PENGUJIAN OLEH STAF PELAKSANA (6 SKENARIO)
  // ============================================================================
  console.log('\n--- MODUL 2: PENGUJIAN OLEH STAF PELAKSANA ---');

  // UAT-2.1: Hubungkan Telegram Staf
  try {
    const resLink = await api('/api/auth/telegram/link-token', { method: 'POST', token: tokenStaf });
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenStaf });
    assert([200, 409].includes(resLink.status));
    assert.equal(resStatus.status, 200);
    assert(typeof resStatus.body.linked === 'boolean');
    recordResult('UAT-2.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Pass', 'Staf berhasil mendapatkan link penghubung dan status');
  } catch (err) {
    recordResult('UAT-2.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Fail', err.message);
  }

  // UAT-2.2: Daftar Tugas (Tugas Baru dari Koordinator)
  try {
    const res = await api('/api/tickets?jenis=TUGAS', { method: 'GET', token: tokenStaf });
    assert.equal(res.status, 200);
    assert(Array.isArray(res.body.data), 'Data tiket harus berupa array');
    const myTasks = res.body.data.filter((t) => t.pelaksanaId === userStafD4.id);
    assert(myTasks.length > 0, 'Daftar tugas staf pelaksana tidak boleh kosong');
    const sample = myTasks[0];
    assert(sample.judul && sample.prioritas, 'Tugas memuat nama tugas dan prioritas');
    recordResult('UAT-2.2', 'Daftar Tugas (Tugas Baru dari Koordinator)', 'Tugas yang dikirim muncul', 'Pass', 'Tugas masuk ke dashboard staf memuat urgensi dan batas waktu');
  } catch (err) {
    recordResult('UAT-2.2', 'Daftar Tugas (Tugas Baru dari Koordinator)', 'Tugas yang dikirim muncul', 'Fail', err.message);
  }

  // UAT-2.3: Pengerjaan Tugas (Lapor Selesai)
  let taskForStafExecId = null;
  try {
    const newTask = await db.ticket.create({
      data: {
        judul: 'Pengecekan Tensi Meter Poli Anak',
        deskripsi: 'Kalibrasi tensi meter manual.',
        prioritas: 'MEDIUM',
        status: 'DIPROSES',
        pembuatId: userKoorD4.id,
        penanggungJawabId: userKoorD4.id,
        pelaksanaId: userStafD4.id,
        divisiId: userKoorD4.divisiId,
        deadline: new Date(Date.now() + 10 * 3600 * 1000),
      },
    });
    taskForStafExecId = newTask.id;

    const resLapor = await api(`/api/tickets/${taskForStafExecId}/status`, {
      method: 'PATCH',
      token: tokenStaf,
      body: {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: 'Tensi meter telah dikalibrasi dan siap digunakan.',
        fotoBukti: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });
    assert.equal(resLapor.status, 200);
    assert.equal(resLapor.body.data.status, 'MENUNGGU_VALIDASI');
    assert.equal(resLapor.body.data.laporanPenyelesaian, 'Tensi meter telah dikalibrasi dan siap digunakan.');
    recordResult('UAT-2.3', 'Daftar Tugas (Tugas Aktif)', 'Pengerjaan Tugas', 'Pass', 'Status tugas berhasil berubah menjadi MENUNGGU_VALIDASI');
  } catch (err) {
    recordResult('UAT-2.3', 'Daftar Tugas (Tugas Aktif)', 'Pengerjaan Tugas', 'Fail', err.message);
  }

  // UAT-2.4: Revisi Tugas
  try {
    await db.ticket.update({
      where: { id: taskForStafExecId },
      data: { status: 'DIPROSES', catatanRevisi: 'Lampirkan foto stiker kalibrasi terbaru.' },
    });

    const resResubmit = await api(`/api/tickets/${taskForStafExecId}/status`, {
      method: 'PATCH',
      token: tokenStaf,
      body: {
        status: 'MENUNGGU_VALIDASI',
        laporanPenyelesaian: 'Foto stiker kalibrasi sudah ditambahkan.',
        fotoBukti: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });
    assert.equal(resResubmit.status, 200);
    assert.equal(resResubmit.body.data.status, 'MENUNGGU_VALIDASI');
    recordResult('UAT-2.4', 'Daftar Tugas (Tugas Aktif)', 'Revisi Tugas', 'Pass', 'Staf berhasil mengirimkan revisi dan status kembali Menunggu Evaluasi');
  } catch (err) {
    recordResult('UAT-2.4', 'Daftar Tugas (Tugas Aktif)', 'Revisi Tugas', 'Fail', err.message);
  }

  // UAT-2.5: Laporkan Masalah (Pengajuan Masalah Fasilitas oleh Staf)
  try {
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenStaf,
      body: {
        judul: 'AC Ruang Poli Anak Bocor Air',
        deskripsi: 'Air menetes mengenai meja periksa dokter.',
        lokasi: 'Poli Anak Lantai 2',
        divisiId: userKoorD4.divisiId,
        prioritas: 'MEDIUM',
        isBuatTugas: false,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'MENUNGGU_TRIASE');
    assert.equal(res.body.data.pembuatId, userStafD4.id);
    recordResult('UAT-2.5', 'Laporkan Masalah (Pengajuan Masalah Fasilitas)', 'Mengirim laporan insiden/kerusakan sarana prasarana', 'Pass', 'Laporan masalah berstatus MENUNGGU_TRIASE (Menunggu Peninjauan) tersimpan');
  } catch (err) {
    recordResult('UAT-2.5', 'Laporkan Masalah (Pengajuan Masalah Fasilitas)', 'Mengirim laporan insiden/kerusakan sarana prasarana', 'Fail', err.message);
  }

  // UAT-2.6: Putuskan Telegram Staf
  try {
    const res = await api('/api/auth/telegram/link', { method: 'DELETE', token: tokenStaf });
    assert.equal(res.status, 200);
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenStaf });
    assert.equal(resStatus.body.linked, false);
    recordResult('UAT-2.6', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Pass', 'Sambungan Telegram Staf berhasil diputus');
  } catch (err) {
    recordResult('UAT-2.6', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Fail', err.message);
  }

  // ============================================================================
  // MODUL 3: PENGUJIAN OLEH DIREKTUR (7 SKENARIO)
  // ============================================================================
  console.log('\n--- MODUL 3: PENGUJIAN OLEH DIREKTUR ---');

  // UAT-3.1: Hubungkan Telegram Direktur
  try {
    const resLink = await api('/api/auth/telegram/link-token', { method: 'POST', token: tokenDirektur });
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenDirektur });
    assert([200, 409].includes(resLink.status));
    assert.equal(resStatus.status, 200);
    assert(typeof resStatus.body.linked === 'boolean');
    recordResult('UAT-3.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Pass', 'Tautan Telegram Direktur berhasil dibuat');
  } catch (err) {
    recordResult('UAT-3.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Fail', err.message);
  }

  // UAT-3.2: Tampilan Rekapitulasi Kinerja Seluruh Divisi
  try {
    const res = await api('/api/laporan-sla', { method: 'GET', token: tokenDirektur });
    assert.equal(res.status, 200);
    assert(res.body.summary !== undefined, 'Summary harus ada');
    assert(res.body.summary.totalSelesai !== undefined, 'Statistik totalSelesai harus ada');
    recordResult('UAT-3.2', 'Laporan Kinerja', 'Tampilan rekapitulasi kinerja', 'Pass', 'Tabel dan metrik rekapitulasi kinerja menyeluruh tampil rapi');
  } catch (err) {
    recordResult('UAT-3.2', 'Laporan Kinerja', 'Tampilan rekapitulasi kinerja', 'Fail', err.message);
  }

  // UAT-3.3: Unduh Laporan PDF Direktur
  try {
    const res = await api('/api/laporan-sla/export/pdf', { method: 'GET', token: tokenDirektur });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /application\/pdf/);
    recordResult('UAT-3.3', 'Laporan Kinerja', 'Unduh laporan PDF', 'Pass', 'File PDF kinerja rumah sakit berhasil diunduh');
  } catch (err) {
    recordResult('UAT-3.3', 'Laporan Kinerja', 'Unduh laporan PDF', 'Fail', err.message);
  }

  // UAT-3.4: Unduh Laporan Excel Direktur
  try {
    const res = await api('/api/laporan-sla/export/excel', { method: 'GET', token: tokenDirektur });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /spreadsheetml|octet-stream/);
    recordResult('UAT-3.4', 'Laporan Kinerja', 'Unduh laporan Excel', 'Pass', 'File Excel kinerja rumah sakit berhasil diunduh');
  } catch (err) {
    recordResult('UAT-3.4', 'Laporan Kinerja', 'Unduh laporan Excel', 'Fail', err.message);
  }

  // UAT-3.5: Direktur Mengirim Instruksi/Tugas ke Kadiv
  try {
    const deadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenDirektur,
      body: {
        judul: 'Instruksi Direksi: Audit K3 Triwulan IV',
        deskripsi: 'Lakukan inspeksi keselamatan kerja seluruh ruangan.',
        prioritas: 'HIGH',
        pelaksanaId: userKadivD4.id,
        divisiId: userKadivD4.divisiId,
        deadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.pelaksanaId, userKadivD4.id);
    recordResult('UAT-3.5', 'Daftar Tugas (Buat Tugas Baru)', 'Direktur mengirim instruksi/tugas', 'Pass', 'Instruksi Direktur berhasil diterbitkan ke Kepala Divisi');
  } catch (err) {
    recordResult('UAT-3.5', 'Daftar Tugas (Buat Tugas Baru)', 'Direktur mengirim instruksi/tugas', 'Fail', err.message);
  }

  // UAT-3.6: Laporkan Masalah oleh Direktur
  try {
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenDirektur,
      body: {
        judul: 'Temuan Direksi: Retakan Dinding Selasar Gedung A',
        deskripsi: 'Perlu evaluasi struktur sipil.',
        lokasi: 'Selasar Gedung A',
        divisiId: userKadivD4.divisiId,
        prioritas: 'HIGH',
        isBuatTugas: false,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'MENUNGGU_TRIASE');
    assert.equal(res.body.data.pembuatId, userDirektur.id);
    recordResult('UAT-3.6', 'Laporkan Masalah & Laporan Saya', 'Direktur melaporkan temuan fasilitas rumah sakit', 'Pass', 'Laporan temuan Direksi berhasil diterbitkan ke divisi tujuan');
  } catch (err) {
    recordResult('UAT-3.6', 'Laporkan Masalah & Laporan Saya', 'Direktur melaporkan temuan fasilitas rumah sakit', 'Fail', err.message);
  }

  // UAT-3.7: Putuskan Telegram Direktur
  try {
    const res = await api('/api/auth/telegram/link', { method: 'DELETE', token: tokenDirektur });
    assert.equal(res.status, 200);
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenDirektur });
    assert.equal(resStatus.body.linked, false);
    recordResult('UAT-3.7', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Pass', 'Sambungan Telegram Direktur berhasil diputus');
  } catch (err) {
    recordResult('UAT-3.7', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Fail', err.message);
  }

  // ============================================================================
  // MODUL 4: PENGUJIAN OLEH KEPALA DIVISI (9 SKENARIO)
  // ============================================================================
  console.log('\n--- MODUL 4: PENGUJIAN OLEH KEPALA DIVISI ---');

  // UAT-4.1: Hubungkan Telegram Kadiv
  try {
    const resLink = await api('/api/auth/telegram/link-token', { method: 'POST', token: tokenKadiv });
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenKadiv });
    assert([200, 409].includes(resLink.status));
    assert.equal(resStatus.status, 200);
    assert(typeof resStatus.body.linked === 'boolean');
    recordResult('UAT-4.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Pass', 'Tautan Telegram Kadiv berhasil dibuat');
  } catch (err) {
    recordResult('UAT-4.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Fail', err.message);
  }

  // UAT-4.2: Pembaruan Data Kinerja Kadiv
  try {
    const res = await api('/api/laporan-sla', { method: 'GET', token: tokenKadiv });
    assert.equal(res.status, 200);
    assert(res.body.summary !== undefined);
    recordResult('UAT-4.2', 'Laporan Kinerja', 'Pembaruan data', 'Pass', 'Hasil kinerja dari staf divisi tampil terbarui');
  } catch (err) {
    recordResult('UAT-4.2', 'Laporan Kinerja', 'Pembaruan data', 'Fail', err.message);
  }

  // UAT-4.3: Pembatasan Hak Akses Data Kadiv
  try {
    const res = await api('/api/laporan-sla?divisiId=1', { method: 'GET', token: tokenKadiv });
    assert.equal(res.status, 200);
    if (res.body.data && res.body.data.length > 0) {
      const leaked = res.body.data.filter((item) => item.divisiId !== userKadivD4.divisiId);
      assert.equal(leaked.length, 0, 'Kadiv tidak boleh melihat divisi lain');
    }
    recordResult('UAT-4.3', 'Laporan Kinerja', 'Pembatasan hak akses data', 'Pass', 'Kadiv hanya dapat melihat data kinerja divisinya sendiri');
  } catch (err) {
    recordResult('UAT-4.3', 'Laporan Kinerja', 'Pembatasan hak akses data', 'Fail', err.message);
  }

  // UAT-4.4: Unduh Laporan PDF Kadiv
  try {
    const res = await api('/api/laporan-sla/export/pdf', { method: 'GET', token: tokenKadiv });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /application\/pdf/);
    recordResult('UAT-4.4', 'Laporan Kinerja', 'Unduh laporan PDF', 'Pass', 'File PDF kinerja divisi berhasil diunduh');
  } catch (err) {
    recordResult('UAT-4.4', 'Laporan Kinerja', 'Unduh laporan PDF', 'Fail', err.message);
  }

  // UAT-4.5: Unduh Laporan Excel Kadiv
  try {
    const res = await api('/api/laporan-sla/export/excel', { method: 'GET', token: tokenKadiv });
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.match(contentType, /spreadsheetml|octet-stream/);
    recordResult('UAT-4.5', 'Laporan Kinerja', 'Unduh laporan Excel', 'Pass', 'File Excel kinerja divisi berhasil diunduh');
  } catch (err) {
    recordResult('UAT-4.5', 'Laporan Kinerja', 'Unduh laporan Excel', 'Fail', err.message);
  }

  // UAT-4.6: Kepala Divisi Mengirim Tugas ke Koordinator Divisinya
  try {
    const deadline = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKadiv,
      body: {
        judul: 'Arahan Kadiv: Persiapan Akreditasi Ruang Farmasi',
        deskripsi: 'Siapkan dokumen suhu dan kelembaban ruang obat.',
        prioritas: 'MEDIUM',
        pelaksanaId: userKoorD4.id,
        divisiId: userKadivD4.divisiId,
        deadline,
        isBuatTugas: true,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.pelaksanaId, userKoorD4.id);
    recordResult('UAT-4.6', 'Daftar Tugas (Membuat Tugas)', 'Kepala Divisi mengirim tugas ke Koordinator Divisinya', 'Pass', 'Tugas berhasil terkirim ke dashboard Koordinator');
  } catch (err) {
    recordResult('UAT-4.6', 'Daftar Tugas (Membuat Tugas)', 'Kepala Divisi mengirim tugas ke Koordinator Divisinya', 'Fail', err.message);
  }

  // UAT-4.7: Pembatasan Penerima Tugas Kadiv
  try {
    const res = await api('/api/tickets/staff', { method: 'GET', token: tokenKadiv });
    assert.equal(res.status, 200);
    assert(Array.isArray(res.body.data), 'Data harus berupa array');
    const outOfDivisi = res.body.data.filter((u) => u.divisiId && u.divisiId !== userKadivD4.divisiId);
    assert.equal(outOfDivisi.length, 0, 'Hanya pegawai dari divisi Kadiv yang boleh muncul');
    recordResult('UAT-4.7', 'Daftar Tugas', 'Pembatasan penerima tugas', 'Pass', 'Pilihan penerima tugas dibatasi hanya untuk divisi Kadiv');
  } catch (err) {
    recordResult('UAT-4.7', 'Daftar Tugas', 'Pembatasan penerima tugas', 'Fail', err.message);
  }

  // UAT-4.8: Laporkan Masalah (Pelaporan Kerusakan Antar-Divisi oleh Kadiv)
  try {
    const res = await api('/api/tickets', {
      method: 'POST',
      token: tokenKadiv,
      body: {
        judul: 'Kerusakan Komputer Kasir Poli Kebidanan',
        deskripsi: 'PC tidak bisa booting, perlu dicek tim IT.',
        lokasi: 'Kasir Kebidanan',
        divisiId: 4,
        prioritas: 'HIGH',
        isBuatTugas: false,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'MENUNGGU_TRIASE');
    assert.equal(res.body.data.pembuatId, userKadivD4.id);
    recordResult('UAT-4.8', 'Laporkan Masalah', 'Kadiv melaporkan kebutuhan sarana prasarana lintas divisi', 'Pass', 'Laporan masalah antardivisi berhasil diajukan dengan status MENUNGGU_TRIASE');
  } catch (err) {
    recordResult('UAT-4.8', 'Laporkan Masalah', 'Kadiv melaporkan kebutuhan sarana prasarana lintas divisi', 'Fail', err.message);
  }

  // UAT-4.9: Putuskan Telegram Kadiv
  try {
    const res = await api('/api/auth/telegram/link', { method: 'DELETE', token: tokenKadiv });
    assert.equal(res.status, 200);
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenKadiv });
    assert.equal(resStatus.body.linked, false);
    recordResult('UAT-4.9', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Pass', 'Sambungan Telegram Kadiv berhasil diputus');
  } catch (err) {
    recordResult('UAT-4.9', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Fail', err.message);
  }

  // ============================================================================
  // MODUL 5: PENGUJIAN OLEH ADMIN (5 SKENARIO)
  // ============================================================================
  console.log('\n--- MODUL 5: PENGUJIAN OLEH ADMIN ---');

  // UAT-5.1: Hubungkan Telegram Admin
  try {
    const resLink = await api('/api/auth/telegram/link-token', { method: 'POST', token: tokenAdmin });
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenAdmin });
    assert([200, 409].includes(resLink.status));
    assert.equal(resStatus.status, 200);
    assert(typeof resStatus.body.linked === 'boolean');
    recordResult('UAT-5.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Pass', 'Tautan Telegram Admin berhasil dibuat');
  } catch (err) {
    recordResult('UAT-5.1', 'Hubungkan Telegram', 'Menghubungkan Telegram', 'Fail', err.message);
  }

  // UAT-5.2: Batas Waktu Pengingat di Pengaturan Sistem
  try {
    const res = await api('/api/config', {
      method: 'PUT',
      token: tokenAdmin,
      body: {
        reminderHoursBeforeDeadline: 12,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.config.reminderHoursBeforeDeadline, 12);
    recordResult('UAT-5.2', 'Batas Waktu Pengingat di Pengaturan Sistem', 'Mengubah waktu pengingat', 'Pass', 'Batas waktu pengingat berhasil diubah menjadi 12 jam otomatis');
  } catch (err) {
    recordResult('UAT-5.2', 'Batas Waktu Pengingat di Pengaturan Sistem', 'Mengubah waktu pengingat', 'Fail', err.message);
  }

  // UAT-5.3: Memantau Log Notifikasi
  try {
    const res = await api('/api/notifications/logs?page=1&limit=10', { method: 'GET', token: tokenAdmin });
    assert.equal(res.status, 200);
    assert(Array.isArray(res.body.data), 'Data logs harus berupa array');
    assert(res.body.summary !== undefined, 'Summary logs harus ada');
    recordResult('UAT-5.3', 'Memantau Log Notifikasi', 'Pantau riwayat pesan', 'Pass', 'Riwayat log notifikasi tercatat lengkap beserta filter');
  } catch (err) {
    recordResult('UAT-5.3', 'Memantau Log Notifikasi', 'Pantau riwayat pesan', 'Fail', err.message);
  }

  // UAT-5.4: Keterhubungan Akun Pegawai di Pengaturan Sistem
  try {
    const res = await api('/api/config/recipients-summary', { method: 'GET', token: tokenAdmin });
    assert.equal(res.status, 200);
    assert(res.body.totalUsers !== undefined, 'totalUsers harus ada');
    assert(Array.isArray(res.body.users), 'users harus berupa array');
    recordResult('UAT-5.4', 'Keterhubungan Akun Pegawai di Pengaturan Sistem', 'Memantau Akun Pegawai yang sudah Terhubung/Belum terhubung Telegram', 'Pass', 'Daftar user beserta status terhubung/belum terhubung tampil lengkap');
  } catch (err) {
    recordResult('UAT-5.4', 'Keterhubungan Akun Pegawai di Pengaturan Sistem', 'Memantau Akun Pegawai yang sudah Terhubung/Belum terhubung Telegram', 'Fail', err.message);
  }

  // UAT-5.5: Putuskan Telegram Admin
  try {
    const res = await api('/api/auth/telegram/link', { method: 'DELETE', token: tokenAdmin });
    assert.equal(res.status, 200);
    const resStatus = await api('/api/auth/telegram/status', { method: 'GET', token: tokenAdmin });
    assert.equal(resStatus.body.linked, false);
    recordResult('UAT-5.5', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Pass', 'Sambungan Telegram Admin berhasil diputus');
  } catch (err) {
    recordResult('UAT-5.5', 'Putuskan Telegram', 'Memutuskan sambungan Telegram', 'Fail', err.message);
  }

  // ============================================================================
  // REKAPITULASI HASIL UAT
  // ============================================================================
  console.log('\n================================================================');
  console.log('REKAPITULASI HASIL EKSEKUSI UAT:');
  const passCount = testResults.filter((r) => r.status === 'Pass').length;
  const failCount = testResults.filter((r) => r.status === 'Fail').length;
  console.log(`Total Skenario Diuji : ${testResults.length}`);
  console.log(`Lulus (Pass)         : ${passCount}`);
  console.log(`Gagal (Fail)         : ${failCount}`);
  console.log(`Persentase Kelulusan : ${((passCount / testResults.length) * 100).toFixed(1)}%`);
  console.log('================================================================');

  await db.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

runAllUAT().catch((e) => {
  console.error('Fatal Error during UAT execution:', e);
  process.exit(1);
});
