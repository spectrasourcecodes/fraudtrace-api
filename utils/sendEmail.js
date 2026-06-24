const createTransporter = require('../config/email');

const sendEmail = async (options) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Fraud Trace Recovery" <${process.env.EMAIL_USER || 'noreply@fraudtracerecovery.com'}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html?.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);

    // Log success (messageId available for real transports)
    if (info.messageId) {
      console.log('Email sent successfully, ID:', info.messageId);
    }

    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error('Email could not be sent');
  }
};


/**
 * Strip HTML tags for plain text version
 */
const stripHtml = (html) => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Generate email template
 */
const generateTemplate = (type, data) => {
  const templates = {
    'email-verification': {
      subject: 'Verify Your Email - Fraud Trace Recovery',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Fraud Trace Recovery</h1>
              <p>Protecting Victims of Online Fraud</p>
            </div>
            <div class="content">
              <h2>Welcome, ${data.name}!</h2>
              <p>Thank you for registering with Fraud Trace Recovery. Please verify your email address to complete your registration.</p>
              <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #06b6d4;">${data.verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <div class="footer">
                <p>If you didn't create an account with Fraud Trace Recovery, please ignore this email.</p>
                <p>© ${new Date().getFullYear()} Fraud Trace Recovery. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    },
    
    'password-reset': {
      subject: 'Password Reset - Fraud Trace Recovery',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello, ${data.name}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
              </div>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link expires in 10 minutes. If you didn't request a password reset, please ignore this email and ensure your account is secure.
              </div>
              <p>Or copy this link:</p>
              <p style="word-break: break-all; color: #f59e0b;">${data.resetUrl}</p>
            </div>
          </div>
        </body>
        </html>
      `
    },

    'case-update': {
      subject: `Case Update - ${data.caseTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; background: ${getStatusColor(data.status)}; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Case Update</h1>
            </div>
            <div class="content">
              <h2>Your case has been updated</h2>
              <p><strong>Case ID:</strong> ${data.caseId}</p>
              <p><strong>Title:</strong> ${data.caseTitle}</p>
              <p><strong>New Status:</strong> <span class="status-badge">${data.status}</span></p>
              <div class="details">
                <h3>Update Details:</h3>
                <p>${data.message}</p>
              </div>
              <p>Log in to your account to view the full details.</p>
            </div>
          </div>
        </body>
        </html>
      `
    },

    'welcome': {
      subject: 'Welcome to Fraud Trace Recovery',
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
            .feature { background: white; padding: 15px; border-radius: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Fraud Trace Recovery!</h1>
            </div>
            <div class="content">
              <h2>Hello, ${data.name}!</h2>
              <p>Your account has been created successfully. We're here to help you report and track fraud cases.</p>
              
              <div class="features">
                <div class="feature">
                  <h4>🔍 Report Fraud</h4>
                  <p>Submit detailed fraud reports</p>
                </div>
                <div class="feature">
                  <h4>📊 Track Cases</h4>
                  <p>Monitor investigation progress</p>
                </div>
                <div class="feature">
                  <h4>📁 Evidence Management</h4>
                  <p>Upload and organize evidence</p>
                </div>
                <div class="feature">
                  <h4>💬 Support</h4>
                  <p>Get help when you need it</p>
                </div>
              </div>
              
              <p>Get started by reporting your first case or browsing our resources.</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  };

  return templates[type] || templates['welcome'];
};

const getStatusColor = (status) => {
  const colors = {
    'submitted': '#3b82f6',
    'under_review': '#f59e0b',
    'evidence_verification': '#8b5cf6',
    'investigation': '#06b6d4',
    'escalated': '#ef4444',
    'resolved': '#10b981',
    'closed': '#6b7280'
  };
  return colors[status] || '#6b7280';
};

module.exports = {
  sendEmail,
  generateTemplate,
  stripHtml
};