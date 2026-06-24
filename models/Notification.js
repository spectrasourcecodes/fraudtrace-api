const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'case_update',
      'evidence_status',
      'investigator_message',
      'system',
      'alert'
    ],
    default: 'system'
  },
  relatedCase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case'
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);