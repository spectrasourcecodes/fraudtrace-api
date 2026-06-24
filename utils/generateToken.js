const jwt = require('jsonwebtoken');

/**
 * Generate JWT Token
 * @param {String} id - User ID
 * @param {Object} [options] - Additional JWT options
 * @returns {String} JWT Token
 */
const generateToken = (id, options = {}) => {
  const payload = {
    id,
    ...options.payload
  };

  const signOptions = {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRE || '30d',
    ...options
  };

  return jwt.sign(payload, process.env.JWT_SECRET, signOptions);
};

/**
 * Generate refresh token with longer expiry
 * @param {String} id - User ID
 * @returns {String} Refresh token
 */
const generateRefreshToken = (id) => {
  return generateToken(id, { expiresIn: '7d' });
};

/**
 * Generate email verification token
 * @returns {String} Random token
 */
const generateVerificationToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Generate password reset token
 * @returns {String} Hashed reset token
 */
const generateResetToken = () => {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const hashedToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  return {
    resetToken,
    hashedToken,
    expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
  };
};

/**
 * Generate case ID
 * @param {Number} count - Current case count
 * @returns {String} Formatted case ID
 */
const generateCaseId = (count) => {
  return `FTR-${String(count + 1).padStart(6, '0')}`;
};

module.exports = {
  generateToken,
  generateRefreshToken,
  generateVerificationToken,
  generateResetToken,
  generateCaseId
};