const { query } = require('../config/db');

const enrollCustomerInProgram = async ({
  customerId,
  programId,
  totalSessions,
  postponedLimit = 2,
}) => {
  const result = await query(
    `INSERT INTO customer_programs
      (customer_id, program_id, total_sessions, remaining_sessions, postpone_limit, postponed_used)
     VALUES ($1, $2, $3, $3, $4, 0)
     RETURNING *`,
    [customerId, programId, totalSessions, postponedLimit]
  );
  return result.rows[0];
};

const getCustomerProgramSummary = async (customerId) => {
  const result = await query(
    `SELECT cp.*, p.name, p.description
     FROM customer_programs cp
     JOIN programs p ON p.id = cp.program_id
     WHERE cp.customer_id = $1`,
    [customerId]
  );
  return result.rows;
};

module.exports = {
  enrollCustomerInProgram,
  getCustomerProgramSummary,
};

