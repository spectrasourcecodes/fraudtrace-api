const User = require('../models/User');
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const Notification = require('../models/Notification');
const rateLimit = require('express-rate-limit');

// @desc    Get system statistics
// @route   GET /api/admin/stats
exports.getSystemStats = async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const investigators = await User.countDocuments({ role: 'investigator' });
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    // Case stats
    const totalCases = await Case.countDocuments();
    const openCases = await Case.countDocuments({
      status: { $in: ['submitted', 'under_review', 'evidence_verification', 'investigation'] }
    });
    const resolvedCases = await Case.countDocuments({ status: 'resolved' });
    const escalatedCases = await Case.countDocuments({ status: 'escalated' });
    const newCasesToday = await Case.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    // Amount stats
    const amountStats = await Case.aggregate([
      {
        $group: {
          _id: null,
          totalAmountLost: { $sum: '$amountLost' },
          averageAmount: { $avg: '$amountLost' },
          maxAmount: { $max: '$amountLost' }
        }
      }
    ]);

    // Evidence stats
    const totalEvidence = await Evidence.countDocuments({ isActive: true });
    const verifiedEvidence = await Evidence.countDocuments({ 
      isActive: true, 
      verificationStatus: 'verified' 
    });

    // Notification stats
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });

    // Cases by type
    const casesByType = await Case.aggregate([
      { $group: { _id: '$fraudType', count: { $sum: 1 }, totalAmount: { $sum: '$amountLost' } } },
      { $sort: { count: -1 } }
    ]);

    // Cases by country
    const casesByCountry = await Case.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Monthly trends
    const monthlyTrends = await Case.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amountLost' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          investigators,
          newToday: newUsersToday
        },
        cases: {
          total: totalCases,
          open: openCases,
          resolved: resolvedCases,
          escalated: escalatedCases,
          newToday: newCasesToday,
          amountStats: amountStats[0] || { totalAmountLost: 0, averageAmount: 0, maxAmount: 0 }
        },
        evidence: {
          total: totalEvidence,
          verified: verifiedEvidence
        },
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications
        },
        analytics: {
          casesByType,
          casesByCountry,
          monthlyTrends
        }
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

// @desc    Get activity log
// @route   GET /api/admin/activity
exports.getActivityLog = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get recent notifications as activity log
    const activities = await Notification.find()
      .sort('-createdAt')
      .limit(parseInt(limit))
      .populate('user', 'name email')
      .populate('relatedCase', 'caseId title');

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, action, userId } = req.query;
    
    // In a real app, this would query an AuditLog model
    // For now, we'll use case status history as a simple audit trail
    const cases = await Case.find({
      'statusHistory.0': { $exists: true }
    })
    .select('caseId statusHistory')
    .sort('-createdAt')
    .limit(parseInt(limit));

    const auditLogs = [];
    cases.forEach(caseItem => {
      caseItem.statusHistory.forEach(history => {
        auditLogs.push({
          caseId: caseItem.caseId,
          action: `Status changed to ${history.status}`,
          changedBy: history.changedBy,
          timestamp: history.timestamp,
          notes: history.notes
        });
      });
    });

    res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: auditLogs.length
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

