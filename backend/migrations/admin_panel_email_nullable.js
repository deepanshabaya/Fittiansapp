/**
 * Migration: Make users.email nullable.
 *
 * Admin creates users with name + role first. The user sets their own email
 * when they open the app for the first time. The UNIQUE constraint remains
 * so no two users can share the same email once set.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: make users.email nullable...');

    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN email DROP NOT NULL;
    `);

    console.log('✅ users.email is now nullable (UNIQUE constraint retained).');
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
