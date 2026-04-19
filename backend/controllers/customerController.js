const { validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { getCustomerByUserId } = require('../models/customerModel');

const getMyProfileController = async (req, res, next) => {
  try {
    const customer = await getCustomerByUserId(req.user.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }
    return res.json({ customer });
  } catch (err) {
    next(err);
  }
};

// Multipart body values arrive as strings (or undefined for unset fields).
// Turn empty-strings into null so we don't overwrite rows with "".
const cleanStr = (v) => {
  if (v === undefined || v === null) return null;
  const trimmed = String(v).trim();
  return trimmed.length ? trimmed : null;
};

const updateMyProfileController = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existing = await getCustomerByUserId(req.user.id);
    if (!existing) {
      return res.status(404).json({ message: 'Customer profile not found' });
    }

    const mobile = cleanStr(req.body.mobile);
    const address = cleanStr(req.body.address);
    // Photo: new uploaded file wins. If none uploaded, keep existing value.
    const newPhotoPath = req.files?.upload_photo?.[0]
      ? `/uploads/profiles/${req.files.upload_photo[0].filename}`
      : existing.upload_photo;

    const modifiedBy = req.user.email || `user:${req.user.id}`;

    await client.query('BEGIN');

    const updRes = await client.query(
      `UPDATE customers SET
         mobile       = $2,
         address      = $3,
         upload_photo = $4,
         modifiedon   = NOW(),
         modifiedby   = $5
       WHERE user_id = $1
       RETURNING *`,
      [req.user.id, mobile, address, newPhotoPath, modifiedBy]
    );

    // Keep users.mobile in sync with customers.mobile
    await client.query(
      `UPDATE users SET mobile = $1 WHERE id = $2`,
      [mobile, req.user.id]
    );

    await client.query('COMMIT');
    return res.json({ customer: updRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getMyProfileController,
  updateMyProfileController,
};
