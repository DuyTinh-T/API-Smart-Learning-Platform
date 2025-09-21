const express = require('express');
const { body, param } = require('express-validator');
const { Course, Lesson } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Lesson:
 *       type: object
 *       required:
 *         - title
 *         - type
 *         - courseId
 *         - moduleId
 *         - order
 *         - duration
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [video, text, audio, interactive, quiz, assignment, live_session]
 *         content:
 *           type: object
 *           properties:
 *             text:
 *               type: string
 *             video:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 duration:
 *                   type: number
 *                 thumbnail:
 *                   type: string
 *             audio:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 duration:
 *                   type: number
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         order:
 *           type: number
 *         isPreview:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [draft, published, archived, under_review]
 */

/**
 * @swagger
 * tags:
 *   name: Lessons
 *   description: Lesson management
 */

/**
 * @swagger
 * /api/courses/{courseId}/modules/{moduleId}/lessons:
 *   post:
 *     summary: Create lesson in module (Admin/Teacher only)
 *     tags: [Lessons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - duration
 *               - order
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [video, text, audio, interactive, quiz, assignment]
 *               duration:
 *                 type: number
 *               order:
 *                 type: number
 *               content:
 *                 type: string
 *               isPreview:
 *                 type: boolean
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Lesson created successfully
 */
router.post('/courses/:courseId/modules/:moduleId/lessons', 
  auth, authorize('admin', 'teacher'), 
  upload.single('media'), handleMulterError, [
    param('courseId').isMongoId().withMessage('Invalid course ID'),
    param('moduleId').isMongoId().withMessage('Invalid module ID'),
    body('title').notEmpty().withMessage('Title is required'),
    body('type').isIn(['video', 'text', 'audio', 'interactive', 'quiz', 'assignment', 'live_session'])
      .withMessage('Invalid lesson type'),
    body('duration').isNumeric().withMessage('Duration must be a number'),
    body('order').isNumeric().withMessage('Order must be a number')
  ], validate, asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const { title, description, type, duration, order, content, isPreview = false } = req.body;

    // Check if course exists and user has permission
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (req.user.role !== 'admin' && course.instructor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add lessons to this course'
      });
    }

    // Check if module exists
    const module = course.modules.id(moduleId);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: 'Module not found'
      });
    }

    // Create lesson data
    const lessonData = {
      title,
      description,
      type,
      courseId,
      moduleId,
      order: parseInt(order),
      duration: parseInt(duration),
      isPreview,
      content: {}
    };

    // Handle different content types
    if (type === 'text') {
      lessonData.content.text = content;
    } else if (type === 'video' && req.file) {
      lessonData.content.video = {
        url: `/uploads/${req.file.filename}`,
        duration: parseInt(duration) * 60, // Convert to seconds
        thumbnail: req.body.thumbnail || ''
      };
    } else if (type === 'audio' && req.file) {
      lessonData.content.audio = {
        url: `/uploads/${req.file.filename}`,
        duration: parseInt(duration) * 60,
        transcript: req.body.transcript || ''
      };
    } else if (type === 'interactive') {
      lessonData.content.interactive = {
        html: req.body.html || '',
        css: req.body.css || '',
        javascript: req.body.javascript || '',
        iframe_url: req.body.iframe_url || ''
      };
    } else if (type === 'assignment') {
      lessonData.content.assignment = {
        instructions: content || '',
        maxFileSize: req.body.maxFileSize || 10485760,
        allowedFileTypes: req.body.allowedFileTypes ? 
          JSON.parse(req.body.allowedFileTypes) : ['pdf', 'doc', 'docx'],
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        maxScore: req.body.maxScore || 100
      };
    }

    const lesson = new Lesson(lessonData);
    await lesson.save();

    // Add lesson to module
    module.lessons.push(lesson._id);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: lesson
    });
  }));

/**
 * @swagger
 * /api/courses/{courseId}/modules/{moduleId}/lessons:
 *   get:
 *     summary: Get lessons in module
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lessons retrieved successfully
 */
