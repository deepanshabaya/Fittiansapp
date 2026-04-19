const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const programRoutes = require('./routes/programRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const pauseRoutes = require('./routes/pauseRoutes');
const customerProgramRoutes = require('./routes/customerProgramRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const legalRoutes = require('./routes/legalRoutes');
const userAgreementRoutes = require('./routes/userAgreementRoutes');

const app = express();

// Railway (and most PaaS) sits behind a reverse proxy. This makes
// req.ip / secure / protocol reflect the original client, not the proxy.
app.set('trust proxy', 1);

// CORS — permissive by default (Expo Go / React Native fetch doesn't enforce
// CORS, but Expo web does, and so do any browser-based admin tools).
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Serve uploaded files (images) as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug logging for login requests (helps diagnose tunnel timeouts).
app.use((req, res, next) => {
  if (req.method === 'POST' && req.originalUrl === '/api/auth/login') {
    const start = Date.now();
    console.log('[LOGIN REQUEST] start', {
      email: req.body?.email,
    });
    res.on('finish', () => {
      console.log('[LOGIN REQUEST] done', {
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/pause', pauseRoutes);
app.use('/api/customer-programs', customerProgramRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/user-agreements', userAgreementRoutes);

app.use(errorHandler);

// Railway injects PORT at runtime — must use it, and must bind to 0.0.0.0
// (the container's external interface), not localhost.
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
