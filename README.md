# AI-Powered Learning Management System API

A comprehensive Learning Management System API with AI-powered recommendations, blockchain payment support, and multi-channel notifications.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Course Management**: Complete CRUD operations for courses, lessons, and modules
- **Interactive Quizzes**: Smart quiz system with auto-grading and analytics
- **AI Recommendations**: Personalized learning recommendations using multiple AI engines
- **Progress Tracking**: Detailed learning analytics and progress monitoring
- **Payment Processing**: Multi-channel payments including blockchain support
- **Notification System**: Multi-channel notifications (in-app, email, SMS, push)
- **File Management**: Secure file upload and management for multimedia content
- **Real-time Analytics**: Comprehensive analytics and reporting

## 🛠️ Technologies

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Documentation**: Swagger/OpenAPI 3.0
- **Validation**: Express-validator
- **Payment Processing**: Stripe, PayPal, Crypto integration ready

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## ⚡ Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd API
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/ai-lms
MONGODB_TEST_URI=mongodb://localhost:27017/ai-lms-test

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Server Configuration
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Notification Services
SENDGRID_API_KEY=your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
FCM_SERVER_KEY=your-fcm-server-key

# Blockchain Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
```

### 4. Start the server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start
```

### 5. Access the API
- **API Base URL**: `http://localhost:3000/api`
- **Documentation**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`

## 📚 API Documentation

### Interactive Documentation
Visit `http://localhost:3000/api-docs` for comprehensive interactive API documentation with Swagger UI.

### Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### User Roles
- **Student**: Basic user with course enrollment and learning capabilities
- **Teacher**: Can create and manage courses, lessons, and quizzes
- **Admin**: Full system access including user management and analytics

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### User Management
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/:id/analytics` - Get user analytics

### Course Management
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course (Teacher/Admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (Teacher/Admin)
- `DELETE /api/courses/:id` - Delete course (Teacher/Admin)
- `POST /api/courses/:id/enroll` - Enroll in course

### Quiz System
- `POST /api/quizzes` - Create quiz (Teacher/Admin)
- `GET /api/quizzes` - Get all quizzes
- `GET /api/quizzes/:id` - Get quiz details
- `POST /api/quizzes/:id/submit` - Submit quiz answers
- `GET /api/quizzes/:id/results` - Get quiz results

### Progress & Analytics
- `GET /api/progress/dashboard` - Get learning dashboard
- `GET /api/progress/analytics` - Get learning analytics
- `POST /api/progress/lessons/:lessonId/complete` - Mark lesson complete

### AI Recommendations
- `GET /api/recommendations` - Get personalized recommendations
- `POST /api/recommendations/generate` - Generate new recommendations

### Payment Processing
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/:id/confirm` - Confirm payment
- `GET /api/payments` - Get payment history

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/send` - Send notification (Admin/Teacher)
- `PUT /api/notifications/preferences` - Update notification preferences

## 🛠️ Project Structure

```
API/
├── app.js                     # Main application file
├── package.json              # Dependencies and scripts
├── config/
│   ├── database.js           # MongoDB connection
│   └── swagger.js            # Swagger documentation setup
├── models/                   # MongoDB schemas
│   ├── User.js
│   ├── Course.js
│   ├── Lesson.js
│   ├── Quiz.js
│   ├── UserProgress.js
│   ├── Recommendation.js
│   ├── Payment.js
│   └── Notification.js
├── routes/                   # API routes
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management
│   ├── courses.js           # Course management
│   ├── lessons.js           # Lesson management
│   ├── quizzes.js           # Quiz system
│   ├── progress.js          # Progress tracking
│   ├── recommendations.js   # AI recommendations
│   ├── payments.js          # Payment processing
│   └── notifications.js     # Notification system
├── middleware/              # Custom middleware
│   ├── auth.js             # Authentication & authorization
│   ├── validation.js       # Input validation
│   ├── upload.js          # File upload handling
│   └── errorHandler.js    # Global error handling
└── uploads/               # File upload directory
```

## 🔧 Configuration

### Environment Variables
Required environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 3000)
- Additional configuration for payments, notifications, etc.

### Security Features
- Helmet.js for security headers
- CORS configuration
- JWT token authentication
- Input validation and sanitization
- File upload restrictions
- Rate limiting (100 requests per 15 minutes)

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   - Copy `.env.example` to `.env`
   - Fill in your configuration values

3. **Start MongoDB**
   - Ensure MongoDB is running locally or provide cloud connection string

4. **Run the Server**
   ```bash
   npm start        # Production
   npm run dev      # Development with hot reload
   ```

5. **Visit Documentation**
   - Open `http://localhost:3000/api-docs` for interactive API documentation

## 📊 Features Overview

### 🎓 Learning Management
- Course creation and management
- Multi-media lesson content
- Interactive quizzes with auto-grading
- Progress tracking and analytics
- Certificate generation

### 🤖 AI-Powered Features
- Personalized course recommendations
- Learning path optimization
- Performance analytics
- Adaptive learning suggestions

### 💳 Payment Integration
- Multiple payment gateways
- Blockchain payment support
- Subscription management
- Refund processing

### 📱 Multi-Channel Notifications
- In-app notifications
- Email notifications
- SMS alerts
- Push notifications

## 📈 Analytics & Reporting

The API provides comprehensive analytics:
- User engagement metrics
- Course performance data
- Payment transaction analytics
- Notification delivery statistics
- AI recommendation effectiveness

## 🔒 Security

- JWT-based authentication
- Role-based authorization
- Input validation and sanitization
- Rate limiting protection
- Secure file upload handling
- SQL injection prevention
- XSS protection

## 📞 Support

For questions or support:
- 📖 Check the interactive documentation at `/api-docs`
- 🐛 Report issues via GitHub Issues
- 📧 Contact: support@learningplatform.com

---

**🎯 Ready to power the future of education with AI! 🚀**

3. Start the development server:
```bash
npm run dev
```

Or start in production mode:
```bash
npm start
```

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Available Endpoints

#### General
- `GET /` - Welcome message and API info
- `GET /api/health` - Health check with system info

#### Users API
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Example Requests

#### Create a user:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

#### Get all users:
```bash
curl http://localhost:3000/api/users
```

## Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with nodemon
- `npm test` - Run tests (not implemented yet)

## Middleware

### Logger
Logs all incoming requests with timestamp, method, URL, and IP address.

### Rate Limiter
Basic rate limiting implementation:
- Default: 100 requests per 15 minutes per IP
- Returns 429 status when limit exceeded

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## Next Steps

This is a basic starter template. You can extend it by:

1. Adding a database (MongoDB, PostgreSQL, etc.)
2. Implementing authentication (JWT, sessions)
3. Adding data validation (Joi, express-validator)
4. Adding testing (Jest, Mocha)
5. Adding more comprehensive error handling
6. Adding API documentation (Swagger/OpenAPI)
7. Adding CORS middleware
8. Adding security headers (helmet)

## License

ISC
