// Backend/controllers/authController.js
const prisma = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const DAFTAR_DIVISI_RSIA = [
  'Pelayanan Medis',
  'Penunjang Medis',
  'Keperawatan & Kebidanan',
  'Umum & IT',
  'Administrasi & Keuangan',
  'HRD & Marketing',
];

// Normalisasi Nomor HP (menghapus spasi/strip dan menyeragamkan awalan +62/62 menjadi 08)
const normalizePhone = (phone = '') => {
  let cleaned = String(phone).replace(/[\s\-]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
};

const ensureDivisiSeeded = async () => {
  const count = await prisma.divisi.count();
  if (count === 0) {
    for (const nama of DAFTAR_DIVISI_RSIA) {
      await prisma.divisi.upsert({
        where: { nama },
        update: {},
        create: { nama },
      });
    }
  }
};

// 1. Registrasi Akun Baru oleh Admin Sistem (UAT-1.1)
const register = async (req, res) => {
  try {
    await ensureDivisiSeeded();

    const { nama, noHp, email, password, role, divisiId, idDivisi } = req.body;

    if (!nama || !noHp || !password) {
      return res.status(400).json({ message: 'Nama, Nomor HP, dan password wajib diisi.' });
    }

    const cleanNoHp = normalizePhone(noHp);
    const cleanEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { noHp: cleanNoHp },
          ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Nomor HP atau Email sudah terdaftar di sistem.' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const parsedDivisiId = divisiId || idDivisi ? Number(divisiId || idDivisi) : null;
    const assignedRole = role || 'STAF';

    const newUser = await prisma.user.create({
      data: {
        nama: nama.trim(),
        noHp: cleanNoHp,
        email: cleanEmail,
        password: hashedPassword,
        role: assignedRole,
        divisiId: parsedDivisiId,
      },
      include: {
        divisi: true,
      },
    });

    if (req.user && req.user.id) {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_USER_RBAC',
          entityType: 'User',
          entityId: newUser.id,
          userId: req.user.id,
          details: `Admin mendaftarkan akun ${newUser.nama} (No HP: ${newUser.noHp}) dengan role ${newUser.role}`,
        },
      });
    }

    return res.status(201).json({
      message: `Akun ${newUser.nama} (${newUser.noHp}) berhasil didaftarkan!`,
      user: {
        id: newUser.id,
        nama: newUser.nama,
        noHp: newUser.noHp,
        email: newUser.email,
        role: newUser.role,
        divisi: newUser.divisi,
      },
    });
  } catch (error) {
    console.error('Error pada register:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat membuat akun.' });
  }
};

// 2. Login Pengguna Menggunakan Nomor HP atau Email
const login = async (req, res) => {
  try {
    const { noHp, email, identifier, password } = req.body;
    const rawKey = (noHp || identifier || email || '').trim();

    if (!rawKey || !password) {
      return res.status(400).json({ message: 'Nomor HP dan password wajib diisi.' });
    }

    const cleanPhoneKey = normalizePhone(rawKey);
    const cleanEmailKey = rawKey.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { noHp: rawKey },
          { noHp: cleanPhoneKey },
          { email: cleanEmailKey },
        ],
      },
      include: { divisi: true },
    });

    if (!user) {
      console.log(`[LOGIN GAGAL] Akun dengan input "${rawKey}" tidak ditemukan di database.`);
      return res.status(401).json({
        message: 'Nomor HP belum terdaftar. Pastikan akun sudah disimpan di Dashboard Admin.',
      });
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);
    if (!isPasswordValid) {
      console.log(`[LOGIN GAGAL] Password salah untuk akun ${user.nama} (${user.noHp}).`);
      return res.status(401).json({ message: 'Password yang Anda masukkan salah.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, divisiId: user.divisiId },
      process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        noHp: user.noHp,
        email: user.email,
        role: user.role,
        divisiId: user.divisiId,
        namaDivisi: user.divisi?.nama || null,
      },
    });
  } catch (error) {
    console.error('Error pada login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.' });
  }
};

// 3. Reset Password Akun oleh Admin Sistem (Recorded in AuditLog)
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ message: 'Password baru minimal harus 6 karakter.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);

    await prisma.user.update({
      where: { id: Number(id) },
      data: { password: hashedPassword },
    });

    // Catat tindakan reset password ke AuditLog (UAT-6.1)
    if (req.user && req.user.id) {
      await prisma.auditLog.create({
        data: {
          action: 'RESET_PASSWORD_USER',
          entityType: 'User',
          entityId: targetUser.id,
          userId: req.user.id,
          details: `Admin mereset password untuk akun ${targetUser.nama} (${targetUser.noHp})`,
        },
      });
    }

    return res.status(200).json({
      message: `Password untuk ${targetUser.nama} (${targetUser.noHp}) berhasil direset!`,
    });
  } catch (error) {
    console.error('Error saat reset password:', error);
    return res.status(500).json({ message: 'Gagal mereset password pengguna.' });
  }
};

// 4. Ambil Daftar Semua Akun untuk Tabel Matriks RBAC Admin
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        noHp: true,
        email: true,
        role: true,
        divisiId: true,
        divisi: {
          select: { id: true, nama: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ data: users });
  } catch (error) {
    console.error('Error mengambil daftar user:', error);
    return res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
  }
};

// 5. Ambil Daftar Semua Divisi
const getDivisi = async (req, res) => {
  try {
    await ensureDivisiSeeded();
    const divisi = await prisma.divisi.findMany({
      orderBy: { id: 'asc' },
    });
    return res.status(200).json({ data: divisi });
  } catch (error) {
    console.error('Error mengambil daftar divisi:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar divisi.' });
  }
};

const createTelegramLink = async (req, res) => {
  try {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;

    if (!botUsername) {
      return res.status(500).json({
        message: 'TELEGRAM_BOT_USERNAME belum dikonfigurasi.',
      });
    }

    const userId = Number(req.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: 'Identitas pengguna tidak valid.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramChatId: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Pengguna tidak ditemukan.',
      });
    }

    if (user.telegramChatId) {
      return res.status(409).json({
        message: 'Akun Telegram pengguna sudah terhubung.',
      });
    }

    // Token acak 64 karakter, sesuai batas payload Telegram
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Simpan hash token, bukan token aslinya
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Hapus token lama yang belum digunakan, lalu buat token baru
    await prisma.$transaction([
      prisma.telegramLinkToken.deleteMany({
        where: {
          userId,
          usedAt: null,
        },
      }),

      prisma.telegramLinkToken.create({
        data: {
          tokenHash,
          userId,
          expiresAt,
        },
      }),
    ]);

    const cleanUsername = botUsername.replace(/^@/, '');

    return res.status(200).json({
      message: 'Tautan penghubung Telegram berhasil dibuat.',
      link: `https://t.me/${cleanUsername}?start=${rawToken}`,
      expiresIn: 600,
    });
  } catch (error) {
    console.error('Gagal membuat tautan Telegram:', error);

    return res.status(500).json({
      message: 'Gagal membuat tautan penghubung Telegram.',
    });
  }
};

module.exports = {
  register,
  login,
  resetPassword,
  getUsers,
  getDivisi,
  createTelegramLink,
};