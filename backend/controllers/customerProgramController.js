const { validationResult } = require('express-validator');
const {
  enrollCustomerInProgram,
  getCustomerProgramSummary,
} = require('../models/customerProgramModel');

// POST /api/customer-programs — admin enrolls customer
const enrollCustomerController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, programId, totalSessions, postponeLimit } = req.body;
    const enrollment = await enrollCustomerInProgram({
      customerId,
      programId,
      totalSessions,
      postponedLimit: postponeLimit || 2,
    });

    return res.status(201).json({ enrollment });
  } catch (err) {
    next(err);
  }
};

// GET /api/customer-programs/:customerId
const getCustomerProgramSummaryController = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const programs = await getCustomerProgramSummary(customerId);
    return res.json({ programs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  enrollCustomerController,
  getCustomerProgramSummaryController,
};
