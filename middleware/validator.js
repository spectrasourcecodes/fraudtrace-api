const { body, validationResult } = require('express-validator');

exports.validateRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

exports.validateCase = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('fraudType').isIn([
    'investment_scam', 'crypto_scam', 'ponzi_scheme', 'romance_scam',
    'fake_broker', 'online_shopping', 'phishing', 'identity_theft', 'other'
  ]).withMessage('Invalid fraud type'),
  body('amountLost').isNumeric().withMessage('Amount lost must be a number'),
  body('currency').notEmpty().withMessage('Currency is required'),
  body('incidentDate').isISO8601().withMessage('Invalid date'),
  body('description').trim().notEmpty().withMessage('Description is required')
];

exports.handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};