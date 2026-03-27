const { pool } = require('../config/db');

const migrate = async () => {
  try {
    console.log('Starting Phase 1 database migration...');
    
    // 1. Alter trainers table
    await pool.query(`
      ALTER TABLE trainers
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS certification_academy VARCHAR(255),
      ADD COLUMN IF NOT EXISTS introduction_video_url VARCHAR(255);
    `);
    console.log('Added missing columns to trainers table.');
    
    // 2. We can automatically approve existing trainers to prevent locking them out
    await pool.query(`
      UPDATE trainers SET is_approved = TRUE WHERE is_approved = FALSE;
    `);
    console.log('Auto-approved existing trainers for backward compatibility.');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
};

migrate();
