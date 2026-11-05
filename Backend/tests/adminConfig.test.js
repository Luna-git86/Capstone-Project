// Backend/tests/adminConfig.test.js
const { describe, it, before, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { app } = require('../index');
const systemConfigStore = require('../config/systemConfigStore');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'RSIA_QURRATA_AYUN_SECRET_KEY_2026';

function generateTestToken(user) {
  return jwt.sign(
    {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      divisiId: user.divisiId || 1,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const adminUser = { id: 1, nama: 'Super Admin RSIA', email: 'admin@rsia.com', role: 'ADMIN' };
const direkturUser = { id: 2, nama: 'dr. Direktur', email: 'direktur@rsia.com', role: 'DIREKTUR' };
const kadivUser = { id: 3, nama: 'dr. Kadiv Medis', email: 'kadiv@rsia.com', role: 'KADIV' };
const koordinatorUser = { id: 4, nama: 'Koordinator Poli', email: 'koor@rsia.com', role: 'KOORDINATOR' };
const stafUser = { id: 5, nama: 'Staf Perawat', email: 'staf@rsia.com', role: 'STAF' };

const adminToken = generateTestToken(adminUser);
const direkturToken = generateTestToken(direkturUser);
const kadivToken = generateTestToken(kadivUser);
const koordinatorToken = generateTestToken(koordinatorUser);
const stafToken = generateTestToken(stafUser);

// Helper simulasi HTTP request ke Express app
async function mockRequest(app, { method, url, token, body }) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = http.createServer(app);
    server.listen(0, () => {
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
        resolve({ statusCode: 500, error: err.message });
      });

      if (payload) req.write(payload);
      req.end();
    });
  });
}

