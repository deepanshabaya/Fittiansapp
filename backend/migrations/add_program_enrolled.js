/**
 * Migration: Add program_enrolled column to customers table.
 *
 * Safe to run multiple times (IF NOT EXISTS).
 */
const { pool } = require('../config/db');

const VALID_PROGRAMS = [
  'my_home_coach',
  'my_home_coach_couple',
  'fit_mentor_program',
  'disease_reversal_program',
];

const migrate = async () => {
  try {
    console.log('Starting migration: add program_enrolled to customers...');

    await pool.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS program_enrolled VARCHAR(50)
          CHECK (program_enrolled IN (
            'my_home_coach',
            'my_home_coach_couple',
            'fit_mentor_program',
            'disease_reversal_program'
          ));
    `);

    console.log('✅ program_enrolled column added to customers table.');
    console.log('   Allowed values:', VALID_PROGRAMS.join(', '));
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
