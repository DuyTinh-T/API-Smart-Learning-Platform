const express = require('express');
const { body, param, query } = require('express-validator');
const { Payment, User, Course } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - amount
 *         - currency
 *         - method
 *         - itemType
 *         - itemId
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *           enum: [USD, EUR, VND, BTC, ETH]
 *         method:
 *           type: string
 *           enum: [credit_card, paypal, bank_transfer, crypto, stripe]
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *         itemType:
 *           type: string
 *           enum: [course, subscription, certificate]
 *         itemId:
 *           type: string
 *         transactionId:
 *           type: string
 *         paymentGateway:
 *           type: string
 *           enum: [stripe, paypal, coinbase, binance]
 *         blockchain:
 *           type: object
 *           properties:
 *             network:
 *               type: string
 *               enum: [ethereum, bitcoin, binance_smart_chain]
 *             walletAddress:
 *               type: string
 *             transactionHash:
 *               type: string
 *             gasPrice:
 *               type: number
 *             confirmations:
 *               type: number
 */

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and transaction management
 */

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create payment intent for course purchase
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemType
 *               - itemId
 *               - amount
 *               - currency
 *               - method
 *             properties:
 *               itemType:
 *                 type: string
 *                 enum: [course, subscription, certificate]
 *               itemId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, VND, BTC, ETH]
 *               method:
 *                 type: string
 *                 enum: [credit_card, paypal, bank_transfer, crypto, stripe]
 *               paymentGateway:
 *                 type: string
 *                 enum: [stripe, paypal, coinbase, binance]
 *     responses:
 *       201:
 *         description: Payment intent created successfully
 *       400:
 *         description: Invalid payment data
 */
