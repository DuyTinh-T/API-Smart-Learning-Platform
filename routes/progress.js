const express = require('express');
const { body, param, query } = require('express-validator');
const { User, Course, UserProgress, Recommendation } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProgress:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         courseId:
 *           type: string
 *         enrolledAt:
 *           type: string
 *           format: date
 *         completedAt:
 *           type: string
 *           format: date
 *         progress:
 *           type: object
 *           properties:
 *             completedLessons:
 *               type: number
 *             totalLessons:
 *               type: number
 *             percentage:
 *               type: number
 *         currentLesson:
 *           type: string
 *         lessons:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               lessonId:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               completedAt:
 *                 type: string
 *                 format: date
 *               timeSpent:
 *                 type: number
 *               score:
 *                 type: number
 *         quizzes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               score:
 *                 type: number
 *               attempts:
 *                 type: number
 *               lastAttemptAt:
 *                 type: string
 *                 format: date
 *         analytics:
 *           type: object
 *           properties:
 *             totalTimeSpent:
 *               type: number
 *             averageScore:
 *               type: number
 *             studyStreak:
 *               type: number
 *             lastActivityAt:
 *               type: string
 *               format: date
 */

/**
 * @swagger
 * tags:
 *   name: Progress
 *   description: User progress tracking and analytics
 */

/**
 * @swagger
 * /api/progress/courses/{courseId}:
 *   get:
 *     summary: Get user progress for specific course
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProgress'
 *       404:
 *         description: Progress not found
 */
router.get('/progress/courses/:courseId', auth, [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  let userProgress = await UserProgress.findOne({
    userId: req.user.id,
    courseId: req.params.courseId
  }).populate('courseId', 'title modules totalLessons')
    .populate('lessons.lessonId', 'title type duration')
    .populate('quizzes.quizId', 'title totalMarks');

  if (!userProgress) {
    // Create initial progress record if doesn't exist
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    userProgress = new UserProgress({
      userId: req.user.id,
      courseId: req.params.courseId,
      enrolledAt: new Date(),
      progress: {
        completedLessons: 0,
        totalLessons: course.totalLessons || 0,
        percentage: 0
      }
    });
    await userProgress.save();
  }

  res.json({
    success: true,
    data: userProgress
  });
}));

/**
 * @swagger
 * /api/progress/lessons/{lessonId}/complete:
 *   post:
 *     summary: Mark lesson as completed
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lessonId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timeSpent:
 *                 type: number
 *                 description: Time spent in seconds
 *               score:
 *                 type: number
 *                 description: Score if applicable
 *     responses:
 *       200:
 *         description: Lesson marked as completed
 *       400:
 *         description: Lesson already completed or invalid data
 */
