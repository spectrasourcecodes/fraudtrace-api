const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, read, type } = req.query;
    
    const query = { user: req.user.id };
    
    if (read === 'true') query.read = true;
    if (read === 'false') query.read = false;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('relatedCase', 'caseId title');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      user: req.user.id, 
      read: false 
    });

    res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true, readAt: Date.now() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true, readAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/all
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    res.status(200).json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create notification (admin/investigator only)
// @route   POST /api/notifications
// Update the createNotification function:
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, message, type, relatedCase, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message'
      });
    }

    // If userId is provided, send to specific user
    if (userId) {
      // Check if userId is an email or MongoDB ID
      let user;
      if (userId.includes('@')) {
        // Find by email
        user = await User.findOne({ email: userId });
      } else {
        // Find by ID
        user = await User.findById(userId);
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const notification = await Notification.create({
        user: user._id,
        title,
        message,
        type: type || 'system',
        relatedCase,
        priority: priority || 'normal'
      });

      // Emit real-time notification via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${user._id}`).emit('notification', notification);
      }

      return res.status(201).json({
        success: true,
        data: notification,
        message: `Notification sent to ${user.name || user.email}`
      });
    }

    // If no userId, return error
    return res.status(400).json({
      success: false,
      message: 'Please provide userId for single notification. Use /api/admin/send-bulk-notification for bulk sending.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};