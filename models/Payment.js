const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  // Payment Basic Info
  paymentId: {
    type: String,
    unique: true,
    required: true
  },
  
  // User & Course Info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  
  // Payment Amount
  amount: {
    original: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    final: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'VND',
      enum: ['VND', 'USD', 'EUR']
    }
  },
  
  // Traditional Payment Methods
  traditional: {
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'e_wallet', 'cash']
    },
    provider: {
      type: String,
      enum: ['stripe', 'paypal', 'vnpay', 'momo', 'zalopay', 'banking']
    },
    transactionId: String,
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  
  // Blockchain Payment (Web3)
  blockchain: {
    network: {
      type: String,
      enum: ['ethereum', 'binance_smart_chain', 'polygon', 'solana', 'cardano']
    },
    tokenSymbol: {
      type: String,
      enum: ['ETH', 'BNB', 'MATIC', 'SOL', 'ADA', 'USDT', 'USDC', 'DAI']
    },
    tokenAddress: String,
    txHash: {
      type: String,
      unique: true,
      sparse: true // Allow null values to be non-unique
    },
    blockNumber: Number,
    fromAddress: {
      type: String,
      lowercase: true
    },
    toAddress: {
      type: String,
      lowercase: true
    },
    gasUsed: Number,
    gasFee: {
      amount: Number,
      currency: String
    },
    confirmations: {
      type: Number,
      default: 0
    },
    explorerUrl: String
  },
  
  // Payment Status
  status: {
    type: String,
    enum: [
      'pending', 'processing', 'completed', 'failed', 
      'cancelled', 'refunded', 'partially_refunded',
      'expired', 'disputed'
    ],
    default: 'pending',
    index: true
  },
  
  // Payment Type
  type: {
    type: String,
    enum: ['course_purchase', 'subscription', 'certification', 'premium_feature'],
    required: true
  },
  
  // Discount & Coupon
  discountInfo: {
    couponCode: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount']
    },
    discountValue: Number,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Invoice & Receipt
  invoice: {
    invoiceNumber: {
      type: String,
      unique: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    dueDate: Date,
    pdfUrl: String,
    downloadCount: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
  // Failure & Error Info
  failureReason: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // Refund Information
  refund: {
    amount: Number,
    reason: String,
    requestedAt: Date,
    processedAt: Date,
    refundTxHash: String, // For blockchain refunds
    refundMethod: {
      type: String,
      enum: ['original_method', 'bank_transfer', 'crypto']
    }
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    country: String,
    paymentSource: {
      type: String,
      enum: ['web', 'mobile_app', 'api']
    },
    affiliateCode: String,
    referrerUrl: String
  },
  
  // Security & Anti-Fraud
  riskAssessment: {
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    factors: [{
      factor: String,
      impact: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      score: Number
    }],
    reviewRequired: {
      type: Boolean,
      default: false
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ courseId: 1 });
PaymentSchema.index({ 'blockchain.txHash': 1 });
PaymentSchema.index({ 'traditional.transactionId': 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ 'invoice.invoiceNumber': 1 });
PaymentSchema.index({ type: 1 });

// Virtual for payment method
PaymentSchema.virtual('paymentMethod').get(function() {
  if (this.blockchain.txHash) {
    return `${this.blockchain.network}_${this.blockchain.tokenSymbol}`;
  }
  return this.traditional.method;
});

// Pre-save middleware
PaymentSchema.pre('save', function(next) {
  // Generate payment ID if not exists
  if (!this.paymentId) {
    this.paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Generate invoice number if payment is completed
  if (this.status === 'completed' && !this.invoice.invoiceNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.invoice.invoiceNumber = `INV-${year}${month}-${random}`;
  }
  
  // Set completion timestamp
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status === 'failed' && !this.failedAt) {
      this.failedAt = new Date();
    } else if (this.status === 'refunded' && !this.refundedAt) {
      this.refundedAt = new Date();
    }
  }
  
  next();
});

// Instance method to process blockchain payment
PaymentSchema.methods.processBlockchainPayment = async function(txHash, network, tokenSymbol) {
  this.blockchain.txHash = txHash;
  this.blockchain.network = network;
  this.blockchain.tokenSymbol = tokenSymbol;
  this.status = 'processing';
  
  return this.save();
};

// Instance method to confirm blockchain payment
PaymentSchema.methods.confirmBlockchainPayment = async function(blockNumber, confirmations) {
  this.blockchain.blockNumber = blockNumber;
  this.blockchain.confirmations = confirmations;
  
  // Consider confirmed after certain confirmations
  const requiredConfirmations = {
    'ethereum': 12,
    'binance_smart_chain': 6,
    'polygon': 10,
    'solana': 1
  };
  
  if (confirmations >= (requiredConfirmations[this.blockchain.network] || 6)) {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Instance method to initiate refund
PaymentSchema.methods.initiateRefund = async function(amount, reason) {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }
  
  const refundAmount = amount || this.amount.final;
  
  this.refund = {
    amount: refundAmount,
    reason: reason,
    requestedAt: new Date(),
    refundMethod: this.blockchain.txHash ? 'crypto' : 'original_method'
  };
  
  this.status = refundAmount >= this.amount.final ? 'refunded' : 'partially_refunded';
  
  return this.save();
};

// Static method to get payment statistics
PaymentSchema.statics.getStatistics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount.final' },
        avgAmount: { $avg: '$amount.final' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Static method to get blockchain payment stats
PaymentSchema.statics.getBlockchainStats = function() {
  return this.aggregate([
    {
      $match: {
        'blockchain.txHash': { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: {
          network: '$blockchain.network',
          token: '$blockchain.tokenSymbol'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount.final' },
        avgGasFee: { $avg: '$blockchain.gasFee.amount' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('Payment', PaymentSchema);
