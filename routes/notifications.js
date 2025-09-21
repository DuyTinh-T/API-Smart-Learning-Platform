const express = require('express');
const { body, param, query } = require('express-validator');
const { Notification, User } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - title
 *         - message
 *         - type
 *         - channel
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         type:
 *           type: string
 *           enum: [info, success, warning, error, course_update, quiz_reminder, payment_confirmation, system_maintenance]
 *         channel:
 *           type: string
 *           enum: [in_app, email, sms, push]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         status:
 *           type: string
 *           enum: [pending, sent, delivered, failed, read]
 *         metadata:
 *           type: object
 *           properties:
 *             courseId:
 *               type: string
 *             lessonId:
 *               type: string
 *             quizId:
 *               type: string
 *             actionUrl:
 *               type: string
 *             imageUrl:
 *               type: string
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *         sentAt:
 *           type: string
 *           format: date-time
 *         readAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Multi-channel notification system
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, failed, read]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, course_update, quiz_reminder, payment_confirmation, system_maintenance]
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [in_app, email, sms, push]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 unreadCount:
 *                   type: number
 */
router.get('/notifications', auth, [
  query('status').optional().isIn(['pending', 'sent', 'delivered', 'failed', 'read'])
    .withMessage('Invalid status'),
  query('type').optional().isIn(['info', 'success', 'warning', 'error', 'course_update', 'quiz_reminder', 'payment_confirmation', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  query('channel').optional().isIn(['in_app', 'email', 'sms', 'push'])
    .withMessage('Invalid channel'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('unreadOnly').optional().isBoolean().withMessage('UnreadOnly must be boolean')
], validate, asyncHandler(async (req, res) => {
  const { status, type, channel, page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { userId: req.user.id };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (channel) filter.channel = channel;
  if (unreadOnly === 'true') filter.readAt = null;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1, priority: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('metadata.courseId', 'title thumbnail')
    .populate('metadata.quizId', 'title');

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({
    userId: req.user.id,
    readAt: null
  });

  res.json({
    success: true,
    data: notifications,
    unreadCount,
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
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/notifications/:id/read', auth, [
  param('id').isMongoId().withMessage('Invalid notification ID')
], validate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id, readAt: null },
    { 
      readAt: new Date(),
      status: 'read'
    },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found or already read'
    });
  }

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
}));

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/notifications/mark-all-read', auth, asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user.id, readAt: null },
    { 
      readAt: new Date(),
      status: 'read'
    }
  );

  res.json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
    data: {
      updatedCount: result.modifiedCount
    }
  });
}));

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
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
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 */
router.delete('/notifications/:id', auth, [
  param('id').isMongoId().withMessage('Invalid notification ID')
], validate, asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
}));

/**
 * @swagger
 * /api/notifications/send:
 *   post:
 *     summary: Send notification (Admin/Teacher only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - type
 *               - channel
 *               - recipients
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error, course_update, quiz_reminder, payment_confirmation, system_maintenance]
 *               channel:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [in_app, email, sms, push]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               recipients:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [specific_users, course_students, all_users, role_based]
 *                   userIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   courseId:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum: [student, teacher, admin]
 *               metadata:
 *                 type: object
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Notification sent successfully
 *       400:
 *         description: Invalid notification data
 */
