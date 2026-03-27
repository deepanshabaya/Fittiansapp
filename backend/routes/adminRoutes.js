const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  approveTrainerController,
  rejectTrainerController,
  getPendingTrainersController,
  mapTrainerController,
} = require('../controllers/adminController');

const router = express.Router();

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