describe('MODUL 6 – ADMIN CONFIGURATION TEST SUITE (18 Skenario UAT)', () => {
  afterEach(() => {
    systemConfigStore._resetConfig();
  });

  // 1. GET /api/config mengembalikan 200 untuk ADMIN
  it('1. GET /api/config mengembalikan 200 dengan struktur konfigurasi lengkap untuk ADMIN', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: adminToken,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.config);
    assert.ok(typeof res.body.config.telegramEnabled === 'boolean');
    assert.ok(typeof res.body.config.maxRetryAttempts === 'number');
    assert.ok(typeof res.body.config.reminderHoursBeforeDeadline === 'number');
    assert.ok(res.body.config.enabledNotificationTypes);
    assert.ok(res.body.config.slaHours);
  });

  // 2. GET /api/config menolak KADIV (403)
  it('2. GET /api/config menolak role KADIV dengan status 403 Forbidden', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: kadivToken,
    });
    assert.equal(res.statusCode, 403);
  });

  // 3. GET /api/config menolak KOORDINATOR (403)
  it('3. GET /api/config menolak role KOORDINATOR dengan status 403 Forbidden', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: koordinatorToken,
    });
    assert.equal(res.statusCode, 403);
  });

  // 4. GET /api/config menolak STAF (403)
  it('4. GET /api/config menolak role STAF dengan status 403 Forbidden', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: stafToken,
    });
    assert.equal(res.statusCode, 403);
  });

  // 5. GET /api/config menolak DIREKTUR (403)
  it('5. GET /api/config menolak role DIREKTUR dengan status 403 Forbidden', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: direkturToken,
    });
    assert.equal(res.statusCode, 403);
  });

  // 6. Request tanpa token ditolak (401)
  it('6. Request tanpa token ditolak dengan status 401 Unauthorized', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
    });
    assert.equal(res.statusCode, 401);
  });

  // 7. Token bot di-mask dan tidak diekspos dalam plain text
  it('7. Masking kredensial: response GET /api/config tidak membocorkan plain bot token', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config',
      token: adminToken,
    });
    assert.equal(res.statusCode, 200);
    assert.ok(!res.body.config.TELEGRAM_BOT_TOKEN);
    assert.ok(!res.body.config.botToken);
    if (res.body.metadata?.tokenMasked) {
      assert.ok(res.body.metadata.tokenMasked.includes('...'));
    }
  });

  // 8. PUT /api/config toggle telegramEnabled
  it('8. PUT /api/config berhasil memperbarui telegramEnabled (toggle ON / OFF)', async () => {
    const resOff = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { telegramEnabled: false },
    });
    assert.equal(resOff.statusCode, 200);
    assert.equal(resOff.body.config.telegramEnabled, false);
    assert.equal(systemConfigStore.isTelegramEnabled(), false);

    const resOn = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { telegramEnabled: true },
    });
    assert.equal(resOn.statusCode, 200);
    assert.equal(resOn.body.config.telegramEnabled, true);
    assert.equal(systemConfigStore.isTelegramEnabled(), true);
  });

  // 9. PUT /api/config maxRetryAttempts valid
  it('9. PUT /api/config berhasil memperbarui maxRetryAttempts (1-10)', async () => {
    const res = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { maxRetryAttempts: 5 },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.config.maxRetryAttempts, 5);
    assert.equal(systemConfigStore.getMaxRetryAttempts(), 5);
  });

  // 10. PUT /api/config menolak maxRetryAttempts invalid (<1 atau >10)
  it('10. PUT /api/config menolak maxRetryAttempts invalid (<1 atau >10) dengan 400', async () => {
    const resZero = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { maxRetryAttempts: 0 },
    });
    assert.equal(resZero.statusCode, 400);

    const resTooHigh = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { maxRetryAttempts: 99 },
    });
    assert.equal(resTooHigh.statusCode, 400);
  });

  // 11. PUT /api/config reminderHoursBeforeDeadline valid
  it('11. PUT /api/config berhasil memperbarui reminderHoursBeforeDeadline', async () => {
    const res = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { reminderHoursBeforeDeadline: 12 },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.config.reminderHoursBeforeDeadline, 12);
    assert.equal(systemConfigStore.getReminderHours(), 12);
  });

  // 12. PUT /api/config menolak reminderHoursBeforeDeadline invalid
  it('12. PUT /api/config menolak reminderHoursBeforeDeadline negatif atau > 168 jam dengan 400', async () => {
    const resNeg = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { reminderHoursBeforeDeadline: -5 },
    });
    assert.equal(resNeg.statusCode, 400);

    const resOver = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { reminderHoursBeforeDeadline: 500 },
    });
    assert.equal(resOver.statusCode, 400);
  });

  // 13. PUT /api/config toggle per event notifikasi
  it('13. PUT /api/config berhasil memperbarui toggle per event notifikasi (enabledNotificationTypes)', async () => {
    const res = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: {
        enabledNotificationTypes: {
          DIRECTIVE_ASSIGNED: false,
          TASK_ASSIGNED: true,
          DEADLINE_SOON: false,
        },
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.config.enabledNotificationTypes.DIRECTIVE_ASSIGNED, false);
    assert.equal(res.body.config.enabledNotificationTypes.TASK_ASSIGNED, true);
    assert.equal(res.body.config.enabledNotificationTypes.DEADLINE_SOON, false);
    assert.equal(systemConfigStore.isNotificationTypeEnabled('DIRECTIVE_ASSIGNED'), false);
    assert.equal(systemConfigStore.isNotificationTypeEnabled('TASK_ASSIGNED'), true);
  });

  // 14. PUT /api/config target SLA per prioritas
  it('14. PUT /api/config berhasil memperbarui durasi target SLA per prioritas (slaHours)', async () => {
    const res = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: {
        slaHours: {
          RENDAH: 96,
          URGENT: 4,
        },
      },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.config.slaHours.RENDAH, 96);
    assert.equal(res.body.config.slaHours.URGENT, 4);
    assert.equal(res.body.config.slaHours.SEDANG, 48); // nilai default tetap utuh
  });

  // 15. AuditLog mencatat pembaruan konfigurasi
  it('15. PUT /api/config mencatat riwayat perubahan ke tabel AuditLog dengan data admin pengeksekusi', async () => {
    const res = await mockRequest(app, {
      method: 'PUT',
      url: '/api/config',
      token: adminToken,
      body: { maxRetryAttempts: 4 },
    });
    assert.equal(res.statusCode, 200);

    const latestAudit = await prisma.auditLog.findFirst({
      where: { entityType: 'SystemConfig' },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(latestAudit);
    assert.equal(latestAudit.action, 'UPDATE_SYSTEM_CONFIG');
    assert.equal(latestAudit.userId, adminUser.id);
    const details = JSON.parse(latestAudit.details);
    assert.equal(details.updatedConfig.maxRetryAttempts, 4);
  });

  // 16. GET /api/config/telegram-status mengembalikan health-check status bot
  it('16. GET /api/config/telegram-status mengembalikan health check koneksi bot Telegram', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config/telegram-status',
      token: adminToken,
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.status);
    assert.ok(['CONNECTED', 'NOT_CONFIGURED', 'ERROR', 'UNREACHABLE'].includes(res.body.status));
  });

  // 17. GET /api/config/recipients-summary mengembalikan statistik akun Telegram pegawai
  it('17. GET /api/config/recipients-summary mengembalikan agregasi akun pegawai terhubung vs belum terhubung', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config/recipients-summary',
      token: adminToken,
    });
    assert.equal(res.statusCode, 200);
    assert.ok(typeof res.body.totalUsers === 'number');
    assert.ok(typeof res.body.totalLinked === 'number');
    assert.ok(typeof res.body.totalUnlinked === 'number');
    assert.ok(res.body.summaryByRole);
    assert.ok(Array.isArray(res.body.users));
  });

  // 18. GET /api/config/audit-logs mengembalikan log perubahan konfigurasi
  it('18. GET /api/config/audit-logs mengembalikan daftar riwayat log konfigurasi sistem', async () => {
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/config/audit-logs',
      token: adminToken,
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.data));
  });
});
