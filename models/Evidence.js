const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  caseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'document', 'video', 'archive', 'other']
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    enum: [
      'screenshot',
      'transaction_record',
      'communication',
      'identification',
      'contract',
      'legal_document',
      'other'
    ],
    default: 'other'
  },
  tags: [String],
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
evidenceSchema.index({ caseId: 1, isActive: 1 });
evidenceSchema.index({ uploadedBy: 1 });
evidenceSchema.index({ verificationStatus: 1 });
evidenceSchema.index({ tags: 1 });

// Virtual for file size in readable format
evidenceSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save hook
evidenceSchema.pre('save', function(next) {
  // Ensure tags are unique and lowercase
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags.map(tag => tag.toLowerCase().trim()))];
  }
  next();
});

// Ensure virtuals are included in JSON output
evidenceSchema.set('toJSON', { virtuals: true });
evidenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Evidence', evidenceSchema);