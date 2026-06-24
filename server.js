const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

// Import rate limiters
const {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  reportLimiter,
  passwordResetLimiter,
  notificationLimiter,
  apiLimiter,
} = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config();

// ============================================
// ENVIRONMENT VARIABLE VALIDATION
// ============================================

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Check optional Cloudinary config
const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinary = cloudinaryVars.filter(varName => !process.env[varName]);
if (missingCloudinary.length > 0) {
  console.warn('⚠️  Cloudinary not fully configured. File uploads will use local storage.');
  console.warn('   Missing:', missingCloudinary.join(', '));
} else {
  console.log('✅ Cloudinary configured');
}

// ============================================
// INITIALIZE CONFIGURATIONS
// ============================================

const { configureCloudinary } = require('./config/cloudinary');
configureCloudinary();

const app = express();
const server = http.createServer(app);

// ============================================
// ENSURE UPLOAD DIRECTORIES EXIST
// ============================================

const uploadDirs = ['uploads', 'uploads/evidence', 'uploads/documents', 'uploads/images'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ============================================
// SOCKET.IO SETUP
// ============================================

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:4173',
      'https://fraudtrace-zbtc.onrender.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// ============================================
// STORE RATE LIMITERS
// ============================================
app.set('rateLimiters', {
  generalLimiter, authLimiter, uploadLimiter,
  reportLimiter, passwordResetLimiter, notificationLimiter, apiLimiter,
});

// ============================================
// MIDDLEWARE SETUP (ORDER MATTERS!)
// ============================================

// 1. CORS - MUST be before other middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'https://fraudtrace-zbtc.onrender.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 2. Helmet - but allow cross-origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: false, // Disable CSP to avoid blocking API calls
}));

// 3. Logging
app.use(morgan('dev'));

// 4. Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// RATE LIMITING
// ============================================

// Apply general rate limiter to ALL routes
app.use(generalLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ============================================
// API ROUTES
// ============================================

app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use('/api/evidence', uploadLimiter, require('./routes/evidenceRoutes'));
app.use('/api/notifications', notificationLimiter, require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/threat-intel', require('./routes/threatIntelRoutes'));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
    rateLimiting: true,
  });
});

// ============================================
// API 404 HANDLER
// ============================================

app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  socket.on('join', (userId) => {
    if (userId) { socket.join(`user_${userId}`); console.log(`👤 User ${userId} joined`); }
  });
  socket.on('join_case', (caseId) => {
    if (caseId) { socket.join(`case_${caseId}`); console.log(`📋 Joined case: ${caseId}`); }
  });
  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation Error', errors: messages });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `Duplicate value for '${field}'` });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token. Please login again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}`, code: err.code });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Fraud Trace Recovery Server');
  console.log('═══════════════════════════════════');
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`💾 Storage: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Cloudinary' : 'Local'}`);
  console.log(`🛡️  Rate Limiting: Enabled`);
  console.log('═══════════════════════════════════');
  console.log('');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down...`);
  try {
    await new Promise((resolve) => server.close(() => resolve()));
    await mongoose.connection.close();
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (error) {
    console.error('Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  server.close(() => process.exit(1));
});

module.exports = app;