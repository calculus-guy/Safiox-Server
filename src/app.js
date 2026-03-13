const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler.middleware');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');

const app = express();

// ── Security headers ──
app.use(helmet());

// ── CORS ──
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ── Request logging ──
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Body parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting ──
app.use('/api', generalLimiter);

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Safiox API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ══════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/sos', require('./routes/sos.routes'));
app.use('/api/emergency-contacts', require('./routes/emergencyContact.routes'));
app.use('/api/organizations', require('./routes/organization.routes'));
app.use('/api/community-responders', require('./routes/communityResponder.routes'));
app.use('/api/org', require('./routes/org.routes'));
app.use('/api/incidents', require('./routes/incident.routes'));
app.use('/api/feed', require('./routes/feed.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/devices', require('./routes/device.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/messages', require('./routes/message.routes'));

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

module.exports = app;
