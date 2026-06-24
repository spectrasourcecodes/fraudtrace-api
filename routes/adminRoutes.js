const express = require('express');
const router = express.Router();
const {
  getSystemStats,
  getAuditLogs,
  updateSystemSettings,
  getSystemSettings,
  clearCache,
  backupDatabase,
  getActivityLog,
  sendBulkNotification,
  getRateLimitStats,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin only
router.use(protect);
router.use(authorize('admin'));

// Dashboard & Stats
router.get('/stats', getSystemStats);
router.get('/activity', getActivityLog);
router.get('/audit-logs', getAuditLogs);

// Settings
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

// Notifications
router.post('/send-bulk-notification', sendBulkNotification);

// Maintenance
router.post('/clear-cache', clearCache);
router.post('/backup', backupDatabase);

// rate limit stats
router.get('/rate-limits', getRateLimitStats);

module.exports = router;