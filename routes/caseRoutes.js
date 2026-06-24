const express = require('express');
const router = express.Router();
const {
  createCase,
  getCases,
  getCase,
  updateCase,
  getCaseStats,
  getUserStats,
  assignInvestigator,
  updateCaseStatus
} = require('../controllers/caseController');
const { protect, authorize } = require('../middleware/auth');
const { validateCase, handleValidation } = require('../middleware/validator');

router.use(protect);

router.route('/')
  .get(getCases)
  .post(validateCase, handleValidation, createCase);

// Stats routes
router.get('/stats', getCaseStats);
router.get('/my-stats', getUserStats);

// Assign investigator (admin only)
router.put('/:id/assign', authorize('admin', 'investigator'), assignInvestigator);

// Update case status
router.put('/:id/status', updateCaseStatus);

router.route('/:id')
  .get(getCase)
  .put(updateCase);

module.exports = router;