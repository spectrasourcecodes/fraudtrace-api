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

// Import the dedicated database connection function
const connectDB = require('./config/db');

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
  console.warn('   To enable Cloudinary, add these to your .env file.');
} else {
  console.log('✅ Cloudinary configured');
}

// ============================================
// INITIALIZE CONFIGURATIONS
// ============================================

// Initialize Cloudinary config (if available)
const { configureCloudinary } = require('./config/cloudinary');
configureCloudinary();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ============================================
// ENSURE UPLOAD DIRECTORIES EXIST
// ============================================
const uploadDirs = [
  'uploads',
  'uploads/evidence',
  'uploads/documents',
  'uploads/images',
];
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
    origin: 'https://fraudtrace-zbtc.onrender.com' || process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
app.set('io', io);

// ============================================
// STORE RATE LIMITERS FOR ACCESS BY CONTROLLERS
// ============================================
app.set('rateLimiters', {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  reportLimiter,
  passwordResetLimiter,
  notificationLimiter,
  apiLimiter,
});

// ============================================
// MIDDLEWARE SETUP
// ============================================


// CORS
app.use(cors({
  origin: 'https://fraudtrace-zbtc.onrender.com' || process.env.CLIENT_URL,
  credentials: true,
}));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// RATE LIMITING
// ============================================
app.use(generalLimiter);

// Serve uploaded files statically (before API routes to avoid rate limiting on static files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// DATABASE CONNECTION (using connectDB)
// ============================================
let dbConnected = false;

connectDB()
  .then(() => {
    dbConnected = true;
    console.log('✅ MongoDB connection established');
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Middleware to check DB connection before processing API requests
app.use('/api', (req, res, next) => {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Database connection not ready. Please try again in a moment.',
    });
  }
  next();
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
// HEALTH CHECK ENDPOINT
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
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    }
  });
  socket.on('join_case', (caseId) => {
    if (caseId) {
      socket.join(`case_${caseId}`);
      console.log(`📋 Joined case room: ${caseId}`);
    }
  });
  socket.on('leave_case', (caseId) => {
    if (caseId) {
      socket.leave(`case_${caseId}`);
    }
  });
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

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
  console.log(`🛡️  Rate Limiting: Enabled***`);
  console.log('═══════════════════════════════════');
  console.log('');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
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