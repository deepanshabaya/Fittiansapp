const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  markSessionController,
  postponeSessionController,
  cancelSessionController,
  addProgressController,
  syncStepsController,
  getCustomerDashboardController,
  getLatestProgressController,
  getTodaySessionsController,
} = require('../controllers/dashboardController');

const router = express.Router();

// Trainer marks customer session
router.post(
  '/session/mark',
  authenticate,
  authorizeRoles('trainer'),
  [
    body('customer_id').isInt(),
    body('status').isIn(['completed', 'missed']),
    body('session_date').optional().isDate(),
  ],
  markSessionController
);

// Customer postpones a session (status=missed, action_type=postponed)
router.post(
  '/session/postpone',
  authenticate,
  authorizeRoles('customer'),
  [body('session_date').optional().isDate()],
  postponeSessionController
);

// Customer cancels a session (status=missed, action_type=cancelled)
router.post(
  '/session/cancel',
  authenticate,
  authorizeRoles('customer'),
  [body('session_date').optional().isDate()],
  cancelSessionController
);

// Trainer adds/updates customer progress
router.post(
  '/progress/add',
  authenticate,
  authorizeRoles('trainer'),
  [
    body('customer_id').isInt(),
    body('log_date').optional().isDate(),
  ],
  addProgressController
);

// Customer syncs steps from device
router.post(
  '/health/steps/sync',
  authenticate,
  authorizeRoles('customer'),
  [
    body('steps_per_day').isInt({ min: 0 }),
    body('date').optional().isDate(),
  ],
  syncStepsController
);

// Customer dashboard analytics
router.get(
  '/customer/:id',
  authenticate,
  getCustomerDashboardController
);

// Latest progress for a customer (pre-fill trainer form)
router.get(
  '/progress/:customerId',
  authenticate,
  getLatestProgressController
);

// Today's session statuses for a trainer's customers
router.get(
  '/sessions/today/:trainerId',
  authenticate,
  getTodaySessionsController
);

module.exports = router;