router.post('/progress/lessons/:lessonId/complete', auth, [
  param('lessonId').isMongoId().withMessage('Invalid lesson ID'),
  body('timeSpent').optional().isNumeric().withMessage('Time spent must be a number'),
  body('score').optional().isNumeric().withMessage('Score must be a number')
], validate, asyncHandler(async (req, res) => {
  const { timeSpent = 0, score = null } = req.body;

  // Find lesson and get course info
  const { Lesson } = require('../models');
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Find or create user progress
  let userProgress = await UserProgress.findOne({
    userId: req.user.id,
    courseId: lesson.courseId
  });

  if (!userProgress) {
    const course = await Course.findById(lesson.courseId);
    userProgress = new UserProgress({
      userId: req.user.id,
      courseId: lesson.courseId,
      enrolledAt: new Date(),
      progress: {
        completedLessons: 0,
        totalLessons: course.totalLessons || 0,
        percentage: 0
      }
    });
  }

  // Check if lesson already completed
  const existingLesson = userProgress.lessons.find(
    l => l.lessonId.toString() === req.params.lessonId
  );

  if (existingLesson) {
    if (existingLesson.completed) {
      return res.status(400).json({
        success: false,
        message: 'Lesson already completed'
      });
    }
    
    // Update existing lesson progress
    existingLesson.completed = true;
    existingLesson.completedAt = new Date();
    existingLesson.timeSpent += timeSpent;
    if (score !== null) existingLesson.score = score;
  } else {
    // Add new lesson progress
    userProgress.lessons.push({
      lessonId: req.params.lessonId,
      completed: true,
      completedAt: new Date(),
      timeSpent,
      score
    });
  }

  // Update overall progress
  const completedLessons = userProgress.lessons.filter(l => l.completed).length;
  userProgress.progress.completedLessons = completedLessons;
  
  if (userProgress.progress.totalLessons > 0) {
    userProgress.progress.percentage = 
      Math.round((completedLessons / userProgress.progress.totalLessons) * 100);
  }

  // Update analytics
  userProgress.analytics.totalTimeSpent += timeSpent;
  userProgress.analytics.lastActivityAt = new Date();

  // Check if course is completed
  if (userProgress.progress.percentage === 100 && !userProgress.completedAt) {
    userProgress.completedAt = new Date();
  }

  await userProgress.save();

  // Update user learning analytics
  await User.findByIdAndUpdate(req.user.id, {
    $inc: {
      'learningAnalytics.totalLessonsCompleted': existingLesson ? 0 : 1,
      'learningAnalytics.totalTimeSpent': timeSpent
    },
    'learningAnalytics.lastActivityAt': new Date()
  });

  res.json({
    success: true,
    message: 'Lesson marked as completed',
    data: {
      progress: userProgress.progress,
      courseCompleted: !!userProgress.completedAt
    }
  });
}));

/**
 * @swagger
 * /api/progress/dashboard:
 *   get:
 *     summary: Get user learning dashboard with progress across all courses
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/progress/dashboard', auth, asyncHandler(async (req, res) => {
  // Get all user progress records
  const userProgress = await UserProgress.find({ userId: req.user.id })
    .populate('courseId', 'title thumbnail instructor category difficulty')
    .sort({ enrolledAt: -1 });

  // Get user analytics
  const user = await User.findById(req.user.id).select('learningAnalytics');

  // Calculate dashboard statistics
  const totalCourses = userProgress.length;
  const completedCourses = userProgress.filter(p => p.completedAt).length;
  const inProgressCourses = userProgress.filter(p => !p.completedAt && p.progress.percentage > 0).length;
  
  const totalLessons = userProgress.reduce((sum, p) => sum + p.progress.totalLessons, 0);
  const completedLessons = userProgress.reduce((sum, p) => sum + p.progress.completedLessons, 0);
  
  const averageProgress = totalCourses > 0 ?
    Math.round(userProgress.reduce((sum, p) => sum + p.progress.percentage, 0) / totalCourses) : 0;

  // Get recent activity
  const recentActivity = userProgress
    .filter(p => p.analytics.lastActivityAt)
    .sort((a, b) => new Date(b.analytics.lastActivityAt) - new Date(a.analytics.lastActivityAt))
    .slice(0, 5)
    .map(p => ({
      courseId: p.courseId._id,
      courseTitle: p.courseId.title,
      courseThumbnail: p.courseId.thumbnail,
      lastActivity: p.analytics.lastActivityAt,
      progress: p.progress.percentage
    }));

  // Get learning streak and weekly progress
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weeklyActivity = userProgress.filter(p => 
    p.analytics.lastActivityAt && p.analytics.lastActivityAt >= weekAgo
  ).length;

  // Get recommended next lessons
  const inProgressCourseIds = userProgress
    .filter(p => !p.completedAt && p.progress.percentage > 0)
    .map(p => p.courseId._id);

  const { Lesson } = require('../models');
  const nextLessons = [];
  
  for (const progress of userProgress.slice(0, 3)) {
    if (progress.completedAt) continue;
    
    const completedLessonIds = progress.lessons
      .filter(l => l.completed)
      .map(l => l.lessonId);
    
    const nextLesson = await Lesson.findOne({
      courseId: progress.courseId._id,
      _id: { $nin: completedLessonIds },
      status: 'published'
    }).sort({ order: 1 }).select('title type duration order');

    if (nextLesson) {
      nextLessons.push({
        courseId: progress.courseId._id,
        courseTitle: progress.courseId.title,
        lesson: nextLesson,
        progress: progress.progress.percentage
      });
    }
  }

  res.json({
    success: true,
    data: {
      overview: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalLessons,
        completedLessons,
        averageProgress,
        totalTimeSpent: user.learningAnalytics.totalTimeSpent,
        studyStreak: user.learningAnalytics.studyStreak,
        weeklyActivity
      },
      recentActivity,
      nextLessons,
      courseProgress: userProgress.map(p => ({
        courseId: p.courseId._id,
        courseTitle: p.courseId.title,
        courseThumbnail: p.courseId.thumbnail,
        instructor: p.courseId.instructor,
        category: p.courseId.category,
        difficulty: p.courseId.difficulty,
        progress: p.progress,
        enrolledAt: p.enrolledAt,
        completedAt: p.completedAt,
        lastActivity: p.analytics.lastActivityAt
      }))
    }
  });
}));

/**
 * @swagger
 * /api/progress/analytics:
 *   get:
 *     summary: Get detailed learning analytics
 *     tags: [Progress]
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
 *         description: Learning analytics retrieved successfully
 */