router.post('/payments/create-intent', auth, [
  body('itemType').isIn(['course', 'subscription', 'certificate'])
    .withMessage('Invalid item type'),
  body('itemId').isMongoId().withMessage('Invalid item ID'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('currency').isIn(['USD', 'EUR', 'VND', 'BTC', 'ETH'])
    .withMessage('Invalid currency'),
  body('method').isIn(['credit_card', 'paypal', 'bank_transfer', 'crypto', 'stripe'])
    .withMessage('Invalid payment method'),
  body('paymentGateway').optional().isIn(['stripe', 'paypal', 'coinbase', 'binance'])
    .withMessage('Invalid payment gateway')
], validate, asyncHandler(async (req, res) => {
  const { itemType, itemId, amount, currency, method, paymentGateway } = req.body;

  // Validate the item exists and user can purchase it
  let item;
  if (itemType === 'course') {
    item = await Course.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user already purchased this course
    const existingPayment = await Payment.findOne({
      userId: req.user.id,
      itemType: 'course',
      itemId,
      status: 'completed'
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Course already purchased'
      });
    }
  }

  // Create payment record
  const payment = new Payment({
    userId: req.user.id,
    amount: parseFloat(amount),
    currency,
    method,
    status: 'pending',
    itemType,
    itemId,
    paymentGateway: paymentGateway || getDefaultGateway(method),
    transactionId: generateTransactionId(),
    metadata: {
      itemTitle: item?.title,
      userEmail: req.user.email,
      createdVia: 'api'
    }
  });

  await payment.save();

  // Generate payment intent based on method
  let paymentIntent;
  
  try {
    switch (method) {
      case 'stripe':
      case 'credit_card':
        paymentIntent = await createStripePaymentIntent(payment);
        break;
      case 'paypal':
        paymentIntent = await createPayPalPaymentIntent(payment);
        break;
      case 'crypto':
        paymentIntent = await createCryptoPaymentIntent(payment);
        break;
      default:
        paymentIntent = {
          id: payment.transactionId,
          status: 'pending',
          amount: payment.amount,
          currency: payment.currency
        };
    }

    // Update payment with gateway response
    payment.gatewayResponse.intentId = paymentIntent.id;
    payment.gatewayResponse.status = paymentIntent.status;
    payment.status = 'processing';
    await payment.save();

    res.status(201).json({
      success: true,
      message: 'Payment intent created successfully',
      data: {
        paymentId: payment._id,
        transactionId: payment.transactionId,
        paymentIntent,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      }
    });
  } catch (error) {
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();

    return res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
}));

/**
 * @swagger
 * /api/payments/{id}/confirm:
 *   post:
 *     summary: Confirm payment completion
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *               transactionHash:
 *                 type: string
 *               walletAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Payment confirmation failed
 */
router.post('/payments/:id/confirm', auth, [
  param('id').isMongoId().withMessage('Invalid payment ID'),
  body('paymentMethodId').optional().notEmpty().withMessage('Payment method ID required'),
  body('transactionHash').optional().notEmpty().withMessage('Transaction hash required for crypto'),
  body('walletAddress').optional().notEmpty().withMessage('Wallet address required for crypto')
], validate, asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  if (payment.status !== 'processing' && payment.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Payment already ${payment.status}`
    });
  }

  try {
    let confirmationResult;

    switch (payment.method) {
      case 'stripe':
      case 'credit_card':
        confirmationResult = await confirmStripePayment(payment, req.body.paymentMethodId);
        break;
      case 'paypal':
        confirmationResult = await confirmPayPalPayment(payment);
        break;
      case 'crypto':
        confirmationResult = await confirmCryptoPayment(payment, req.body);
        break;
      default:
        // Manual confirmation for other methods
        confirmationResult = { success: true, status: 'completed' };
    }

    if (confirmationResult.success) {
      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.gatewayResponse = {
        ...payment.gatewayResponse,
        confirmation: confirmationResult
      };

      // Handle blockchain specific data
      if (payment.method === 'crypto' && req.body.transactionHash) {
        payment.blockchain = {
          network: req.body.network || 'ethereum',
          walletAddress: req.body.walletAddress,
          transactionHash: req.body.transactionHash,
          confirmations: 0,
          gasPrice: req.body.gasPrice || 0
        };
      }

      await payment.save();

      // Process the purchase (enroll in course, activate subscription, etc.)
      await processPurchase(payment);

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentId: payment._id,
          transactionId: payment.transactionId,
          status: payment.status,
          completedAt: payment.completedAt
        }
      });
    } else {
      payment.status = 'failed';
      payment.failureReason = confirmationResult.error || 'Payment confirmation failed';
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Payment confirmation failed',
        error: confirmationResult.error
      });
    }
  } catch (error) {
    payment.status = 'failed';
    payment.failureReason = error.message;
    await payment.save();

    res.status(500).json({
      success: false,
      message: 'Payment confirmation error',
      error: error.message
    });
  }
}));

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/payments', auth, [
  query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], validate, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user.id };
  if (status) filter.status = status;

  const payments = await Payment.find(filter)
    .populate('itemId', 'title thumbnail')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-gatewayResponse -blockchain.walletAddress'); // Hide sensitive data

  const total = await Payment.countDocuments(filter);

  res.json({
    success: true,
    data: payments,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  });
}));

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:id', auth, [
  param('id').isMongoId().withMessage('Invalid payment ID')
], validate, asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    _id: req.params.id,
    userId: req.user.id
  }).populate('itemId', 'title thumbnail instructor')
    .select('-gatewayResponse -blockchain.walletAddress'); // Hide sensitive data

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found'
    });
  }

  res.json({
    success: true,
    data: payment
  });
}));

/**
 * @swagger
 * /api/payments/{id}/refund:
 *   post:
 *     summary: Request payment refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Partial refund amount (optional)
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Refund not allowed
 */
router.post('/payments/:id/refund', auth, [
  param('id').isMongoId().withMessage('Invalid payment ID'),
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').optional().isNumeric().withMessage('Refund amount must be a number')
], validate, asyncHandler(async (req, res) => {
  const { reason, amount } = req.body;

  const payment = await Payment.findOne({
    _id: req.params.id,
    userId: req.user.id,
    status: 'completed'
  });

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment not found or not eligible for refund'
    });
  }

  // Check refund policy (e.g., within 30 days)
  const daysSincePurchase = (new Date() - payment.completedAt) / (1000 * 60 * 60 * 24);
  if (daysSincePurchase > 30) {
    return res.status(400).json({
      success: false,
      message: 'Refund period has expired (30 days)'
    });
  }

  const refundAmount = amount ? parseFloat(amount) : payment.amount;
  
  if (refundAmount > payment.amount) {
    return res.status(400).json({
      success: false,
      message: 'Refund amount cannot exceed original payment'
    });
  }

  try {
    // Process refund through payment gateway
    let refundResult;
    
    switch (payment.method) {
      case 'stripe':
      case 'credit_card':
        refundResult = await processStripeRefund(payment, refundAmount);
        break;
      case 'paypal':
        refundResult = await processPayPalRefund(payment, refundAmount);
        break;
      case 'crypto':
        refundResult = { success: false, error: 'Crypto refunds must be processed manually' };
        break;
      default:
        refundResult = { success: true, refundId: generateTransactionId() };
    }

    if (refundResult.success) {
      payment.status = 'refunded';
      payment.refund = {
        amount: refundAmount,
        reason,
        processedAt: new Date(),
        refundId: refundResult.refundId,
        gatewayResponse: refundResult
      };
      await payment.save();

      // Revoke access to purchased item
      await revokePurchaseAccess(payment);

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundAmount,
          refundId: refundResult.refundId,
          processedAt: payment.refund.processedAt
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Refund processing failed',
        error: refundResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Refund processing error',
      error: error.message
    });
  }
}));

/**
 * @swagger
 * /api/payments/analytics:
 *   get:
 *     summary: Get payment analytics (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment analytics retrieved successfully
 */
router.get('/payments/analytics', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const analytics = await Payment.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        totalTransactions: { $sum: 1 },
        completedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failedTransactions: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        refundedAmount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$refund.amount', 0] } },
        averageTransactionValue: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', null] } }
      }
    }
  ]);

  const byMethod = await Payment.aggregate([
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
        successRate: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
      }
    }
  ]);

  const byCurrency = await Payment.aggregate([
    {
      $group: {
        _id: '$currency',
        count: { $sum: 1 },
        totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } }
      }
    }
  ]);

  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'completed',
        completedAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      overview: analytics[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        refundedAmount: 0,
        averageTransactionValue: 0
      },
      byMethod,
      byCurrency,
      monthlyRevenue
    }
  });
}));

// Helper Functions

function generateTransactionId() {
  return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function getDefaultGateway(method) {
  const gatewayMap = {
    'credit_card': 'stripe',
    'stripe': 'stripe',
    'paypal': 'paypal',
    'crypto': 'coinbase',
    'bank_transfer': 'stripe'
  };
  return gatewayMap[method] || 'stripe';
}

// Payment Gateway Integration Functions (Placeholder implementations)

async function createStripePaymentIntent(payment) {
  // Placeholder for Stripe integration
  // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  // return await stripe.paymentIntents.create({ ... });
  
  return {
    id: 'pi_' + Math.random().toString(36).substr(2, 9),
    status: 'requires_payment_method',
    amount: payment.amount * 100, // Stripe uses cents
    currency: payment.currency.toLowerCase(),
    client_secret: 'pi_' + Math.random().toString(36).substr(2, 20)
  };
}

async function createPayPalPaymentIntent(payment) {
  // Placeholder for PayPal integration
  return {
    id: 'PAYID-' + Math.random().toString(36).substr(2, 10).toUpperCase(),
    status: 'created',
    amount: payment.amount,
    currency: payment.currency,
    approve_url: 'https://paypal.com/approve/' + Math.random().toString(36).substr(2, 10)
  };
}

async function createCryptoPaymentIntent(payment) {
  // Placeholder for crypto payment integration
  return {
    id: 'CRYPTO_' + Math.random().toString(36).substr(2, 10).toUpperCase(),
    status: 'awaiting_payment',
    amount: payment.amount,
    currency: payment.currency,
    wallet_address: '0x' + Math.random().toString(16).substr(2, 40),
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  };
}

async function confirmStripePayment(payment, paymentMethodId) {
  // Placeholder for Stripe payment confirmation
  return { success: true, status: 'completed' };
}

async function confirmPayPalPayment(payment) {
  // Placeholder for PayPal payment confirmation
  return { success: true, status: 'completed' };
}

async function confirmCryptoPayment(payment, data) {
  // Placeholder for crypto payment confirmation
  // Would typically verify transaction on blockchain
  return { success: true, status: 'completed' };
}

async function processStripeRefund(payment, amount) {
  // Placeholder for Stripe refund processing
  return { success: true, refundId: 're_' + Math.random().toString(36).substr(2, 9) };
}

async function processPayPalRefund(payment, amount) {
  // Placeholder for PayPal refund processing
  return { success: true, refundId: 'REFUND-' + Math.random().toString(36).substr(2, 10) };
}

async function processPurchase(payment) {
  // Handle post-payment processing (enrollment, access granting, etc.)
  if (payment.itemType === 'course') {
    const course = await Course.findById(payment.itemId);
    if (course) {
      // Add user to enrolled students
      if (!course.enrolledStudents.includes(payment.userId)) {
        course.enrolledStudents.push(payment.userId);
        await course.save();
      }

      // Create user progress record
      const { UserProgress } = require('../models');
      const existingProgress = await UserProgress.findOne({
        userId: payment.userId,
        courseId: payment.itemId
      });

      if (!existingProgress) {
        const userProgress = new UserProgress({
          userId: payment.userId,
          courseId: payment.itemId,
          enrolledAt: new Date(),
          progress: {
            completedLessons: 0,
            totalLessons: course.totalLessons || 0,
            percentage: 0
          }
        });
        await userProgress.save();
      }
    }
  }
}

async function revokePurchaseAccess(payment) {
  // Handle access revocation after refund
  if (payment.itemType === 'course') {
    const course = await Course.findById(payment.itemId);
    if (course) {
      course.enrolledStudents = course.enrolledStudents.filter(
        studentId => studentId.toString() !== payment.userId.toString()
      );
      await course.save();
    }

    // Archive user progress instead of deleting
    const { UserProgress } = require('../models');
    await UserProgress.findOneAndUpdate(
      { userId: payment.userId, courseId: payment.itemId },
      { status: 'refunded', refundedAt: new Date() }
    );
  }
}

module.exports = router;
