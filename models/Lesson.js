const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // Lesson Type & Content
  type: {
    type: String,
    enum: ['video', 'text', 'audio', 'interactive', 'quiz', 'assignment', 'live_session'],
    required: true
  },
  
  // Content based on type
  content: {
    // For text lessons
    text: {
      type: String,
      maxlength: 50000
    },
    
    // For video lessons
    video: {
      url: String,
      duration: Number, // seconds
      quality: {
        type: String,
        enum: ['240p', '360p', '480p', '720p', '1080p'],
        default: '720p'
      },
      subtitles: [{
        language: String,
        url: String
      }],
      thumbnail: String,
      chapters: [{
        title: String,
        startTime: Number, // seconds
        endTime: Number
      }]
    },
    
    // For audio lessons
    audio: {
      url: String,
      duration: Number, // seconds
      transcript: String
    },
    
    // For interactive lessons
    interactive: {
      html: String,
      css: String,
      javascript: String,
      iframe_url: String
    },
    
    // For assignments
    assignment: {
      instructions: String,
      maxFileSize: {
        type: Number,
        default: 10485760 // 10MB in bytes
      },
      allowedFileTypes: [{
        type: String,
        enum: ['pdf', 'doc', 'docx', 'txt', 'zip', 'jpg', 'png', 'mp4']
      }],
      dueDate: Date,
      maxScore: {
        type: Number,
        default: 100
      },
      rubric: [{
        criteria: String,
        maxPoints: Number,
        description: String
      }]
    }
  },
  
  // Media Resources
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'doc', 'video', 'audio', 'link', 'image', 'code']
    },
    url: String,
    fileSize: Number,
    downloadable: {
      type: Boolean,
      default: true
    }
  }],
  
  // Lesson Metadata
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // estimated duration in minutes
    required: true
  },
  
  // Prerequisites & Learning Objectives
  prerequisites: [{
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    required: {
      type: Boolean,
      default: true
    }
  }],
  learningObjectives: [{
    type: String,
    trim: true
  }],
  
  // Assessment & Quiz Integration
  hasQuiz: {
    type: Boolean,
    default: false
  },
  quizzes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  }],
  minQuizScore: {
    type: Number,
    default: 70, // minimum score to pass
    min: 0,
    max: 100
  },
  
  // Lesson Settings
  isPreview: {
    type: Boolean,
    default: false // if true, lesson is free to preview
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  allowDiscussion: {
    type: Boolean,
    default: true
  },
  allowNotes: {
    type: Boolean,
    default: true
  },
  
  // Progress Tracking
  completionCriteria: {
    type: {
      type: String,
      enum: ['time_based', 'interaction_based', 'quiz_based', 'manual'],
      default: 'time_based'
    },
    minTimeSpent: {
      type: Number, // minimum minutes to spend
      default: 0
    },
    requiredInteractions: [{
      type: String // e.g., 'click_button', 'submit_form', etc.
    }],
    passingScore: {
      type: Number,
      default: 70
    }
  },
  
  // Analytics for AI
  analytics: {
    totalViews: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number, // average minutes spent by students
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageScore: {
      type: Number,
      default: 0
    },
    dropOffPoints: [{
      timestamp: Number, // seconds where students usually drop off
      percentage: Number
    }],
    popularSections: [{
      startTime: Number,
      endTime: Number,
      replayCount: Number
    }],
    difficultyRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    }
  },
  
  // Comments & Discussions
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    timestamp: {
      type: Number, // seconds in video/audio where comment was made
      default: 0
    },
    replies: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 1000
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    isInstructorReply: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'under_review'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  
  // SEO
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  
  // AI Enhancement Data
  aiData: {
    transcription: {
      type: String // AI-generated transcription for videos/audio
    },
    keyTopics: [{
      topic: String,
      relevance: Number, // 0-1 score
      timestamp: Number // when topic appears (for videos)
    }],
    suggestedPrerequisites: [{
      topic: String,
      confidence: Number // AI confidence in suggestion
    }],
    difficulty_prediction: {
      type: Number,
      min: 1,
      max: 10
    },
    estimated_completion_time: {
      type: Number // AI predicted time in minutes
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
LessonSchema.index({ courseId: 1, moduleId: 1, order: 1 });
LessonSchema.index({ status: 1 });
LessonSchema.index({ type: 1 });
LessonSchema.index({ isPreview: 1 });
LessonSchema.index({ 'analytics.completionRate': -1 });
LessonSchema.index({ createdAt: -1 });

// Text search index
LessonSchema.index({
  title: 'text',
  description: 'text',
  'content.text': 'text',
  'aiData.keyTopics.topic': 'text'
});

// Virtual for formatted duration
LessonSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Virtual for total comments
LessonSchema.virtual('totalComments').get(function() {
  return this.comments.reduce((total, comment) => 
    total + 1 + comment.replies.length, 0
  );
});

// Pre-save middleware
LessonSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Instance method to add comment
LessonSchema.methods.addComment = function(userId, content, timestamp = 0) {
  this.comments.push({
    userId,
    content,
    timestamp,
    createdAt: new Date()
  });
  
  return this.save();
};

// Instance method to update analytics
LessonSchema.methods.updateAnalytics = function(timeSpent, completed = false, score = null) {
  this.analytics.totalViews += 1;
  
  // Update average time spent
  const currentAvg = this.analytics.averageTimeSpent;
  const views = this.analytics.totalViews;
  this.analytics.averageTimeSpent = ((currentAvg * (views - 1)) + timeSpent) / views;
  
  // Update completion rate if completed
  if (completed) {
    // This would need to be calculated with actual completion data
    // For now, we'll increment a simple counter
  }
  
  // Update average score
  if (score !== null) {
    const currentScore = this.analytics.averageScore || 0;
    this.analytics.averageScore = ((currentScore * (views - 1)) + score) / views;
  }
};

// Static method to find lessons by difficulty
LessonSchema.statics.findByDifficulty = function(level, courseId = null) {
  const query = {
    status: 'published',
    'aiData.difficulty_prediction': level
  };
  
  if (courseId) {
    query.courseId = courseId;
  }
  
  return this.find(query)
    .populate('courseId', 'title category')
    .sort({ order: 1 });
};

// Static method for AI recommendations
LessonSchema.statics.getRecommendations = function(userId, interests, difficulty, limit = 5) {
  return this.find({
    status: 'published',
    'aiData.keyTopics.topic': { $in: interests },
    'aiData.difficulty_prediction': { $lte: difficulty + 1, $gte: difficulty - 1 }
  })
  .populate('courseId', 'title category thumbnail')
  .sort({ 'analytics.engagementScore': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Lesson', LessonSchema);
