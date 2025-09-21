const mongoose = require('mongoose');

// Database connection configuration
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-ai-platform';
    
    const options = {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      
      // Database options
      dbName: process.env.DB_NAME || 'lms-ai-platform',
      
      // Authentication (if needed)
      // user: process.env.DB_USER,
      // pass: process.env.DB_PASS,
      
      // Additional options for production
      retryWrites: true,
      w: 'majority'
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoURI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected');
    });
    
    // Handle application termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 Mongoose connection closed due to application termination');
        process.exit(0);
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Database utilities
const dbUtils = {
  // Check if connected
  isConnected: () => {
    return mongoose.connection.readyState === 1;
  },
  
  // Get connection status
  getConnectionStatus: () => {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState];
  },
  
  // Get database statistics
  getStats: async () => {
    if (!dbUtils.isConnected()) {
      return null;
    }
    
    try {
      const admin = mongoose.connection.db.admin();
      const stats = await admin.stats();
      
      return {
        collections: stats.collections,
        dataSize: Math.round(stats.dataSize / 1024 / 1024 * 100) / 100, // MB
        indexSize: Math.round(stats.indexSize / 1024 / 1024 * 100) / 100, // MB
        totalSize: Math.round(stats.storageSize / 1024 / 1024 * 100) / 100, // MB
        documents: stats.objects
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  },
  
  // Create indexes for better performance
  createIndexes: async () => {
    try {
      console.log('🔧 Creating database indexes...');
      
      // You can add custom indexes here if needed
      // Example:
      // await User.collection.createIndex({ email: 1 }, { unique: true });
      // await Course.collection.createIndex({ category: 1, level: 1 });
      
      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
    }
  },
  
  // Database health check
  healthCheck: async () => {
    try {
      if (!dbUtils.isConnected()) {
        return { status: 'disconnected', healthy: false };
      }
      
      // Test with a simple ping
      await mongoose.connection.db.admin().ping();
      
      const stats = await dbUtils.getStats();
      
      return {
        status: 'connected',
        healthy: true,
        stats: stats,
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  },
  
  // Seed database with sample data (for development)
  seedDatabase: async () => {
    try {
      console.log('🌱 Seeding database with sample data...');
      
      // Import models
      const User = require('./User');
      const Course = require('./Course');
      
      // Check if data already exists
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        console.log('📊 Database already has data, skipping seed');
        return;
      }
      
      // Create sample admin user
      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@lms.com',
        password: 'admin123',
        role: 'admin',
        profile: {
          learningGoal: 'skill_upgrade',
          dailyStudyTime: 60,
          skillLevel: 'advanced'
        }
      });
      
      await adminUser.save();
      
      // Create sample teacher
      const teacher = new User({
        name: 'John Teacher',
        email: 'teacher@lms.com',
        password: 'teacher123',
        role: 'teacher',
        profile: {
          learningGoal: 'academic',
          dailyStudyTime: 90,
          skillLevel: 'advanced'
        }
      });
      
      await teacher.save();
      
      // Create sample student
      const student = new User({
        name: 'Jane Student',
        email: 'student@lms.com',
        password: 'student123',
        role: 'student',
        profile: {
          learningGoal: 'career_change',
          dailyStudyTime: 45,
          skillLevel: 'beginner',
          interests: ['programming', 'web_dev']
        }
      });
      
      await student.save();
      
      // Create sample course
      const course = new Course({
        title: 'Introduction to JavaScript',
        slug: 'intro-javascript',
        description: 'Learn the fundamentals of JavaScript programming',
        shortDescription: 'JavaScript basics for beginners',
        thumbnail: 'https://example.com/js-thumbnail.jpg',
        category: 'programming',
        level: 'beginner',
        duration: {
          totalHours: 20,
          totalLessons: 15,
          totalQuizzes: 5
        },
        instructor: {
          userId: teacher._id,
          bio: 'Experienced JavaScript developer and teacher'
        },
        modules: [{
          title: 'Getting Started',
          description: 'Introduction to JavaScript',
          order: 1,
          lessons: [],
          estimatedDuration: 120
        }],
        prerequisites: ['Basic computer skills'],
        learningOutcomes: [
          'Understand JavaScript syntax',
          'Write basic JavaScript programs',
          'Work with variables and functions'
        ],
        pricing: {
          type: 'free',
          price: 0
        },
        status: 'published',
        isPublic: true
      });
      
      await course.save();
      
      console.log('✅ Database seeded successfully');
      console.log(`👤 Admin: admin@lms.com / admin123`);
      console.log(`👨‍🏫 Teacher: teacher@lms.com / teacher123`);
      console.log(`👩‍🎓 Student: student@lms.com / student123`);
      
    } catch (error) {
      console.error('❌ Error seeding database:', error);
    }
  }
};

module.exports = {
  connectDB,
  dbUtils
};
