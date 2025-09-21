# 📚 MongoDB Schema Documentation - LMS AI Platform

## 🎯 Tổng quan

Hệ thống MongoDB schema được thiết kế cho **LMS AI Platform** - một nền tảng học tập trực tuyến tích hợp AI recommendations và blockchain payments. Schema được tối ưu cho:

- ✅ **AI-powered recommendations**
- ✅ **Progress tracking chi tiết**
- ✅ **Blockchain & traditional payments** 
- ✅ **Multi-channel notifications**
- ✅ **Advanced analytics**
- ✅ **Performance optimization**

---

## 📋 Danh sách Models

### 1. **User Model** (`models/User.js`)
**Quản lý người dùng với AI learning analytics**

**Tính năng chính:**
- 👤 Profile chi tiết (learning goals, study preferences)
- 📊 Progress tracking cho từng course/lesson
- 🧠 AI analytics (study patterns, weak areas, strong areas)
- 🎯 Learning recommendations integration
- 🔐 Authentication & security

**Key Fields:**
```javascript
{
  name, email, password, role,
  profile: { learningGoal, dailyStudyTime, skillLevel },
  enrolledCourses: [{ courseId, progress, status }],
  analytics: { studyStreak, totalStudyTime, weakAreas }
}
```

### 2. **Course Model** (`models/Course.js`)
**Khóa học với module structure và AI data**

**Tính năng chính:**
- 📚 Multi-module course structure
- 🎯 AI recommendation data
- 💰 Flexible pricing (free/paid/subscription)
- ⭐ Reviews & ratings system
- 📈 Analytics & performance tracking

**Key Fields:**
```javascript
{
  title, description, category, level,
  modules: [{ title, lessons, order }],
  instructor: { userId, bio },
  pricing: { type, price, currency },
  aiData: { difficulty_score, similar_courses }
}
```

### 3. **Lesson Model** (`models/Lesson.js`)
**Bài học đa dạng với media support**

**Tính năng chính:**
- 🎥 Multi-media content (video, audio, text, interactive)
- 📝 Assignments với auto-grading
- 💬 Comments & discussions
- 📊 Advanced analytics cho AI
- 🏷️ Content tagging

**Key Fields:**
```javascript
{
  title, type, content,
  video: { url, duration, subtitles },
  assignment: { instructions, rubric },
  analytics: { completionRate, engagementScore }
}
```

### 4. **Quiz Model** (`models/Quiz.js`)
**Hệ thống quiz thông minh với AI generation**

**Tính năng chính:**
- ❓ Multiple question types (MCQ, essay, code, matching)
- 🤖 AI-generated questions
- 🔒 Anti-cheating features (proctoring, time limits)
- 📊 Detailed analytics per question
- 🔄 Auto-grading với manual override

**Key Fields:**
```javascript
{
  questions: [{ type, options, correctAnswers }],
  settings: { timeLimit, maxAttempts, proctoring },
  attempts: [{ userId, answers, score }],
  aiGenerated: { isAiGenerated, confidence }
}
```

### 5. **Recommendation Model** (`models/Recommendation.js`)
**AI-powered recommendation engine**

**Tính năng chính:**
- 🧠 Multiple AI algorithms (collaborative, content-based, hybrid)
- 🎯 Context-aware recommendations
- 📊 A/B testing support
- 💡 Personalized messaging
- 📈 Performance tracking

**Key Fields:**
```javascript
{
  userId, context: { trigger, triggerData },
  aiAnalysis: { algorithm, confidence, reasoning },
  recommendations: [{ type, contentRef, score }],
  delivery: { channel, frequency }
}
```

### 6. **Payment Model** (`models/Payment.js`)
**Dual payment system (Traditional + Blockchain)**

**Tính năng chính:**
- 💳 Traditional payments (Stripe, PayPal, VNPay)
- ⛓️ Blockchain payments (ETH, BNB, MATIC)
- 🧾 Invoice generation
- 🔄 Refund processing
- 🛡️ Anti-fraud detection

**Key Fields:**
```javascript
{
  userId, courseId, amount,
  traditional: { method, provider, transactionId },
  blockchain: { network, txHash, confirmations },
  status, invoice: { invoiceNumber, pdfUrl }
}
```

### 7. **Notification Model** (`models/Notification.js`)
**Multi-channel notification system**

**Tính năng chính:**
- 📱 Multi-channel delivery (in-app, email, push, SMS)
- 🤖 AI-generated personalized content
- ⏰ Smart scheduling
- 📊 Engagement tracking
- 🧪 A/B testing

**Key Fields:**
```javascript
{
  recipient: { userId, userGroup },
  title, message, type, category,
  channels: { inApp, email, push, sms },
  aiGenerated: { personalizationLevel, sentiment }
}
```

---

## 🔧 Cấu hình Database

### Database Connection (`config/database.js`)
```javascript
const { connectDB, dbUtils } = require('./config/database');

// Kết nối database
await connectDB();

// Utilities
const isConnected = dbUtils.isConnected();
const stats = await dbUtils.getStats();
const health = await dbUtils.healthCheck();
```

### Environment Variables (`.env.example`)
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/lms-ai-platform
DB_NAME=lms-ai-platform

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
ENABLE_AI_RECOMMENDATIONS=true

# Blockchain
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-key
ENABLE_BLOCKCHAIN_PAYMENTS=true
```

---

## 📊 Performance Optimizations

### 🔍 **Indexes được tạo:**
- User: `email`, `role`, `enrolledCourses.courseId`
- Course: `category + level`, `status + isPublic`, `tags`
- Lesson: `courseId + moduleId + order`, `analytics.completionRate`
- Quiz: `courseId + lessonId`, `attempts.userId`
- Recommendation: `userId + isActive`, `aiAnalysis.confidence`
- Payment: `userId + status`, `blockchain.txHash`
- Notification: `recipient.userId + status`, `scheduling.sendAt`

### 📈 **Analytics Aggregations:**
- Course completion rates
- User learning patterns
- Payment statistics
- Notification engagement
- AI recommendation effectiveness

---

## 🚀 Tích hợp AI Features

### 1. **Learning Path Recommendations**
```javascript
// Tìm courses phù hợp với user profile
const recommendations = await Course.findSimilar(
  courseId, user.profile.interests, user.profile.skillLevel
);
```

### 2. **Adaptive Learning**
```javascript
// Update progress và trigger AI analysis
await user.updateCourseProgress(courseId, lessonId, timeSpent, score);

// AI sẽ analyze và tạo recommendations mới
```

### 3. **Smart Notifications**
```javascript
// AI-generated personalized notification
const notification = await Notification.createAIRecommendation(
  userId, recommendation
);
```

---

## 🔐 Security Features

- 🔒 Password hashing with bcryptjs
- 🎟️ JWT authentication
- 📊 Rate limiting
- 🛡️ Anti-fraud payment detection
- 🔍 Learning analytics privacy

---

## 🎯 Usage Examples

### Quick Start:
```javascript
// Import models
const { User, Course, Lesson } = require('./models');

// Create user
const user = new User({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword',
  role: 'student'
});
await user.save();

// Enroll in course
user.enrolledCourses.push({
  courseId: courseId,
  status: 'active'
});
await user.save();
```

---

## 📚 Tài liệu liên quan

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose ODM](https://mongoosejs.com/)
- [AI Integration Guide](./docs/ai-integration.md)
- [Payment Integration](./docs/payments.md)

---

**🎉 Schema này được thiết kế để scale và mở rộng cho hệ thống LMS enterprise-grade với AI capabilities!**
