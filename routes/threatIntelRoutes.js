const express = require('express');
const router = express.Router();
const {
  getThreats,
  getThreat,
  createThreat,
  updateThreat,
  deleteThreat,
  searchThreats,
  getThreatStats,
  linkThreatToCase,
  getRelatedThreats
} = require('../controllers/threadIntelController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Threat intelligence routes
router.get('/', getThreats);
router.get('/stats', getThreatStats);
router.get('/search', searchThreats);
router.get('/:id', getThreat);
router.get('/:id/related', getRelatedThreats);

// Create and update threats (investigator and admin only)
router.post('/', authorize('investigator', 'admin'), createThreat);
router.put('/:id', authorize('investigator', 'admin'), updateThreat);
router.delete('/:id', authorize('investigator', 'admin'), deleteThreat);
router.post('/:id/link-case', authorize('investigator', 'admin'), linkThreatToCase);

module.exports = router;