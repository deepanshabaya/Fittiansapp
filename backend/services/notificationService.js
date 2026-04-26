// Notification service — listens to AppEventBus, validates, formats messages,
// persists via the repository. Producers (session controllers) only emit; this
// service is the only place that knows how to translate an action into a
// stored notification. Loose coupling: if you delete this file, session
// flows still work.
const { query } = require('../config/db');
const { bus, EVENTS, ACTION_TYPES } = require('../events/appEvents');
const notificationRepo = require('../repositories/notificationRepository');

// Resolve trainerId (trainers.id) → users.id for recipient addressing.
const resolveTrainerUserId = async (trainerId) => {
  const r = await query(
    `SELECT user_id FROM trainers WHERE id = $1`,
    [trainerId]
  );
  return r.rows[0]?.user_id || null;
};

// Resolve customerId (customers.id) → users.id + name for actor + message.
const resolveCustomerInfo = async (customerId) => {
  const r = await query(
    `SELECT c.user_id, COALESCE(c.name, u.name) AS name
       FROM customers c JOIN users u ON u.id = c.user_id
      WHERE c.id = $1`,
    [customerId]
  );
  return r.rows[0] || null;
};

const ACTION_CONFIG = {
  [ACTION_TYPES.PAUSE]: {
    type: 'session_paused',
    verb: 'paused',
    referenceTable: 'pause_requests',
  },
  [ACTION_TYPES.POSTPONE]: {
    type: 'session_postponed',
    verb: 'postponed',
    referenceTable: 'customer_sessions',
  },
  [ACTION_TYPES.CANCEL]: {
    type: 'session_cancelled',
    verb: 'cancelled',
    referenceTable: 'customer_sessions',
  },
};

const buildMessage = ({ customerName, verb, sessionDate, pauseUntilDate }) => {
  const who = customerName || 'A customer';
  if (verb === 'paused' && pauseUntilDate) {
    return `${who} has paused sessions until ${pauseUntilDate}.`;
  }
  if (sessionDate) {
    return `${who} has ${verb} the session scheduled on ${sessionDate}.`;
  }
  return `${who} has ${verb} a session.`;
};

// Core handler — kept exported so it can be unit tested or invoked manually.
const handleSessionAction = async (payload) => {
  try {
    if (!payload || typeof payload !== 'object') return;

    const {
      sessionId = null,
      customerId,
      trainerId,
      actionType,
      sessionDate = null,
      pauseUntilDate = null,
      timestamp,
    } = payload;

    const cfg = ACTION_CONFIG[actionType];
    if (!cfg) {
      console.warn('[notificationService] Unknown actionType:', actionType);
      return;
    }
    if (!trainerId || !customerId) {
      console.warn('[notificationService] Missing trainerId/customerId; skipping.');
      return;
    }

    const trainerUserId = await resolveTrainerUserId(trainerId);
    if (!trainerUserId) {
      console.warn(`[notificationService] No user for trainerId=${trainerId}; skipping.`);
      return;
    }

    const customer = await resolveCustomerInfo(customerId);
    const message = buildMessage({
      customerName: customer?.name,
      verb: cfg.verb,
      sessionDate,
      pauseUntilDate,
    });

    await notificationRepo.insertNotification({
      recipientUserId: trainerUserId,
      recipientRole: 'trainer',
      actorUserId: customer?.user_id || null,
      type: cfg.type,
      message,
      referenceTable: cfg.referenceTable,
      referenceId: sessionId,
      metadata: { actionType, sessionDate, pauseUntilDate, timestamp },
    });
  } catch (err) {
    // Never let a notification failure surface as an API error to the caller.
    console.error('[notificationService] handleSessionAction failed:', err);
  }
};

// Subscribe once at boot. Idempotent — safe to call repeatedly.
let registered = false;
const register = () => {
  if (registered) return;
  bus.on(EVENTS.SESSION_ACTION, handleSessionAction);
  registered = true;
  console.log('[notificationService] subscribed to', EVENTS.SESSION_ACTION);
};

module.exports = {
  register,
  handleSessionAction,
};
