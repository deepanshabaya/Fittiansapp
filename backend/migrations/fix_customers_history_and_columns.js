/**
 * Migration: Fix customers_history table + widen customers varchar columns.
 * Safe to run multiple times.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting fix migration...');

    // 1. Add missing columns to customers_history
    //    (the INSERT SELECT copies all customer columns, so history needs them too)
    await pool.query(`
      ALTER TABLE customers_history
        ADD COLUMN IF NOT EXISTS user_id INTEGER,
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS weight NUMERIC,
        ADD COLUMN IF NOT EXISTS height NUMERIC,
        ADD COLUMN IF NOT EXISTS amount_paid NUMERIC,
        ADD COLUMN IF NOT EXISTS amount_paid_on TIMESTAMP;
    `);
    console.log('  ✅ customers_history: added missing columns');

    // 2. Widen customers varchar columns to fit enum values
    //    daily_routine: 'moderately_active' = 17 chars (was VARCHAR(10))
    //    smoking: 'occasional' = 10 chars (was VARCHAR(5))
    //    alcohol_frequency: 'occasionally' = 12 chars (was VARCHAR(10))
    await pool.query(`
      ALTER TABLE customers
        ALTER COLUMN daily_routine TYPE VARCHAR(50),
        ALTER COLUMN smoking TYPE VARCHAR(20),
        ALTER COLUMN alcohol_frequency TYPE VARCHAR(50);
    `);
    console.log('  ✅ customers: widened daily_routine, smoking, alcohol_frequency');

    // 3. Widen customers_history columns to match
    await pool.query(`
      ALTER TABLE customers_history
        ALTER COLUMN daily_routine TYPE VARCHAR(50),
        ALTER COLUMN smoking TYPE VARCHAR(20),
        ALTER COLUMN alcohol_frequency TYPE VARCHAR(50);
    `);
    console.log('  ✅ customers_history: widened matching columns');

    console.log('Fix migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
