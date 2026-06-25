const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

// ============================================
// VALIDATION
// ============================================
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// ============================================
// INIT
// ============================================
const { configureCloudinary } = require('./config/cloudinary');
configureCloudinary();

const app = express();
const server = http.createServer(app);

// ============================================
// MIDDLEWARE (no Helmet, no rate limiter)
// ============================================
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 👇 LOG EVERY REQUEST so we can see what's hitting the server
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================
// SIMPLE TEST ENDPOINT (no auth, no DB)
// ============================================
app.get('/ping', (req, res) => {
  res.json({ success: true, message: 'pong', time: new Date().toISOString() });
});

app.get('/test-login', (req, res) => {
  // Simulate a login response
  res.json({
    success: true,
    token: 'test-token-123',
    user: { id: '1', name: 'Test', email: 'test@test.com', role: 'user' },
  });
});

// ============================================
// ROUTES (import your existing route files)
// ============================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/evidence', require('./routes/evidenceRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/threat-intel', require('./routes/threatIntelRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` });
});

// Error handler (keep your existing one)
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ============================================
// START
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Test: http://localhost:${PORT}/ping`);
  console.log(`   Test: http://localhost:${PORT}/test-login`);
});