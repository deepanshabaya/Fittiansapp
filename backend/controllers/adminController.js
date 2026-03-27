const { validationResult } = require('express-validator');
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

module.exports = {
  approveTrainerController,
  rejectTrainerController,
  getPendingTrainersController,
  mapTrainerController,
};
