const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  // Target User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Recommendation Context
  context: {
    trigger: {
      type: String,
      enum: [
        'course_completion', 'lesson_completion', 'quiz_failure', 'quiz_success',
        'learning_path', 'skill_gap', 'peer_activity', 'time_based',
        'performance_drop', 'engagement_low', 'manual', 'seasonal'
      ],
      required: true
    },
    triggerData: {
      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
      },
      lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      },
      quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz'
      },
      score: Number,
      performance: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor']
      }
    }
  },
  
  // AI Analysis Data
  aiAnalysis: {
    algorithm: {
      type: String,
      enum: ['collaborative_filtering', 'content_based', 'hybrid', 'deep_learning', 'rule_based'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    reasoning: {
      type: String,
      maxlength: 1000
    },
    factors: [{
      factor: {
        type: String,
        enum: [
          'user_interest', 'skill_level', 'learning_style', 'completion_rate',
          'peer_similarity', 'content_similarity', 'trending', 'seasonal',
          'difficulty_match', 'time_availability', 'weak_area_improvement'
        ]
      },
      weight: {
        type: Number,
        min: 0,
        max: 1
      },
      value: String
    }],
    modelVersion: {
      type: String,
      default: '1.0'
    }
  },
  
  // Recommendations
  recommendations: [{
    // Recommendation Type
    type: {
      type: String,
      enum: [
        'course', 'lesson', 'quiz', 'study_path', 'study_schedule',
        'skill_practice', 'review_content', 'peer_connection',
        'learning_resource', 'break_suggestion', 'motivation'
      ],
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    
    // Content Reference
    contentRef: {
      itemType: {
        type: String,
        enum: ['Course', 'Lesson', 'Quiz', 'User', 'Resource']
      },
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'recommendations.contentRef.itemType'
      }
    },
    
    // Recommendation Details
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    actionText: {
      type: String, // e.g., "Start Course", "Review Lesson", "Take Quiz"
      maxlength: 50
    },
    
    // Customized Content
    personalizedMessage: {
      type: String,
      maxlength: 500
    },
    benefits: [{
      type: String,
      maxlength: 200
    }],
    estimatedTime: {
      type: Number // minutes
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    
    // Scheduling
    suggestedTiming: {
      type: String,
      enum: ['now', 'today', 'this_week', 'next_week', 'flexible'],
      default: 'flexible'
    },
    optimalStudyTime: {
      hour: {
        type: Number,
        min: 0,
        max: 23
      },
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6 // 0 = Sunday
      }
    },
    
    // Tracking
    score: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    dismissed: {
      type: Boolean,
      default: false
    },
    dismissedAt: Date,
    dismissReason: {
      type: String,
      enum: ['not_interested', 'already_completed', 'too_difficult', 'too_easy', 'no_time', 'other']
    },
    
    // Feedback
    userRating: {
      type: Number,
      min: 1,
      max: 5
    },
    userFeedback: {
      type: String,
      maxlength: 500
    },
    helpfulness: {
      type: String,
      enum: ['very_helpful', 'helpful', 'neutral', 'not_helpful', 'very_unhelpful']
    }
  }],
  
  // Delivery Settings
  delivery: {
    channel: {
      type: String,
      enum: ['in_app', 'email', 'push', 'sms', 'all'],
      default: 'in_app'
    },
    frequency: {
      type: String,
      enum: ['immediate', 'daily_digest', 'weekly_digest', 'on_demand'],
      default: 'immediate'
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
    openedAt: Date
  },
  
  // Validity & Expiration
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // A/B Testing
  experimentGroup: {
    type: String
  },
  variant: {
    type: String
  },
  
  // Performance Metrics
  metrics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    ctr: {
      type: Number, // Click-through rate
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // Auto-delete after 30 days
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

// Indexes for performance
RecommendationSchema.index({ userId: 1, isActive: 1 });
RecommendationSchema.index({ 'context.trigger': 1 });
RecommendationSchema.index({ 'delivery.channel': 1, 'delivery.sent': 1 });
RecommendationSchema.index({ validFrom: 1, validUntil: 1 });
RecommendationSchema.index({ createdAt: -1 });
RecommendationSchema.index({ 'recommendations.type': 1 });
RecommendationSchema.index({ 'aiAnalysis.confidence': -1 });
RecommendationSchema.index({ experimentGroup: 1, variant: 1 });

// Virtual for total recommendations
RecommendationSchema.virtual('totalRecommendations').get(function() {
  return this.recommendations.length;
});

// Virtual for active recommendations
RecommendationSchema.virtual('activeRecommendations').get(function() {
  return this.recommendations.filter(rec => 
    !rec.dismissed && !rec.completed && new Date() <= this.validUntil
  );
});

// Pre-save middleware
RecommendationSchema.pre('save', function(next) {
  // Update CTR and conversion rates
  this.recommendations.forEach(rec => {
    if (this.metrics.impressions > 0) {
      this.metrics.ctr = this.metrics.clicks / this.metrics.impressions;
      this.metrics.conversionRate = this.metrics.conversions / this.metrics.impressions;
    }
  });
  
  next();
});

// Instance method to mark recommendation as viewed
RecommendationSchema.methods.markAsViewed = function(recommendationId) {
  const rec = this.recommendations.id(recommendationId);
  if (rec) {
    this.metrics.impressions += 1;
  }
  return this.save();
};

// Instance method to mark recommendation as clicked
RecommendationSchema.methods.markAsClicked = function(recommendationId) {
  const rec = this.recommendations.id(recommendationId);
  if (rec && !rec.clicked) {
    rec.clicked = true;
    rec.clickedAt = new Date();
    this.metrics.clicks += 1;
  }
  return this.save();
};

// Instance method to mark recommendation as completed
RecommendationSchema.methods.markAsCompleted = function(recommendationId) {
  const rec = this.recommendations.id(recommendationId);
  if (rec && !rec.completed) {
    rec.completed = true;
    rec.completedAt = new Date();
    this.metrics.conversions += 1;
  }
  return this.save();
};

// Instance method to dismiss recommendation
RecommendationSchema.methods.dismissRecommendation = function(recommendationId, reason) {
  const rec = this.recommendations.id(recommendationId);
  if (rec) {
    rec.dismissed = true;
    rec.dismissedAt = new Date();
    rec.dismissReason = reason;
  }
  return this.save();
};

// Static method to get active recommendations for user
RecommendationSchema.statics.getActiveForUser = function(userId, limit = 10) {
  return this.find({
    userId: userId,
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }
  })
  .populate('recommendations.contentRef.itemId')
  .sort({ 'aiAnalysis.confidence': -1, createdAt: -1 })
  .limit(limit);
};

// Static method to get recommendations by type
RecommendationSchema.statics.getByType = function(userId, type, limit = 5) {
  return this.find({
    userId: userId,
    'recommendations.type': type,
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() }
  })
  .populate('recommendations.contentRef.itemId')
  .sort({ 'recommendations.score': -1 })
  .limit(limit);
};

// Static method to get trending recommendations
RecommendationSchema.statics.getTrending = function(timeframe = 7) {
  const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $unwind: '$recommendations'
    },
    {
      $group: {
        _id: {
          type: '$recommendations.type',
          contentId: '$recommendations.contentRef.itemId'
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: '$aiAnalysis.confidence' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalConversions: { $sum: '$metrics.conversions' }
      }
    },
    {
      $sort: { count: -1, avgConfidence: -1 }
    },
    {
      $limit: 20
    }
  ]);
};

// Static method for A/B testing analysis
RecommendationSchema.statics.getABTestResults = function(experimentGroup) {
  return this.aggregate([
    {
      $match: {
        experimentGroup: experimentGroup
      }
    },
    {
      $group: {
        _id: '$variant',
        totalRecommendations: { $sum: 1 },
        avgConfidence: { $avg: '$aiAnalysis.confidence' },
        totalImpressions: { $sum: '$metrics.impressions' },
        totalClicks: { $sum: '$metrics.clicks' },
        totalConversions: { $sum: '$metrics.conversions' },
        avgCTR: { $avg: '$metrics.ctr' },
        avgConversionRate: { $avg: '$metrics.conversionRate' }
      }
    },
    {
      $sort: { avgConversionRate: -1 }
    }
  ]);
};

// Static method to clean up expired recommendations
RecommendationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { validUntil: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

module.exports = mongoose.model('Recommendation', RecommendationSchema);
