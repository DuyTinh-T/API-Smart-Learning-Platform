const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Learning Profile (for AI recommendations)
  profile: {
    learningGoal: {
      type: String,
      enum: ['career_change', 'skill_upgrade', 'hobby', 'certification', 'academic'],
      default: 'skill_upgrade'
    },
    dailyStudyTime: {
      type: Number, // minutes per day
      default: 30,
      min: 10,
      max: 480
    },
    preferredLearningStyle: {
      type: String,
      enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
      default: 'visual'
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    interests: [{
      type: String,
      trim: true
    }],
    timezone: {
      type: String,
      default: 'UTC+7'
    }
  },
  
  // Course Enrollment & Progress
  enrolledCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped', 'paused'],
      default: 'active'
    },
    progress: {
      completedModules: [{
        moduleId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        completedAt: {
          type: Date,
          default: Date.now
        }
      }],
      completedLessons: [{
        lessonId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Lesson',
          required: true
        },
        completedAt: {
          type: Date,
          default: Date.now
        },
        timeSpent: {
          type: Number, // minutes
          default: 0
        },
        score: {
          type: Number, // for quizzes
          min: 0,
          max: 100
        }
      }],
      overallProgress: {
        type: Number, // percentage
        default: 0,
        min: 0,
        max: 100
      },
      totalStudyTime: {
        type: Number, // total minutes spent
        default: 0
      },
      averageScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      lastAccessedAt: {
        type: Date,
        default: Date.now
      }
    }
  }],
  
  // Learning Analytics (for AI)
  analytics: {
    studyStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    totalCoursesCompleted: {
      type: Number,
      default: 0
    },
    totalStudyTime: {
      type: Number, // total minutes across all courses
      default: 0
    },
    averageSessionDuration: {
      type: Number, // minutes
      default: 0
    },
    preferredStudyTimes: [{
      hour: {
        type: Number,
        min: 0,
        max: 23
      },
      frequency: {
        type: Number,
        default: 1
      }
    }],
    weakAreas: [{
      topic: String,
      difficulty: {
        type: String,
        enum: ['low', 'medium', 'high']
      }
    }],
    strongAreas: [{
      topic: String,
      proficiency: {
        type: String,
        enum: ['good', 'very_good', 'excellent']
      }
    }]
  },
  
  // Notification Settings
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    studyReminders: {
      type: Boolean,
      default: true
    },
    aiRecommendations: {
      type: Boolean,
      default: true
    }
  },
  
  // Security & Authentication
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
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

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'enrolledCourses.courseId': 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'profile.interests': 1 });

// Virtual for total enrolled courses
UserSchema.virtual('totalEnrolledCourses').get(function() {
  return this.enrolledCourses.length;
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Pre-save middleware to update timestamps
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update progress
UserSchema.methods.updateCourseProgress = function(courseId, lessonId, timeSpent, score) {
  const courseProgress = this.enrolledCourses.find(
    course => course.courseId.toString() === courseId.toString()
  );
  
  if (courseProgress) {
    // Update lesson completion
    const existingLesson = courseProgress.progress.completedLessons.find(
      lesson => lesson.lessonId.toString() === lessonId.toString()
    );
    
    if (!existingLesson) {
      courseProgress.progress.completedLessons.push({
        lessonId,
        timeSpent,
        score,
        completedAt: new Date()
      });
    }
    
    // Update total study time
    courseProgress.progress.totalStudyTime += timeSpent;
    this.analytics.totalStudyTime += timeSpent;
    
    // Update last accessed
    courseProgress.progress.lastAccessedAt = new Date();
  }
};

// Static method to find users for AI recommendations
UserSchema.statics.findSimilarUsers = function(userId, interests, skillLevel) {
  return this.find({
    _id: { $ne: userId },
    'profile.interests': { $in: interests },
    'profile.skillLevel': skillLevel,
    isActive: true
  });
};

module.exports = mongoose.model('User', UserSchema);
