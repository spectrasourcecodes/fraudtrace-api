const express = require('express');
const router = express.Router();
const {
  getSupportLinks,
  updateSupportLinks,
  submitSupportTicket,
  getSupportTickets,
  getSupportTicket,
  updateTicketStatus,
  addTicketResponse
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

// Public route - get support links
router.get('/links', getSupportLinks);

// Admin routes for managing support links
router.put('/links', protect, authorize('admin'), updateSupportLinks);

// Protected ticket routes
router.post('/tickets', protect, submitSupportTicket);
router.get('/tickets', protect, getSupportTickets);
router.get('/tickets/:id', protect, getSupportTicket);
router.put('/tickets/:id/status', protect, authorize('admin', 'investigator'), updateTicketStatus);
router.post('/tickets/:id/response', protect, authorize('admin', 'investigator'), addTicketResponse);

module.exports = router;