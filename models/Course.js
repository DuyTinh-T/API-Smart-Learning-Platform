const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  shortDescription: {
    type: String,
    maxlength: 300
  },
  
  // Media & Visuals
  thumbnail: {
    type: String,
    required: true
  },
  previewVideo: {
    type: String // URL to preview video
  },
  images: [{
    url: String,
    alt: String
  }],
  
  // Course Categorization
  category: {
    type: String,
    required: true,
    enum: [
      'programming', 'design', 'business', 'marketing', 
      'data_science', 'ai_ml', 'mobile_dev', 'web_dev',
      'devops', 'cybersecurity', 'blockchain', 'game_dev'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Course Metadata
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  language: {
    type: String,
    default: 'vietnamese'
  },
  duration: {
    totalHours: {
      type: Number,
      required: true
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    totalQuizzes: {
      type: Number,
      default: 0
    }
  },
  
  // Course Structure
  modules: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      maxlength: 500
    },
    order: {
      type: Number,
      required: true
    },
    lessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    estimatedDuration: {
      type: Number // minutes
    },
    prerequisites: [{
      type: String
    }],
    learningObjectives: [{
      type: String
    }]
  }],
  
  // Prerequisites & Requirements
  prerequisites: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  
  // Learning Outcomes
  learningOutcomes: [{
    type: String,
    required: true,
    trim: true
  }],
  
  // Instructor Information
  instructor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    bio: {
      type: String,
      maxlength: 1000
    },
    expertise: [{
      type: String
    }],
    socialLinks: {
      website: String,
      linkedin: String,
      twitter: String,
      github: String
    }
  },
  
  // Pricing & Enrollment
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'subscription'],
      default: 'free'
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'VND'
    },
    discountPrice: {
      type: Number,
      min: 0
    },
    discountExpiry: {
      type: Date
    }
  },
  
  // Course Status & Settings
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'under_review'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  allowEnrollment: {
    type: Boolean,
    default: true
  },
  certificateAvailable: {
    type: Boolean,
    default: false
  },
  
  // Analytics & Performance
  stats: {
    totalEnrollments: {
      type: Number,
      default: 0
    },
    activeEnrollments: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  },
  
  // Reviews & Ratings
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: 1000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false
    }
  }],
  
  // AI & Recommendation Data
  aiData: {
    difficulty_score: {
      type: Number,
      min: 0,
      max: 10
    },
    engagement_score: {
      type: Number,
      min: 0,
      max: 10
    },
    completion_prediction: {
      type: Number,
      min: 0,
      max: 1
    },
    recommended_study_time: {
      type: Number // minutes per day
    },
    similar_courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    skills_gained: [{
      skill: String,
      proficiency_level: {
        type: String,
        enum: ['basic', 'intermediate', 'advanced']
      }
    }]
  },
  
  // SEO & Marketing
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  
  // Timestamps
  publishedAt: {
    type: Date
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CourseSchema.index({ category: 1, level: 1 });
CourseSchema.index({ status: 1, isPublic: 1 });
CourseSchema.index({ 'instructor.userId': 1 });
CourseSchema.index({ tags: 1 });
CourseSchema.index({ 'stats.averageRating': -1 });
CourseSchema.index({ 'stats.totalEnrollments': -1 });
CourseSchema.index({ createdAt: -1 });
CourseSchema.index({ slug: 1 });
CourseSchema.index({ 'pricing.price': 1 });

// Text index for search
CourseSchema.index({
  title: 'text',
  description: 'text',
  'modules.title': 'text',
  tags: 'text'
});

// Virtual for total modules
CourseSchema.virtual('totalModules').get(function() {
  return this.modules.length;
});

// Virtual for formatted price
CourseSchema.virtual('formattedPrice').get(function() {
  if (this.pricing.type === 'free') return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: this.pricing.currency
  }).format(this.pricing.price);
});

// Pre-save middleware to generate slug
CourseSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  // Update lesson and quiz counts
  this.duration.totalLessons = this.modules.reduce((total, module) => 
    total + module.lessons.length, 0
  );
  
  this.lastUpdatedAt = Date.now();
  next();
});

// Static method to find similar courses
CourseSchema.statics.findSimilar = function(courseId, category, tags, limit = 5) {
  return this.find({
    _id: { $ne: courseId },
    status: 'published',
    isPublic: true,
    $or: [
      { category: category },
      { tags: { $in: tags } }
    ]
  })
  .sort({ 'stats.averageRating': -1, 'stats.totalEnrollments': -1 })
  .limit(limit)
  .populate('instructor.userId', 'name avatar');
};

// Static method to get popular courses
CourseSchema.statics.getPopular = function(limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true
  })
  .sort({ 'stats.totalEnrollments': -1, 'stats.averageRating': -1 })
  .limit(limit)
  .populate('instructor.userId', 'name avatar');
};

// Instance method to calculate average rating
CourseSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.stats.averageRating = 0;
    this.stats.totalReviews = 0;
    return;
  }
  
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.stats.averageRating = Number((totalRating / this.reviews.length).toFixed(1));
  this.stats.totalReviews = this.reviews.length;
};

// Instance method to update enrollment stats
CourseSchema.methods.updateEnrollmentStats = function(type = 'enroll') {
  if (type === 'enroll') {
    this.stats.totalEnrollments += 1;
    this.stats.activeEnrollments += 1;
  } else if (type === 'complete') {
    this.stats.activeEnrollments -= 1;
  } else if (type === 'drop') {
    this.stats.activeEnrollments -= 1;
  }
  
  // Update completion rate
  if (this.stats.totalEnrollments > 0) {
    const completed = this.stats.totalEnrollments - this.stats.activeEnrollments;
    this.stats.completionRate = Math.round((completed / this.stats.totalEnrollments) * 100);
  }
};

module.exports = mongoose.model('Course', CourseSchema);
