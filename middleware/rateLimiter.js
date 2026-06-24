const rateLimit = require('express-rate-limit');
const ApiResponse = require('../utils/apiResponse');

// ============================================
// GENERAL API RATE LIMITER (5 minutes)
// ============================================
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (was 15 min)
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 5 minutes',
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many requests. Please try again later.'
    );
  },
  skip: (req) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1';
  },
});

// ============================================
// STRICT AUTH RATE LIMITER (15 minutes)
// ============================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes',
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many authentication attempts. Please try again after 15 minutes.'
    );
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// ============================================
// FILE UPLOAD RATE LIMITER (15 minutes)
// ============================================
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes (was 1 hour)
  max: 30, // Limit each IP to 30 uploads per window (was 20)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload limit reached, please try again after 15 minutes',
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Upload limit reached. Please try again later.'
    );
  },
});

// ============================================
// API SPECIFIC RATE LIMITER (per minute)
// ============================================
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many API requests. Please slow down.'
    );
  },
});

// ============================================
// CASE REPORT RATE LIMITER (1 hour)
// ============================================
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 case reports per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You can only submit 5 reports per hour. Please wait before submitting another.',
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Report limit reached. You can submit up to 5 reports per hour.'
    );
  },
});

// ============================================
// PASSWORD RESET RATE LIMITER (1 hour)
// ============================================
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again later.',
  },
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many password reset attempts. Please try again after an hour.'
    );
  },
});

// ============================================
// NOTIFICATION CREATION RATE LIMITER (30 seconds)
// ============================================
const notificationLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds (was 1 minute)
  max: 30, // Limit each IP to 30 notification creations per window (was 10)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.tooManyRequests(
      res,
      'Too many notifications sent. Please wait before sending more.'
    );
  },
});

// ============================================
// DYNAMIC RATE LIMITER FACTORY
// ============================================
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: 100 requests
    standardHeaders: true,
    legacyHeaders: false,
    message: options.message || {
      success: false,
      message: 'Too many requests, please try again later',
    },
    handler: (req, res) => {
      return ApiResponse.tooManyRequests(
        res,
        options.message || 'Too many requests. Please try again later.'
      );
    },
    skip: options.skip || undefined,
    keyGenerator: options.keyGenerator || undefined,
  });
};

// ============================================
// EXPORT ALL LIMITERS
// ============================================
module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  apiLimiter,
  reportLimiter,
  passwordResetLimiter,
  notificationLimiter,
  createRateLimiter,
};