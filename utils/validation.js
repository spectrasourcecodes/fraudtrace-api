const { body, param, query, validationResult } = require('express-validator');

/**
 * Custom validation rules
 */
const validationRules = {
  // User validation
  userRegistration: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    
    body('phone')
      .optional()
      .matches(/^\+?[\d\s-()]+$/)
      .withMessage('Please provide a valid phone number'),
    
    body('country')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Country name is too long'),
    
    body('preferredLanguage')
      .optional()
      .isIn(['en', 'es', 'fr', 'de', 'ar', 'zh', 'ru', 'pt'])
      .withMessage('Invalid language selection'),
  ],

  // Login validation
  userLogin: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  // Case validation
  createCase: [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Case title is required')
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    
    body('fraudType')
      .notEmpty()
      .withMessage('Fraud type is required')
      .isIn([
        'investment_scam', 'crypto_scam', 'ponzi_scheme',
        'romance_scam', 'fake_broker', 'online_shopping',
        'phishing', 'identity_theft', 'other'
      ])
      .withMessage('Invalid fraud type'),
    
    body('amountLost')
      .isFloat({ min: 0 })
      .withMessage('Amount lost must be a positive number'),
    
    body('currency')
      .notEmpty()
      .withMessage('Currency is required')
      .isLength({ min: 3, max: 10 })
      .withMessage('Invalid currency'),
    
    body('incidentDate')
      .isISO8601()
      .withMessage('Invalid date format')
      .custom((value) => {
        const date = new Date(value);
        if (date > new Date()) {
          throw new Error('Incident date cannot be in the future');
        }
        return true;
      }),
    
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ min: 20, max: 5000 })
      .withMessage('Description must be between 20 and 5000 characters'),
    
    body('fraudCompanyName')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Company name is too long'),
    
    body('fraudWebsite')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid website URL'),
    
    body('country')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Country name is too long'),
    
    body('suspectWallet')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Wallet address is too long'),
    
    body('suspectBankAccount')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Bank account is too long'),
    
    body('suspectEmail')
      .optional()
      .isEmail()
      .withMessage('Invalid suspect email')
      .normalizeEmail(),
    
    body('suspectPhone')
      .optional()
      .matches(/^\+?[\d\s-()]+$/)
      .withMessage('Invalid phone number'),
  ],

  // Evidence validation
  uploadEvidence: [
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description is too long'),
    
    body('category')
      .optional()
      .isIn([
        'screenshot', 'transaction_record', 'communication',
        'identification', 'contract', 'other'
      ])
      .withMessage('Invalid category'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
  ],

  // Investigation note validation
  addNote: [
    body('note')
      .trim()
      .notEmpty()
      .withMessage('Note cannot be empty')
      .isLength({ max: 2000 })
      .withMessage('Note is too long'),
    
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean'),
  ],

  // Password reset validation
  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
  ],

  resetPassword: [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],

  // Threat intelligence validation
  addThreat: [
    body('type')
      .notEmpty()
      .withMessage('Threat type is required')
      .isIn(['domain', 'ip_address', 'crypto_wallet', 'email', 'phone'])
      .withMessage('Invalid threat type'),
    
    body('value')
      .trim()
      .notEmpty()
      .withMessage('Threat value is required'),
    
    body('riskScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Risk score must be between 0 and 100'),
  ],
};

/**
 * Validation middleware generator
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Array} Middleware array
 */
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      const extractedErrors = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: extractedErrors,
        timestamp: new Date().toISOString()
      });
    },
  ];
};

module.exports = {
  validationRules,
  validate,
};