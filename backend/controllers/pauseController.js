const { validationResult } = require('express-validator');
const {
  createPauseRequest,
  getTrainerPauseRequests,
  updatePauseRequestStatus,
} = require('../models/pauseRequestModel');
const { query } = require('../config/db');
const { bus, EVENTS, ACTION_TYPES } = require('../events/appEvents');

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

    // One-action-per-session rule: reject if any session in [today, pauseUntilDate]
    // already has a postpone/cancel action, OR if a pause request already covers
    // any part of this range.
    const conflict = await query(
      `SELECT 'session' AS source, action_type
         FROM customer_sessions
        WHERE customer_id = $1
          AND session_date BETWEEN CURRENT_DATE AND $2::date
          AND action_type IN ('postponed','cancelled')
       UNION ALL
       SELECT 'pause' AS source, status AS action_type
         FROM pause_requests
        WHERE customer_id = $1
          AND status IN ('Pending','Approved')
          AND pause_until_date >= CURRENT_DATE
       LIMIT 1`,
      [customerId, pauseUntilDate]
    );
    if (conflict.rowCount > 0) {
      const c = conflict.rows[0];
      const label = c.source === 'pause' ? 'pause' : c.action_type;
      return res.status(409).json({
        message: `Action already taken for this session (${label}). Only one action per session is allowed.`,
      });
    }

    const request = await createPauseRequest({
      customerId,
      pauseUntilDate,
      reason,
    });

    // Resolve trainer for this customer so the listener can address the
    // notification. Best-effort lookup; absence is logged inside the service.
    let trainerId = null;
    try {
      const t = await query(
        `SELECT trainer_id FROM trainer_customer_mapping WHERE customer_id = $1`,
        [customerId]
      );
      trainerId = t.rows[0]?.trainer_id || null;
    } catch (_) { /* swallow — notification path must not fail the request */ }

    if (trainerId) {
      bus.emit(EVENTS.SESSION_ACTION, {
        sessionId: request.id,
        customerId,
        trainerId,
        actionType: ACTION_TYPES.PAUSE,
        pauseUntilDate,
        timestamp: new Date().toISOString(),
      });
    }

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

