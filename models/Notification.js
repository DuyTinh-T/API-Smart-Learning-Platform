const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  // Target User(s)
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    // For bulk notifications
    userGroup: {
      type: String,
      enum: ['all_users', 'students', 'teachers', 'admins', 'premium_users', 'course_enrolled']
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course' // For course-specific notifications
    }
  },
  
  // Notification Content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  shortMessage: {
    type: String,
    maxlength: 100 // For push notifications
  },
  
  // Notification Type & Category
  type: {
    type: String,
    enum: [
      // Learning related
      'course_reminder', 'lesson_available', 'quiz_available', 'assignment_due',
      'course_completed', 'certificate_ready', 'progress_milestone',
      
      // AI related
      'ai_recommendation', 'personalized_tip', 'study_streak', 'performance_insight',
      
      // Social & Community
      'peer_achievement', 'discussion_reply', 'mentor_message',
      
      // System & Account
      'account_update', 'security_alert', 'payment_confirmation', 'subscription_expiry',
      
      // Marketing & Engagement
      'new_course_launch', 'discount_offer', 'feature_announcement',
      
      // Administrative
      'system_maintenance', 'policy_update', 'general_announcement'
    ],
    required: true,
    index: true
  },
  
  category: {
    type: String,
    enum: ['learning', 'ai', 'social', 'system', 'marketing', 'admin'],
    required: true
  },
  
  // Priority & Urgency
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  // Content References
  relatedContent: {
    contentType: {
      type: String,
      enum: ['Course', 'Lesson', 'Quiz', 'Payment', 'User', 'Recommendation']
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedContent.contentType'
    },
    actionUrl: String, // Deep link to specific content
    actionText: String // Call-to-action button text
  },
  
  // Personalization Data
  personalization: {
    userName: String,
    courseName: String,
    lessonName: String,
    progress: Number,
    streak: Number,
    customData: mongoose.Schema.Types.Mixed
  },
  
  // Delivery Channels
  channels: {
    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      read: {
        type: Boolean,
        default: false
      },
      readAt: Date
    },
    
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      opened: {
        type: Boolean,
        default: false
      },
      openedAt: Date,
      clicked: {
        type: Boolean,
        default: false
      },
      clickedAt: Date,
      bounced: {
        type: Boolean,
        default: false
      }
    },
    
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      clicked: {
        type: Boolean,
        default: false
      },
      clickedAt: Date,
      deviceTokens: [String]
    },
    
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: Date,
      delivered: {
        type: Boolean,
        default: false
      },
      deliveredAt: Date,
      phoneNumber: String
    }
  },
  
  // Scheduling
  scheduling: {
    sendAt: {
      type: Date,
      default: Date.now
    },
    timezone: {
      type: String,
      default: 'UTC+7'
    },
    recurring: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom']
      },
      interval: Number, // For custom frequency (days)
      endDate: Date,
      lastSent: Date,
      nextSend: Date
    },
    optimal: {
      useAI: {
        type: Boolean,
        default: false
      },
      bestTimeHour: {
        type: Number,
        min: 0,
        max: 23
      },
      bestDayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      }
    }
  },
  
  // AI Enhancement
  aiGenerated: {
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    model: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    personalizationLevel: {
      type: String,
      enum: ['generic', 'basic', 'advanced', 'highly_personalized'],
      default: 'generic'
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'encouraging', 'urgent', 'celebratory']
    },
    tone: {
      type: String,
      enum: ['formal', 'casual', 'friendly', 'professional', 'motivational']
    }
  },
  
  // Engagement Tracking
  engagement: {
    viewed: {
      type: Boolean,
      default: false
    },
    viewedAt: Date,
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date,
    dismissed: {
      type: Boolean,
      default: false
    },
    dismissedAt: Date,
    actionTaken: {
      type: Boolean,
      default: false
    },
    actionTakenAt: Date,
    actionType: String, // What action was taken
    
    // User feedback
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      enum: ['helpful', 'not_helpful', 'irrelevant', 'too_frequent', 'good_timing', 'bad_timing']
    }
  },
  
  // A/B Testing
  experiment: {
    experimentId: String,
    variant: String,
    controlGroup: {
      type: Boolean,
      default: false
    }
  },
  
  // Templates & Localization
  template: {
    templateId: String,
    variables: mongoose.Schema.Types.Mixed,
    language: {
      type: String,
      default: 'vi'
    },
    localizedContent: {
      vi: {
        title: String,
        message: String
      },
      en: {
        title: String,
        message: String
      }
    }
  },
  
  // Status & Lifecycle
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'draft',
    index: true
  },
  
  // Failure & Retry Logic
  failure: {
    reason: String,
    attemptCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    nextRetryAt: Date,
    permanentFailure: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['manual', 'automated', 'ai_triggered', 'event_triggered', 'scheduled']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    tags: [String],
    campaignId: String,
    batchId: String
  },
  
  // Expiration
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
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
NotificationSchema.index({ 'recipient.userId': 1, status: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ 'scheduling.sendAt': 1, status: 1 });
NotificationSchema.index({ 'channels.inApp.read': 1 });
NotificationSchema.index({ priority: 1, createdAt: -1 });
NotificationSchema.index({ 'recipient.userGroup': 1 });
NotificationSchema.index({ 'experiment.experimentId': 1 });

