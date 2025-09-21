const express = require('express');
const { body, param, query } = require('express-validator');
const { Recommendation, User, Course, UserProgress } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Recommendation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [course, lesson, quiz, skill_path]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         targetItem:
 *           type: object
 *           properties:
 *             itemType:
 *               type: string
 *               enum: [course, lesson, quiz, skill_path]
 *             itemId:
 *               type: string
 *             metadata:
 *               type: object
 *         aiEngine:
 *           type: string
 *           enum: [collaborative_filtering, content_based, hybrid, deep_learning]
 *         score:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         reasoning:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         status:
 *           type: string
 *           enum: [active, accepted, dismissed, expired]
 */

/**
 * @swagger
 * tags:
 *   name: AI Recommendations
 *   description: AI-powered personalized learning recommendations
 */

/**
 * @swagger
 * /api/recommendations:
 *   get:
 *     summary: Get personalized recommendations for user
 *     tags: [AI Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [course, lesson, quiz, skill_path]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
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
 *                     $ref: '#/components/schemas/Recommendation'
 */
router.get('/recommendations', auth, [
  query('type').optional().isIn(['course', 'lesson', 'quiz', 'skill_path'])
    .withMessage('Invalid recommendation type'),
  query('limit').optional().isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level')
], validate, asyncHandler(async (req, res) => {
  const { type, limit = 10, priority } = req.query;
  
  // Build filter
  const filter = {
    userId: req.user.id,
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  const recommendations = await Recommendation.find(filter)
    .populate('targetItem.itemId')
    .sort({ priority: -1, score: -1, createdAt: -1 })
    .limit(parseInt(limit));

  // Enrich recommendations with additional data
  const enrichedRecommendations = await Promise.all(
    recommendations.map(async (rec) => {
      const enriched = rec.toObject();
      
      // Add additional context based on item type
      if (rec.targetItem.itemType === 'course') {
        const course = await Course.findById(rec.targetItem.itemId)
          .select('title thumbnail instructor category difficulty rating totalLessons estimatedDuration');
        enriched.targetItem.details = course;
      }
      
      return enriched;
    })
  );

  res.json({
    success: true,
    data: enrichedRecommendations
  });
}));

/**
 * @swagger
 * /api/recommendations/generate:
 *   post:
 *     summary: Generate new AI recommendations for user
 *     tags: [AI Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceRefresh:
 *                 type: boolean
 *                 default: false
 *               includeTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [course, lesson, quiz, skill_path]
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 */
router.post('/recommendations/generate', auth, [
  body('forceRefresh').optional().isBoolean().withMessage('ForceRefresh must be boolean'),
  body('includeTypes').optional().isArray().withMessage('IncludeTypes must be an array')
], validate, asyncHandler(async (req, res) => {
  const { forceRefresh = false, includeTypes = ['course', 'lesson', 'quiz'] } = req.body;

  // Get user data for AI analysis
  const user = await User.findById(req.user.id)
    .populate('enrolledCourses.courseId', 'category tags difficulty')
    .populate('interests');

  const userProgress = await UserProgress.find({ userId: req.user.id })
    .populate('courseId', 'category tags difficulty instructor');

  // Check if we need to generate new recommendations
  const existingRecommendations = await Recommendation.find({
    userId: req.user.id,
    status: 'active',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
  });

  if (!forceRefresh && existingRecommendations.length >= 5) {
    return res.json({
      success: true,
      message: 'Recent recommendations already exist',
      data: existingRecommendations
    });
  }

  const newRecommendations = [];

  // 1. Collaborative Filtering Recommendations
  if (includeTypes.includes('course')) {
    const collaborativeRecs = await generateCollaborativeRecommendations(user, userProgress);
    newRecommendations.push(...collaborativeRecs);
  }

  // 2. Content-Based Recommendations
  if (includeTypes.includes('lesson') || includeTypes.includes('course')) {
    const contentBasedRecs = await generateContentBasedRecommendations(user, userProgress);
    newRecommendations.push(...contentBasedRecs);
  }

  // 3. Skill Gap Analysis Recommendations
  if (includeTypes.includes('quiz') || includeTypes.includes('skill_path')) {
    const skillGapRecs = await generateSkillGapRecommendations(user, userProgress);
    newRecommendations.push(...skillGapRecs);
  }

  // 4. Popular/Trending Recommendations
  const trendingRecs = await generateTrendingRecommendations(user);
  newRecommendations.push(...trendingRecs);

  // Save recommendations to database
  const savedRecommendations = [];
  for (const recData of newRecommendations) {
    const recommendation = new Recommendation({
      ...recData,
      userId: req.user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await recommendation.save();
    savedRecommendations.push(recommendation);
  }

  // Mark old recommendations as expired
  await Recommendation.updateMany(
    {
      userId: req.user.id,
      status: 'active',
      _id: { $nin: savedRecommendations.map(r => r._id) }
    },
    { status: 'expired' }
  );

  res.json({
    success: true,
    message: `Generated ${savedRecommendations.length} new recommendations`,
    data: savedRecommendations
  });
}));

/**
 * @swagger
 * /api/recommendations/{id}/accept:
 *   post:
 *     summary: Accept a recommendation
 *     tags: [AI Recommendations]
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
 *         description: Recommendation accepted successfully
 */
router.post('/recommendations/:id/accept', auth, [
  param('id').isMongoId().withMessage('Invalid recommendation ID')
], validate, asyncHandler(async (req, res) => {
  const recommendation = await Recommendation.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!recommendation) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  recommendation.status = 'accepted';
  recommendation.acceptedAt = new Date();
  
  // Update user analytics
  recommendation.analytics.interactions.push({
    type: 'accepted',
    timestamp: new Date(),
    context: 'user_action'
  });

  await recommendation.save();

  // If it's a course recommendation, auto-enroll user
  if (recommendation.targetItem.itemType === 'course') {
    const course = await Course.findById(recommendation.targetItem.itemId);
    if (course && course.enrollmentType === 'open') {
      // Auto-enroll logic could be implemented here
    }
  }

  res.json({
    success: true,
    message: 'Recommendation accepted successfully',
    data: recommendation
  });
}));

/**
 * @swagger
 * /api/recommendations/{id}/dismiss:
 *   post:
 *     summary: Dismiss a recommendation
 *     tags: [AI Recommendations]
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
 *                 enum: [not_interested, already_know, too_difficult, too_easy, irrelevant]
 *     responses:
 *       200:
 *         description: Recommendation dismissed successfully
 */
router.post('/recommendations/:id/dismiss', auth, [
  param('id').isMongoId().withMessage('Invalid recommendation ID'),
  body('reason').optional().isIn(['not_interested', 'already_know', 'too_difficult', 'too_easy', 'irrelevant'])
    .withMessage('Invalid dismissal reason')
], validate, asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const recommendation = await Recommendation.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!recommendation) {
    return res.status(404).json({
      success: false,
      message: 'Recommendation not found'
    });
  }

  recommendation.status = 'dismissed';
  recommendation.dismissedAt = new Date();
  if (reason) recommendation.dismissalReason = reason;

  // Update analytics
  recommendation.analytics.interactions.push({
    type: 'dismissed',
    timestamp: new Date(),
    context: reason || 'user_action'
  });

  await recommendation.save();

  // Update user preferences based on dismissal reason for future recommendations
  if (reason) {
    await updateUserPreferencesFromDismissal(req.user.id, recommendation, reason);
  }

  res.json({
    success: true,
    message: 'Recommendation dismissed successfully'
  });
}));

