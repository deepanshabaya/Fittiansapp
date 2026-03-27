const { query } = require('../config/db');

const createProgram = async ({ name, description, totalSessions }) => {
  const result = await query(
    `INSERT INTO programs (name, description, total_sessions)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, description, totalSessions]
  );
  return result.rows[0];
};

const getPrograms = async () => {
  const result = await query('SELECT * FROM programs ORDER BY name ASC');
  return result.rows;
};

module.exports = {
  createProgram,
  getPrograms,
};

