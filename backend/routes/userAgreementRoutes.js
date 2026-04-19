const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/authMiddleware');
const { acceptAgreement } = require('../controllers/legalController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  [
    body('type')
      .isString()
      .isLength({ min: 1, max: 32 })
      .withMessage('type is required'),
    body('version')
      .isInt({ min: 1 })
      .withMessage('version must be a positive integer'),
    body('agreed')
      .isBoolean()
      .withMessage('agreed must be boolean'),
  ],
  acceptAgreement
);

module.exports = router;
