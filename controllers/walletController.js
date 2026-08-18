const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Static conversion rates for simulation
const CONVERSION_RATES = {
  USDT: 1,        // Assuming wallet currency is USD, 1 USD = 1 USDT
  BTC: 0.000015,  // 1 USD ≈ 0.000015 BTC (approximate)
  ETH: 0.00025,   // 1 USD ≈ 0.00025 ETH (approximate)
};

// Helper: Convert amount from wallet currency to equivalent values
const getEquivalentBalances = (balance, currency) => {
  // For simplicity, we assume wallet currency is USD or USDT (1:1)
  // If currency is not USD, we still treat it as USD equivalent for demo
  const usdValue = balance; // Assume all currencies are pegged to USD for simulation

  return {
    USDT: usdValue.toFixed(2),
    BTC: (usdValue * CONVERSION_RATES.BTC).toFixed(8),
    ETH: (usdValue * CONVERSION_RATES.ETH).toFixed(8),
  };
};

// @desc    Get current user's wallet
// @route   GET /api/wallet/my
exports.getMyWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found. Please contact support to create your wallet.',
      });
    }

    const equivalents = getEquivalentBalances(wallet.balance, wallet.currency);

    res.status(200).json({
      success: true,
      data: {
        ...wallet.toObject(),
        equivalents,
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Simulate withdrawal from user wallet
// @route   POST /api/wallet/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid withdrawal amount.',
      });
    }

    const wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found.',
      });
    }

    // Check if wallet is active
    if (wallet.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Your wallet is not active. Please contact support for assistance.',
      });
    }

    // Check withdrawal limit
    if (wallet.withdrawalLimit > 0 && amount > wallet.withdrawalLimit) {
      return res.status(400).json({
        success: false,
        message: `Withdrawal amount exceeds your limit of ${wallet.withdrawalLimit} ${wallet.currency}.`,
      });
    }

    // Check sufficient balance
    if (amount > wallet.balance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance.',
      });
    }

    // Simulate withdrawal: deduct balance
    wallet.balance -= amount;
    wallet.lastWithdrawalAt = new Date();
    wallet.lastWithdrawalAmount = amount;
    await wallet.save();

    // Create notification for the user
    await Notification.create({
      user: req.user.id,
      title: 'Withdrawal Processed',
      message: `Your withdrawal of ${amount} ${wallet.currency} has been proccessed. Remaining balance: ${wallet.balance.toFixed(2)} ${wallet.currency}.`,
      type: 'system',
      priority: 'normal',
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('wallet_update', {
        balance: wallet.balance,
        currency: wallet.currency,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Withdrawal successfully.',
      data: {
        withdrawnAmount: amount,
        remainingBalance: wallet.balance,
        currency: wallet.currency,
        timestamp: wallet.lastWithdrawalAt,
      },
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get all wallets (admin only)
// @route   GET /api/wallet/admin/all
exports.adminGetWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find()
      .populate('user', 'name email')
      .sort('-createdAt');

    const walletsWithEquivalents = wallets.map(wallet => ({
      ...wallet.toObject(),
      equivalents: getEquivalentBalances(wallet.balance, wallet.currency),
    }));

    res.status(200).json({
      success: true,
      count: wallets.length,
      data: walletsWithEquivalents,
    });
  } catch (error) {
    console.error('Admin get wallets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create wallet for user (admin only)
// @route   POST /api/wallet/admin
exports.adminCreateWallet = async (req, res) => {
  try {
    const { userId, currency, balance, withdrawalLimit } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a user ID.',
      });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ user: userId });
    if (existingWallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already exists for this user.',
      });
    }

    const wallet = await Wallet.create({
      user: userId,
      currency: currency || 'USD',
      balance: balance || 0,
      withdrawalLimit: withdrawalLimit || 0,
      status: 'inactive', // Default status is inactive
    });

    // Notify user
    await Notification.create({
      user: userId,
      title: 'Wallet Created',
      message: `A wallet has been created for you with ${wallet.balance} ${wallet.currency}. Status is currently inactive.`,
      type: 'system',
      priority: 'normal',
    });

    res.status(201).json({
      success: true,
      data: wallet,
      message: 'Wallet created successfully.',
    });
  } catch (error) {
    console.error('Admin create wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update wallet (admin only)
// @route   PUT /api/wallet/admin/:id
exports.adminUpdateWallet = async (req, res) => {
  try {
    const { currency, balance, status, withdrawalLimit, adjustment } = req.body;

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found.',
      });
    }

    // If adjustment is provided (add/deduct), apply to balance
    if (adjustment !== undefined && !isNaN(adjustment)) {
      const newBalance = wallet.balance + Number(adjustment);
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Balance cannot be negative.',
        });
      }
      wallet.balance = newBalance;
    } else if (balance !== undefined && !isNaN(balance)) {
      if (balance < 0) {
        return res.status(400).json({
          success: false,
          message: 'Balance cannot be negative.',
        });
      }
      wallet.balance = Number(balance);
    }

    if (currency) wallet.currency = currency;
    if (status) wallet.status = status;
    if (withdrawalLimit !== undefined && !isNaN(withdrawalLimit)) {
      if (withdrawalLimit < 0) {
        return res.status(400).json({
          success: false,
          message: 'Withdrawal limit cannot be negative.',
        });
      }
      wallet.withdrawalLimit = Number(withdrawalLimit);
    }

    await wallet.save();

    // Notify user
    await Notification.create({
      user: wallet.user,
      title: 'Wallet Updated',
      message: `Your wallet has been updated. New balance: ${wallet.balance} ${wallet.currency}. Status: ${wallet.status}.`,
      type: 'system',
      priority: 'normal',
    });

    res.status(200).json({
      success: true,
      data: wallet,
      message: 'Wallet updated successfully.',
    });
  } catch (error) {
    console.error('Admin update wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};