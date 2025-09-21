const express = require('express');
const { body, param, query } = require('express-validator');
const { Quiz, User, Course, UserProgress } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth, authorize } = require('../middleware/auth');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Quiz:
 *       type: object
 *       required:
 *         - title
 *         - type
 *         - timeLimit
 *         - totalMarks
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [multiple_choice, essay, mixed, coding, true_false]
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *         timeLimit:
 *           type: number
 *           description: Time limit in minutes
 *         totalMarks:
 *           type: number
 *         passingMarks:
 *           type: number
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [multiple_choice, essay, true_false, coding]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: string
 *               marks:
 *                 type: number
 *               explanation:
 *                 type: string
 *         settings:
 *           type: object
 *           properties:
 *             randomizeQuestions:
 *               type: boolean
 *             showResults:
 *               type: boolean
 *             allowRetake:
 *               type: boolean
 *             maxAttempts:
 *               type: number
 *     QuizSubmission:
 *       type: object
 *       properties:
 *         answers:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               answer:
 *                 type: string
 */

/**
 * @swagger
 * tags:
 *   name: Quizzes
 *   description: Quiz management and submissions
 */

/**
 * @swagger
 * /api/quizzes:
 *   post:
 *     summary: Create quiz (Admin/Teacher only)
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - timeLimit
 *               - totalMarks
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [multiple_choice, essay, mixed, coding, true_false]
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               courseId:
 *                 type: string
 *               lessonId:
 *                 type: string
 *               timeLimit:
 *                 type: number
 *               totalMarks:
 *                 type: number
 *               passingMarks:
 *                 type: number
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Quiz created successfully
 */
