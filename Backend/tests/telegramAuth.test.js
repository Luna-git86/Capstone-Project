// Backend/tests/telegramAuth.test.js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const http = require('http');
const { app } = require('../index');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026';

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

async function mockRequest(app, { method, url, token, body }) {
  return new Promise((resolve) => {
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

describe('Telegram Auth Endpoints (/api/auth/telegram/*)', () => {
  let testUser;
  let testToken;

  before(async () => {
    // Cari user staf atau buat user dummy untuk pengetesan jika belum ada
    testUser = await prisma.user.findFirst({
      where: { role: 'STAF' },
    });

    if (!testUser) {
      testUser = await prisma.user.findFirst();
    }

    if (testUser) {
      testToken = generateTestToken(testUser);
    }
  });

  it('1. POST /api/auth/telegram/link-token tanpa auth ditolak 401', async () => {
    const res = await mockRequest(app, {
      method: 'POST',
      url: '/api/auth/telegram/link-token',
    });
    assert.equal(res.statusCode, 401);
  });

  it('2. GET /api/auth/telegram/status dengan token mengembalikan status linked', async () => {
    if (!testUser) return;
    const res = await mockRequest(app, {
      method: 'GET',
      url: '/api/auth/telegram/status',
      token: testToken,
    });
    assert.equal(res.statusCode, 200);
    assert.equal(typeof res.body.linked, 'boolean');
  });

  it('3. POST /api/auth/telegram/link-token dengan token mengembalikan tautan atau status conflict jika sudah linked', async () => {
    if (!testUser) return;
    const res = await mockRequest(app, {
      method: 'POST',
      url: '/api/auth/telegram/link-token',
      token: testToken,
    });
    // Jika user belum linked: 200 dengan link t.me
    // Jika user sudah linked: 409
    assert.ok(res.statusCode === 200 || res.statusCode === 409);
    if (res.statusCode === 200) {
      assert.ok(res.body.link);
      assert.match(res.body.link, /^https:\/\/t\.me\//);
    }
  });
});
