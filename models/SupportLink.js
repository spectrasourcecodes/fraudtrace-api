const mongoose = require('mongoose');

const supportLinkSchema = new mongoose.Schema({
  whatsapp: {
    type: String,
    default: 'https://wa.me/1234567890'
  },
  telegram: {
    type: String,
    default: 'https://t.me/fraudtracerecovery'
  },
  email: {
    type: String,
    default: 'mailto:support@fraudtracerecovery.com'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportLink', supportLinkSchema);