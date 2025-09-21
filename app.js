require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import configurations
const { connectDB } = require('./config/database');
const { specs, swaggerUi, swaggerOptions } = require('./config/swagger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const lessonRoutes = require('./routes/lessons');
const quizRoutes = require('./routes/quizzes');
const progressRoutes = require('./routes/progress');
const recommendationRoutes = require('./routes/recommendations');
const paymentRoutes = require('./routes/payments');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Swagger UI
}));

// CORS configuration - Enhanced for better compatibility
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép requests từ các domain được cấu hình hoặc localhost trong development
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',') 
      : [
          'http://localhost:3000', 
          'https://smart-learning-platform-pi.vercel.app'
        ];
    
    // Trong development, cho phép tất cả origins
    if (process.env.NODE_ENV === 'development' && !origin) {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },// Cho phép cookies và authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'], 
  maxAge: 86400,
  optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));

// Explicitly handle preflight OPTIONS requests for all routes
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files middleware
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running successfully',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Welcome to AI-Powered Learning Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      authentication: '/api/auth',
      users: '/api/users',
      courses: '/api/courses',
      lessons: '/api/lessons',
      quizzes: '/api/quizzes',
      progress: '/api/progress',
      recommendations: '/api/recommendations',
      payments: '/api/payments',
      notifications: '/api/notifications'
    },
    features: [
      'JWT Authentication',
      'Role-based Access Control',
      'Course Management',
      'AI-powered Recommendations',
      'Progress Tracking',
      'Multi-channel Payments',
      'Notification System',
      'File Uploads',
      'Real-time Analytics'
    ]
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', courseRoutes);
app.use('/api', lessonRoutes);
app.use('/api', quizRoutes);
app.use('/api', progressRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', paymentRoutes);
app.use('/api', notificationRoutes);

// API version route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI-Powered LMS API v1.0.0',
    documentation: '/api-docs',
    status: 'active'
  });
});

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Check the API documentation at /api-docs for available endpoints'
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api-docs',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log('🚀 AI-Powered LMS API Server Started Successfully!');
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port: ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`� Health Check: http://localhost:${PORT}/health`);
  console.log(`� API Base URL: http://localhost:${PORT}/api`);
  console.log('✅ All systems operational!');
});

module.exports = app;
