const { validationResult } = require('express-validator');
const { pool } = require('../config/db');
const { getTrainerForCustomer, getCustomersForTrainer } = require('../models/trainerCustomerMappingModel');
const { getTrainerByUserId, getTrainerById, updateIntroductionVideoUrl } = require('../models/trainerModel');

// PUT /api/trainers/customers/:id/health
// Trainer edits a mapped customer. Mirrors admin updateUserController: full-object
// update of a fixed column set. Before UPDATE, snapshot the old row into
// customers_history (action='UPDATE', modifiedby=trainer).
const updateCustomerHealthController = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const trainerId = req.user.trainerId;
    if (!trainerId) {
      return res.status(403).json({ message: 'Only trainers can update customer health.' });
    }

    const customerId = req.params.id;

    // Verify this customer is mapped to this trainer
    const mapCheck = await client.query(
      `SELECT 1 FROM trainer_customer_mapping WHERE trainer_id = $1 AND customer_id = $2`,
      [trainerId, customerId]
    );
    if (mapCheck.rowCount === 0) {
      return res.status(403).json({ message: 'This customer is not assigned to you.' });
    }

    // Normalise: treat empty strings as null (pickers send "" when unset)
    const clean = (v) => (v === '' || v === undefined ? null : v);
    // Photo: new uploaded file wins; otherwise keep existing value (set later from DB row)
    const uploadedPhotoPath = req.files?.upload_photo?.[0]
      ? `/uploads/profiles/${req.files.upload_photo[0].filename}`
      : null;
    const weight = clean(req.body.weight);
    const height = clean(req.body.height);
    const daily_routine = clean(req.body.daily_routine);
    const medical_conditions = clean(req.body.medical_conditions);
    const fitness_goal = clean(req.body.fitness_goal);
    const smoking = clean(req.body.smoking);
    const alcohol_frequency = clean(req.body.alcohol_frequency);
    const dietary_preference = clean(req.body.dietary_preference);
    const special_focus = clean(req.body.special_focus);
    const program_enrolled = clean(req.body.program_enrolled);

    await client.query('BEGIN');

    // 1. Fetch existing customer row (full row — needed for history snapshot)
    const curRes = await client.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
    if (curRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Customer not found' });
    }
    const upload_photo = uploadedPhotoPath || curRes.rows[0].upload_photo;

    // 2. Resolve modifiedby (trainer.name, fallback to mobile)
    const trainerProfile = await getTrainerById(trainerId);
    const modifiedBy =
      trainerProfile?.name || trainerProfile?.mobile || `trainer:${trainerId}`;

    // 3. Snapshot old row into customers_history
    await client.query(
      `INSERT INTO customers_history (
        customer_id, user_id, start_date, created_at, name, mobile, address,
        total_sessions, upload_photo, weight, height, amount_paid,
        amount_paid_on, age, daily_routine, medical_conditions,
        fitness_goal, smoking, alcohol_frequency, dietary_preference,
        special_focus, program_enrolled, action, modifiedon, modifiedby
      )
      SELECT
        id, user_id, start_date, created_at, name, mobile, address,
        total_sessions, upload_photo, weight, height, amount_paid,
        amount_paid_on, age, daily_routine, medical_conditions,
        fitness_goal, smoking, alcohol_frequency, dietary_preference,
        special_focus, program_enrolled, 'UPDATE',
        NOW(), $2
      FROM customers
      WHERE id = $1`,
      [customerId, modifiedBy]
    );
    // 4. UPDATE customers — static column set, full-object write
    const updRes = await client.query(
      `UPDATE customers SET
         upload_photo        = $1,
         weight              = $2,
         height              = $3,
         daily_routine       = $4,
         medical_conditions  = $5,
         fitness_goal        = $6,
         smoking             = $7,
         alcohol_frequency   = $8,
         dietary_preference  = $9,
         special_focus       = $10,
         program_enrolled    = $11,
         modifiedon          = NOW(),
         modifiedby          = $12
       WHERE id = $13
       RETURNING *`,
      [
        upload_photo,
        weight !== null && weight !== '' ? parseFloat(weight) : null,
        height !== null && height !== '' ? parseFloat(height) : null,
        daily_routine,
        medical_conditions,
        fitness_goal,
        smoking,
        alcohol_frequency,
        dietary_preference,
        special_focus,
        program_enrolled,
        modifiedBy,
        customerId,
      ]
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

// PUT /api/trainers/me — trainer updates their own profile
const updateMyProfileController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const trainerProfile = await getTrainerByUserId(req.user.id);
    if (!trainerProfile) {
      return res.status(404).json({ message: 'Trainer profile not found' });
    }

    const clean = (v) => {
      if (v === undefined || v === null) return null;
      const t = String(v).trim();
      return t.length ? t : null;
    };

    const bio = clean(req.body.bio);
    const specialization = clean(req.body.specialization);
    const certifications = clean(req.body.certifications);
    const introduction_video_url = clean(req.body.introduction_video_url);
    const name = clean(req.body.name);
    const mobileno = clean(req.body.mobileno);
    // Photo: new uploaded file wins; otherwise keep the existing trainers.profile
    const profile = req.files?.profile?.[0]
      ? `/uploads/profiles/${req.files.profile[0].filename}`
      : trainerProfile.profile;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE trainers SET
           bio                    = $1,
           specialization         = $2,
           certifications         = $3,
           introduction_video_url = $4,
           name                   = $5,
           profile                = $6,
           mobileno               = $7
         WHERE id = $8
         RETURNING *`,
        [bio, specialization, certifications, introduction_video_url, name, profile, mobileno, trainerProfile.id]
      );

      // Keep users.mobile in sync with trainers.mobileno
      await client.query(
        `UPDATE users SET mobile = $1 WHERE id = $2`,
        [mobileno, req.user.id]
      );

      await client.query('COMMIT');
      return res.json({ trainer: result.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/trainers/me — returns the logged-in trainer's own profile
const getMyProfileController = async (req, res, next) => {
  try {
    const trainer = await getTrainerByUserId(req.user.id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer profile not found' });
    }
    return res.json({ trainer });
  } catch (err) {
    next(err);
  }
};

// GET /api/trainers/by-customer/:customerId
const getTrainerForCustomerController = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const trainer = await getTrainerForCustomer(customerId);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not mapped to this customer' });
    }
    return res.json({ trainer });
  } catch (err) {
    next(err);
  }
};

// GET /api/trainers/:id
const getTrainerByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trainer = await getTrainerById(id);
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    return res.json({ trainer });
  } catch (err) {
    next(err);
  }
};

// GET /api/trainers/my-customers — trainer sees their assigned customers
const getMyCustomersController = async (req, res, next) => {
  try {
    const trainerId = req.user.trainerId;
    if (!trainerId) {
      return res.status(400).json({ message: 'No trainerId in token. Are you logged in as a trainer?' });
    }
    const customers = await getCustomersForTrainer(trainerId);
    return res.json({ customers });
  } catch (err) {
    next(err);
  }
};

// POST /api/trainers/assign-customer
const assignCustomerToTrainer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { trainerId, customerId } = req.body;
    const { mapTrainerToCustomer } = require('../models/trainerCustomerMappingModel');
    const mapping = await mapTrainerToCustomer({ trainerId, customerId });
    return res.status(201).json({ mapping });
  } catch (err) {
    next(err);
  }
};

// POST /api/trainers/uploadVideo
const uploadIntroductionVideo = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { videoUrl } = req.body;

    // Find trainer profile for this user
    const trainerProfile = await getTrainerByUserId(req.user.id);
    if (!trainerProfile) {
      return res.status(404).json({ message: 'Trainer profile not found' });
    }

    const updated = await updateIntroductionVideoUrl({
      trainerId: trainerProfile.id,
      videoUrl,
    });

    return res.json({ trainer: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfileController,
  updateMyProfileController,
  getTrainerForCustomerController,
  getTrainerByIdController,
  getMyCustomersController,
  assignCustomerToTrainer,
  uploadIntroductionVideo,
  updateCustomerHealthController,
};
