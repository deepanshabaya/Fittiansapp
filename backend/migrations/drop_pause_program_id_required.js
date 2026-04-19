/**
 * Migration: pause_requests.program_id no longer required.
 *
 * Pauses are now customer-level (program_enrolled lives on customers as text).
 * Existing rows are preserved; future rows can be inserted with NULL program_id.
 *
 * Safe to run multiple times.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: make pause_requests.program_id nullable...');

    await pool.query(`
      ALTER TABLE pause_requests
        ALTER COLUMN program_id DROP NOT NULL;
    `);

    console.log('✅ pause_requests.program_id is now nullable.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
