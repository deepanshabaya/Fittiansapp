const { pool } = require('../config/db');

async function setupAndSeed() {
  console.log('--- Starting Database Setup and Seeding ---');
  try {
    console.log('Dropping existing tables for a clean setup...');
    await pool.query(`
      DROP TABLE IF EXISTS pause_requests CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS trainer_customer_mapping CASCADE;
      DROP TABLE IF EXISTS customer_programs CASCADE;
      DROP TABLE IF EXISTS programs CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS trainers CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // 1. Create Tables
    console.log('Creating tables...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        password VARCHAR(255),
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'trainer', 'customer')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE trainers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        experience INTEGER DEFAULT 0,
        specialization VARCHAR(255),
        is_approved BOOLEAN DEFAULT FALSE,
        certifications JSONB DEFAULT '[]'::jsonb,
        certification_academy VARCHAR(255),
        introduction_video_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE programs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        total_sessions INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE customer_programs (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        total_sessions INTEGER NOT NULL,
        remaining_sessions INTEGER NOT NULL,
        postpone_limit INTEGER NOT NULL DEFAULT 2,
        postponed_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (customer_id, program_id)
      );

      CREATE TABLE trainer_customer_mapping (
        id SERIAL PRIMARY KEY,
        trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
        customer_id INTEGER UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE sessions (
        id SERIAL PRIMARY KEY,
        trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled','Completed','Cancelled','Postponed','Missed')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE attendance (
        id SERIAL PRIMARY KEY,
        session_id INTEGER UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
        mark_in_time TIMESTAMP,
        mark_out_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE pause_requests (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
        pause_until_date DATE NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tables created successfully.');

    // 2. Insert Dummy Data
    console.log('Inserting dummy data...');

    // Admin
    await pool.query(`INSERT INTO users (name, email, password, role) VALUES ('Admin Admin', 'admin@fitness.com', 'admin123', 'admin')`);

    // Trainer
    const trainerUserRes = await pool.query(`INSERT INTO users (name, email, password, role) VALUES ('Pro Trainer', 'trainer@fitness.com', 'trainer123', 'trainer') RETURNING id`);
    const trainerUserId = trainerUserRes.rows[0].id;

    const trainerRes = await pool.query(`
      INSERT INTO trainers (user_id, bio, experience, specialization, is_approved, certifications, certification_academy, introduction_video_url)
      VALUES ($1, 'Passionate trainer', 5, 'Weightlifting', TRUE, '["ACE", "NASM"]', 'Global Fitness', 'http://youtube.com/trainer')
      RETURNING id;
    `, [trainerUserId]);
    const trainerId = trainerRes.rows[0].id;

    // Customer
    const custUserRes = await pool.query(`INSERT INTO users (name, email, password, role) VALUES ('John Doe', 'customer@fitness.com', 'customer123', 'customer') RETURNING id`);
    const custUserId = custUserRes.rows[0].id;

    const custRes = await pool.query(`INSERT INTO customers (user_id, start_date) VALUES ($1, CURRENT_DATE) RETURNING id`, [custUserId]);
    const customerId = custRes.rows[0].id;

    // Program
    const progRes = await pool.query(`INSERT INTO programs (name, description, total_sessions) VALUES ('12 Week Transformation', 'Lose weight and build muscle', 12) RETURNING id`);
    const programId = progRes.rows[0].id;

    // Mapping
    await pool.query(`INSERT INTO trainer_customer_mapping (trainer_id, customer_id) VALUES ($1, $2)`, [trainerId, customerId]);

    // Enrollment
    await pool.query(`
      INSERT INTO customer_programs (customer_id, program_id, total_sessions, remaining_sessions, postpone_limit, postponed_used)
      VALUES ($1, $2, 12, 12, 2, 0)
    `, [customerId, programId]);

    console.log('✅ Dummy data successfully fully seeded.');
    console.log('--- Migration & Seeding Successful!! ---');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

setupAndSeed();
