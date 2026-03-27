const { validationResult } = require('express-validator');
const {
  markAttendanceIn,
  markAttendanceOut,
  getAttendanceByCustomer,
} = require('../models/attendanceModel');

// GET /api/attendance/:customerId
const getAttendanceForCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const records = await getAttendanceByCustomer(customerId);
    return res.json({ attendance: records });
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/mark
// body: { sessionId, markType: 'in' | 'out', timestamp }
const markAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, markType, timestamp } = req.body;

    // Use trainerId from JWT payload (set during login for trainer role)
    const trainerId = req.user.trainerId;
    if (!trainerId) {
      return res.status(400).json({ message: 'No trainerId in token. Are you logged in as a trainer?' });
    }

    let record;

    if (markType === 'in') {
      record = await markAttendanceIn({
        sessionId,
        trainerId,
        markInTime: timestamp || new Date(),
      });
    } else {
      record = await markAttendanceOut({
        sessionId,
        trainerId,
        markOutTime: timestamp || new Date(),
      });
    }

    return res.status(201).json({ attendance: record });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAttendanceForCustomer,
  markAttendance,
};
