const express = require('express');
const router = express.Router();
const {
  uploadEvidence,
  getEvidenceByCase,
  getEvidence,
  updateEvidence,
  deleteEvidence,
  downloadEvidence,
  verifyEvidence,
  addTags,
  getEvidenceStats
} = require('../controllers/evidenceController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Evidence routes
router.post('/:caseId', upload.array('files', 10), uploadEvidence);
router.get('/case/:caseId', getEvidenceByCase);
router.get('/stats', authorize('investigator', 'admin'), getEvidenceStats);
router.get('/:id', getEvidence);
router.get('/:id/download', downloadEvidence);
router.put('/:id', updateEvidence);
router.put('/:id/verify', authorize('investigator', 'admin'), verifyEvidence);
router.put('/:id/tags', addTags);
router.delete('/:id', deleteEvidence);

module.exports = router;