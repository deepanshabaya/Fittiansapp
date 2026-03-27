const { query } = require('../config/db');

const createCustomer = async ({ userId, startDate = null }) => {
  const result = await query(
    `INSERT INTO customers (user_id, start_date)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, startDate]
  );
  return result.rows[0];
};

const getCustomerByUserId = async (userId) => {
  const result = await query(
    'SELECT * FROM customers WHERE user_id = $1',
    [userId]
  );
  return result.rows[0];
};

const getCustomerById = async (id) => {
  const result = await query(
    'SELECT * FROM customers WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  createCustomer,
  getCustomerByUserId,
  getCustomerById,
};

