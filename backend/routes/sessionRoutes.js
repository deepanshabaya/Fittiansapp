const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createSessionController,
  getSessionHistory,
  getTrainerSessions,
  cancelSessionController,
  postponeSessionController,
} = require('../controllers/sessionController');

const router = express.Router();

// Trainer or admin creates a session
router.post(
  '/',
  authenticate,
  authorizeRoles('trainer', 'admin'),
  [
    body('customerId').isInt().withMessage('customerId is required'),
    body('programId').isInt().withMessage('programId is required'),
    body('sessionDate').isISO8601().withMessage('sessionDate is required (YYYY-MM-DD)'),
    body('startTime').notEmpty().withMessage('startTime is required'),
    body('endTime').notEmpty().withMessage('endTime is required'),
  ],
  createSessionController
);

// Customer or admin views a customer's session history
router.get(
  '/customer/:customerId',
  authenticate,
  getSessionHistory
);

// Trainer views their own sessions
router.get(
  '/trainer/:trainerId',
  authenticate,
  getTrainerSessions
);

// Customer or admin cancels a session
router.post(
  '/cancel',
  authenticate,
  authorizeRoles('customer', 'admin'),
  [body('sessionId').isInt().withMessage('sessionId is required')],
  cancelSessionController
);

// Customer or admin postpones a session
router.post(
  '/postpone',
  authenticate,
  authorizeRoles('customer', 'admin'),
  [
    body('sessionId').isInt().withMessage('sessionId is required'),
    body('newDate').isISO8601().withMessage('newDate is required'),
    body('newStartTime').notEmpty().withMessage('newStartTime is required'),
    body('newEndTime').notEmpty().withMessage('newEndTime is required'),
  ],
  postponeSessionController
);

module.exports = router;
