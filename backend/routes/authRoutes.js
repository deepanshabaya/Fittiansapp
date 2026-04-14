const express = require('express');
const { body } = require('express-validator');
const { login, register, checkUserExistsController } = require('../controllers/authController');

const router = express.Router();

// Login — role is auto-detected from the users table, not sent by client.
// Password is optional (admin-created users may not have one yet).
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').optional(),
  ],
  login
);

router.post(
  '/register',
  [
    body('mobile')
      .matches(/^\d{10,15}$/)
      .withMessage('Mobile must be 10–15 digits'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  register
);

// check-user now only needs email — returns { exists, role }
router.post(
  '/check-user',
  [
    body('email').isEmail().withMessage('Valid email required'),
  ],
  checkUserExistsController
);

module.exports = router;
