const { query } = require('../config/db');

const markAttendanceIn = async ({ sessionId, trainerId, markInTime }) => {
  const result = await query(
    `INSERT INTO attendance (session_id, trainer_id, mark_in_time)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id)
     DO UPDATE SET mark_in_time = EXCLUDED.mark_in_time
     RETURNING *`,
    [sessionId, trainerId, markInTime]
  );
  return result.rows[0];
};

const markAttendanceOut = async ({ sessionId, trainerId, markOutTime }) => {
  const result = await query(
    `UPDATE attendance
     SET mark_out_time = $3
     WHERE session_id = $1 AND trainer_id = $2
     RETURNING *`,
    [sessionId, trainerId, markOutTime]
  );
  return result.rows[0];
};

const getAttendanceBySession = async (sessionId) => {
  const result = await query(
    'SELECT * FROM attendance WHERE session_id = $1',
    [sessionId]
  );
  return result.rows[0];
};

const getAttendanceByCustomer = async (customerId) => {
  const result = await query(
    `SELECT a.*, s.customer_id, s.trainer_id, s.program_id, s.session_date, s.start_time, s.end_time
     FROM attendance a
     JOIN sessions s ON s.id = a.session_id
     WHERE s.customer_id = $1
     ORDER BY s.session_date DESC, s.start_time DESC`,
    [customerId]
  );
  return result.rows;
};

module.exports = {
  markAttendanceIn,
  markAttendanceOut,
  getAttendanceBySession,
  getAttendanceByCustomer,
};