router.post('/notifications/send', auth, authorize('admin', 'teacher'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['info', 'success', 'warning', 'error', 'course_update', 'quiz_reminder', 'payment_confirmation', 'system_maintenance'])
    .withMessage('Invalid notification type'),
  body('channel').isArray({ min: 1 }).withMessage('At least one channel is required'),
  body('channel.*').isIn(['in_app', 'email', 'sms', 'push']).withMessage('Invalid channel'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('recipients.type').isIn(['specific_users', 'course_students', 'all_users', 'role_based'])
    .withMessage('Invalid recipient type'),
  body('scheduledFor').optional().isISO8601().withMessage('Invalid scheduled date format')
], validate, asyncHandler(async (req, res) => {
  const { title, message, type, channel, priority = 'medium', recipients, metadata, scheduledFor } = req.body;

  // Get recipient user IDs based on type
  let recipientUserIds = [];

  switch (recipients.type) {
    case 'specific_users':
      if (!recipients.userIds || recipients.userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User IDs required for specific users'
        });
      }
      recipientUserIds = recipients.userIds;
      break;

    case 'course_students':
      if (!recipients.courseId) {
        return res.status(400).json({
          success: false,
          message: 'Course ID required for course students'
        });
      }
      const { Course } = require('../models');
      const course = await Course.findById(recipients.courseId);
      if (course) {
        recipientUserIds = course.enrolledStudents;
      }
      break;

    case 'all_users':
      const allUsers = await User.find({}, '_id');
      recipientUserIds = allUsers.map(user => user._id);
      break;

    case 'role_based':
      if (!recipients.role) {
        return res.status(400).json({
          success: false,
          message: 'Role required for role-based notifications'
        });
      }
      const roleUsers = await User.find({ role: recipients.role }, '_id');
      recipientUserIds = roleUsers.map(user => user._id);
      break;
  }

  if (recipientUserIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No recipients found'
    });
  }

  const notifications = [];
  const now = new Date();
  const scheduled = scheduledFor ? new Date(scheduledFor) : now;

  // Create notifications for each recipient and channel
  for (const userId of recipientUserIds) {
    for (const channelType of channel) {
      const notification = new Notification({
        userId,
        title,
        message,
        type,
        channel: channelType,
        priority,
        status: scheduled > now ? 'pending' : 'sent',
        metadata: metadata || {},
        scheduledFor: scheduled,
        sentAt: scheduled <= now ? now : null,
        createdBy: req.user.id
      });

      notifications.push(notification);
    }
  }

  // Bulk insert notifications
  const savedNotifications = await Notification.insertMany(notifications);

  // Send immediate notifications (not scheduled)
  if (scheduled <= now) {
    // Process sending through different channels
    await processNotifications(savedNotifications.filter(n => n.scheduledFor <= now));
  }

  res.status(201).json({
    success: true,
    message: `${savedNotifications.length} notifications created`,
    data: {
      totalNotifications: savedNotifications.length,
      recipients: recipientUserIds.length,
      channels: channel.length,
      scheduledFor: scheduled,
      immediate: scheduled <= now
    }
  });
}));

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 */
router.get('/notifications/preferences', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('notificationPreferences');

  const defaultPreferences = {
    in_app: {
      course_update: true,
      quiz_reminder: true,
      payment_confirmation: true,
      system_maintenance: true
    },
    email: {
      course_update: true,
      quiz_reminder: true,
      payment_confirmation: true,
      system_maintenance: false
    },
    sms: {
      course_update: false,
      quiz_reminder: true,
      payment_confirmation: true,
      system_maintenance: false
    },
    push: {
      course_update: true,
      quiz_reminder: true,
      payment_confirmation: true,
      system_maintenance: true
    }
  };

  const preferences = user.notificationPreferences || defaultPreferences;

  res.json({
    success: true,
    data: preferences
  });
}));

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update user notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               in_app:
 *                 type: object
 *               email:
 *                 type: object
 *               sms:
 *                 type: object
 *               push:
 *                 type: object
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 */
router.put('/notifications/preferences', auth, [
  body('in_app').optional().isObject().withMessage('In-app preferences must be an object'),
  body('email').optional().isObject().withMessage('Email preferences must be an object'),
  body('sms').optional().isObject().withMessage('SMS preferences must be an object'),
  body('push').optional().isObject().withMessage('Push preferences must be an object')
], validate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  // Update notification preferences
  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...req.body
  };

  await user.save();

  res.json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: user.notificationPreferences
  });
}));

/**
 * @swagger
 * /api/notifications/analytics:
 *   get:
 *     summary: Get notification analytics (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *     responses:
 *       200:
 *         description: Notification analytics retrieved successfully
 */
