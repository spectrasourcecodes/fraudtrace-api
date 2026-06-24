const mongoose = require('mongoose');

const threatIntelSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['domain', 'ip_address', 'crypto_wallet', 'email', 'phone'],
    required: true
  },
  value: {
    type: String,
    required: true
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  relatedCases: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  }],
  occurrences: {
    type: Number,
    default: 1
  },
  tags: [String],
  notes: String,
  lastSeen: Date,
  firstSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'monitoring', 'resolved'],
    default: 'active'
  },
  connections: [{
    type: {
      type: String,
      enum: ['domain', 'ip_address', 'crypto_wallet', 'email', 'phone']
    },
    value: String,
    relationship: String
  }]
}, {
  timestamps: true
});

threatIntelSchema.index({ value: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('ThreatIntelligence', threatIntelSchema);