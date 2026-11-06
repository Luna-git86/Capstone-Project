// Backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_negara_api_2026';

// 1. Login Pengguna (UAT-1.1, UAT-1.5 s/d UAT-1.8, UAT-1.12)
const login = async (req, res) => {
  try {
    const { noHp, email, identifier, password } = req.body;
    const loginId = (noHp || identifier || email || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        message: 'Nomor HP dan kata sandi wajib diisi.',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { noHp: loginId },
          { email: loginId },
        ],
      },
      include: {
        divisi: { select: { id: true, nama: true } },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'Nomor HP atau kata sandi tidak sesuai.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Nomor HP atau kata sandi tidak sesuai.',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nama: user.nama,
        role: user.role,
        divisiId: user.divisiId,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: `${user.nama} (${user.role}) berhasil masuk ke sistem.`,
      },
    });

    return res.status(200).json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        nama: user.nama,
        noHp: user.noHp,
        email: user.email,
        role: user.role,
        divisiId: user.divisiId,
        divisi: user.divisi?.nama || null,
      },
    });
  } catch (error) {
    console.error('Error login:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server saat login.' });
  }
};

// 2. Registrasi / Tambah Akun Pegawai Baru oleh Admin (UAT-1.2)
const register = async (req, res) => {
  try {
    const { nama, noHp, email, password, role, divisiId } = req.body;

    if (!nama || !noHp || !password || !role) {
      return res.status(400).json({
        message: 'Nama, Nomor HP, Kata Sandi, dan Jabatan wajib diisi.',
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { noHp: noHp.trim() },
          ...(email ? [{ email: email.trim() }] : []),
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Nomor HP atau Email sudah terdaftar pada akun lain.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nama: nama.trim(),
        noHp: noHp.trim(),
        email: email && email.trim() !== '' ? email.trim() : null,
        password: hashedPassword,
        role,
        divisiId: divisiId ? Number(divisiId) : null,
      },
      include: {
        divisi: { select: { id: true, nama: true } },
      },
    });

    if (req.user?.id) {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE_USER',
          entityType: 'User',
          entityId: newUser.id,
          userId: Number(req.user.id),
          details: `Admin mendaftarkan akun baru: ${newUser.nama} sebagai ${newUser.role} (${newUser.divisi?.nama || 'Lintas Divisi'})`,
        },
      });
    }

    return res.status(201).json({
      message: `Akun ${newUser.nama} (${newUser.role}) berhasil ditambahkan!`,
      data: {
        id: newUser.id,
        nama: newUser.nama,
        noHp: newUser.noHp,
        email: newUser.email,
        role: newUser.role,
        divisiId: newUser.divisiId,
        divisi: newUser.divisi,
      },
    });
  } catch (error) {
    console.error('Error register:', error);
    return res.status(500).json({ message: 'Gagal mendaftarkan akun baru.' });
  }
};

// 3. Ambil Semua Daftar Akun Pegawai (Khusus Admin)
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
        divisi: { select: { id: true, nama: true } },
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error('Error getUsers:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar akun pegawai.' });
  }
};

// 4. Reset Kata Sandi Pegawai oleh Admin (UAT-1.3)
const resetPassword = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({
        message: 'Kata sandi baru minimal harus 6 karakter.',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Akun pegawai tidak ditemukan.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        action: 'RESET_PASSWORD',
        entityType: 'User',
        entityId: targetUser.id,
        userId: Number(req.user.id),
        details: `Admin mengatur ulang kata sandi untuk akun ${targetUser.nama} (${targetUser.role})`,
      },
    });

    return res.status(200).json({
      message: `Kata sandi untuk ${targetUser.nama} berhasil diperbarui!`,
    });
  } catch (error) {
    console.error('Error resetPassword:', error);
    return res.status(500).json({ message: 'Gagal mengatur ulang kata sandi.' });
  }
};

// 5. Hapus Akun Pegawai dengan Proteksi Akun Admin Aktif (UAT-1.4)
const deleteUser = async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const currentAdminId = Number(req.user.id);

    // Proteksi UAT-1.4: Admin dilarang menghapus akunnya sendiri yang sedang aktif
    if (targetUserId === currentAdminId) {
      return res.status(400).json({
        message: 'Keamanan Sistem: Anda tidak dapat menghapus akun Admin yang sedang aktif digunakan!',
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Akun pegawai tidak ditemukan.' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({
        message: 'Keamanan Sistem: Akun dengan jabatan Admin Sistem utama dikunci dan tidak dapat dihapus.',
      });
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: targetUserId,
        userId: currentAdminId,
        details: `Admin menghapus akun pegawai ${targetUser.nama} (${targetUser.role})`,
      },
    });

    return res.status(200).json({
      message: `Akun pegawai ${targetUser.nama} berhasil dihapus.`,
    });
  } catch (error) {
    console.error('Error deleteUser:', error);
    return res.status(400).json({
      message: 'Akun ini tidak dapat dihapus karena masih tercatat pada riwayat tiket/tugas.',
    });
  }
};

// 6. Ambil Daftar Divisi
const getDivisi = async (req, res) => {
  try {
    const divisi = await prisma.divisi.findMany({
      orderBy: { id: 'asc' },
    });
    return res.status(200).json({ data: divisi });
  } catch (error) {
    console.error('Error getDivisi:', error);
    return res.status(500).json({ message: 'Gagal mengambil daftar divisi.' });
  }
};

// 7. Ambil Rekam Jejak Keamanan / Immutable Audit Trail (UAT-6.8)
const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: { id: true, nama: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.status(200).json({ data: logs });
  } catch (error) {
    console.error('Error getAuditLogs:', error);
    return res.status(500).json({ message: 'Gagal mengambil data Audit Trail.' });
  }
};

module.exports = {
  login,
  register,
  getUsers,
  resetPassword,
  deleteUser,
  getDivisi,
  getAuditLogs,
};