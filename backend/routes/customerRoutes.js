const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const { adminUpload } = require('../config/upload');
const {
  getMyProfileController,
  updateMyProfileController,
} = require('../controllers/customerController');

const router = express.Router();

// Customer fetches their own profile
router.get(
  '/me',
  authenticate,
  authorizeRoles('customer'),
  getMyProfileController
);

// Customer updates their own profile (mobile / address / upload_photo only).
// Accepts multipart/form-data so the photo can be uploaded as a file.
router.put(
  '/update-profile',
  authenticate,
  authorizeRoles('customer'),
  (req, res, next) => {
    adminUpload(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  [
    body('mobile')
      .optional({ nullable: true, checkFalsy: true })
      .matches(/^\d{10}$/)
      .withMessage('Mobile must be exactly 10 digits'),
    body('address')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .isLength({ max: 500 })
      .withMessage('Address must be under 500 characters'),
  ],
  updateMyProfileController
);

module.exports = router;
