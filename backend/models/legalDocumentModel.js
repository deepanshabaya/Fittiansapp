const { query } = require('../config/db');

// Returns the latest (highest-version) document for a given type, or null.
const getLatestByType = async (type) => {
  const result = await query(
    `SELECT id, type, version, content, created_at, updated_at
     FROM legal_documents
     WHERE type = $1
     ORDER BY version DESC
     LIMIT 1`,
    [type]
  );
  return result.rows[0] || null;
};

// Returns a specific (type, version) or null. Used to validate that a
// version referenced by a user_agreement actually exists.
const getByTypeAndVersion = async (type, version) => {
  const result = await query(
    `SELECT id, type, version, content, created_at, updated_at
     FROM legal_documents
     WHERE type = $1 AND version = $2`,
    [type, version]
  );
  return result.rows[0] || null;
};

module.exports = {
  getLatestByType,
  getByTypeAndVersion,
};
