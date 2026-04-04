const { validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { approveTrainer, rejectTrainer, getPendingTrainers } = require('../models/trainerModel');
const { mapTrainerToCustomer } = require('../models/trainerCustomerMappingModel');

// POST /api/admin/approveTrainer
const approveTrainerController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trainerId } = req.body;
    const trainer = await approveTrainer(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    return res.json({ trainer });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/rejectTrainer
const rejectTrainerController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trainerId } = req.body;
    const trainer = await rejectTrainer(trainerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    return res.json({ trainer });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/pendingTrainers
const getPendingTrainersController = async (req, res, next) => {
  try {
    const trainers = await getPendingTrainers();
    return res.json({ trainers });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/mapTrainer
// PUT /api/admin/changeTrainer
const mapTrainerController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trainerId, customerId } = req.body;
    const mapping = await mapTrainerToCustomer({ trainerId, customerId });
    return res.json({ mapping });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────
// POST /api/admin/create-user
// Creates a user + role-specific profile in a single transaction.
//
// Body fields (sent as multipart/form-data when images are included):
//   Common: name (required), role (required: 'trainer' | 'customer')
//   Customer: mobile, address, total_sessions, weight, height,
//             amount_paid, amount_paid_on, start_date
//             File field: upload_photo
//   Trainer: mobileno, bio, specialization, certifications,
//            introduction_video_url
//            File field: profile
// ────────────────────────────────────────────────────────────
const createUserController = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, role } = req.body;

    await client.query('BEGIN');

    // Step 1: Insert into users table (email & password are null — user sets them on first app open)
    const userResult = await client.query(
      `INSERT INTO users (name, role) VALUES ($1, $2) RETURNING id, name, role, created_at`,
      [name, role]
    );
    const newUser = userResult.rows[0];

    let profile = null;

    // Step 2: Insert into role-specific table
    if (role === 'customer') {
      // Resolve file path for uploaded photo
      const uploadPhotoPath = req.files?.upload_photo?.[0]
        ? `/uploads/profiles/${req.files.upload_photo[0].filename}`
        : null;

      const {
        mobile = null,
        address = null,
        total_sessions = 0,
        weight = null,
        height = null,
        amount_paid = null,
        amount_paid_on = null,
        start_date = null,
      } = req.body;

      const custResult = await client.query(
        `INSERT INTO customers
           (user_id, name, mobile, address, total_sessions,
            upload_photo, weight, height, amount_paid, amount_paid_on, start_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          newUser.id,
          name,
          mobile,
          address,
          parseInt(total_sessions, 10) || 0,
          uploadPhotoPath,
          weight ? parseFloat(weight) : null,
          height ? parseFloat(height) : null,
          amount_paid ? parseFloat(amount_paid) : null,
          amount_paid_on || null,
          start_date || null,
        ]
      );
      profile = custResult.rows[0];
    } else if (role === 'trainer') {
      // Resolve file path for profile image
      const profileImagePath = req.files?.profile?.[0]
        ? `/uploads/profiles/${req.files.profile[0].filename}`
        : null;

      const {
        mobileno = null,
        bio = null,
        specialization = null,
        certifications = '[]',
        introduction_video_url = null,
      } = req.body;

      const trainerResult = await client.query(
        `INSERT INTO trainers
           (user_id, name, mobileno, bio, specialization,
            certifications, profile, introduction_video_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          newUser.id,
          name,
          mobileno,
          bio,
          specialization,
          certifications,
          profileImagePath,
          introduction_video_url || null,
        ]
      );
      profile = trainerResult.rows[0];
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully`,
      user: newUser,
      profile,
    });
  } catch (err) {
    await client.query('ROLLBACK');

    // Handle unique-constraint violations gracefully
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A user with this data already exists.' });
    }
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  approveTrainerController,
  rejectTrainerController,
  getPendingTrainersController,
  mapTrainerController,
  createUserController,
};
