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
    body('email').isEmail().withMessage('Valid email is required'),
    body('role').isIn(['trainer', 'customer']).withMessage('Role is invalid'),
    body('name').isLength({ min: 2 }).withMessage('Name is required'),
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
