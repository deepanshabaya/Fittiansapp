const { validationResult } = require('express-validator');
const { getTrainerForCustomer, getCustomersForTrainer } = require('../models/trainerCustomerMappingModel');
const { getTrainerByUserId, getTrainerById, updateIntroductionVideoUrl } = require('../models/trainerModel');

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
  getTrainerForCustomerController,
  getTrainerByIdController,
  getMyCustomersController,
  assignCustomerToTrainer,
  uploadIntroductionVideo,
};