router.get('/progress/analytics', auth, [
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

  // Get user progress data
  const userProgress = await UserProgress.find({ 
    userId: req.user.id,
    'analytics.lastActivityAt': { $gte: startDate }
  }).populate('courseId', 'title category');

  // Calculate time-based analytics
  const dailyActivity = {};
  const categoryProgress = {};
  let totalTimeSpent = 0;
  let totalLessonsCompleted = 0;

  userProgress.forEach(progress => {
    const category = progress.courseId.category;
    
    // Category-wise progress
    if (!categoryProgress[category]) {
      categoryProgress[category] = {
        coursesEnrolled: 0,
        coursesCompleted: 0,
        totalTimeSpent: 0,
        averageProgress: 0
      };
    }
    
    categoryProgress[category].coursesEnrolled += 1;
    if (progress.completedAt) {
      categoryProgress[category].coursesCompleted += 1;
    }
    categoryProgress[category].totalTimeSpent += progress.analytics.totalTimeSpent;
    categoryProgress[category].averageProgress += progress.progress.percentage;
    
    totalTimeSpent += progress.analytics.totalTimeSpent;
    totalLessonsCompleted += progress.progress.completedLessons;

    // Daily activity (simplified - would need lesson completion tracking for accurate daily data)
    const activityDate = progress.analytics.lastActivityAt.toISOString().split('T')[0];
    if (!dailyActivity[activityDate]) {
      dailyActivity[activityDate] = {
        timeSpent: 0,
        lessonsCompleted: 0,
        coursesAccessed: 0
      };
    }
    dailyActivity[activityDate].coursesAccessed += 1;
  });

  // Calculate averages for categories
  Object.keys(categoryProgress).forEach(category => {
    const cat = categoryProgress[category];
    cat.averageProgress = cat.coursesEnrolled > 0 ?
      Math.round(cat.averageProgress / cat.coursesEnrolled) : 0;
  });

  // Get learning goals and achievements (if implemented)
  const user = await User.findById(req.user.id).select('learningAnalytics');
  
  // Calculate learning velocity (lessons per day)
  const daysInPeriod = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
  const learningVelocity = daysInPeriod > 0 ? (totalLessonsCompleted / daysInPeriod).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      period,
      summary: {
        totalTimeSpent,
        totalLessonsCompleted,
        coursesActive: userProgress.length,
        learningVelocity: parseFloat(learningVelocity),
        averageSessionTime: totalTimeSpent > 0 && totalLessonsCompleted > 0 ?
          Math.round(totalTimeSpent / totalLessonsCompleted) : 0
      },
      categoryProgress,
      dailyActivity: Object.keys(dailyActivity)
        .sort()
        .slice(-30) // Last 30 days
        .map(date => ({
          date,
          ...dailyActivity[date]
        })),
      overallStats: {
        totalCoursesEnrolled: user.learningAnalytics.totalCoursesEnrolled,
        totalLessonsCompleted: user.learningAnalytics.totalLessonsCompleted,
        totalQuizzesCompleted: user.learningAnalytics.totalQuizzesCompleted,
        totalTimeSpent: user.learningAnalytics.totalTimeSpent,
        studyStreak: user.learningAnalytics.studyStreak,
        averageScore: user.learningAnalytics.averageScore
      }
    }
  });
}));