router.get('/courses/:courseId/modules/:moduleId/lessons', [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  param('moduleId').isMongoId().withMessage('Invalid module ID')
], validate, asyncHandler(async (req, res) => {
  const { courseId, moduleId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  const module = course.modules.id(moduleId);
  if (!module) {
    return res.status(404).json({
      success: false,
      message: 'Module not found'
    });
  }

  const lessons = await Lesson.find({
    _id: { $in: module.lessons },
    status: 'published'
  }).sort({ order: 1 });

  res.json({
    success: true,
    data: lessons
  });
}));

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get lesson details
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson retrieved successfully
 *       404:
 *         description: Lesson not found
 */
router.get('/lessons/:id', [
  param('id').isMongoId().withMessage('Invalid lesson ID')
], validate, asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id)
    .populate('courseId', 'title instructor')
    .populate('quizzes');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Update view count
  lesson.analytics.totalViews += 1;
  await lesson.save();

  res.json({
    success: true,
    data: lesson
  });
}));

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update lesson (Admin/Teacher only)
 *     tags: [Lessons]
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
 *         description: Lesson updated successfully
 *       403:
 *         description: Not authorized to update this lesson
 *       404:
 *         description: Lesson not found
 */
router.put('/lessons/:id', 
  auth, authorize('admin', 'teacher'),
  upload.single('media'), handleMulterError, [
    param('id').isMongoId().withMessage('Invalid lesson ID')
  ], validate, asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.id).populate('courseId');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        lesson.courseId.instructor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson'
      });
    }

    // Update basic fields
    const updateFields = ['title', 'description', 'duration', 'order', 'isPreview'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        lesson[field] = req.body[field];
      }
    });

    // Update content based on type
    if (req.body.content) {
      if (lesson.type === 'text') {
        lesson.content.text = req.body.content;
      }
    }

    // Handle new media file
    if (req.file) {
      if (lesson.type === 'video') {
        lesson.content.video.url = `/uploads/${req.file.filename}`;
      } else if (lesson.type === 'audio') {
        lesson.content.audio.url = `/uploads/${req.file.filename}`;
      }
    }

    await lesson.save();

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: lesson
    });
  }));

/**
 * @swagger
 * /api/lessons/{lessonId}/media:
 *   post:
 *     summary: Upload media for lesson
 *     tags: [Lessons]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               title:
 *                 type: string
 *               downloadable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 */
router.post('/lessons/:lessonId/media',
  auth, authorize('admin', 'teacher'),
  upload.array('media', 5), handleMulterError, [
    param('lessonId').isMongoId().withMessage('Invalid lesson ID')
  ], validate, asyncHandler(async (req, res) => {
    const lesson = await Lesson.findById(req.params.lessonId).populate('courseId');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check authorization
    if (req.user.role !== 'admin' && 
        lesson.courseId.instructor.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload media to this lesson'
      });
    }

    const uploadedFiles = [];
    
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        const resource = {
          title: req.body.title ? 
            (Array.isArray(req.body.title) ? req.body.title[index] : req.body.title) :
            file.originalname,
          type: file.mimetype.startsWith('video/') ? 'video' :
                file.mimetype.startsWith('audio/') ? 'audio' :
                file.mimetype.startsWith('image/') ? 'image' :
                file.mimetype === 'application/pdf' ? 'pdf' : 'doc',
          url: `/uploads/${file.filename}`,
          fileSize: file.size,
          downloadable: req.body.downloadable !== 'false'
        };
        
        lesson.resources.push(resource);
        uploadedFiles.push(resource);
      });
    }

    await lesson.save();

    res.json({
      success: true,
      message: 'Media uploaded successfully',
      data: uploadedFiles
    });
  }));

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete lesson (Admin/Teacher only)
 *     tags: [Lessons]
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
 *         description: Lesson deleted successfully
 *       403:
 *         description: Not authorized to delete this lesson
 *       404:
 *         description: Lesson not found
 */
router.delete('/lessons/:id', auth, authorize('admin', 'teacher'), [
  param('id').isMongoId().withMessage('Invalid lesson ID')
], validate, asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('courseId');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check authorization
  if (req.user.role !== 'admin' && 
      lesson.courseId.instructor.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this lesson'
    });
  }

  // Remove lesson from course module
  const course = await Course.findById(lesson.courseId);
  course.modules.forEach(module => {
    module.lessons = module.lessons.filter(
      lessonId => lessonId.toString() !== lesson._id.toString()
    );
  });
  await course.save();

  // Delete lesson
  await Lesson.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Lesson deleted successfully'
  });
}));

module.exports = router;
