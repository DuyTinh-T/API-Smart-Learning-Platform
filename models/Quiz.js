const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  instructions: {
    type: String,
    maxlength: 2000
  },
  
  // Quiz Type & Settings
  type: {
    type: String,
    enum: ['practice', 'assessment', 'final_exam', 'certification'],
    default: 'practice'
  },
  
  // Associated Course/Lesson
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  moduleId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // Questions
  questions: [{
    // Question Basic Info
    questionText: {
      type: String,
      required: true,
      maxlength: 2000
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'single_choice', 'true_false', 'fill_blank', 'essay', 'code', 'matching', 'ordering'],
      required: true
    },
    points: {
      type: Number,
      default: 1,
      min: 1
    },
    order: {
      type: Number,
      required: true
    },
    
    // Media Support
    image: {
      type: String // URL to image
    },
    video: {
      type: String // URL to video
    },
    audio: {
      type: String // URL to audio
    },
    
    // Answer Options (for multiple choice, single choice)
    options: [{
      text: {
        type: String,
        required: true,
        maxlength: 500
      },
      isCorrect: {
        type: Boolean,
        default: false
      },
      explanation: {
        type: String,
        maxlength: 1000
      },
      order: {
        type: Number,
        required: true
      }
    }],
    
    // Correct Answers (for different question types)
    correctAnswers: {
      // For fill in the blanks - multiple possible answers
      fillBlanks: [{
        type: String,
        trim: true
      }],
      
      // For true/false
      trueFalse: {
        type: Boolean
      },
      
      // For essay questions - model answer
      essay: {
        type: String,
        maxlength: 5000
      },
      
      // For code questions
      code: {
        language: {
          type: String,
          enum: ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'sql']
        },
        solution: String,
        testCases: [{
          input: String,
          expectedOutput: String
        }]
      },
      
      // For matching questions
      matching: [{
        left: String,
        right: String
      }],
      
      // For ordering questions
      ordering: [{
        item: String,
        correctPosition: Number
      }]
    },
    
    // Question Analytics & AI Data
    analytics: {
      totalAttempts: {
        type: Number,
        default: 0
      },
      correctAttempts: {
        type: Number,
        default: 0
      },
      averageTime: {
        type: Number, // seconds
        default: 0
      },
      difficultyScore: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      },
      commonMistakes: [{
        answer: String,
        frequency: Number
      }]
    },
    
    // Explanation and Hints
    explanation: {
      type: String,
      maxlength: 2000
    },
    hints: [{
      type: String,
      maxlength: 500
    }],
    
    // Question Metadata
    tags: [{
      type: String,
      lowercase: true,
      trim: true
    }],
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    estimatedTime: {
      type: Number, // seconds
      default: 60
    }
  }],
  
  // Quiz Configuration
  settings: {
    // Time Settings
    timeLimit: {
      type: Number, // minutes, 0 means no limit
      default: 0
    },
    timePerQuestion: {
      type: Number, // seconds per question
      default: 60
    },
    
    // Attempt Settings
    maxAttempts: {
      type: Number,
      default: 3,
      min: 1
    },
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    
    // Display Settings
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: String,
      enum: ['immediately', 'after_submission', 'after_deadline', 'never'],
      default: 'after_submission'
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    showExplanations: {
      type: Boolean,
      default: true
    },
    
    // Navigation Settings
    allowBacktrack: {
      type: Boolean,
      default: true
    },
    requireSequential: {
      type: Boolean,
      default: false
    },
    
    // Security Settings
    preventCheating: {
      type: Boolean,
      default: false
    },
    webcamRequired: {
      type: Boolean,
      default: false
    },
    fullScreen: {
      type: Boolean,
      default: false
    }
  },
  
  // Grading & Scoring
  totalPoints: {
    type: Number,
    default: 0
  },
  weightage: {
    type: Number, // percentage of course grade
    default: 0,
    min: 0,
    max: 100
  },
  
  // Quiz Attempts & Results
  attempts: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    answers: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      answer: mongoose.Schema.Types.Mixed, // Flexible for different answer types
      isCorrect: Boolean,
      pointsEarned: {
        type: Number,
        default: 0
      },
      timeSpent: {
        type: Number, // seconds
        default: 0
      },
      submittedAt: {
        type: Date,
        default: Date.now
      }
    }],
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    totalPointsEarned: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    submittedAt: {
      type: Date
    },
    timeSpent: {
      type: Number, // total seconds
      default: 0
    },
    attemptNumber: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'auto_submitted', 'abandoned'],
      default: 'in_progress'
    },
    ipAddress: String,
    userAgent: String,
    
    // AI Proctoring Data (if enabled)
    proctoring: {
      suspiciousActivity: [{
        type: {
          type: String,
          enum: ['tab_switch', 'window_blur', 'copy_paste', 'right_click', 'fullscreen_exit']
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        details: String
      }],
      webcamSnapshots: [{
        timestamp: Date,
        imageUrl: String,
        confidence: Number // AI confidence in person identity
      }]
    }
  }],
  
  // Quiz Analytics
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    highestScore: {
      type: Number,
      default: 0
    },
    lowestScore: {
      type: Number,
      default: 0
    },
    passRate: {
      type: Number, // percentage
      default: 0
    },
    averageTime: {
      type: Number, // minutes
      default: 0
    },
    abandonmentRate: {
      type: Number, // percentage
      default: 0
    },
    difficultyRating: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  },
  
  // AI Generated Content
  aiGenerated: {
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    generatedBy: {
      type: String,
      enum: ['gpt', 'claude', 'custom_ai']
    },
    prompt: String,
    generatedAt: Date,
    humanReviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  
  // Status & Scheduling
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft'
  },
  publishedAt: Date,
  scheduledAt: Date,
  deadline: Date,
  
  // Access Control
  isPublic: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
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
QuizSchema.index({ courseId: 1, lessonId: 1 });
QuizSchema.index({ status: 1 });
QuizSchema.index({ type: 1 });
QuizSchema.index({ 'attempts.userId': 1 });
QuizSchema.index({ deadline: 1 });
QuizSchema.index({ createdAt: -1 });

