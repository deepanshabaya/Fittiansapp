/**
 * Migration: ensure customers_history audit table exists.
 * Safe to run multiple times.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: customers_history...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers_history (
        history_id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        name VARCHAR(100),
        email VARCHAR(100),
        mobile VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        gender VARCHAR(20),
        upload_photo TEXT,
        total_sessions INTEGER,
        session_validity_days INTEGER,
        trial_sessions INTEGER,
        free_sessions INTEGER,
        age INTEGER,
        daily_routine VARCHAR(50),
        medical_conditions TEXT,
        fitness_goal VARCHAR(50),
        smoking VARCHAR(20),
        alcohol_frequency VARCHAR(50),
        dietary_preference VARCHAR(50),
        special_focus TEXT,
        program_enrolled VARCHAR(50),
        action VARCHAR(20),
        modifiedby VARCHAR(100),
        modifiedon TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS modifiedon TIMESTAMP,
        ADD COLUMN IF NOT EXISTS modifiedby VARCHAR(100);
    `);

    console.log('✅ customers_history + modifiedon/modifiedby ready.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
