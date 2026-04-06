const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { adminUpload } = require('../config/upload');
const {
  approveTrainerController,
  rejectTrainerController,
  getPendingTrainersController,
  mapTrainerController,
  createUserController,
  getCustomersForMappingController,
  getTrainersListController,
  getUserDetailsController,
  updateUserController,
  getAllUsersController,
} = require('../controllers/adminController');

const router = express.Router();

// ────────────────────────────────────────────────────────────
// POST /api/admin/create-user
// Creates a new trainer or customer (user + role-specific row).
// Accepts multipart/form-data for image uploads.
// ────────────────────────────────────────────────────────────
router.post(
  '/create-user',
  authenticate,
  authorizeRoles('admin'),
  // multer parses multipart body & files BEFORE validators run
  (req, res, next) => {
    adminUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required'),
    body('role')
      .isIn(['trainer', 'customer'])
      .withMessage('Role must be trainer or customer'),
    // Conditional: mobile / mobileno format (10-15 digits)
    body('mobile')
      .optional()
      .matches(/^\d{10,15}$/)
      .withMessage('Mobile must be 10–15 digits'),
    body('mobileno')
      .optional()
      .matches(/^\d{10,15}$/)
      .withMessage('Mobile number must be 10–15 digits'),
    // Numeric validations
    body('total_sessions')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Total sessions must be a non-negative integer'),
    body('weight')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Weight must be a positive number'),
    body('height')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Height must be a positive number'),
    body('amount_paid')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Amount paid must be a positive number'),
    body('age')
      .optional()
      .isInt({ min: 0, max: 120 })
      .withMessage('Age must be between 0 and 120'),
    body('daily_routine')
      .optional()
      .isIn(['active', 'sitting', 'mixed'])
      .withMessage('daily_routine must be active, sitting, or mixed'),
    body('fitness_goal')
      .optional()
      .isIn(['weight_loss', 'muscle_gain', 'overall_fitness', 'strength_building'])
      .withMessage('Invalid fitness_goal value'),
    body('smoking')
      .optional()
      .isIn(['no', 'yes'])
      .withMessage('smoking must be yes or no'),
    body('alcohol_frequency')
      .optional()
      .isIn(['none', 'occasional', 'weekly', 'daily'])
      .withMessage('Invalid alcohol_frequency value'),
    body('dietary_preference')
      .optional()
      .isIn(['vegetarian', 'non_vegetarian', 'vegan', 'lacto_ovo', 'ovo', 'pescatarian'])
      .withMessage('Invalid dietary_preference value'),
    body('program_enrolled')
      .optional()
      .isIn(['my_home_coach', 'my_home_coach_couple', 'fit_mentor_program', 'disease_reversal_program'])
      .withMessage('Invalid program_enrolled value'),
  ],
  createUserController
);

// GET /api/admin/customers-for-mapping — all customers with mapping status
router.get(
  '/customers-for-mapping',
  authenticate,
  authorizeRoles('admin'),
  getCustomersForMappingController
);

// GET /api/admin/trainers-list — all trainers for picker
router.get(
  '/trainers-list',
  authenticate,
  authorizeRoles('admin'),
  getTrainersListController
);

// GET /api/admin/pendingTrainers — list trainers awaiting approval
router.get(
  '/pendingTrainers',
  authenticate,
  authorizeRoles('admin'),
  getPendingTrainersController
);

// POST /api/admin/approveTrainer
router.post(
  '/approveTrainer',
  authenticate,
  authorizeRoles('admin'),
  [body('trainerId').isInt().withMessage('trainerId is required')],
  approveTrainerController
);

// POST /api/admin/rejectTrainer
router.post(
  '/rejectTrainer',
  authenticate,
  authorizeRoles('admin'),
  [body('trainerId').isInt().withMessage('trainerId is required')],
  rejectTrainerController
);

// POST /api/admin/mapTrainer
router.post(
  '/mapTrainer',
  authenticate,
  authorizeRoles('admin'),
  [
    body('trainerId').isInt().withMessage('trainerId is required'),
    body('customerId').isInt().withMessage('customerId is required'),
  ],
  mapTrainerController
);

// PUT /api/admin/changeTrainer
router.put(
  '/changeTrainer',
  authenticate,
  authorizeRoles('admin'),
  [
    body('trainerId').isInt().withMessage('trainerId is required'),
    body('customerId').isInt().withMessage('customerId is required'),
  ],
  mapTrainerController
);

// GET /api/admin/all-users — list all customers + trainers (for edit picker)
router.get(
  '/all-users',
  authenticate,
  authorizeRoles('admin'),
  getAllUsersController
);

// GET /api/admin/user-details/:role/:id — full profile for one user
router.get(
  '/user-details/:role/:id',
  authenticate,
  authorizeRoles('admin'),
  getUserDetailsController
);

// PUT /api/admin/update-user/:role/:id — update customer or trainer
router.put(
  '/update-user/:role/:id',
  authenticate,
  authorizeRoles('admin'),
  (req, res, next) => {
    adminUpload(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('mobile').optional().matches(/^\d{10,15}$/).withMessage('Mobile must be 10–15 digits'),
    body('mobileno').optional().matches(/^\d{10,15}$/).withMessage('Mobile number must be 10–15 digits'),
    body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be positive'),
    body('height').optional().isFloat({ min: 0 }).withMessage('Height must be positive'),
    body('amount_paid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be positive'),
    body('age').optional().isInt({ min: 0, max: 120 }).withMessage('Age must be 0–120'),
    body('daily_routine').optional().isIn(['active', 'sitting', 'mixed']).withMessage('Invalid daily_routine'),
    body('fitness_goal').optional().isIn(['weight_loss', 'muscle_gain', 'overall_fitness', 'strength_building']).withMessage('Invalid fitness_goal'),
    body('smoking').optional().isIn(['no', 'yes']).withMessage('Invalid smoking value'),
    body('alcohol_frequency').optional().isIn(['none', 'occasional', 'weekly', 'daily']).withMessage('Invalid alcohol_frequency'),
    body('dietary_preference').optional().isIn(['vegetarian', 'non_vegetarian', 'vegan', 'lacto_ovo', 'ovo', 'pescatarian']).withMessage('Invalid dietary_preference'),
    body('program_enrolled').optional().isIn(['my_home_coach', 'my_home_coach_couple', 'fit_mentor_program', 'disease_reversal_program']).withMessage('Invalid program_enrolled'),
  ],
  updateUserController
);

module.exports = router;
