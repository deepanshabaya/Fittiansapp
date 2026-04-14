/**
 * Migration: customer_sessions, customer_progress, customer_progress_history.
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 */
const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting migration: sessions + progress tables...');

    // 1. customer_sessions — daily session attendance
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_sessions (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        trainer_id  INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
        session_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) NOT NULL CHECK (status IN ('completed','missed')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(customer_id, session_date)
      );
    `);
    console.log('  ✅ customer_sessions');

    // 2. customer_progress — latest progress snapshot per customer
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_progress (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        trainer_id  INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
        log_date DATE NOT NULL DEFAULT CURRENT_DATE,

        -- Body
        weight NUMERIC,
        neck NUMERIC,
        chest NUMERIC,
        upper_waist NUMERIC,
        lower_waist NUMERIC,
        hips NUMERIC,
        arms NUMERIC,
        thighs NUMERIC,

        -- Strength
        pushups INTEGER,
        plank_seconds INTEGER,
        squats INTEGER,
        lunges INTEGER,
        deadlift NUMERIC,
        latpulldown NUMERIC,
        chest_press NUMERIC,
        shoulder_press NUMERIC,

        -- Endurance
        cycling_time INTEGER,
        cycling_distance NUMERIC,
        jumping_jacks INTEGER,
        burpees INTEGER,
        high_knees INTEGER,
        mountain_climbers INTEGER,
        skipping INTEGER,

        -- Flexibility
        sit_and_reach NUMERIC,
        deep_squat_hold INTEGER,
        hip_flexor_hold INTEGER,
        shoulder_mobility VARCHAR(20),
        bridge_hold INTEGER,

        -- Diet
        diet_compliance VARCHAR(20),
        meals_per_day INTEGER,
        protein_intake NUMERIC,
        water_intake NUMERIC,
        junk_food_per_week INTEGER,

        -- Lifestyle
        steps_per_day INTEGER,
        steps_source VARCHAR(10) DEFAULT 'manual',
        sleep_hours NUMERIC,

        -- Feedback
        trainer_note TEXT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(customer_id, log_date)
      );
    `);
    console.log('  ✅ customer_progress');

    // 3. customer_progress_history — audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_progress_history (
        history_id SERIAL PRIMARY KEY,
        progress_id INTEGER,
        customer_id INTEGER NOT NULL,
        trainer_id INTEGER,
        log_date DATE,

        weight NUMERIC, neck NUMERIC, chest NUMERIC,
        upper_waist NUMERIC, lower_waist NUMERIC, hips NUMERIC,
        arms NUMERIC, thighs NUMERIC,

        pushups INTEGER, plank_seconds INTEGER, squats INTEGER,
        lunges INTEGER, deadlift NUMERIC, latpulldown NUMERIC,
        chest_press NUMERIC, shoulder_press NUMERIC,

        cycling_time INTEGER, cycling_distance NUMERIC,
        jumping_jacks INTEGER, burpees INTEGER, high_knees INTEGER,
        mountain_climbers INTEGER, skipping INTEGER,

        sit_and_reach NUMERIC, deep_squat_hold INTEGER,
        hip_flexor_hold INTEGER, shoulder_mobility VARCHAR(20),
        bridge_hold INTEGER,

        diet_compliance VARCHAR(20), meals_per_day INTEGER,
        protein_intake NUMERIC, water_intake NUMERIC,
        junk_food_per_week INTEGER,

        steps_per_day INTEGER, steps_source VARCHAR(10),
        sleep_hours NUMERIC,

        trainer_note TEXT,

        modifiedon TIMESTAMP DEFAULT NOW(),
        modifiedby VARCHAR(100)
      );
    `);
    console.log('  ✅ customer_progress_history');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
};

migrate();