/**
 * @swagger
 * /api/recommendations/analytics:
 *   get:
 *     summary: Get recommendation analytics (Admin only)
 *     tags: [AI Recommendations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommendation analytics retrieved successfully
 */
router.get('/recommendations/analytics', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const analytics = await Recommendation.aggregate([
    {
      $group: {
        _id: null,
        totalRecommendations: { $sum: 1 },
        activeRecommendations: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        acceptedRecommendations: {
          $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        },
        dismissedRecommendations: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        },
        averageScore: { $avg: '$score' }
      }
    }
  ]);

  const byType = await Recommendation.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        averageScore: { $avg: '$score' },
        acceptanceRate: {
          $avg: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        }
      }
    }
  ]);

  const byEngine = await Recommendation.aggregate([
    {
      $group: {
        _id: '$aiEngine',
        count: { $sum: 1 },
        averageScore: { $avg: '$score' },
        acceptanceRate: {
          $avg: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
        }
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      overview: analytics[0] || {
        totalRecommendations: 0,
        activeRecommendations: 0,
        acceptedRecommendations: 0,
        dismissedRecommendations: 0,
        averageScore: 0
      },
      byType,
      byEngine
    }
  });
}));

// AI Recommendation Generation Functions

async function generateCollaborativeRecommendations(user, userProgress) {
  const recommendations = [];
  
  // Find users with similar learning patterns
  const userCategories = [...new Set(userProgress.map(p => p.courseId.category))];
  
  const similarUsers = await UserProgress.find({
    'courseId.category': { $in: userCategories },
    userId: { $ne: user._id }
  }).populate('userId').populate('courseId');

  // Find courses that similar users have completed but current user hasn't
  const userCourseIds = userProgress.map(p => p.courseId._id.toString());
  const recommendedCourses = new Set();

  similarUsers.forEach(progress => {
    if (progress.completedAt && !userCourseIds.includes(progress.courseId._id.toString())) {
      recommendedCourses.add(progress.courseId._id.toString());
    }
  });

  // Create recommendations for top courses
  const topRecommendations = Array.from(recommendedCourses).slice(0, 3);
  
  for (const courseId of topRecommendations) {
    const course = await Course.findById(courseId);
    if (course) {
      recommendations.push({
        type: 'course',
        title: `Recommended: ${course.title}`,
        description: `Students with similar interests have successfully completed this course`,
        targetItem: {
          itemType: 'course',
          itemId: courseId,
          metadata: {
            category: course.category,
            difficulty: course.difficulty
          }
        },
        aiEngine: 'collaborative_filtering',
        score: 0.8,
        reasoning: 'Based on learning patterns of similar users',
        tags: ['popular', 'similar_users'],
        priority: 'medium'
      });
    }
  }

  return recommendations;
}

