const { query } = require('../config/db');

const createUser = async ({ email, password, role }) => {
  const result = await query(
    `INSERT INTO users (email, password, role)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, role`,
    [email, password, role]
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

const findUserByMobile = async (mobile) => {
  const result = await query(
    'SELECT * FROM users WHERE mobile = $1',
    [mobile]
  );
  return result.rows[0];
};

const findUserById = async (id) => {
  const result = await query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserByMobile,
  findUserById,
};
