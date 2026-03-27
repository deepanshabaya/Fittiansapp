const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const {
  listPrograms,
  createProgramController,
} = require('../controllers/programController');

const router = express.Router();

// Public or authenticated users can list programs
router.get(
  '/',
  authenticate,
  listPrograms
);

// Admin creates programs
router.post(
  '/',
  authenticate,
  authorizeRoles('admin'),
  [
    body('name').isLength({ min: 2 }).withMessage('name is required'),
    body('description').isLength({ min: 2 }).withMessage('description is required'),
    body('totalSessions').isInt({ min: 1 }).withMessage('totalSessions must be positive integer'),
  ],
  createProgramController
);

module.exports = router;

