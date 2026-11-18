// Backend/tests/uatSm.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const http = require('http');

const { app } = require('../index');
const { assertNoPiiLeak } = require('../controllers/uatSmController');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret_rsia_2026';

function signToken(role, divisiId = null) {
  return jwt.sign(
    {
      id: 99,
      nama: `Akun ${role}`,
      role,
      divisiId,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function requestApp({ method = 'GET', pathUrl, token, body }) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const rawBody = body ? JSON.stringify(body) : null;
      if (rawBody) headers['Content-Length'] = Buffer.byteLength(rawBody);

      const req = http.request(
        { hostname: '127.0.0.1', port, path: pathUrl, method, headers },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            server.close();
            const buf = Buffer.concat(chunks);
            const ct = res.headers['content-type'] || '';
            let parsed = buf.toString('utf-8');
            if (ct.includes('application/json')) {
              try {
                parsed = JSON.parse(parsed);
              } catch {
                // ignore parse fallback
              }
            }
            resolve({ status: res.statusCode, headers: res.headers, body: parsed, rawBytes: buf.length });
          });
        }
      );
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (rawBody) req.write(rawBody);
      req.end();
    });
  });
}

describe('UAT Scientific Method API (/api/uat-sm) RBAC & Security', () => {
  const pengujiToken = signToken('PENGUJI', null);
  const direkturToken = signToken('DIREKTUR', null);
  const kadivToken = signToken('KADIV', 4);
  const stafToken = signToken('STAF', 4);
  const adminToken = signToken('ADMIN', 2);

  it('1. Menolak akses tanpa token dengan 401', async () => {
    const res = await requestApp({ pathUrl: '/api/uat-sm/status' });
    assert.equal(res.status, 401);
  });

  it('2. Menolak role non-PENGUJI (DIREKTUR, KADIV, STAF, ADMIN) dengan 403', async () => {
    for (const tk of [direkturToken, kadivToken, stafToken, adminToken]) {
      const res = await requestApp({ pathUrl: '/api/uat-sm/status', token: tk });
      assert.equal(res.status, 403);
    }
  });

  it('3. Akun PENGUJI menerima status 8 tahapan pipeline dengan lengkap', async () => {
    const res = await requestApp({ pathUrl: '/api/uat-sm/status', token: pengujiToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.stages.length, 8);
  });

  it('4. Seluruh endpoint stage-data (tab1 s.d. tab5) mengembalikan angka riil & nol PII', async () => {
    const t1 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab1', token: pengujiToken });
    assert.equal(t1.status, 200);
    assert.equal(t1.body.data.kpi.totalVisits, 39042);
    assert.equal(t1.body.data.kpi.totalDays, 1277);
    assert.ok(t1.body.data.penjaminDistribution.length >= 4);
    assert.ok(t1.body.data.sampleRawRows.length >= 5);
    assert.ok(t1.body.data.sampleRawRows[0].pasienMask.includes('Disensor'));
    assert.ok(t1.body.data.sampleAnonymizedRows.length >= 5);
    assert.ok(t1.body.data.sampleAnonymizedRows[0].rmHashPreview);
    assert.equal(t1.body.data.dailySampleRows.length, 10);
    assert.ok('visitCount' in t1.body.data.dailySampleRows[0]);

    const t2 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab2', token: pengujiToken });
    assert.equal(t2.status, 200);
    assert.equal(t2.body.data.featureCount, 14);
    assert.equal(t2.body.data.sampleEngineeredRows.length, 10);

    const t3 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab3', token: pengujiToken });
    assert.equal(t3.status, 200);
    assert.equal(t3.body.data.bestModel, 'HistGradientBoosting');
    assert.equal(t3.body.data.leaderboard.length, 3);

    const t4 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab4', token: pengujiToken });
    assert.equal(t4.status, 200);
    assert.equal(t4.body.data.hypotheses.length, 3);
    assert.ok(t4.body.data.figures.length >= 3);

    const t5 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab5', token: pengujiToken });
    assert.equal(t5.status, 200);
    assert.equal(t5.body.data.projection2026.h2Projected, 3798);
    assert.equal(t5.body.data.dashboardFiles.length, 9);
    assert.equal(t5.body.data.recommendations, undefined);
    assert.ok(t5.body.data.dashboardViews.length >= 4);
  });

  it('5. Menolak stageId tidak valid, tabKey tidak valid, dan path traversal gambar', async () => {
    const badStage = await requestApp({
      method: 'POST',
      pathUrl: '/api/uat-sm/run/invalid;rm',
      token: pengujiToken,
    });
    assert.equal(badStage.status, 400);

    const badTab = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab99', token: pengujiToken });
    assert.equal(badTab.status, 400);

    const badFig = await requestApp({
      pathUrl: '/api/uat-sm/figure/..%2F..%2Fpackage.json',
      token: pengujiToken,
    });
    assert.equal(badFig.status, 400);
  });

  it('6. Endpoint figure menyajikan PNG ter-whitelist secara aman', async () => {
    const figRes = await requestApp({
      pathUrl: '/api/uat-sm/figure/06_prediksi_vs_aktual_2026.png',
      token: pengujiToken,
    });
    assert.equal(figRes.status, 200);
    assert.ok(figRes.rawBytes > 10000);
  });

  it('7. assertNoPiiLeak memblokir field identitas pasien bila muncul', () => {
    assert.throws(() => assertNoPiiLeak({ rows: [{ pasien: 'A', no_rm: '123' }] }, 'test'), /nol-PII/i);
  });

  it('8. POST /run/stage8_integrity_test menjalankan uji Python nyata dan mengembalikan 8 status LOLOS', async () => {
    const res = await requestApp({
      method: 'POST',
      pathUrl: '/api/uat-sm/run/stage8_integrity_test',
      token: pengujiToken,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.parsedTests.length, 8);
    assert.ok(res.body.parsedTests.every((t) => t.status === 'LOLOS'));
  });

  it('9. POST /check-excel memvalidasi file CSV uji tanpa menimpa data resmi RSIA', async () => {
    const sampleCsv = [
      'No. Rawat,Tgl Reg,Jam,Poliklinik,Penjamin,Jns Kunjungan',
      '2026/07/01/001,2026-07-01,08:15,POLIKLINIK OBGYN,BPJS,LAMA',
      '2026/07/01/002,2026-07-01,09:05,UNIT IGD,UMUM,BARU',
    ].join('\n');
    const res = await requestApp({
      method: 'POST',
      pathUrl: '/api/uat-sm/check-excel',
      token: pengujiToken,
      body: {
        fileName: 'uji_simulasi.csv',
        contentBase64: Buffer.from(sampleCsv, 'utf-8').toString('base64'),
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.inspection.totalRows, 2);
    assert.equal(res.body.inspection.isFormatCompatible, true);
    assert.equal(res.body.inspection.sampleRows.length, 2);
  });
});
