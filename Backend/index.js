const express = require('express');
const cors = require('cors');
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 


const authRoutes = require('./routes/authRoute');
app.use('/api/auth', authRoutes);

const ticketRoutes = require('./routes/ticketRoute');
app.use('/api/tickets', ticketRoutes);

// Endpoint dasar untuk cek status server
app.get('/', (req, res) => {
  res.send('Server E-Ticketing RSIA berjalan dengan baik!');
});

app.listen(port, () => {
  console.log(`Server Backend berjalan di http://localhost:${port}`);
});