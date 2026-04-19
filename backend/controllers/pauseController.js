const { validationResult } = require('express-validator');
const {
  createPauseRequest,
  getTrainerPauseRequests,
  updatePauseRequestStatus,
} = require('../models/pauseRequestModel');

// POST /api/pause/request (customer)
const requestPause = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { pauseUntilDate, reason } = req.body;
    const customerId = req.user.customerId || req.body.customerId;

    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    const request = await createPauseRequest({
      customerId,
      pauseUntilDate,
      reason,
    });

    return res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
};

// GET /api/pause/trainerRequests (trainer)
const getTrainerRequests = async (req, res, next) => {
  try {
    const trainerId = req.user.trainerId || req.user.id;
    const requests = await getTrainerPauseRequests(trainerId);
    return res.json({ requests });
  } catch (err) {
    next(err);
  }
};

// POST /api/pause/approve (trainer)
const approvePauseRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestId, status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await updatePauseRequestStatus({ requestId, status });
    if (!updated) {
      return res.status(404).json({ message: 'Pause request not found' });
    }

    return res.json({ request: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestPause,
  getTrainerRequests,
  approvePauseRequest,
};