// Virtual for total questions
QuizSchema.virtual('totalQuestions').get(function() {
  return this.questions.length;
});

// Virtual for average difficulty
QuizSchema.virtual('averageDifficulty').get(function() {
  if (this.questions.length === 0) return 0;
  
  const difficultyMap = { easy: 1, medium: 2, hard: 3 };
  const totalDifficulty = this.questions.reduce((sum, q) => 
    sum + difficultyMap[q.difficulty], 0
  );
  
  return totalDifficulty / this.questions.length;
});

// Pre-save middleware
QuizSchema.pre('save', function(next) {
  // Calculate total points
  this.totalPoints = this.questions.reduce((total, question) => 
    total + question.points, 0
  );
  
  // Set published date
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Instance method to grade attempt
QuizSchema.methods.gradeAttempt = function(attemptId) {
  const attempt = this.attempts.id(attemptId);
  if (!attempt) return null;
  
  let totalPointsEarned = 0;
  let correctAnswers = 0;
  
  attempt.answers.forEach(answer => {
    const question = this.questions.id(answer.questionId);
    if (!question) return;
    
    // Grade based on question type
    switch (question.type) {
      case 'multiple_choice':
      case 'single_choice':
        const selectedOptions = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
        const correctOptions = question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt._id.toString());
        
        const isCorrect = selectedOptions.length === correctOptions.length &&
          selectedOptions.every(opt => correctOptions.includes(opt.toString()));
        
        answer.isCorrect = isCorrect;
        answer.pointsEarned = isCorrect ? question.points : 0;
        break;
        
      case 'true_false':
        answer.isCorrect = answer.answer === question.correctAnswers.trueFalse;
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        break;
        
      case 'fill_blank':
        const userAnswer = answer.answer.toLowerCase().trim();
        answer.isCorrect = question.correctAnswers.fillBlanks
          .some(correct => correct.toLowerCase().trim() === userAnswer);
        answer.pointsEarned = answer.isCorrect ? question.points : 0;
        break;
        
      // Essay and code questions need manual grading
      case 'essay':
      case 'code':
        answer.pointsEarned = answer.pointsEarned || 0;
        answer.isCorrect = answer.pointsEarned >= (question.points * 0.6);
        break;
    }
    
    totalPointsEarned += answer.pointsEarned;
    if (answer.isCorrect) correctAnswers++;
    
    // Update question analytics
    question.analytics.totalAttempts++;
    if (answer.isCorrect) {
      question.analytics.correctAttempts++;
    }
  });
  
  attempt.totalPointsEarned = totalPointsEarned;
  attempt.score = Math.round((totalPointsEarned / this.totalPoints) * 100);
  attempt.status = 'submitted';
  attempt.submittedAt = new Date();
  
  // Update quiz analytics
  this.updateAnalytics();
  
  return attempt;
};

// Instance method to update analytics
QuizSchema.methods.updateAnalytics = function() {
  const submittedAttempts = this.attempts.filter(a => a.status === 'submitted');
  
  this.analytics.totalAttempts = submittedAttempts.length;
  
  if (submittedAttempts.length > 0) {
    const scores = submittedAttempts.map(a => a.score);
    this.analytics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    this.analytics.highestScore = Math.max(...scores);
    this.analytics.lowestScore = Math.min(...scores);
    this.analytics.passRate = (scores.filter(s => s >= this.settings.passingScore).length / scores.length) * 100;
    
    const times = submittedAttempts.map(a => a.timeSpent / 60); // convert to minutes
    this.analytics.averageTime = times.reduce((a, b) => a + b, 0) / times.length;
  }
  
  const abandonedAttempts = this.attempts.filter(a => a.status === 'abandoned').length;
  this.analytics.abandonmentRate = (abandonedAttempts / this.attempts.length) * 100;
};

// Static method to generate AI quiz
QuizSchema.statics.generateAIQuiz = function(courseId, topic, difficulty, questionCount) {
  // This would integrate with AI service to generate questions
  // For now, return a placeholder structure
  return {
    title: `AI Generated Quiz: ${topic}`,
    description: `Auto-generated quiz on ${topic}`,
    courseId: courseId,
    type: 'practice',
    aiGenerated: {
      isAiGenerated: true,
      generatedBy: 'gpt',
      prompt: `Generate ${questionCount} ${difficulty} questions about ${topic}`,
      generatedAt: new Date(),
      confidence: 0.8
    },
    questions: [] // Would be populated by AI service
  };
};

// Static method to find quizzes for AI recommendations
QuizSchema.statics.getRecommendations = function(userId, difficulty, topics, limit = 5) {
  return this.find({
    status: 'published',
    'questions.tags': { $in: topics },
    'questions.difficulty': difficulty
  })
  .populate('courseId', 'title category')
  .sort({ 'analytics.averageScore': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Quiz', QuizSchema);
