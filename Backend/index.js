const express = require('express');
const cors = require('cors');
const { startTelegramBot } = require('./services/telegramBot');
const { startDeadlineScheduler } = require('./jobs/deadlineScheduler');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

const authRoutes = require('./routes/authRoute');
app.use('/api/auth', authRoutes);

const ticketRoutes = require('./routes/ticketRoute');
app.use('/api/tickets', ticketRoutes);

const slaRoutes = require('./routes/slaRoute');
app.use('/api/laporan-sla', slaRoutes);

const notificationRoutes = require('./routes/notificationRoute');
app.use('/api/notifications', notificationRoutes);

const configRoutes = require('./routes/configRoute');
app.use('/api/config', configRoutes);

app.get('/', (req, res) => {
  res.send('Server Backend E-Ticketing RSIA berjalan dengan baik!');
});

function startBackgroundServices() {
  startTelegramBot();
  startDeadlineScheduler();
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server Backend berjalan di http://localhost:${port}`);
    startBackgroundServices();
  });
}

module.exports = { app, startBackgroundServices };
