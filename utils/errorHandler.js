const ApiResponse = require('./apiResponse');
const logger = require('./logger');

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`${err.name}: ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new AppError(message, 401);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new AppError('File too large. Maximum size is 10MB.', 400);
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = new AppError('Too many files. Maximum is 20 files.', 400);
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error = new AppError('Unexpected file field.', 400);
    } else {
      error = new AppError('File upload error.', 400);
    }
  }

  // Send response
  return ApiResponse.error(
    res,
    error.message || 'Internal Server Error',
    error.statusCode || 500,
    process.env.NODE_ENV === 'development' ? { stack: err.stack } : null
  );
};

module.exports = {
  AppError,
  errorHandler,
};