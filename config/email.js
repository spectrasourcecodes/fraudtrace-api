const nodemailer = require('nodemailer');

const createTransporter = async () => {
  // If real SMTP credentials are provided, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('✅ Using real SMTP for email delivery');
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // If Mailtrap credentials are provided (dev), use them
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    console.log('📧 Using Mailtrap for email testing');
    return nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  // No credentials at all – use a console mock
  console.warn('⚠️  No email credentials set. Emails will be logged to console instead of sent.');
  return {
    sendMail: (mailOptions) => {
      console.log('\n--- MOCK EMAIL ---');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Body:', mailOptions.html);
      console.log('-------------------\n');
      return Promise.resolve({ messageId: 'mock-' + Date.now() });
    },
  };
};

module.exports = createTransporter;