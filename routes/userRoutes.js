const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getUserStats,
  getInvestigators
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Admin only routes
router.get('/', authorize('admin'), getUsers);
router.get('/stats', authorize('admin'), getUserStats);
router.put('/:id/status', authorize('admin'), updateUserStatus);
router.delete('/:id', authorize('admin'), deleteUser);

// Investigator and admin routes
router.get('/investigators', authorize('investigator', 'admin'), getInvestigators);

// User routes (own profile or admin)
router.get('/:id', getUser);
router.put('/:id', updateUser);

module.exports = router;