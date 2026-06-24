const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {sendEmail} = require('../utils/sendEmail');
const SupportLink = require('../models/SupportLink');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, country, preferredLanguage } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      country,
      preferredLanguage,
      verificationToken
    });

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify Your Email - Fraud Trace Recovery',
        html: `
          <h1>Welcome to Fraud Trace Recovery</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationUrl}">Verify Email</a>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        preferredLanguage: user.preferredLanguage
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

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status === 'inactive' || user.status === 'suspended') {
      return res.status(401).json({
        success: false,
        message: 'Your account has been suspended or deactivated. Please contact support.'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        preferredLanguage: user.preferredLanguage,
        status: user.status,
        emailVerified: user.emailVerified,
        phone: user.phone
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

// @desc    Get current logged in user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        preferredLanguage: user.preferredLanguage,
        status: user.status,
        emailVerified: user.emailVerified,
        phone: user.phone,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
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

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with that email'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Your account is not active. Please contact support.'
      });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request - Fraud Trace Recovery',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #06b6d4; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Fraud Trace Recovery</h1>
                <p>Password Reset Request</p>
              </div>
              <div class="content">
                <h2>Hello ${user.name},</h2>
                <p>You recently requested to reset your password. Click the button below to reset it.</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all;">${resetUrl}</p>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This link expires in 10 minutes</li>
                    <li>If you didn't request this, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                  </ul>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully. Please check your inbox.'
      });
    } catch (emailError) {
      // Reset the token fields if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('Email sending failed:', emailError);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Validate new password
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    // Generate new token for auto-login
    const token = generateToken(user._id);

    // Send confirmation email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Successful - Fraud Trace Recovery',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Fraud Trace Recovery</h1>
                <p>Password Reset Successful</p>
              </div>
              <div class="content">
                <h2>Hello ${user.name},</h2>
                <p>Your password has been successfully reset.</p>
                <p>If you did not make this change, please contact our support team immediately.</p>
                <p>For security reasons, we recommend:</p>
                <ul>
                  <li>Using a unique password for this account</li>
                  <li>Enabling two-factor authentication</li>
                  <li>Regularly reviewing your account activity</li>
                </ul>
              </div>
            </div>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
      // Don't return error as password was already reset
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with matching verification token
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token. Please request a new verification email.'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified'
      });
    }

    // Update user
    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    // Generate token for auto-login
    const authToken = generateToken(user._id);

    // Send welcome email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verified - Welcome to Fraud Trace Recovery',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #06b6d4, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
              .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
              .feature { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Fraud Trace Recovery!</h1>
                <p>Your email has been verified successfully</p>
              </div>
              <div class="content">
                <h2>Hello ${user.name},</h2>
                <p>Thank you for verifying your email address. Your account is now fully activated.</p>
                
                <div class="features">
                  <div class="feature">
                    <h4>🔍 Report Fraud</h4>
                    <p style="font-size: 14px;">Submit detailed fraud reports</p>
                  </div>
                  <div class="feature">
                    <h4>📊 Track Cases</h4>
                    <p style="font-size: 14px;">Monitor investigation progress</p>
                  </div>
                  <div class="feature">
                    <h4>📁 Evidence Upload</h4>
                    <p style="font-size: 14px;">Securely upload documents</p>
                  </div>
                  <div class="feature">
                    <h4>💬 Support</h4>
                    <p style="font-size: 14px;">24/7 expert assistance</p>
                  </div>
                </div>

                <div style="text-align: center;">
                  <a href="${process.env.CLIENT_URL}/dashboard" class="button">Go to Dashboard</a>
                </div>

                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  If you need help, our support team is available 24/7.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't return error as email is already verified
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: true
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

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.verificationToken = verificationToken;
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify Your Email - Fraud Trace Recovery',
        html: `
          <h1>Email Verification</h1>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } catch (emailError) {
      user.verificationToken = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, country, preferredLanguage } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (country) user.country = country;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        preferredLanguage: user.preferredLanguage,
        phone: user.phone,
        emailVerified: user.emailVerified
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

// @desc    Change password (when logged in)
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide old and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Send notification email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Changed - Fraud Trace Recovery',
        html: `
          <h1>Password Changed</h1>
          <p>Your password was recently changed. If you did not make this change, please contact support immediately.</p>
        `
      });
    } catch (emailError) {
      console.error('Notification email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// send account verification guide through email
exports.sendVerificationGuide = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch the Telegram link from SupportLink collection
    const supportLinks = await SupportLink.findOne();
    const telegramLink = supportLinks?.telegram || 'https://t.me/fraudtracerecovery'; // fallback

    // Build the guide email with the dynamic Telegram link
    const guideHtml = `
      <h2>Account Verification Guide</h2>
      <p>Dear ${user.name},</p>
      <p>Thank you for using Fraud Trace Recovery. To complete the verification of your account, please contact our Account Verification Manager through the link below:</p>
      <p>
        <a href="${telegramLink}" style="display: inline-block; padding: 12px 24px; background-color: #0088cc; color: white; text-decoration: none; border-radius: 6px;">
          Contact Verification Manager on Telegram
        </a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:<br/>${telegramLink}</p>
      <p>Please include your registered email address (<strong>${user.email}</strong>) in your message.</p>
      <p>Our team will verify your account within 1-2 business days.</p>
      <p>Best regards,<br/>Fraud Trace Recovery Team</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Account Verification Guide – Fraud Trace Recovery',
      html: guideHtml,
    });

    res.status(200).json({
      success: true,
      message: 'Verification guide sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send verification guide',
      error: error.message,
    });
  }
};

// @desc    Logout user (invalidate token on server side if using blacklist)
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    // If using token blacklist, add token to blacklist here
    // For now, just send success response (client will remove token)
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};