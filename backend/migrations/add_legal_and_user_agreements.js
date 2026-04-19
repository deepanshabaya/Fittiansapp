/**
 * Migration: legal documents + user agreements.
 *
 * Creates:
 *   - legal_documents: versioned legal text (terms, privacy, etc.)
 *   - user_agreements: per-user acceptance records, tied to (type, version)
 *
 * Idempotent. Seeds an initial v1 "terms" row if none exists so the
 * GET /api/legal/terms endpoint returns something out of the box.
 */
const { pool } = require('../config/db');

const INITIAL_TERMS = `Welcome to Fittians.

By using this application you agree to the following terms:

1. You are responsible for the accuracy of the personal and health
   information you provide.
2. Fittians is a facilitation platform; training advice comes from
   your assigned trainer and is not medical advice.
3. Your data is processed per our privacy policy.
4. You may request account deletion at any time.

These terms may be updated. Continued use after an update constitutes
acceptance of the revised terms.`;

const migrate = async () => {
  try {
    console.log('Starting migration: legal_documents + user_agreements...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id         SERIAL PRIMARY KEY,
        type       VARCHAR(32) NOT NULL,
        version    INTEGER NOT NULL CHECK (version >= 1),
        content    TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (type, version)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS legal_documents_type_version_idx
        ON legal_documents (type, version DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_agreements (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type       VARCHAR(32) NOT NULL,
        version    INTEGER NOT NULL CHECK (version >= 1),
        agreed     BOOLEAN NOT NULL DEFAULT TRUE,
        agreed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, type, version),
        FOREIGN KEY (type, version)
          REFERENCES legal_documents (type, version)
          ON DELETE RESTRICT
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS user_agreements_user_type_idx
        ON user_agreements (user_id, type);
    `);

    // Seed initial terms if none exist (idempotent).
    const seedCheck = await pool.query(
      `SELECT 1 FROM legal_documents WHERE type = 'terms' LIMIT 1`
    );
    if (seedCheck.rowCount === 0) {
      await pool.query(
        `INSERT INTO legal_documents (type, version, content) VALUES ('terms', 1, $1)`,
        [INITIAL_TERMS]
      );
      console.log('   Seeded initial terms v1.');
    } else {
      console.log('   Existing terms found; skipped seed.');
    }

    console.log('✅ legal_documents + user_agreements ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    pool.end();
  }
};

migrate();
