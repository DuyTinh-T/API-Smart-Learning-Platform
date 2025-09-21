const express = require('express');
const { body, param, query } = require('express-validator');
const { Course, Lesson, User } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Course:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - category
 *         - level
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         category:
 *           type: string
 *           enum: [programming, design, business, marketing, data_science, ai_ml, mobile_dev, web_dev, devops, cybersecurity, blockchain, game_dev]
 *         level:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         thumbnail:
 *           type: string
 *         modules:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               order:
 *                 type: number
 *               lessons:
 *                 type: array
 *                 items:
 *                   type: string
 *         instructor:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *             bio:
 *               type: string
 *         pricing:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [free, paid, subscription]
 *             price:
 *               type: number
 *             currency:
 *               type: string
 *         status:
 *           type: string
 *           enum: [draft, published, archived, under_review]
 */

/**
 * @swagger
 * tags:
 *   name: Courses
 *   description: Course management
 */

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     parameters:
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, popular, rating]
 *           default: newest
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 */
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  query('sort').optional().isIn(['newest', 'oldest', 'popular', 'rating'])
], validate, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  const query = { status: 'published', isPublic: true };
  
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.level) {
    query.level = req.query.level;
  }
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Build sort
  let sort = { createdAt: -1 };
  switch (req.query.sort) {
    case 'oldest':
      sort = { createdAt: 1 };
      break;
    case 'popular':
      sort = { 'stats.totalEnrollments': -1 };
      break;
    case 'rating':
      sort = { 'stats.averageRating': -1 };
      break;
    default:
      sort = { createdAt: -1 };
  }

  const [courses, total] = await Promise.all([
    Course.find(query)
      .populate('instructor.userId', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-modules.lessons'), // Don't include lesson details in list
    Course.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: courses,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      count: courses.length
    }
  });
}));

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID with full details
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 */
router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate('instructor.userId', 'name avatar bio')
    .populate('modules.lessons', 'title type duration isPreview')
    .populate('reviews.userId', 'name avatar');

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is enrolled (if authenticated)
  let isEnrolled = false;
  if (req.user) {
    isEnrolled = req.user.enrolledCourses.some(
      enrollment => enrollment.courseId.toString() === course._id.toString()
    );
  }

  res.json({
    success: true,
    data: {
      ...course.toObject(),
      isEnrolled
    }
  });
}));

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create new course (Admin/Teacher only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *               - level
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               shortDescription:
 *                 type: string
 *               category:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               prerequisites:
 *                 type: array
 *                 items:
 *                   type: string
 *               learningOutcomes:
 *                 type: array
 *                 items:
 *                   type: string
 *               pricing:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [free, paid, subscription]
 *                   price:
 *                     type: number
 *                   currency:
 *                     type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 */
router.post('/', auth, authorize('admin', 'teacher'), upload.single('thumbnail'), handleMulterError, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('level').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  body('learningOutcomes').isArray().withMessage('Learning outcomes are required')
], validate, asyncHandler(async (req, res) => {
  const {
    title, description, shortDescription, category, level, language,
    tags, prerequisites, learningOutcomes, pricing = {}
  } = req.body;

  // Parse arrays if they're strings (from form data)
  const parsedTags = Array.isArray(tags) ? tags : (tags ? JSON.parse(tags) : []);
  const parsedPrerequisites = Array.isArray(prerequisites) ? prerequisites : 
    (prerequisites ? JSON.parse(prerequisites) : []);
  const parsedOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes : 
    JSON.parse(learningOutcomes);
  const parsedPricing = typeof pricing === 'string' ? JSON.parse(pricing) : pricing;

  const courseData = {
    title,
    description,
    shortDescription,
    category,
    level,
    language: language || 'vietnamese',
    tags: parsedTags,
    prerequisites: parsedPrerequisites,
    learningOutcomes: parsedOutcomes,
    instructor: {
      userId: req.user.id,
      bio: req.body.instructorBio || ''
    },
    pricing: {
      type: parsedPricing.type || 'free',
      price: parsedPricing.price || 0,
      currency: parsedPricing.currency || 'VND'
    }
  };

  // Add thumbnail if uploaded
  if (req.file) {
    courseData.thumbnail = `/uploads/${req.file.filename}`;
  }

  const course = new Course(courseData);
  await course.save();

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: course
  });
}));

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update course (Admin/Teacher only)
 *     tags: [Courses]
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
 *         description: Course updated successfully
 *       403:
 *         description: Not authorized to update this course
 *       404:
 *         description: Course not found
 */
