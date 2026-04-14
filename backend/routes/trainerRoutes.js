const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getMyProfileController,
  getTrainerForCustomerController,
  getTrainerByIdController,
  getMyCustomersController,
  updateMyProfileController,
  assignCustomerToTrainer,
  uploadIntroductionVideo,
  updateCustomerHealthController,
} = require('../controllers/trainerController');

const router = express.Router();

// Trainer fetches their own profile (used by TrainerVerificationScreen to poll approval)
router.get(
  '/me',
  authenticate,
  authorizeRoles('trainer'),
  getMyProfileController
);

// Trainer updates their own profile
router.put(
  '/me',
  authenticate,
  authorizeRoles('trainer'),
  updateMyProfileController
);

// Trainer sees their assigned customers
router.get(
  '/my-customers',
  authenticate,
  authorizeRoles('trainer'),
  getMyCustomersController
);

// Trainer updates health fields of a customer
router.put(
  '/customers/:id/health',
  authenticate,
  authorizeRoles('trainer'),
  [
    body('weight').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('height').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }),
    body('daily_routine').optional({ nullable: true, checkFalsy: true }).isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']),
    body('fitness_goal').optional({ nullable: true, checkFalsy: true }).isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'disease_management']),
    body('smoking').optional({ nullable: true, checkFalsy: true }).isIn(['never', 'occasional', 'regular', 'former']),
    body('alcohol_frequency').optional({ nullable: true, checkFalsy: true }).isIn(['never', 'rarely', 'occasionally', 'weekly', 'daily']),
    body('dietary_preference').optional({ nullable: true, checkFalsy: true }).isIn(['vegetarian', 'vegan', 'non_vegetarian', 'eggetarian', 'jain']),
    body('program_enrolled').optional({ nullable: true, checkFalsy: true }).isIn(['my_home_coach', 'my_home_coach_couple', 'fit_mentor_program', 'disease_reversal_program']),
  ],
  updateCustomerHealthController
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
