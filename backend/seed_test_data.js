const { pool } = require('./config/db');

async function seedTestData() {
  console.log('--- Starting Test Data Seeding ---');
  try {
    // 1. Approve all trainers
    await pool.query(`UPDATE trainers SET is_approved = TRUE`);
    console.log('✅ Approved all trainers.');

    // 2. Ensure a Program exists
    let programData = await pool.query(`SELECT id FROM programs LIMIT 1`);
    let programId;
    if (programData.rows.length === 0) {
      const newProgram = await pool.query(
        `INSERT INTO programs (name, description, total_sessions) VALUES ('Test Weight Loss', '12 Week Program', 12) RETURNING id`
      );
      programId = newProgram.rows[0].id;
      console.log('✅ Created mock Program.');
    } else {
      programId = programData.rows[0].id;
      console.log('✅ Found existing Program.');
    }

    // 3. Map all unassigned customers to the first trainer
    const firstTrainer = await pool.query(`SELECT id FROM trainers LIMIT 1`);
    if (firstTrainer.rows.length > 0) {
      const trainerId = firstTrainer.rows[0].id;
      
      const customers = await pool.query(`SELECT id FROM customers`);
      for (let cust of customers.rows) {
        // Map Trainer
        await pool.query(
          `INSERT INTO trainer_customer_mapping (trainer_id, customer_id) VALUES ($1, $2) ON CONFLICT (customer_id) DO NOTHING`,
          [trainerId, cust.id]
        );
        
        // Enroll in Program with 12 total sessions, and Postpone limit of 3
        await pool.query(
          `INSERT INTO customer_programs (customer_id, program_id, total_sessions, remaining_sessions, postpone_limit, postponed_used) 
           VALUES ($1, $2, 12, 12, 3, 0)
           ON CONFLICT DO NOTHING`,
          [cust.id, programId]
        );
      }
      console.log(`✅ Assigned all customers to Trainer #${trainerId} and enrolled in Program #${programId}.`);
    } else {
      console.log('⚠️ No trainers found! Please register a Trainer first in the app.');
    }

    console.log('--- Seeding Completed Successfully! ---');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    pool.end();
  }
}

seedTestData();
