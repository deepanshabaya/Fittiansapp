-- =============================================================
-- FITNESS APP — PostgreSQL Schema
-- =============================================================
-- Run this file to create all tables:
--   psql -U postgres -d fitnessapp -f schema.sql
-- =============================================================

-- 1. Users (login / auth)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'trainer', 'customer')),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Trainers (linked 1-to-1 with a user row where role = 'trainer')
CREATE TABLE IF NOT EXISTS trainers (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio                     TEXT,
  experience              INTEGER DEFAULT 0,
  specialization          VARCHAR(255),
  certifications          JSONB DEFAULT '[]',
  certification_academy   VARCHAR(255),
  introduction_video_url  TEXT,
  is_approved             BOOLEAN DEFAULT FALSE,
  approved_at             TIMESTAMP,
  rejected_at             TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW()
);

-- 3. Customers (linked 1-to-1 with a user row where role = 'customer')
CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Programs (fitness plans)
CREATE TABLE IF NOT EXISTS programs (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  total_sessions INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- 5. Customer ↔ Program enrollment
CREATE TABLE IF NOT EXISTS customer_programs (
  id                SERIAL PRIMARY KEY,
  customer_id       INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  program_id        INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  total_sessions    INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  postpone_limit    INTEGER NOT NULL DEFAULT 2,
  postponed_used    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, program_id)
);

-- 6. Trainer ↔ Customer mapping (1 customer → 1 trainer)
CREATE TABLE IF NOT EXISTS trainer_customer_mapping (
  id          SERIAL PRIMARY KEY,
  trainer_id  INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  customer_id INTEGER UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- 7. Sessions (individual training sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id           SERIAL PRIMARY KEY,
  trainer_id   INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  program_id   INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                 CHECK (status IN ('Scheduled','Completed','Cancelled','Postponed','Missed')),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- 8. Attendance (1 row per session)
CREATE TABLE IF NOT EXISTS attendance (
  id            SERIAL PRIMARY KEY,
  session_id    INTEGER UNIQUE NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  trainer_id    INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  mark_in_time  TIMESTAMP,
  mark_out_time TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 9. Pause requests
CREATE TABLE IF NOT EXISTS pause_requests (
  id              SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  program_id      INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  pause_until_date DATE NOT NULL,
  reason          TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending'
                    CHECK (status IN ('Pending','Approved','Rejected')),
  reviewed_at     TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- =============================================================
-- Seed: create one admin user (password: admin123)
-- The hash below is bcrypt('admin123', 10)
-- =============================================================
-- INSERT INTO users (email, password_hash, role) VALUES
--   ('admin@fitnessapp.com', '$2a$10$XXXX...replace_with_real_hash', 'admin');
