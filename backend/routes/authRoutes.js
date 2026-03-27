const express = require('express');
const { body } = require('express-validator');
const { login, register, checkUserExistsController } = require('../controllers/authController');

const router = express.Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password is required'),
    body('role').isIn(['trainer', 'customer', 'admin']).withMessage('Role is invalid'),
  ],
  login
);

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    // body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('role').isIn(['trainer', 'customer']).withMessage('Role is invalid'),
    body('name').isLength({ min: 2 }).withMessage('Name is required'),
  ],
  register
);
router.post(
  '/check-user',
  [
    body('role').isIn(['trainer', 'customer']).withMessage('Invalid role'),
    body('email').optional().isEmail().withMessage('Valid email required'),
  ],
  checkUserExistsController
);

module.exports = router;

