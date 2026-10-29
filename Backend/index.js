const express = require('express');
const cors = require('cors');
const { startTelegramBot } = require('./services/telegramBot');
const { startSlaCronJob } = require('./jobs/slaCronJob');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoute');
app.use('/api/auth', authRoutes);

const ticketRoutes = require('./routes/ticketRoute');
app.use('/api/tickets', ticketRoutes);

const slaRoutes = require('./routes/slaRoute');
app.use('/api/laporan-sla', slaRoutes);

const notificationLogRoutes = require('./routes/notificationLogRoute');
app.use('/api/notification-logs', notificationLogRoutes);

app.get('/', (req, res) => {
  res.send('Server Backend E-Ticketing RSIA berjalan dengan baik!');
});

app.listen(port, () => {
  console.log(`Server Backend berjalan di http://localhost:${port}`);

  startTelegramBot();
  startSlaCronJob();
});
