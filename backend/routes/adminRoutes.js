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
  ],
  createUserController
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

module.exports = router;
