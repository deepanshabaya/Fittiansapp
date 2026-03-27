const { validationResult } = require('express-validator');
const {
  createSession,
  getSessionById,
  getSessionsByCustomer,
  getSessionsByTrainer,
  cancelSession,
  postponeSession,
} = require('../models/sessionModel');
const { query } = require('../config/db');

// ---------- helpers ----------

/**
 * 10 PM cutoff rule:
 * A customer cannot cancel or postpone a session if the session is tomorrow
 * (or earlier) and the current time is past 10:00 PM.
 */
const isWithinCutoff = (sessionDate) => {
  const now = new Date();
  const session = new Date(sessionDate);
  // Zero-out session time to compare dates
  session.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // If session is tomorrow or earlier, check the clock
  if (session <= tomorrow) {
    const currentHour = now.getHours();
    if (currentHour >= 22) {
      // 22 = 10 PM
      return false; // NOT allowed
    }
  }
  return true; // allowed
};

/**
 * Ownership check: the session must belong to the requesting customer.
 * Returns { ok, session, error }.
 */
const verifyOwnership = async (sessionId, userId, role) => {
  const session = await getSessionById(sessionId);
  if (!session) {
    return { ok: false, error: 'Session not found', status: 404 };
  }
  // Admin can operate on any session
  if (role === 'admin') {
    return { ok: true, session };
  }
  // For customers: verify via the customers table (customer_id on the session)
  const custResult = await query(
    'SELECT id FROM customers WHERE user_id = $1',
    [userId]
  );
  const customer = custResult.rows[0];
  if (!customer || customer.id !== session.customer_id) {
    return { ok: false, error: 'You do not own this session', status: 403 };
  }
  return { ok: true, session };
};

// ---------- controllers ----------

// POST /api/sessions  — trainer or admin creates a session
const createSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerId, programId, sessionDate, startTime, endTime } = req.body;

    // Resolve trainerId from token (trainers) or body (admin)
    let trainerId = req.user.trainerId;
    if (req.user.role === 'admin') {
      trainerId = req.body.trainerId;
      if (!trainerId) {
        return res.status(400).json({ message: 'trainerId is required for admin' });
      }
    }
    if (!trainerId) {
      return res.status(400).json({ message: 'No trainerId available' });
    }

    const session = await createSession({
      trainerId,
      customerId,
      programId,
      sessionDate,
      startTime,
      endTime,
    });

    return res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/customer/:customerId
const getSessionHistory = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const sessions = await getSessionsByCustomer(customerId);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/trainer/:trainerId
const getTrainerSessions = async (req, res, next) => {
  try {
    const { trainerId } = req.params;
    const sessions = await getSessionsByTrainer(trainerId);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/cancel
const cancelSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId } = req.body;

    // Ownership check
    const ownership = await verifyOwnership(sessionId, req.user.id, req.user.role);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.error });
    }

    // 10 PM cutoff
    if (!isWithinCutoff(ownership.session.session_date)) {
      return res.status(400).json({
        message: 'Cannot cancel session after 10 PM for tomorrow\'s sessions',
      });
    }

    const session = await cancelSession({ sessionId });
    return res.json({ session });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/postpone
const postponeSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, newDate, newStartTime, newEndTime } = req.body;

    // Ownership check
    const ownership = await verifyOwnership(sessionId, req.user.id, req.user.role);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ message: ownership.error });
    }

    // 10 PM cutoff
    if (!isWithinCutoff(ownership.session.session_date)) {
      return res.status(400).json({
        message: 'Cannot postpone session after 10 PM for tomorrow\'s sessions',
      });
    }

    // Postpone limit check — look up customer_programs for this customer + program
    const cpResult = await query(
      `SELECT postpone_limit, postponed_used
       FROM customer_programs
       WHERE customer_id = $1 AND program_id = $2`,
      [ownership.session.customer_id, ownership.session.program_id]
    );
    const cp = cpResult.rows[0];
    if (cp && cp.postponed_used >= cp.postpone_limit) {
      return res.status(400).json({
        message: `Postpone limit reached (${cp.postpone_limit}). Cannot postpone further.`,
      });
    }

    const session = await postponeSession({
      sessionId,
      newDate,
      newStartTime,
      newEndTime,
    });

    // Increment postponed_used
    if (cp) {
      await query(
        `UPDATE customer_programs
         SET postponed_used = postponed_used + 1
         WHERE customer_id = $1 AND program_id = $2`,
        [ownership.session.customer_id, ownership.session.program_id]
      );
    }

    return res.json({ session });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSessionController,
  getSessionHistory,
  getTrainerSessions,
  cancelSessionController,
  postponeSessionController,
};