async function generateContentBasedRecommendations(user, userProgress) {
  const recommendations = [];
  
  // Analyze user's completed courses and interests
  const completedCategories = userProgress
    .filter(p => p.completedAt)
    .map(p => p.courseId.category);
  
  const preferredCategories = [...new Set(completedCategories)];
  const userTags = user.interests || [];

  // Find similar courses based on categories and tags
  const similarCourses = await Course.find({
    $or: [
      { category: { $in: preferredCategories } },
      { tags: { $in: userTags } }
    ],
    _id: { $nin: userProgress.map(p => p.courseId._id) },
    status: 'published'
  }).limit(5);

  similarCourses.forEach(course => {
    const score = calculateContentSimilarity(course, preferredCategories, userTags);
    
    recommendations.push({
      type: 'course',
      title: `You might like: ${course.title}`,
      description: `Based on your interest in ${preferredCategories.join(', ')}`,
      targetItem: {
        itemType: 'course',
        itemId: course._id,
        metadata: {
          category: course.category,
          difficulty: course.difficulty
        }
      },
      aiEngine: 'content_based',
      score,
      reasoning: `Matches your interests in ${course.category}`,
      tags: ['content_match', course.category],
      priority: score > 0.7 ? 'high' : 'medium'
    });
  });

  return recommendations;
}

async function generateSkillGapRecommendations(user, userProgress) {
  const recommendations = [];
  
  // Analyze quiz performance to identify skill gaps
  const weakAreas = [];
  
  userProgress.forEach(progress => {
    progress.quizzes.forEach(quiz => {
      if (quiz.completed && quiz.score < 70) { // Assuming 70% as threshold
        weakAreas.push({
          courseId: progress.courseId._id,
          category: progress.courseId.category,
          score: quiz.score
        });
      }
    });
  });

  // Find courses/lessons that can help improve weak areas
  const improvementCourses = await Course.find({
    category: { $in: weakAreas.map(w => w.category) },
    difficulty: 'beginner', // Suggest easier courses for skill improvement
    status: 'published'
  }).limit(3);

  improvementCourses.forEach(course => {
    const relatedWeakArea = weakAreas.find(w => w.category === course.category);
    
    recommendations.push({
      type: 'course',
      title: `Strengthen your ${course.category} skills`,
      description: `Based on your quiz performance, this course can help improve your understanding`,
      targetItem: {
        itemType: 'course',
        itemId: course._id,
        metadata: {
          category: course.category,
          difficulty: course.difficulty,
          improvementArea: true
        }
      },
      aiEngine: 'hybrid',
      score: 0.9, // High score for skill gap filling
      reasoning: `Quiz performance indicates room for improvement in ${course.category}`,
      tags: ['skill_gap', 'improvement'],
      priority: 'high'
    });
  });

  return recommendations;
}

async function generateTrendingRecommendations(user) {
  const recommendations = [];
  
  // Find trending courses based on recent enrollments
  const trendingCourses = await Course.aggregate([
    {
      $match: {
        status: 'published',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    },
    {
      $addFields: {
        enrollmentCount: { $size: '$enrolledStudents' }
      }
    },
    {
      $sort: { enrollmentCount: -1, rating: -1 }
    },
    { $limit: 3 }
  ]);

  trendingCourses.forEach(course => {
    recommendations.push({
      type: 'course',
      title: `Trending: ${course.title}`,
      description: `This popular course is trending among learners`,
      targetItem: {
        itemType: 'course',
        itemId: course._id,
        metadata: {
          category: course.category,
          difficulty: course.difficulty,
          trending: true
        }
      },
      aiEngine: 'hybrid',
      score: 0.7,
      reasoning: 'Popular among recent learners',
      tags: ['trending', 'popular'],
      priority: 'low'
    });
  });

  return recommendations;
}

function calculateContentSimilarity(course, preferredCategories, userTags) {
  let score = 0;
  
  // Category match
  if (preferredCategories.includes(course.category)) {
    score += 0.5;
  }
  
  // Tag match
  const commonTags = course.tags.filter(tag => userTags.includes(tag));
  score += (commonTags.length / Math.max(course.tags.length, userTags.length, 1)) * 0.3;
  
  // Rating bonus
  if (course.rating && course.rating > 4) {
    score += 0.2;
  }
  
  return Math.min(score, 1);
}

async function updateUserPreferencesFromDismissal(userId, recommendation, reason) {
  // Update user preferences based on dismissal patterns
  // This could involve updating user's disliked categories, difficulty preferences, etc.
  // Implementation would depend on how user preferences are stored
  
  const user = await User.findById(userId);
  if (!user.preferences) {
    user.preferences = { dismissed: [] };
  }
  
  user.preferences.dismissed.push({
    itemType: recommendation.targetItem.itemType,
    reason,
    category: recommendation.targetItem.metadata?.category,
    timestamp: new Date()
  });
  
  await user.save();
}

module.exports = router;