router.post('/quizzes', auth, authorize('admin', 'teacher'), [
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['multiple_choice', 'essay', 'mixed', 'coding', 'true_false'])
    .withMessage('Invalid quiz type'),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  body('timeLimit').isNumeric().withMessage('Time limit must be a number'),
  body('totalMarks').isNumeric().withMessage('Total marks must be a number'),
  body('passingMarks').isNumeric().withMessage('Passing marks must be a number'),
  body('questions').isArray({ min: 1 }).withMessage('At least one question is required'),
  body('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  body('lessonId').optional().isMongoId().withMessage('Invalid lesson ID')
], validate, asyncHandler(async (req, res) => {
  const quizData = {
    ...req.body,
    createdBy: req.user.id
  };

  // Validate questions based on quiz type
  const { questions, type } = req.body;
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    if (!question.question || !question.type || !question.marks) {
      return res.status(400).json({
        success: false,
        message: `Question ${i + 1} is missing required fields`
      });
    }

    if (['multiple_choice', 'true_false'].includes(question.type)) {
      if (!question.options || !question.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} must have options and correct answer`
        });
      }
    }
  }

  const quiz = new Quiz(quizData);
  await quiz.save();

  res.status(201).json({
    success: true,
    message: 'Quiz created successfully',
    data: quiz
  });
}));

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: Get quizzes with pagination and filtering
 *     tags: [Quizzes]
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
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
 */
router.get('/quizzes', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object
  const filter = { status: 'published' };
  
  if (req.query.type) filter.type = req.query.type;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.courseId) filter.courseId = req.query.courseId;

  const quizzes = await Quiz.find(filter)
    .populate('courseId', 'title instructor')
    .populate('createdBy', 'name email')
    .select('-questions.correctAnswer -questions.explanation') // Hide answers for students
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Quiz.countDocuments(filter);

  res.json({
    success: true,
    data: quizzes,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit
    }
  });
}));

/**
 * @swagger
 * /api/quizzes/{id}:
 *   get:
 *     summary: Get quiz details
 *     tags: [Quizzes]
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
 *         description: Quiz retrieved successfully
 *       404:
 *         description: Quiz not found
 */
router.get('/quizzes/:id', auth, [
  param('id').isMongoId().withMessage('Invalid quiz ID')
], validate, asyncHandler(async (req, res) => {
  let quiz = await Quiz.findById(req.params.id)
    .populate('courseId', 'title instructor')
    .populate('createdBy', 'name email');

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // Check if user has already attempted this quiz
  const existingAttempt = await quiz.submissions.find(
    submission => submission.userId.toString() === req.user.id
  );

  // Hide correct answers unless user is admin/teacher or has completed the quiz
  const isAuthorized = req.user.role === 'admin' || req.user.role === 'teacher';
  const hasCompleted = existingAttempt && existingAttempt.length > 0;

  if (!isAuthorized && !hasCompleted) {
    quiz = quiz.toObject();
    quiz.questions = quiz.questions.map(q => {
      const { correctAnswer, explanation, ...questionWithoutAnswer } = q;
      return questionWithoutAnswer;
    });
  }

  res.json({
    success: true,
    data: quiz,
    userAttempts: existingAttempt ? existingAttempt.length : 0
  });
}));

/**
 * @swagger
 * /api/quizzes/{id}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizSubmission'
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *       400:
 *         description: Maximum attempts reached or invalid submission
 *       404:
 *         description: Quiz not found
 */
router.post('/quizzes/:id/submit', auth, [
  param('id').isMongoId().withMessage('Invalid quiz ID'),
  body('answers').isArray({ min: 1 }).withMessage('Answers array is required'),
  body('answers.*.questionId').notEmpty().withMessage('Question ID is required'),
  body('answers.*.answer').notEmpty().withMessage('Answer is required')
], validate, asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // Check if user has reached maximum attempts
  const userSubmissions = quiz.submissions.filter(
    sub => sub.userId.toString() === req.user.id
  );

  if (!quiz.settings.allowRetake && userSubmissions.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Quiz can only be attempted once'
    });
  }

  if (quiz.settings.maxAttempts && userSubmissions.length >= quiz.settings.maxAttempts) {
    return res.status(400).json({
      success: false,
      message: `Maximum attempts (${quiz.settings.maxAttempts}) reached`
    });
  }

  // Calculate score
  let totalScore = 0;
  const gradedAnswers = [];

  answers.forEach(userAnswer => {
    const question = quiz.questions.id(userAnswer.questionId);
    if (question) {
      const isCorrect = question.type === 'multiple_choice' || question.type === 'true_false'
        ? question.correctAnswer === userAnswer.answer
        : null; // Essay and coding questions need manual grading

      const score = isCorrect ? question.marks : 0;
      totalScore += score;

      gradedAnswers.push({
        questionId: userAnswer.questionId,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        score,
        maxScore: question.marks
      });
    }
  });

  const percentage = (totalScore / quiz.totalMarks) * 100;
  const passed = totalScore >= quiz.passingMarks;

  // Create submission
  const submission = {
    userId: req.user.id,
    answers: gradedAnswers,
    score: totalScore,
    percentage: percentage.toFixed(2),
    passed,
    submittedAt: new Date(),
    timeSpent: req.body.timeSpent || 0
  };

  quiz.submissions.push(submission);
  await quiz.save();

  // Update user progress if quiz is associated with a course/lesson
  if (quiz.courseId) {
    let userProgress = await UserProgress.findOne({
      userId: req.user.id,
      courseId: quiz.courseId
    });

    if (userProgress) {
      const quizProgress = userProgress.quizzes.find(
        q => q.quizId.toString() === quiz._id.toString()
      );

      if (quizProgress) {
        quizProgress.completed = true;
        quizProgress.score = totalScore;
        quizProgress.attempts += 1;
        quizProgress.lastAttemptAt = new Date();
      } else {
        userProgress.quizzes.push({
          quizId: quiz._id,
          completed: true,
          score: totalScore,
          attempts: 1,
          lastAttemptAt: new Date()
        });
      }

      await userProgress.save();
    }
  }

  // Prepare response based on quiz settings
  const responseData = {
    success: true,
    message: 'Quiz submitted successfully',
    data: {
      score: totalScore,
      totalMarks: quiz.totalMarks,
      percentage: percentage.toFixed(2),
      passed,
      submissionId: submission._id
    }
  };

  if (quiz.settings.showResults) {
    responseData.data.answers = gradedAnswers;
  }

  res.json(responseData);
}));

/**
 * @swagger
 * /api/quizzes/{id}/results:
 *   get:
 *     summary: Get quiz results for user
 *     tags: [Quizzes]
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
 *         description: Quiz results retrieved successfully
 *       404:
 *         description: Quiz not found or no submissions
 */
router.get('/quizzes/:id/results', auth, [
  param('id').isMongoId().withMessage('Invalid quiz ID')
], validate, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  const userSubmissions = quiz.submissions.filter(
    sub => sub.userId.toString() === req.user.id
  );

  if (userSubmissions.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'No submissions found'
    });
  }

  // Get best attempt
  const bestSubmission = userSubmissions.reduce((best, current) => 
    current.score > best.score ? current : best
  );

  res.json({
    success: true,
    data: {
      quizTitle: quiz.title,
      totalAttempts: userSubmissions.length,
      bestScore: bestSubmission.score,
      bestPercentage: bestSubmission.percentage,
      passed: bestSubmission.passed,
      submissions: userSubmissions.map(sub => ({
        submissionId: sub._id,
        score: sub.score,
        percentage: sub.percentage,
        passed: sub.passed,
        submittedAt: sub.submittedAt,
        timeSpent: sub.timeSpent
      }))
    }
  });
}));

/**
 * @swagger
 * /api/quizzes/{id}/analytics:
 *   get:
 *     summary: Get quiz analytics (Admin/Teacher only)
 *     tags: [Quizzes]
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
 *         description: Quiz analytics retrieved successfully
 */
router.get('/quizzes/:id/analytics', auth, authorize('admin', 'teacher'), [
  param('id').isMongoId().withMessage('Invalid quiz ID')
], validate, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).populate('submissions.userId', 'name email');

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  const submissions = quiz.submissions;
  const totalSubmissions = submissions.length;
  const uniqueUsers = [...new Set(submissions.map(sub => sub.userId.toString()))].length;
  
  const scores = submissions.map(sub => parseFloat(sub.percentage));
  const averageScore = scores.length > 0 ? 
    (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : 0;
  
  const passedCount = submissions.filter(sub => sub.passed).length;
  const passRate = totalSubmissions > 0 ? 
    ((passedCount / totalSubmissions) * 100).toFixed(2) : 0;

  // Question-wise analytics
  const questionAnalytics = quiz.questions.map(question => {
    const questionSubmissions = submissions.filter(sub => 
      sub.answers.some(ans => ans.questionId.toString() === question._id.toString())
    );
    
    const correctAnswers = questionSubmissions.filter(sub => {
      const userAnswer = sub.answers.find(ans => 
        ans.questionId.toString() === question._id.toString()
      );
      return userAnswer && userAnswer.isCorrect;
    }).length;

    return {
      questionId: question._id,
      question: question.question,
      totalAttempts: questionSubmissions.length,
      correctAnswers,
      accuracy: questionSubmissions.length > 0 ? 
        ((correctAnswers / questionSubmissions.length) * 100).toFixed(2) : 0
    };
  });

  res.json({
    success: true,
    data: {
      totalSubmissions,
      uniqueUsers,
      averageScore,
      passRate,
      highestScore: Math.max(...scores, 0),
      lowestScore: Math.min(...scores, 100),
      questionAnalytics,
      recentSubmissions: submissions
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 10)
        .map(sub => ({
          userId: sub.userId._id,
          userName: sub.userId.name,
          userEmail: sub.userId.email,
          score: sub.score,
          percentage: sub.percentage,
          passed: sub.passed,
          submittedAt: sub.submittedAt
        }))
    }
  });
}));

/**
 * @swagger
 * /api/quizzes/{id}:
 *   put:
 *     summary: Update quiz (Admin/Teacher only)
 *     tags: [Quizzes]
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
 *         description: Quiz updated successfully
 */
router.put('/quizzes/:id', auth, authorize('admin', 'teacher'), [
  param('id').isMongoId().withMessage('Invalid quiz ID')
], validate, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // Check authorization
  if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this quiz'
    });
  }

  const updateFields = [
    'title', 'description', 'type', 'difficulty', 'timeLimit',
    'totalMarks', 'passingMarks', 'questions', 'settings', 'status'
  ];

  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      quiz[field] = req.body[field];
    }
  });

  await quiz.save();

  res.json({
    success: true,
    message: 'Quiz updated successfully',
    data: quiz
  });
}));

/**
 * @swagger
 * /api/quizzes/{id}:
 *   delete:
 *     summary: Delete quiz (Admin/Teacher only)
 *     tags: [Quizzes]
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
 *         description: Quiz deleted successfully
 */
router.delete('/quizzes/:id', auth, authorize('admin', 'teacher'), [
  param('id').isMongoId().withMessage('Invalid quiz ID')
], validate, asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);

  if (!quiz) {
    return res.status(404).json({
      success: false,
      message: 'Quiz not found'
    });
  }

  // Check authorization
  if (req.user.role !== 'admin' && quiz.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this quiz'
    });
  }

  await Quiz.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Quiz deleted successfully'
  });
}));

module.exports = router;
