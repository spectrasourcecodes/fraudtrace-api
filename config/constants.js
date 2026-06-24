module.exports = {
  // User Roles
  ROLES: {
    USER: 'user',
    INVESTIGATOR: 'investigator',
    ADMIN: 'admin',
  },

  // Case Status
  CASE_STATUS: {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    EVIDENCE_VERIFICATION: 'evidence_verification',
    INVESTIGATION: 'investigation',
    ESCALATED: 'escalated',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
  },

  // Fraud Types
  FRAUD_TYPES: {
    INVESTMENT_SCAM: 'investment_scam',
    CRYPTO_SCAM: 'crypto_scam',
    PONZI_SCHEME: 'ponzi_scheme',
    ROMANCE_SCAM: 'romance_scam',
    FAKE_BROKER: 'fake_broker',
    ONLINE_SHOPPING: 'online_shopping',
    PHISHING: 'phishing',
    IDENTITY_THEFT: 'identity_theft',
    OTHER: 'other',
  },

  // Risk Levels
  RISK_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // Evidence Categories
  EVIDENCE_CATEGORIES: {
    SCREENSHOT: 'screenshot',
    TRANSACTION_RECORD: 'transaction_record',
    COMMUNICATION: 'communication',
    IDENTIFICATION: 'identification',
    CONTRACT: 'contract',
    OTHER: 'other',
  },

  // File Limits
  FILE_LIMITS: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES_PER_CASE: 20,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOC_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    CASE_UPDATE: 'case_update',
    EVIDENCE_STATUS: 'evidence_status',
    INVESTIGATOR_MESSAGE: 'investigator_message',
    SYSTEM: 'system',
    ALERT: 'alert',
  },

  // Threat Intelligence
  THREAT_TYPES: {
    DOMAIN: 'domain',
    IP_ADDRESS: 'ip_address',
    CRYPTO_WALLET: 'crypto_wallet',
    EMAIL: 'email',
    PHONE: 'phone',
  },

  // JWT
  JWT_EXPIRY: '30d',
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },

  // Email Templates
  EMAIL_TEMPLATES: {
    VERIFICATION: 'email-verification',
    PASSWORD_RESET: 'password-reset',
    CASE_UPDATE: 'case-update',
    WELCOME: 'welcome',
  },
};