const express = require('express');
const router = express.Router();
const {
  getMyWallet,
  withdraw,
  adminGetWallets,
  adminCreateWallet,
  adminUpdateWallet,
} = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// User routes
router.get('/my', getMyWallet);
router.post('/withdraw', withdraw);

// Admin routes
router.get('/admin/all', authorize('admin'), adminGetWallets);
router.post('/admin', authorize('admin'), adminCreateWallet);
router.put('/admin/:id', authorize('admin'), adminUpdateWallet);

module.exports = router;