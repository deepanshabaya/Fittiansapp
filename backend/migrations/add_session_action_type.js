/**
 * Migration: adds action_type to customer_sessions and postpone_limit to customers.
 * Idempotent — safe to run multiple times.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: session action_type + postpone_limit...');

    await pool.query(`
      ALTER TABLE customer_sessions
      ADD COLUMN IF NOT EXISTS action_type VARCHAR(20) DEFAULT 'normal'
    `);
    console.log('  ✅ customer_sessions.action_type');

    // Backfill any existing rows that might have NULL
    await pool.query(`
      UPDATE customer_sessions
      SET action_type = 'normal'
      WHERE action_type IS NULL
    `);

    // Add CHECK constraint if missing
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'customer_sessions_action_type_check'
        ) THEN
          ALTER TABLE customer_sessions
          ADD CONSTRAINT customer_sessions_action_type_check
          CHECK (action_type IN ('normal','postponed','cancelled'));
        END IF;
      END$$;
    `);
    console.log('  ✅ customer_sessions.action_type CHECK');

    await pool.query(`
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS postpone_limit INTEGER DEFAULT 2
    `);
    console.log('  ✅ customers.postpone_limit');

    await pool.query(`
      UPDATE customers SET postpone_limit = 2 WHERE postpone_limit IS NULL
    `);

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
