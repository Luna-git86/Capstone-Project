// Backend/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Untuk membaca JWT_SECRET dari file .env (jika ada)

const app = express();
const port = process.env.PORT || 5000;

// Middleware bawaan Express
app.use(cors()); // Mengizinkan akses dari Frontend (React)
app.use(express.json()); // Agar bisa membaca format JSON dari request body

// Menghubungkan Rute
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Endpoint dasar untuk cek status server
app.get('/', (req, res) => {
  res.send('Server E-Ticketing RSIA berjalan dengan baik!');
});

// Menyalakan server
app.listen(port, () => {
  console.log(`Server Backend berjalan di http://localhost:${port}`);
});