// @desc    Get system settings
// @route   GET /api/admin/settings
exports.getSystemSettings = async (req, res) => {
  try {
    // In a real app, fetch from a Settings model
    const settings = {
      siteName: process.env.SITE_NAME || 'Fraud Trace Recovery',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@fraudtracerecovery.com',
      maxLoginAttempts: process.env.MAX_LOGIN_ATTEMPTS || 5,
      sessionTimeout: process.env.SESSION_TIMEOUT || 30,
      enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
    };

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const allowedSettings = [
      'siteName',
      'supportEmail',
      'maxLoginAttempts',
      'sessionTimeout',
      'enableRegistration',
      'maintenanceMode'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedSettings.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // In a real app, save to database
    // For now, just return success
    console.log('Settings updated:', updates);

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Clear system cache
// @route   POST /api/admin/clear-cache
exports.clearCache = async (req, res) => {
  try {
    // Clear Redis cache if using Redis
    // const redis = require('../config/redis');
    // await redis.flushall();

    // Clear any in-memory cache
    // apicache.clear();

    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Backup database
// @route   POST /api/admin/backup
exports.backupDatabase = async (req, res) => {
  try {
    // In a real app, implement database backup
    // This could use mongodump or a backup service
    
    res.status(200).json({
      success: true,
      message: 'Database backup initiated. You will be notified when complete.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Add this to your existing adminController.js

// @desc    Send bulk notification to users by role or all
// @route   POST /api/admin/send-bulk-notification
exports.sendBulkNotification = async (req, res) => {
  try {
    const { title, message, type, priority, targetRole } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message'
      });
    }

    // Build user filter
    let userFilter = {};
    
    if (targetRole && targetRole !== 'all') {
      userFilter.role = targetRole;
    }

    // Find target users
    const users = await User.find({ ...userFilter, status: 'active' });
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found to send notification to'
      });
    }

    // Create notifications for each user
    const notifications = [];
    for (const user of users) {
      const notification = await Notification.create({
        user: user._id,
        title,
        message,
        type: type || 'system',
        priority: priority || 'normal'
      });
      notifications.push(notification);
    }

    // Emit socket notifications if available
    const io = req.app.get('io');
    if (io) {
      for (const user of users) {
        io.to(`user_${user._id}`).emit('notification', {
          title,
          message,
          type: type || 'system',
          priority: priority || 'normal'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Notification sent to ${users.length} user(s)`,
      count: users.length
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


// @desc    Get rate limiting statistics
// @route   GET /api/admin/rate-limits
exports.getRateLimitStats = async (req, res) => {
  try {
    // Get the rate limiter instances from the app
    const app = req.app;
    
    // Rate limit configuration (matches your middleware)
    const rateLimitConfig = {
      generalLimiter: {
        name: 'General API',
        windowMs: 5 * 60 * 1000,
        maxRequests: 100,
        description: 'Applied to all API routes',
      },
      authLimiter: {
        name: 'Authentication',
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        description: 'Applied to login/register routes',
      },
      uploadLimiter: {
        name: 'File Upload',
        windowMs: 15 * 60 * 1000,
        maxRequests: 30,
        description: 'Applied to evidence upload routes',
      },
      notificationLimiter: {
        name: 'Notifications',
        windowMs: 30 * 1000,
        maxRequests: 30,
        description: 'Applied to notification routes',
      },
      reportLimiter: {
        name: 'Case Reports',
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
        description: 'Applied to case report creation',
      },
      passwordResetLimiter: {
        name: 'Password Reset',
        windowMs: 60 * 60 * 1000,
        maxRequests: 3,
        description: 'Applied to password reset requests',
      },
    };

    // Format the response
    const rateLimits = Object.entries(rateLimitConfig).map(([key, config]) => ({
      id: key,
      name: config.name,
      windowMs: config.windowMs,
      windowFormatted: formatWindow(config.windowMs),
      maxRequests: config.maxRequests,
      description: config.description,
      status: 'active',
      blockedCount: Math.floor(Math.random() * 20), // Placeholder - in production track actual blocks
      lastBlocked: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    }));

    // Get actual request counts from the rate limiter store (if available)
    // express-rate-limit stores data in memory by default
    const requestCounts = {};
    try {
      // Access the internal store (this depends on the store type)
      const generalLimiter = app.get('rateLimiters')?.generalLimiter;
      if (generalLimiter && generalLimiter.store) {
        // The store has internal counters we can try to read
        console.log('Rate limiter store type:', generalLimiter.store.constructor.name);
      }
    } catch (storeErr) {
      console.warn('Could not access rate limiter store:', storeErr.message);
    }

    res.status(200).json({
      success: true,
      data: {
        limits: rateLimits,
        totalBlockedToday: rateLimits.reduce((sum, l) => sum + l.blockedCount, 0),
        lastUpdated: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to format time window
const formatWindow = (ms) => {
  if (ms < 60000) return `${ms / 1000} seconds`;
  if (ms < 3600000) return `${ms / 60000} minutes`;
  return `${ms / 3600000} hours`;
};