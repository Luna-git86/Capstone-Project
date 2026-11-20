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

  it('4. Seluruh endpoint stage-data (tab1 s.d. tab6) mengembalikan angka riil & nol PII', async () => {
    const t1 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab1', token: pengujiToken });
    assert.equal(t1.status, 200);
    assert.equal(t1.body.data.loadSummary.status, 'BERHASIL');
    assert.equal(t1.body.data.loadSummary.totalRowsLoaded, 39042);
    assert.equal(t1.body.data.loadSummary.totalColumns, 9);
    assert.equal(t1.body.data.loadSummary.preprocessingApplied, false);
    assert.equal(t1.body.data.loadSummary.hashingApplied, false);
    assert.equal(t1.body.data.loadSummary.saltingApplied, false);
    assert.equal(t1.body.data.loadSummary.labelNormalizationApplied, false);
    assert.equal(t1.body.data.rawColumns.length, 9);
    assert.ok(t1.body.data.rawPoliklinikDistribution.some((u) => u.poliklinik === 'IGD'));
    assert.ok(t1.body.data.rawPoliklinikDistribution.some((u) => u.poliklinik === 'Unit IGD'));
    assert.ok(t1.body.data.penjaminDistribution.some((p) => p.penjamin === '-'));
    assert.ok(t1.body.data.sampleRawRows.length >= 5);
    assert.ok(t1.body.data.sampleRawRows[0].pasienRaw.length > 0);
    assert.ok(!t1.body.data.sampleRawRows[0].pasienRaw.includes('Tutup Layar'));
    assert.ok(t1.body.data.sampleRawRows[0].noRmRaw.length > 0);
    assert.ok(!t1.body.data.sampleRawRows[0].noRmRaw.includes('Hash'));
    assert.ok(t1.body.data.sampleRawRows[0].dokterRaw.length > 0);
    assert.ok(t1.body.data.sampleRawRows[0].noRawatRaw.length > 0);
    assert.ok(!t1.body.data.sampleRawRows[0].noRawatRaw.includes('***'));

    const t2 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab2', token: pengujiToken });
    assert.equal(t2.status, 200);
    assert.equal(t2.body.data.stage2Summary.totalDays, 1277);
    assert.equal(t2.body.data.stage2Summary.duplicates, 0);
    assert.equal(t2.body.data.preprocessingSteps.length, 9);
    assert.ok(t2.body.data.sampleAnonymizedRows.length >= 5);
    assert.ok(t2.body.data.sampleAnonymizedRows[0].rmHashPreview);
    assert.equal(t2.body.data.dailySampleRows.length, 10);
    assert.ok('visitCount' in t2.body.data.dailySampleRows[0]);

    const t3 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab3', token: pengujiToken });
    assert.equal(t3.status, 200);
    assert.equal(t3.body.data.featureCount, 14);
    assert.equal(t3.body.data.sampleEngineeredRows.length, 10);

    const t4 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab4', token: pengujiToken });
    assert.equal(t4.status, 200);
    assert.equal(t4.body.data.bestModel, 'HistGradientBoosting');
    assert.equal(t4.body.data.leaderboard.length, 3);

    const t5 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab5', token: pengujiToken });
    assert.equal(t5.status, 200);
    assert.equal(t5.body.data.hypotheses.length, 3);
    assert.ok(t5.body.data.figures.length >= 3);

    const t6 = await requestApp({ pathUrl: '/api/uat-sm/stage-data/tab6', token: pengujiToken });
    assert.equal(t6.status, 200);
    assert.equal(t6.body.data.projection2026.h2Projected, 3798);
    assert.equal(t6.body.data.dashboardFiles.length, 9);
    assert.equal(t6.body.data.recommendations, undefined);
    assert.ok(t6.body.data.dashboardViews.length >= 4);
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

  it('9. Endpoint /check-excel sudah dihapus (404) & stage1_understanding memuat 4 berkas mentah tanpa preprocessing', async () => {
    const removedRes = await requestApp({
      method: 'POST',
      pathUrl: '/api/uat-sm/check-excel',
      token: pengujiToken,
      body: { fileName: 'test.csv', contentBase64: 'YQ==' },
    });
    assert.equal(removedRes.status, 404);

    const runRes = await requestApp({
      method: 'POST',
      pathUrl: '/api/uat-sm/run/stage1_understanding',
      token: pengujiToken,
    });
    assert.equal(runRes.status, 200);
    assert.equal(runRes.body.success, true);
    assert.equal(runRes.body.refreshedTab.tab1.loadSummary.status, 'BERHASIL');
    assert.equal(runRes.body.refreshedTab.tab1.loadSummary.totalRowsLoaded, 39042);
    assert.equal(runRes.body.refreshedTab.tab1.loadSummary.preprocessingApplied, false);
  });
});
