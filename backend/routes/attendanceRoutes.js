const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getAttendanceForCustomer,
  markAttendance,
} = require('../controllers/attendanceController');

const router = express.Router();

// Customers/trainers/admin can fetch attendance by customer
router.get(
  '/:customerId',
  authenticate,
  getAttendanceForCustomer
);

// Trainer marks attendance
router.post(
  '/mark',
  authenticate,
  authorizeRoles('trainer'),
  [
    body('sessionId').isInt().withMessage('sessionId is required'),
    body('markType').isIn(['in', 'out']).withMessage('markType must be in or out'),
  ],
  markAttendance
);

module.exports = router;