router.get('/notifications/analytics', auth, authorize('admin'), [
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('Invalid period')
], validate, asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const now = new Date();
  let startDate;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
  }

  const analytics = await Notification.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        sentNotifications: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read']] }, 1, 0] } },
        readNotifications: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        failedNotifications: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    }
  ]);

  const byChannel = await Notification.aggregate([
    {
      $match: { createdAt: { $gte: startDate } }
    },
    {
      $group: {
        _id: '$channel',
        count: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ['$status', ['sent', 'delivered', 'read']] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
      }
    }
  ]);

  const byType = await Notification.aggregate([
    {
      $match: { createdAt: { $gte: startDate } }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        readRate: { $avg: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } }
      }
    }
  ]);

  const dailyStats = await Notification.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        sent: { $sum: 1 },
        read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      period,
      overview: analytics[0] || {
        totalNotifications: 0,
        sentNotifications: 0,
        readNotifications: 0,
        failedNotifications: 0
      },
      byChannel,
      byType,
      dailyStats: dailyStats.slice(-30) // Last 30 days
    }
  });
}));

// Helper Functions

async function processNotifications(notifications) {
  // Process notifications through different channels
  const notificationsByChannel = notifications.reduce((acc, notification) => {
    if (!acc[notification.channel]) {
      acc[notification.channel] = [];
    }
    acc[notification.channel].push(notification);
    return acc;
  }, {});

  // Process each channel
  for (const [channel, channelNotifications] of Object.entries(notificationsByChannel)) {
    try {
      switch (channel) {
        case 'in_app':
          // In-app notifications are already stored, just mark as sent
          await markNotificationsAsSent(channelNotifications);
          break;
        case 'email':
          await sendEmailNotifications(channelNotifications);
          break;
        case 'sms':
          await sendSMSNotifications(channelNotifications);
          break;
        case 'push':
          await sendPushNotifications(channelNotifications);
          break;
      }
    } catch (error) {
      console.error(`Failed to process ${channel} notifications:`, error);
      await markNotificationsAsFailed(channelNotifications, error.message);
    }
  }
}

async function markNotificationsAsSent(notifications) {
  const notificationIds = notifications.map(n => n._id);
  await Notification.updateMany(
    { _id: { $in: notificationIds } },
    { 
      status: 'sent',
      sentAt: new Date()
    }
  );
}

async function markNotificationsAsFailed(notifications, errorMessage) {
  const notificationIds = notifications.map(n => n._id);
  await Notification.updateMany(
    { _id: { $in: notificationIds } },
    { 
      status: 'failed',
      failureReason: errorMessage
    }
  );
}

async function sendEmailNotifications(notifications) {
  // Placeholder for email sending logic
  // Would integrate with services like SendGrid, SES, etc.
  console.log(`Sending ${notifications.length} email notifications`);
  
  // Simulate processing
  for (const notification of notifications) {
    // Check user email preferences
    const user = await User.findById(notification.userId).select('notificationPreferences email');
    
    if (user?.notificationPreferences?.email?.[notification.type] !== false) {
      // Send email logic here
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
      notification.failureReason = 'User has disabled email notifications for this type';
    }
    
    await notification.save();
  }
}

async function sendSMSNotifications(notifications) {
  // Placeholder for SMS sending logic
  // Would integrate with services like Twilio, etc.
  console.log(`Sending ${notifications.length} SMS notifications`);
  
  for (const notification of notifications) {
    const user = await User.findById(notification.userId).select('notificationPreferences phone');
    
    if (user?.notificationPreferences?.sms?.[notification.type] !== false && user.phone) {
      // Send SMS logic here
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
      notification.failureReason = 'User has disabled SMS notifications or no phone number';
    }
    
    await notification.save();
  }
}

async function sendPushNotifications(notifications) {
  // Placeholder for push notification logic
  // Would integrate with Firebase Cloud Messaging, etc.
  console.log(`Sending ${notifications.length} push notifications`);
  
  for (const notification of notifications) {
    const user = await User.findById(notification.userId).select('notificationPreferences pushTokens');
    
    if (user?.notificationPreferences?.push?.[notification.type] !== false && user.pushTokens?.length > 0) {
      // Send push notification logic here
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
      notification.failureReason = 'User has disabled push notifications or no push tokens';
    }
    
    await notification.save();
  }
}

module.exports = router;
