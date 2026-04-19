const { query } = require('../config/db');

// Idempotent accept: if the user has already agreed to this (type, version),
// return the existing row instead of creating a duplicate. The UNIQUE
// constraint guarantees correctness even under concurrent inserts.
const recordAgreement = async ({ userId, type, version }) => {
  const result = await query(
    `INSERT INTO user_agreements (user_id, type, version, agreed)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (user_id, type, version)
       DO UPDATE SET agreed = TRUE
     RETURNING id, user_id, type, version, agreed, agreed_at`,
    [userId, type, version]
  );
  return result.rows[0];
};

const getUserAgreements = async ({ userId, type }) => {
  const result = await query(
    `SELECT id, user_id, type, version, agreed, agreed_at
     FROM user_agreements
     WHERE user_id = $1 AND type = $2
     ORDER BY version DESC`,
    [userId, type]
  );
  return result.rows;
};

module.exports = {
  recordAgreement,
  getUserAgreements,
};
