const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  requestPause,
  getTrainerRequests,
  approvePauseRequest,
} = require('../controllers/pauseController');

const router = express.Router();

// Customer creates pause request
router.post(
  '/request',
  authenticate,
  authorizeRoles('customer'),
  [
    body('pauseUntilDate').isISO8601().withMessage('pauseUntilDate is required'),
    body('reason').isLength({ min: 3 }).withMessage('reason is required'),
  ],
  requestPause
);

// Trainer views pending pause requests
router.get(
  '/trainerRequests',
  authenticate,
  authorizeRoles('trainer'),
  getTrainerRequests
);

// Trainer approves/rejects pause request
router.post(
  '/approve',
  authenticate,
  authorizeRoles('trainer'),
  [
    body('requestId').isInt().withMessage('requestId is required'),
    body('status').isIn(['Approved', 'Rejected']).withMessage('Invalid status'),
  ],
  approvePauseRequest
);

module.exports = router;

