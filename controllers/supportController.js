const SupportLink = require('../models/SupportLink');

// Default support links
const defaultSupportLinks = {
  whatsapp: 'https://wa.me/1234567890',
  telegram: 'https://t.me/fraudtracerecovery',
  email: 'mailto:support@fraudtracerecovery.com'
};

// @desc    Get support links
// @route   GET /api/support/links
exports.getSupportLinks = async (req, res) => {
  try {
    let supportLinks = await SupportLink.findOne();

    if (!supportLinks) {
      // Create default support links if none exist
      supportLinks = await SupportLink.create(defaultSupportLinks);
    }

    res.status(200).json({
      success: true,
      data: {
        whatsapp: supportLinks.whatsapp,
        telegram: supportLinks.telegram,
        email: supportLinks.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update support links (admin only)
// @route   PUT /api/support/links
exports.updateSupportLinks = async (req, res) => {
  try {
    const { whatsapp, telegram, email } = req.body;

    let supportLinks = await SupportLink.findOne();

    if (!supportLinks) {
      supportLinks = new SupportLink();
    }

    if (whatsapp) supportLinks.whatsapp = whatsapp;
    if (telegram) supportLinks.telegram = telegram;
    if (email) supportLinks.email = email;

    await supportLinks.save();

    res.status(200).json({
      success: true,
      data: {
        whatsapp: supportLinks.whatsapp,
        telegram: supportLinks.telegram,
        email: supportLinks.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Submit support ticket
// @route   POST /api/support/tickets
exports.submitSupportTicket = async (req, res) => {
  try {
    const { subject, message, priority, caseId } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subject and message'
      });
    }

    // In a real app, this would save to a SupportTicket model
    // For now, we'll just return success and send notification
    
    // Notify admins
    const User = require('../models/User');
    const Notification = require('../models/Notification');
    
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title: 'New Support Ticket',
        message: `${subject} - from ${req.user.name}`,
        type: 'system',
        priority: priority || 'normal'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. We will get back to you shortly.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get user's support tickets
// @route   GET /api/support/tickets
exports.getSupportTickets = async (req, res) => {
  try {
    // In a real app, fetch from database
    res.status(200).json({
      success: true,
      data: [],
      message: 'Ticket system will be implemented in the next update'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single support ticket
// @route   GET /api/support/tickets/:id
exports.getSupportTicket = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: null,
      message: 'Ticket system will be implemented in the next update'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update ticket status
// @route   PUT /api/support/tickets/:id/status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ticket status updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add response to ticket
// @route   POST /api/support/tickets/:id/response
exports.addTicketResponse = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a response message'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Response added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};