/**
 * @swagger
 * /api/progress/certificates/{courseId}:
 *   get:
 *     summary: Get course completion certificate
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate data retrieved successfully
 *       400:
 *         description: Course not completed
 *       404:
 *         description: Course not found
 */
router.get('/progress/certificates/:courseId', auth, [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const userProgress = await UserProgress.findOne({
    userId: req.user.id,
    courseId: req.params.courseId
  }).populate('courseId', 'title instructor category totalLessons')
    .populate('userId', 'name email');

  if (!userProgress) {
    return res.status(404).json({
      success: false,
      message: 'Course progress not found'
    });
  }

  if (!userProgress.completedAt) {
    return res.status(400).json({
      success: false,
      message: 'Course not completed yet'
    });
  }

  // Generate certificate data
  const certificate = {
    certificateId: `CERT-${userProgress.courseId._id}-${userProgress.userId._id}`,
    studentName: userProgress.userId.name,
    studentEmail: userProgress.userId.email,
    courseTitle: userProgress.courseId.title,
    instructor: userProgress.courseId.instructor.name,
    category: userProgress.courseId.category,
    completedAt: userProgress.completedAt,
    enrolledAt: userProgress.enrolledAt,
    duration: Math.ceil((userProgress.completedAt - userProgress.enrolledAt) / (1000 * 60 * 60 * 24)), // Days
    totalLessons: userProgress.courseId.totalLessons,
    completedLessons: userProgress.progress.completedLessons,
    averageScore: userProgress.analytics.averageScore || 0,
    totalTimeSpent: userProgress.analytics.totalTimeSpent,
    verificationUrl: `${process.env.APP_URL || 'http://localhost:3000'}/certificates/verify/${certificate.certificateId}`
  };

  res.json({
    success: true,
    data: certificate
  });
}));

/**
 * @swagger
 * /api/progress/reset/{courseId}:
 *   post:
 *     summary: Reset course progress
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course progress reset successfully
 *       404:
 *         description: Course progress not found
 */
router.post('/progress/reset/:courseId', auth, [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const userProgress = await UserProgress.findOne({
    userId: req.user.id,
    courseId: req.params.courseId
  });

  if (!userProgress) {
    return res.status(404).json({
      success: false,
      message: 'Course progress not found'
    });
  }

  // Reset progress
  userProgress.progress.completedLessons = 0;
  userProgress.progress.percentage = 0;
  userProgress.completedAt = null;
  userProgress.currentLesson = null;
  
  // Clear lesson progress but keep enrollment date
  userProgress.lessons = [];
  userProgress.quizzes = userProgress.quizzes.map(quiz => ({
    ...quiz,
    completed: false,
    score: 0,
    attempts: 0,
    lastAttemptAt: null
  }));

  // Reset analytics but keep total time spent for historical record
  userProgress.analytics.averageScore = 0;
  userProgress.analytics.studyStreak = 0;

  await userProgress.save();

  res.json({
    success: true,
    message: 'Course progress reset successfully',
    data: userProgress
  });
}));

module.exports = router;