// Virtual for total engagement
NotificationSchema.virtual('totalEngagement').get(function() {
  let score = 0;
  if (this.engagement.viewed) score += 1;
  if (this.engagement.clicked) score += 2;
  if (this.engagement.actionTaken) score += 3;
  return score;
});

// Virtual for delivery status
NotificationSchema.virtual('deliveryStatus').get(function() {
  const channels = this.channels;
  let delivered = 0;
  let total = 0;
  
  if (channels.inApp.enabled) {
    total++;
    if (channels.inApp.sent) delivered++;
  }
  if (channels.email.enabled) {
    total++;
    if (channels.email.sent && !channels.email.bounced) delivered++;
  }
  if (channels.push.enabled) {
    total++;
    if (channels.push.delivered) delivered++;
  }
  if (channels.sms.enabled) {
    total++;
    if (channels.sms.delivered) delivered++;
  }
  
  return total > 0 ? (delivered / total) * 100 : 0;
});

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Set expiration if not set (default 30 days)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Update personalization data
  if (this.personalization && this.personalization.userName) {
    this.title = this.title.replace('{userName}', this.personalization.userName);
    this.message = this.message.replace('{userName}', this.personalization.userName);
  }
  
  next();
});

// Instance method to mark as read
NotificationSchema.methods.markAsRead = function() {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  this.engagement.viewed = true;
  this.engagement.viewedAt = new Date();
  return this.save();
};

// Instance method to mark as clicked
NotificationSchema.methods.markAsClicked = function(actionType) {
  this.engagement.clicked = true;
  this.engagement.clickedAt = new Date();
  this.engagement.actionType = actionType;
  
  // Update channel-specific click tracking
  if (this.channels.email.enabled) {
    this.channels.email.clicked = true;
    this.channels.email.clickedAt = new Date();
  }
  if (this.channels.push.enabled) {
    this.channels.push.clicked = true;
    this.channels.push.clickedAt = new Date();
  }
  
  return this.save();
};

// Instance method to dismiss
NotificationSchema.methods.dismiss = function() {
  this.engagement.dismissed = true;
  this.engagement.dismissedAt = new Date();
  return this.save();
};

// Static method to create AI recommendation notification
NotificationSchema.statics.createAIRecommendation = function(userId, recommendation) {
  return new this({
    recipient: { userId: userId },
    type: 'ai_recommendation',
    category: 'ai',
    title: recommendation.title,
    message: recommendation.description,
    relatedContent: {
      contentType: recommendation.contentRef?.itemType,
      contentId: recommendation.contentRef?.itemId,
      actionText: recommendation.actionText
    },
    channels: {
      inApp: { enabled: true },
      push: { enabled: true }
    },
    aiGenerated: {
      isAiGenerated: true,
      confidence: recommendation.score,
      personalizationLevel: 'advanced'
    },
    metadata: {
      source: 'ai_triggered'
    }
  });
};

// Static method to get unread notifications for user
NotificationSchema.statics.getUnreadForUser = function(userId, limit = 20) {
  return this.find({
    'recipient.userId': userId,
    'channels.inApp.read': false,
    status: 'sent'
  })
  .populate('relatedContent.contentId')
  .sort({ priority: -1, createdAt: -1 })
  .limit(limit);
};

// Static method to get notification statistics
NotificationSchema.statics.getStatistics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$status'
        },
        count: { $sum: 1 },
        readRate: {
          $avg: {
            $cond: ['$channels.inApp.read', 1, 0]
          }
        },
        clickRate: {
          $avg: {
            $cond: ['$engagement.clicked', 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to clean up old notifications
NotificationSchema.statics.cleanup = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    'channels.inApp.read': true
  });
};

module.exports = mongoose.model('Notification', NotificationSchema);
