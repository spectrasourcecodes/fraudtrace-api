const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: {
    type: String,
    unique: true,
    // Remove 'required: true' since it will be auto-generated
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  assignedInvestigator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'Please provide a case title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  fraudType: {
    type: String,
    required: [true, 'Fraud type is required'],
    enum: [
      'investment_scam',
      'crypto_scam',
      'ponzi_scheme',
      'romance_scam',
      'fake_broker',
      'online_shopping',
      'phishing',
      'identity_theft',
      'other'
    ]
  },
  fraudCompanyName: {
    type: String,
    trim: true,
    default: ''
  },
  fraudWebsite: {
    type: String,
    trim: true,
    default: ''
  },
  amountLost: {
    type: Number,
    required: [true, 'Please provide the amount lost'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  incidentDate: {
    type: Date,
    default: Date.now
  },
  country: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: [true, 'Please provide case description'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  suspectWallet: {
    type: String,
    default: ''
  },
  suspectBankAccount: {
    type: String,
    default: ''
  },
  suspectEmail: {
    type: String,
    default: ''
  },
  suspectPhone: {
    type: String,
    default: ''
  },
  transactionIds: [{
    type: String
  }],
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'evidence_verification',
      'investigation',
      'escalated',
      'resolved',
      'closed'
    ],
    default: 'submitted'
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  priority: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  tags: [String],
  resolution: {
    type: String,
    enum: ['pending', 'resolved', 'unresolved', 'escalated_to_authorities'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate case ID before saving
caseSchema.pre('save', async function(next) {
  if (this.isNew && !this.caseId) {
    try {
      // Count existing cases to generate sequential ID
      const count = await mongoose.model('Case').countDocuments();
      this.caseId = `FTR-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // Fallback: use timestamp-based ID
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      this.caseId = `FTR-${timestamp}-${random}`;
    }
  }
  next();
});

// Add status to history when status changes
caseSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._modifiedBy,
      timestamp: new Date(),
      notes: this._statusNotes || 'Status updated'
    });
  }
  next();
});

module.exports = mongoose.model('Case', caseSchema);