/**
 * Various helper utilities
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {String} input - Raw user input
 * @returns {String} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate random string
 * @param {Number} length - Length of string
 * @returns {String} Random string
 */
const generateRandomString = (length = 10) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Format currency amount
 * @param {Number} amount - Amount to format
 * @param {String} currency - Currency code
 * @returns {String} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount}`;
  }
};

/**
 * Calculate risk score based on multiple factors
 * @param {Object} caseData - Case data object
 * @returns {Number} Risk score (0-100)
 */
const calculateRiskScore = (caseData) => {
  let score = 0;
  
  // Amount lost factor
  if (caseData.amountLost > 100000) score += 30;
  else if (caseData.amountLost > 10000) score += 20;
  else if (caseData.amountLost > 1000) score += 10;
  
  // Fraud type factor
  const highRiskTypes = ['crypto_scam', 'identity_theft'];
  const mediumRiskTypes = ['investment_scam', 'ponzi_scheme'];
  
  if (highRiskTypes.includes(caseData.fraudType)) score += 25;
  else if (mediumRiskTypes.includes(caseData.fraudType)) score += 15;
  else score += 5;
  
  // Has suspect information factor
  if (caseData.suspectWallet || caseData.suspectBankAccount) score += 15;
  if (caseData.suspectEmail || caseData.suspectPhone) score += 10;
  
  // Website factor
  if (caseData.fraudWebsite) score += 10;
  
  // Transaction IDs factor
  if (caseData.transactionIds && caseData.transactionIds.length > 0) score += 10;
  
  return Math.min(score, 100);
};

/**
 * Get risk level label
 * @param {Number} score - Risk score (0-100)
 * @returns {String} Risk level label
 */
const getRiskLevel = (score) => {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
};

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} Is valid email
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 * @param {String} url - URL to validate
 * @returns {Boolean} Is valid URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate crypto wallet address
 * @param {String} address - Wallet address to validate
 * @returns {Boolean} Is valid wallet address
 */
const isValidWalletAddress = (address) => {
  // Basic validation for common crypto addresses
  const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/;
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  
  return btcRegex.test(address) || ethRegex.test(address);
};

/**
 * Mask sensitive data
 * @param {String} data - Data to mask
 * @param {String} type - Type of data
 * @returns {String} Masked data
 */
const maskData = (data, type = 'email') => {
  if (!data) return '';
  
  switch (type) {
    case 'email':
      const [name, domain] = data.split('@');
      return `${name.charAt(0)}${'*'.repeat(name.length - 1)}@${domain}`;
    
    case 'phone':
      return data.slice(0, 3) + '*'.repeat(data.length - 6) + data.slice(-3);
    
    case 'wallet':
      return data.slice(0, 6) + '...' + data.slice(-4);
    
    default:
      return '*'.repeat(data.length);
  }
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined properties from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const removeUndefined = (obj) => {
  const cleaned = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

/**
 * Paginate results
 * @param {Number} page - Page number
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @returns {Object} Pagination metadata
 */
const getPagination = (page = 1, limit = 10, total = 0) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const pagination = {};
  
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  return {
    ...pagination,
    total,
    pages: Math.ceil(total / limit),
    current: page
  };
};

module.exports = {
  sanitizeInput,
  generateRandomString,
  formatCurrency,
  calculateRiskScore,
  getRiskLevel,
  isValidEmail,
  isValidUrl,
  isValidWalletAddress,
  maskData,
  deepClone,
  removeUndefined,
  getPagination,
};