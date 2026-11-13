const express = require('express');
const cors = require('cors');
const { startTelegramBot } = require('./services/telegramBot');
const { startDeadlineScheduler } = require('./jobs/deadlineScheduler');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS RSIA.'));
    },
    credentials: true,
  })
);
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

const smRoutes = require('./routes/smRoute');
app.use('/api/sm', smRoutes);

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
