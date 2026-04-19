const { query } = require('../config/db');

const createPauseRequest = async ({
  customerId,
  pauseUntilDate,
  reason,
}) => {
  const result = await query(
    `INSERT INTO pause_requests
      (customer_id, pause_until_date, reason, status)
     VALUES ($1,$2,$3,'Pending')
     RETURNING *`,
    [customerId, pauseUntilDate, reason]
  );
  return result.rows[0];
};

const getTrainerPauseRequests = async (trainerId) => {
  const result = await query(
    `SELECT pr.*,
            u.name AS customer_name,
            c.program_enrolled AS program_name
     FROM pause_requests pr
     JOIN customers c ON c.id = pr.customer_id
     JOIN users u ON u.id = c.user_id
     JOIN trainer_customer_mapping m ON m.customer_id = c.id
     WHERE m.trainer_id = $1 AND pr.status = 'Pending'`,
    [trainerId]
  );
  return result.rows;
};

const updatePauseRequestStatus = async ({ requestId, status }) => {
  const result = await query(
    `UPDATE pause_requests
     SET status = $2, reviewed_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [requestId, status]
  );
  return result.rows[0];
};

module.exports = {
  createPauseRequest,
  getTrainerPauseRequests,
  updatePauseRequestStatus,
};
