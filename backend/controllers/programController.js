const { validationResult } = require('express-validator');
const { createProgram, getPrograms } = require('../models/programModel');

// GET /api/programs
const listPrograms = async (req, res, next) => {
  try {
    const programs = await getPrograms();
    return res.json({ programs });
  } catch (err) {
    next(err);
  }
};

// POST /api/programs
const createProgramController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, totalSessions } = req.body;
    const program = await createProgram({ name, description, totalSessions });
    return res.status(201).json({ program });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPrograms,
  createProgramController,
};

