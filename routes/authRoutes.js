const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken,
  updateProfile,
  changePassword,
  sendVerificationGuide,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration, handleValidation } = require('../middleware/validator');

// Public routes
router.post('/register', validateRegistration, handleValidation, register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh-token', refreshToken);

// Protected routes (require authentication)
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/send-verification-guide', protect, sendVerificationGuide);
router.post('/logout', protect, logout);

module.exports = router;