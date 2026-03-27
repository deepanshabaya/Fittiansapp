const { query } = require('../config/db');

const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Postponed', 'Missed'];

const createSession = async ({
  trainerId,
  customerId,
  programId,
  sessionDate,
  startTime,
  endTime,
}) => {
  const result = await query(
    `INSERT INTO sessions
      (trainer_id, customer_id, program_id, session_date, start_time, end_time, status)
     VALUES ($1,$2,$3,$4,$5,$6,'Scheduled')
     RETURNING *`,
    [trainerId, customerId, programId, sessionDate, startTime, endTime]
  );
  return result.rows[0];
};

const getSessionById = async (sessionId) => {
  const result = await query(
    'SELECT * FROM sessions WHERE id = $1',
    [sessionId]
  );
  return result.rows[0];
};

const getSessionsByCustomer = async (customerId) => {
  const result = await query(
    `SELECT s.*, p.name as program_name
     FROM sessions s
     JOIN programs p ON p.id = s.program_id
     WHERE s.customer_id = $1
     ORDER BY s.session_date DESC, s.start_time DESC`,
    [customerId]
  );
  return result.rows;
};

const getSessionsByTrainer = async (trainerId) => {
  const result = await query(
    `SELECT s.*, p.name as program_name, u.name as customer_name
     FROM sessions s
     JOIN programs p ON p.id = s.program_id
     JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = c.user_id
     WHERE s.trainer_id = $1
     ORDER BY s.session_date DESC, s.start_time DESC`,
    [trainerId]
  );
  return result.rows;
};

const postponeSession = async ({ sessionId, newDate, newStartTime, newEndTime }) => {
  const result = await query(
    `UPDATE sessions
     SET session_date = $2,
         start_time = $3,
         end_time = $4,
         status = 'Postponed'
     WHERE id = $1
     RETURNING *`,
    [sessionId, newDate, newStartTime, newEndTime]
  );
  return result.rows[0];
};

const cancelSession = async ({ sessionId }) => {
  const result = await query(
    `UPDATE sessions
     SET status = 'Cancelled'
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  return result.rows[0];
};

const updateSessionStatus = async ({ sessionId, status }) => {
  if (!SESSION_STATUSES.includes(status)) {
    throw new Error('Invalid session status');
  }
  const result = await query(
    `UPDATE sessions
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [sessionId, status]
  );
  return result.rows[0];
};

module.exports = {
  SESSION_STATUSES,
  createSession,
  getSessionById,
  getSessionsByCustomer,
  getSessionsByTrainer,
  postponeSession,
  cancelSession,
  updateSessionStatus,
};
