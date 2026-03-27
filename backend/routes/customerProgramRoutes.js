const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  enrollCustomerController,
  getCustomerProgramSummaryController,
} = require('../controllers/customerProgramController');

const router = express.Router();

// Admin enrolls a customer in a program
router.post(
  '/',
  authenticate,
  authorizeRoles('admin'),
  [
    body('customerId').isInt().withMessage('customerId is required'),
    body('programId').isInt().withMessage('programId is required'),
    body('totalSessions').isInt({ min: 1 }).withMessage('totalSessions must be positive'),
  ],
  enrollCustomerController
);

// Get a customer's program summary
router.get(
  '/:customerId/summary',
  authenticate,
  getCustomerProgramSummaryController
);

module.exports = router;
