// models/index.js - Central export for all models

const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');
const Quiz = require('./Quiz');
const Recommendation = require('./Recommendation');
const Payment = require('./Payment');
const Notification = require('./Notification');

module.exports = {
  User,
  Course,
  Lesson,
  Quiz,
  Recommendation,
  Payment,
  Notification
};
