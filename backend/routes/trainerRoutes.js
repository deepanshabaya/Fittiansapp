const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getMyProfileController,
  getTrainerForCustomerController,
  getTrainerByIdController,
  getMyCustomersController,
  assignCustomerToTrainer,
  uploadIntroductionVideo,
} = require('../controllers/trainerController');

const router = express.Router();

// Trainer fetches their own profile (used by TrainerVerificationScreen to poll approval)
router.get(
  '/me',
  authenticate,
  authorizeRoles('trainer'),
  getMyProfileController
);

// Trainer sees their assigned customers
router.get(
  '/my-customers',
  authenticate,
  authorizeRoles('trainer'),
  getMyCustomersController
);

// Customers (or admin/trainer) can fetch trainer mapped to a customer
router.get(
  '/by-customer/:customerId',
  authenticate,
  getTrainerForCustomerController
);

// Get trainer by id
router.get(
  '/:id',
  authenticate,
  getTrainerByIdController
);

// Admin assigns customer to trainer
router.post(
  '/assign-customer',
  authenticate,
  authorizeRoles('admin'),
  [
    body('trainerId').isInt().withMessage('trainerId is required'),
    body('customerId').isInt().withMessage('customerId is required'),
  ],
  assignCustomerToTrainer
);

// Trainer uploads introduction video URL
router.post(
  '/uploadVideo',
  authenticate,
  authorizeRoles('trainer'),
  [body('videoUrl').isURL().withMessage('Valid videoUrl is required')],
  uploadIntroductionVideo
);

module.exports = router;
