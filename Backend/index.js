const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Agar bisa menerima data berformat JSON dari frontend

// Rute Tes (Untuk memastikan server menyala)
app.get('/', (req, res) => {
  res.json({ message: "Server API E-Ticketing RSIA Qurrata A'yun Berjalan Lancar!" });
});

// Menyalakan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server Backend menyala di port ${PORT}`);
});