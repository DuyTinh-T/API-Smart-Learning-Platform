const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User } = require('../models');
const { validate, asyncHandler } = require('../middleware/validation');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The user's full name
 *         email:
 *           type: string
 *           description: The user's email address
 *         role:
 *           type: string
 *           enum: [student, teacher, admin]
 *           description: The user's role
 *         profile:
 *           type: object
 *           properties:
 *             learningGoal:
 *               type: string
 *               enum: [career_change, skill_upgrade, hobby, certification, academic]
 *             dailyStudyTime:
 *               type: number
 *               description: Minutes per day
 *             skillLevel:
 *               type: string
 *               enum: [beginner, intermediate, advanced]
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 60d0fe4f5311236168a109ca
 *         name: John Doe
 *         email: john@example.com
 *         role: student
 *         profile:
 *           learningGoal: skill_upgrade
 *           dailyStudyTime: 60
 *           skillLevel: beginner
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Authentication and user management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [student, teacher]
 *                 default: student
 *               profile:
 *                 type: object
 *                 properties:
 *                   learningGoal:
 *                     type: string
 *                     enum: [career_change, skill_upgrade, hobby, certification, academic]
 *                   dailyStudyTime:
 *                     type: number
 *                   skillLevel:
 *                     type: string
 *                     enum: [beginner, intermediate, advanced]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['student', 'teacher']).withMessage('Role must be student or teacher')
], validate, asyncHandler(async (req, res) => {
  const { name, email, password, role = 'student', profile = {} } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Create user
  const user = new User({
    name,
    email,
    password,
    role,
    profile: {
      learningGoal: profile.learningGoal || 'skill_upgrade',
      dailyStudyTime: profile.dailyStudyTime || 30,
      skillLevel: profile.skillLevel || 'beginner',
      ...profile
    }
  });

  await user.save();

  // Generate JWT
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile
    }
  });
}));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], validate, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate JWT
  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      lastLoginAt: user.lastLoginAt
    }
  });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', auth, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 */
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('enrolledCourses.courseId', 'title thumbnail category')
    .select('-password');

  res.json({
    success: true,
    user
  });
}));

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               profile:
 *                 type: object
 *                 properties:
 *                   learningGoal:
 *                     type: string
 *                     enum: [career_change, skill_upgrade, hobby, certification, academic]
 *                   dailyStudyTime:
 *                     type: number
 *                   skillLevel:
 *                     type: string
 *                     enum: [beginner, intermediate, advanced]
 *                   interests:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/me', auth, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('profile.dailyStudyTime').optional().isNumeric().withMessage('Daily study time must be a number')
], validate, asyncHandler(async (req, res) => {
  const { name, profile } = req.body;

  const updateData = {};
  if (name) updateData.name = name;
  if (profile) {
    updateData.profile = { ...req.user.profile.toObject(), ...profile };
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user
  });
}));

module.exports = router;
