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
    // mobile field comes as 'mobile' for customers, 'mobileno' for trainers
    const mobileForUsers = req.body.mobile || req.body.mobileno || null;

    await client.query('BEGIN');

    // Step 1: Insert into users table (email & password are null — user sets them on first app open)
    const userResult = await client.query(
      `INSERT INTO users (name, role, mobile, modifiedon) VALUES ($1, $2, $3, NOW()) RETURNING id, name, role, mobile, modifiedon, created_at`,
      [name, role, mobileForUsers]
    );
    const newUser = userResult.rows[0];

    let profile = null;

    // Step 2: Insert into role-specific table
    if (role === 'customer') {
      // Check mobile uniqueness
      const mobileVal = req.body.mobile;
      if (mobileVal) {
        const dup = await client.query(
          'SELECT id FROM customers WHERE mobile = $1', [mobileVal]
        );
        if (dup.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'A customer with this mobile number already exists.' });
        }
      }
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
        age = null,
        daily_routine = null,
        medical_conditions = null,
        fitness_goal = null,
        smoking = null,
        alcohol_frequency = null,
        dietary_preference = null,
        special_focus = null,
        program_enrolled = null,
      } = req.body;

      const custResult = await client.query(
        `INSERT INTO customers
           (user_id, name, mobile, address, total_sessions,
            upload_photo, weight, height, amount_paid, amount_paid_on, start_date,
            age, daily_routine, medical_conditions, fitness_goal,
            smoking, alcohol_frequency, dietary_preference, special_focus,
            program_enrolled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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
          age ? parseInt(age, 10) : null,
          daily_routine || null,
          medical_conditions || null,
          fitness_goal || null,
          smoking || null,
          alcohol_frequency || null,
          dietary_preference || null,
          special_focus || null,
          program_enrolled || null,
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

// ────────────────────────────────────────────────────────────
// GET /api/admin/customers-for-mapping
// Returns all customers with their current mapping status.
// ────────────────────────────────────────────────────────────
const getCustomersForMappingController = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.mobile,
        c.upload_photo,
        c.weight,
        c.height,
        m.trainer_id,
        t.name   AS trainer_name,
        t.profile AS trainer_photo
      FROM customers c
      LEFT JOIN trainer_customer_mapping m ON m.customer_id = c.id
      LEFT JOIN trainers t ON t.id = m.trainer_id
      ORDER BY c.name ASC
    `);
    return res.json({ customers: result.rows });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/admin/trainers-list
// Returns all trainers for admin selection.
// ────────────────────────────────────────────────────────────
const getTrainersListController = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id,
        t.name,
        t.mobileno,
        t.specialization,
        t.profile
        FROM trainers t
      ORDER BY t.name ASC
    `);
    return res.json({ trainers: result.rows });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/admin/user-details/:role/:id
// Returns full details for a customer or trainer by their
// role-specific table id.
// ────────────────────────────────────────────────────────────
const getUserDetailsController = async (req, res, next) => {
  try {
    const { role, id } = req.params;

    if (role === 'customer') {
      const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
      if (!result.rows.length) return res.status(404).json({ message: 'Customer not found' });
      return res.json({ profile: result.rows[0] });
    }

    if (role === 'trainer') {
      const result = await pool.query('SELECT * FROM trainers WHERE id = $1', [id]);
      if (!result.rows.length) return res.status(404).json({ message: 'Trainer not found' });
      return res.json({ profile: result.rows[0] });
    }

    return res.status(400).json({ message: 'role must be customer or trainer' });
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────
// PUT /api/admin/update-user/:role/:id
// Updates a customer or trainer. Accepts multipart/form-data.
// ────────────────────────────────────────────────────────────
const CUSTOMER_COLUMNS = [
  'name', 'mobile', 'address', 'total_sessions', 'weight', 'height',
  'amount_paid', 'amount_paid_on', 'start_date', 'upload_photo',
  'age', 'daily_routine', 'medical_conditions', 'fitness_goal',
  'smoking', 'alcohol_frequency', 'dietary_preference', 'special_focus',
  'program_enrolled',
];

const TRAINER_COLUMNS = [
  'name', 'mobileno', 'bio', 'specialization', 'certifications',
  'introduction_video_url', 'profile',
];

const updateUserController = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, id } = req.params;
    await client.query('BEGIN');

    if (role === 'customer') {
      // Mobile uniqueness check (exclude self)
      const mobileVal = req.body.mobile;
      if (mobileVal) {
        const dup = await client.query(
          'SELECT id FROM customers WHERE mobile = $1 AND id != $2', [mobileVal, id]
        );
        if (dup.rows.length > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'Another customer already has this mobile number.' });
        }
      }

      // Resolve photo if uploaded
      if (req.files?.upload_photo?.[0]) {
        req.body.upload_photo = `/uploads/profiles/${req.files.upload_photo[0].filename}`;
      }

      const sets = [];
      const vals = [];
      let idx = 1;
      for (const col of CUSTOMER_COLUMNS) {
        if (req.body[col] !== undefined) {
          sets.push(`${col} = $${idx++}`);
          vals.push(req.body[col] === '' ? null : req.body[col]);
        }
      }

      if (!sets.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'No fields to update' });
      }

      vals.push(id);
      const result = await client.query(
        `UPDATE customers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals
      );

      // Also update the name in users table if name changed
      if (req.body.name) {
        await client.query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [req.body.name, result.rows[0].user_id]
        );
      }

      await client.query('COMMIT');
      return res.json({ message: 'Customer updated successfully', profile: result.rows[0] });
    }

    if (role === 'trainer') {
      // Resolve profile photo if uploaded
      if (req.files?.profile?.[0]) {
        req.body.profile = `/uploads/profiles/${req.files.profile[0].filename}`;
      }

      const sets = [];
      const vals = [];
      let idx = 1;
      for (const col of TRAINER_COLUMNS) {
        if (req.body[col] !== undefined) {
          sets.push(`${col} = $${idx++}`);
          vals.push(req.body[col] === '' ? null : req.body[col]);
        }
      }

      if (!sets.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'No fields to update' });
      }

      vals.push(id);
      const result = await client.query(
        `UPDATE trainers SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals
      );

      if (req.body.name) {
        await client.query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [req.body.name, result.rows[0].user_id]
        );
      }

      await client.query('COMMIT');
      return res.json({ message: 'Trainer updated successfully', profile: result.rows[0] });
    }

    await client.query('ROLLBACK');
    return res.status(400).json({ message: 'role must be customer or trainer' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ────────────────────────────────────────────────────────────
// GET /api/admin/all-users
// Returns all customers and trainers for the edit picker.
// ────────────────────────────────────────────────────────────
const getAllUsersController = async (req, res, next) => {
  try {
    const [custRes, trainerRes] = await Promise.all([
      pool.query(`SELECT id, name, mobile, upload_photo FROM customers ORDER BY name ASC`),
      pool.query(`SELECT id, name, mobileno, profile FROM trainers ORDER BY name ASC`),
    ]);
    return res.json({
      customers: custRes.rows,
      trainers: trainerRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  approveTrainerController,
  rejectTrainerController,
  getPendingTrainersController,
  mapTrainerController,
  createUserController,
  getCustomersForMappingController,
  getTrainersListController,
  getUserDetailsController,
  updateUserController,
  getAllUsersController,
};