router.put('/:id', auth, authorize('admin', 'teacher'), upload.single('thumbnail'), handleMulterError, [
  param('id').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is authorized to update this course
  if (req.user.role !== 'admin' && course.instructor.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this course'
    });
  }

  // Update fields
  const updateFields = ['title', 'description', 'shortDescription', 'category', 'level', 'language'];
  updateFields.forEach(field => {
    if (req.body[field]) {
      course[field] = req.body[field];
    }
  });

  // Handle arrays
  if (req.body.tags) {
    course.tags = Array.isArray(req.body.tags) ? req.body.tags : JSON.parse(req.body.tags);
  }
  if (req.body.prerequisites) {
    course.prerequisites = Array.isArray(req.body.prerequisites) ? 
      req.body.prerequisites : JSON.parse(req.body.prerequisites);
  }
  if (req.body.learningOutcomes) {
    course.learningOutcomes = Array.isArray(req.body.learningOutcomes) ? 
      req.body.learningOutcomes : JSON.parse(req.body.learningOutcomes);
  }

  // Handle pricing
  if (req.body.pricing) {
    const pricing = typeof req.body.pricing === 'string' ? 
      JSON.parse(req.body.pricing) : req.body.pricing;
    course.pricing = { ...course.pricing.toObject(), ...pricing };
  }

  // Update thumbnail if uploaded
  if (req.file) {
    course.thumbnail = `/uploads/${req.file.filename}`;
  }

  await course.save();

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: course
  });
}));

/**
 * @swagger
 * /api/courses/{id}/enroll:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Courses]
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
 *         description: Enrolled successfully
 *       400:
 *         description: Already enrolled or course not available
 */
router.post('/:id/enroll', auth, [
  param('id').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (!course.allowEnrollment || course.status !== 'published') {
    return res.status(400).json({
      success: false,
      message: 'Course is not available for enrollment'
    });
  }

  const user = await User.findById(req.user.id);

  // Check if already enrolled
  const existingEnrollment = user.enrolledCourses.find(
    enrollment => enrollment.courseId.toString() === course._id.toString()
  );

  if (existingEnrollment) {
    return res.status(400).json({
      success: false,
      message: 'Already enrolled in this course'
    });
  }

  // Add enrollment
  user.enrolledCourses.push({
    courseId: course._id,
    enrolledAt: new Date(),
    status: 'active',
    progress: {
      completedModules: [],
      completedLessons: [],
      overallProgress: 0,
      totalStudyTime: 0,
      averageScore: 0,
      lastAccessedAt: new Date()
    }
  });

  await user.save();

  // Update course stats
  course.updateEnrollmentStats('enroll');
  await course.save();

  res.json({
    success: true,
    message: 'Enrolled in course successfully'
  });
}));

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete course (Admin/Teacher only)
 *     tags: [Courses]
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
 *         description: Course deleted successfully
 *       403:
 *         description: Not authorized to delete this course
 *       404:
 *         description: Course not found
 */
router.delete('/:id', auth, authorize('admin', 'teacher'), [
  param('id').isMongoId().withMessage('Invalid course ID')
], validate, asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check authorization
  if (req.user.role !== 'admin' && course.instructor.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this course'
    });
  }

  // Delete associated lessons
  for (const module of course.modules) {
    await Lesson.deleteMany({ _id: { $in: module.lessons } });
  }

  await Course.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
}));

module.exports = router;
