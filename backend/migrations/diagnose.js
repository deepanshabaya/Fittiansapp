/**
 * Diagnostic script — checks current customers table columns
 * and tests program_enrolled column.
 *
 * Run: node backend/migrations/diagnose.js
 */
const { pool } = require('../config/db');

const diagnose = async () => {
  try {
    console.log('=== Database Diagnostic ===\n');

    // 1. Check which columns exist on the customers table
    const colResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'customers'
      ORDER BY ordinal_position;
    `);

    console.log('--- Customers Table Columns ---');
    colResult.rows.forEach((col) => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} nullable=${col.is_nullable}`);
    });

    const columnNames = colResult.rows.map((r) => r.column_name);
    console.log(`\nTotal columns: ${columnNames.length}\n`);

    // 2. Check if program_enrolled exists
    if (columnNames.includes('program_enrolled')) {
      console.log('✅ program_enrolled column EXISTS');
    } else {
      console.log('❌ program_enrolled column MISSING — run: node backend/migrations/add_program_enrolled.js');
    }

    // 3. Check other new columns from previous migration
    const expectedNew = [
      'age', 'daily_routine', 'medical_conditions', 'fitness_goal',
      'smoking', 'alcohol_frequency', 'dietary_preference', 'special_focus',
    ];
    const missing = expectedNew.filter((c) => !columnNames.includes(c));
    if (missing.length) {
      console.log(`❌ Missing health columns: ${missing.join(', ')}`);
      console.log('  Run: node backend/migrations/add_customer_health_fields.js');
    } else {
      console.log('✅ All health & lifestyle columns present');
    }

    // 4. Check expected basic columns the controller INSERTs into
    const basicExpected = [
      'user_id', 'name', 'mobile', 'address', 'total_sessions',
      'upload_photo', 'weight', 'height', 'amount_paid', 'amount_paid_on', 'start_date',
    ];
    const missingBasic = basicExpected.filter((c) => !columnNames.includes(c));
    if (missingBasic.length) {
      console.log(`\n❌ CRITICAL: These basic columns are MISSING from the DB:`);
      console.log(`  ${missingBasic.join(', ')}`);
      console.log('  The createUserController INSERT will fail with a column error.');
      console.log('  These columns are used in code but may not exist in the schema.');
      console.log('  You need to add them manually or via migration.\n');
    } else {
      console.log('✅ All basic customer columns present');
    }

    // 5. Check constraints on program_enrolled
    if (columnNames.includes('program_enrolled')) {
      const constraintResult = await pool.query(`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'customers'::regclass
          AND pg_get_constraintdef(oid) LIKE '%program_enrolled%';
      `);
      if (constraintResult.rows.length) {
        console.log('\n--- program_enrolled CHECK constraint ---');
        constraintResult.rows.forEach((c) => {
          console.log(`  ${c.conname}: ${c.definition}`);
        });
      } else {
        console.log('\n⚠️  No CHECK constraint found on program_enrolled');
      }

      // 6. Test INSERT and ROLLBACK with program_enrolled
      console.log('\n--- Testing program_enrolled INSERT (dry run) ---');
      try {
        await pool.query('BEGIN');
        const testResult = await pool.query(`
          INSERT INTO customers (user_id, name, program_enrolled)
          VALUES (99999, 'DIAGNOSTIC_TEST', 'my_home_coach')
          RETURNING id, program_enrolled;
        `);
        console.log('✅ Test INSERT succeeded:', testResult.rows[0]);
        await pool.query('ROLLBACK');
        console.log('  (rolled back — no data persisted)');
      } catch (insertErr) {
        await pool.query('ROLLBACK');
        console.log('❌ Test INSERT failed:', insertErr.message);
      }
    }

    // 7. Count existing customers
    const countResult = await pool.query('SELECT COUNT(*) FROM customers');
    console.log(`\nTotal customers in DB: ${countResult.rows[0].count}`);

    console.log('\n=== Diagnostic Complete ===');
  } catch (err) {
    console.error('Diagnostic failed:', err.message);
  } finally {
    pool.end();
  }
};

diagnose();
