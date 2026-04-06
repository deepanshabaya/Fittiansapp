/**
 * Migration: Add health & lifestyle fields to customers table.
 *
 * Uses ADD COLUMN IF NOT EXISTS — safe to run multiple times.
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: add health & lifestyle fields to customers...');

    await pool.query(`
      ALTER TABLE customers
        ADD COLUMN IF NOT EXISTS age INTEGER,
        ADD COLUMN IF NOT EXISTS daily_routine VARCHAR(10)
          CHECK (daily_routine IN ('active', 'sitting', 'mixed')),
        ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
        ADD COLUMN IF NOT EXISTS fitness_goal VARCHAR(30)
          CHECK (fitness_goal IN ('weight_loss', 'muscle_gain', 'overall_fitness', 'strength_building')),
        ADD COLUMN IF NOT EXISTS smoking VARCHAR(5)
          CHECK (smoking IN ('no', 'yes')),
        ADD COLUMN IF NOT EXISTS alcohol_frequency VARCHAR(10)
          CHECK (alcohol_frequency IN ('none', 'occasional', 'weekly', 'daily')),
        ADD COLUMN IF NOT EXISTS dietary_preference VARCHAR(20)
          CHECK (dietary_preference IN ('vegetarian', 'non_vegetarian', 'vegan', 'lacto_ovo', 'ovo', 'pescatarian')),
        ADD COLUMN IF NOT EXISTS special_focus TEXT;
    `);

    console.log('✅ Health & lifestyle columns added to customers table.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
