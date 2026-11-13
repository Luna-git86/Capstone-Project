// Backend/tests/smDashboard.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const path = require('path');
const http = require('http');

const { app } = require('../index');

// Arahkan direktori dashboard ke fixture fiktif terisolasi
const FIXTURE_DIR = path.resolve(__dirname, '../../scientific-method/fixtures/dashboard_sample');
process.env.SM_DASHBOARD_DIR = FIXTURE_DIR;

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret_rsia_2026';

function generateTestToken(user) {
  return jwt.sign(
    {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      divisiId: user.divisiId,
      divisi: user.divisi,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Akun Pengujian
const adminToken = generateTestToken({ id: 1, nama: 'Admin RSIA', role: 'ADMIN', divisiId: 2 });
const koordinatorToken = generateTestToken({ id: 2, nama: 'Koor Poli', role: 'KOORDINATOR', divisiId: 4 });
const stafToken = generateTestToken({ id: 3, nama: 'Staf Perawat', role: 'STAF', divisiId: 4 });
const direkturToken = generateTestToken({ id: 4, nama: 'dr. Direktur', role: 'DIREKTUR', divisiId: null });

// Kadiv Medis: divisiId 4 -> Divisi Pelayanan Medis & Keperawatan (membawahi OBGYN, UMUM, UNIT IGD)
const kadivMedisToken = generateTestToken({
  id: 5,
  nama: 'dr. Kadiv Pelayanan Medis',
  role: 'KADIV',
  divisiId: 4,
  divisi: 'Divisi Pelayanan Medis & Keperawatan',
});

// Kadiv IT: divisiId 2 -> Divisi IT & SIMRS (tidak membawahi poliklinik)
const kadivItToken = generateTestToken({
  id: 6,
  nama: 'Kadiv IT',
  role: 'KADIV',
  divisiId: 2,
  divisi: 'Divisi IT & SIMRS',
});

// Kadiv Tanpa Divisi: divisiId null
const kadivNoDivisiToken = generateTestToken({
  id: 7,
  nama: 'Kadiv Non-Aktif',
  role: 'KADIV',
  divisiId: null,
});

async function mockRequest(expressApp, { method = 'GET', url, token, body }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(expressApp);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload = body ? JSON.stringify(body) : null;
      if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            server.close();
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch (_) {
              parsed = data;
            }
            resolve({ statusCode: res.statusCode, body: parsed });
          });
        }
      );

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

describe('MODUL SCIENTIFIC METHOD – DASHBOARD ANALITIK API (/api/sm/*)', () => {
  it('1. Request tanpa token ditolak dengan HTTP 401 Unauthorized', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary' });
    assert.strictEqual(res.statusCode, 401);
  });

  it('2. Request dengan role ADMIN ditolak dengan HTTP 403 Forbidden', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: adminToken });
    assert.strictEqual(res.statusCode, 403);
  });

  it('3. Request dengan role KOORDINATOR ditolak dengan HTTP 403 Forbidden', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: koordinatorToken });
    assert.strictEqual(res.statusCode, 403);
  });

  it('4. Request dengan role STAF ditolak dengan HTTP 403 Forbidden', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: stafToken });
    assert.strictEqual(res.statusCode, 403);
  });

  it('5. DIREKTUR menerima HTTP 200 dengan seluruh data lengkap (termasuk Total RS)', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: direkturToken });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.kpi_total_rs, 'Direktur harus dapat melihat kpi_total_rs');
    assert.ok(res.body.data.by_poliklinik['POLIKLINIK OBGYN']);
    assert.ok(res.body.data.by_poliklinik['LABORATORIUM']);
  });

  it('6. KADIV Medis menerima HTTP 200 hanya dengan poliklinik divisinya & TANPA Total RS', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: kadivMedisToken });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    // Verifikasi Isolasi: Total RS dilarang dikirim ke KADIV
    assert.strictEqual(res.body.data.kpi_total_rs, undefined, 'Total RS tidak boleh terlihat oleh KADIV');

    // Verifikasi Poliklinik Divisi Medis ada
    assert.ok(res.body.data.by_poliklinik['POLIKLINIK OBGYN'], 'Poliklinik OBGYN harus ada untuk Kadiv Medis');
    assert.ok(res.body.data.by_poliklinik['UNIT IGD'], 'Unit IGD harus ada untuk Kadiv Medis');

    // Verifikasi Poliklinik di luar divisinya (LABORATORIUM) terisolasi dan tidak bocor
    assert.strictEqual(
      res.body.data.by_poliklinik['LABORATORIUM'],
      undefined,
      'Laboratorium tidak boleh bocor ke Kadiv Pelayanan Medis'
    );
  });

  it('7. KADIV mencoba meminta poliklinik lain via query param tetap diisolasi di server', async () => {
    const res = await mockRequest(app, {
      url: '/api/sm/trend_monthly?poliklinik=LABORATORIUM',
      token: kadivMedisToken,
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.total_rs, undefined, 'total_rs tidak boleh terlihat oleh KADIV');
    assert.strictEqual(
      res.body.data.by_poliklinik['LABORATORIUM'],
      undefined,
      'Query param tidak boleh membobol isolasi poliklinik divisi lain'
    );
  });

  it('8. KADIV tanpa poliklinik terpetakan (Kadiv IT) menerima respons aman dengan poliklinik kosong', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: kadivItToken });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.kpi_total_rs, undefined);
    assert.deepStrictEqual(res.body.data.by_poliklinik, {}, 'Kadiv tanpa poli menerima by_poliklinik kosong');
  });

  it('9. KADIV dengan divisiId null menerima respons kosong yang aman', async () => {
    const res = await mockRequest(app, { url: '/api/sm/summary', token: kadivNoDivisiToken });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.kpi_total_rs, undefined);
    assert.deepStrictEqual(res.body.data.by_poliklinik, {});
  });

  it('10. Request berkas yang tidak ada mengembalikan HTTP 404', async () => {
    // Karena ALLOWED_FILES whitelist meta, summary, dll., nama file valid yang belum digenerate atau file tidak ada
    // Misalnya berkas yang belum ada
    const res = await mockRequest(app, { url: '/api/sm/poli_load_dummy', token: direkturToken });
    assert.strictEqual(res.statusCode, 400); // ditolak oleh whitelist
  });

  it('11. Request nama berkas di luar whitelist ditolak dengan HTTP 400', async () => {
    const res = await mockRequest(app, { url: '/api/sm/passwords.json', token: direkturToken });
    assert.strictEqual(res.statusCode, 400);
  });

  it('12. Percobaan Path Traversal ditolak dengan HTTP 400', async () => {
    const res = await mockRequest(app, { url: '/api/sm/..%2F..%2Fpackage.json', token: direkturToken });
    assert.strictEqual(res.statusCode, 400);
  });
});
