const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db'); // Memanggil instance database yang sudah kita pusatkan

// 1. Fungsi Pendaftaran Akun Baru (Register)
const register = async (req, res) => {
    try {
        // Tangkap idDivisi dari frontend
        const { namaLengkap, email, password, role, idDivisi } = req.body;

        // Validasi input dasar
        if (!namaLengkap || !email || !password || !role) {
            return res.status(400).json({ message: "Semua field wajib diisi!" });
        }

        // Cek apakah email sudah terdaftar
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email sudah digunakan." });
        }

        // Hash password demi keamanan
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat user baru ke database
        const newUser = await prisma.user.create({
            data: {
                namaLengkap,
                email,
                password: hashedPassword,
                role,
                // KIRI: divisiId (Sesuai schema Prisma)
                // KANAN: idDivisi (Sesuai nama variabel dari req.body)
                divisiId: idDivisi || null 
            }
        });

        res.status(201).json({ 
            message: "Akun berhasil didaftarkan!", 
            user: { id: newUser.id, email: newUser.email, role: newUser.role }
        });

    } catch (error) {
        console.error("Error register:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server saat pendaftaran." });
    }
};

// 2. Fungsi Masuk (Login)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Cek keberadaan user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        // Verifikasi password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Password salah!" });
        }

        // Buat token JWT yang menyimpan identitas user
        const token = jwt.sign(
            // Gunakan user.divisiId sesuai dengan kembalian dari Prisma
            { id: user.id, role: user.role, divisiId: user.divisiId }, 
            process.env.JWT_SECRET || "kunci_rahasia_rsia_2026",
            { expiresIn: '1d' } // Token berlaku 1 hari
        );

        res.status(200).json({
            message: "Login berhasil!",
            token,
            user: {
                id: user.id,
                namaLengkap: user.namaLengkap,
                email: user.email,
                role: user.role,
                idDivisi: user.divisiId // Kirimkan kembali ke frontend sebagai idDivisi
            }
        });

    } catch (error) {
        console.error("Error login:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server saat login." });
    }
};

module.exports = { register, login };