const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    unique: true, // Each user has one wallet
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
  withdrawalLimit: {
    type: Number,
    default: 0,
    min: [0, 'Withdrawal limit cannot be negative'],
  },
  lastWithdrawalAt: {
    type: Date,
    default: null,
  },
  lastWithdrawalAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Virtual for formatted balance
walletSchema.virtual('balanceFormatted').get(function() {
  return `${this.balance.toFixed(2)} ${this.currency}`;
});

// Ensure virtuals are included in JSON
walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wallet', walletSchema);