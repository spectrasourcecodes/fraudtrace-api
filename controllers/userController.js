const User = require('../models/User');
const Case = require('../models/Case');

// @desc    Get all users (admin only)
// @route   GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
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

// @desc    Get single user
// @route   GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }

    // Get user's case count
    const caseCount = await Case.countDocuments({ user: user._id });

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        caseCount
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

// @desc    Update user
// @route   PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }

    // Fields that can be updated
    const allowedFields = ['name', 'phone', 'country', 'preferredLanguage'];
    
    // Admin can update additional fields
    if (req.user.role === 'admin') {
      allowedFields.push('role', 'status');
    }

    // Filter only allowed fields
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpire');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update user status (admin only)
// @route   PUT /api/users/:id/status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-suspension
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
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

// @desc    Get user statistics (admin only)
// @route   GET /api/users/stats
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const investigators = await User.countDocuments({ role: 'investigator' });
    const admins = await User.countDocuments({ role: 'admin' });
    
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const usersByStatus = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort('-createdAt')
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        investigators,
        admins,
        usersByRole,
        usersByStatus,
        recentUsers
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

// @desc    Get all investigators
// @route   GET /api/users/investigators
exports.getInvestigators = async (req, res) => {
  try {
    const investigators = await User.find({ 
      role: 'investigator',
      status: 'active'
    }).select('name email');

    res.status(200).json({
      success: true,
      data: investigators
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};