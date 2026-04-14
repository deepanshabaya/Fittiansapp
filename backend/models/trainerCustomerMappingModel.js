const { query } = require('../config/db');

const mapTrainerToCustomer = async ({ trainerId, customerId }) => {
  const result = await query(
    `INSERT INTO trainer_customer_mapping (trainer_id, customer_id)
     VALUES ($1, $2)
     ON CONFLICT (customer_id)
     DO UPDATE SET trainer_id = EXCLUDED.trainer_id
     RETURNING *`,
    [trainerId, customerId]
  );
  return result.rows[0];
};

const getTrainerForCustomer = async (customerId) => {
  const result = await query(
    `SELECT t.*
     FROM trainer_customer_mapping m
     JOIN trainers t ON t.id = m.trainer_id
     WHERE m.customer_id = $1`,
    [customerId]
  );
  return result.rows[0];
};

const getCustomersForTrainer = async (trainerId) => {
  const result = await query(
    `SELECT c.*,
       COALESCE(cs.completed_count, 0) AS completed_sessions
     FROM trainer_customer_mapping m
     JOIN customers c ON c.id = m.customer_id
     LEFT JOIN (
       SELECT customer_id, COUNT(*) AS completed_count
       FROM customer_sessions
       WHERE status = 'completed'
       GROUP BY customer_id
     ) cs ON cs.customer_id = c.id
     WHERE m.trainer_id = $1`,
    [trainerId]
  );
  return result.rows;
};

module.exports = {
  mapTrainerToCustomer,
  getTrainerForCustomer,
  getCustomersForTrainer,
};
