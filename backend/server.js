const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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

const app = express();

app.use(cors());
app.use(express.json());

// Debug logging for login requests (helps diagnose tunnel timeouts).
app.use((req, res, next) => {
  if (req.method === 'POST' && req.originalUrl === '/api/auth/login') {
    const start = Date.now();
    console.log('[LOGIN REQUEST] start', {
      email: req.body?.email,
      role: req.body?.role,
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

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
