const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// Middleware agar frontend (React) bisa berkomunikasi dengan backend ini
app.use(cors());
app.use(express.json());

// --- API LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Cari user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      return res.status(404).json({ message: "Email tidak ditemukan!" });
    }

    // 2. Cocokkan password yang dikirim dengan password yang di-hash di database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah!" });
    }

    // 3. Buat Token (Tiket masuk) yang berisi id dan role
    const token = jwt.sign(
      { id: user.id, role: user.role, divisiId: user.divisiId },
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token berlaku 1 hari
    );

    // 4. Kirim balasan ke Frontend
    res.json({
      message: "Login berhasil",
      token: token,
      user: {
        id: user.id,
        namaLengkap: user.namaLengkap,
        email: user.email,
        role: user.role,
        divisiId: user.divisiId
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});

// Jalankan server di port 5000
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server Backend berjalan di http://localhost:${PORT}`);
});