const { validationResult } = require('express-validator');
const { pool } = require('../config/db');

// ─── POST /api/dashboard/session/mark ───────────────────
// Trainer marks a customer's session as completed or missed for today
const markSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const trainerId = req.user.trainerId;
    if (!trainerId) return res.status(403).json({ message: 'Only trainers can mark sessions.' });

    const { customer_id, status, session_date } = req.body;
    const date = session_date || new Date().toISOString().slice(0, 10);

    // Verify mapping
    const map = await pool.query(
      `SELECT 1 FROM trainer_customer_mapping WHERE trainer_id = $1 AND customer_id = $2`,
      [trainerId, customer_id]
    );
    if (map.rowCount === 0) return res.status(403).json({ message: 'Customer not assigned to you.' });

    const result = await pool.query(
      `INSERT INTO customer_sessions (customer_id, trainer_id, session_date, status, action_type)
       VALUES ($1, $2, $3, $4, 'normal')
       ON CONFLICT (customer_id, session_date)
       DO UPDATE SET status = EXCLUDED.status, action_type = 'normal'
       RETURNING *`,
      [customer_id, trainerId, date, status]
    );

    const counts = await getSessionCounts(customer_id);

    return res.json({
      session: result.rows[0],
      status: result.rows[0].status,
      customer_id,
      ...counts,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Shared helper: session counts (authoritative, always from DB) ─
async function getSessionCounts(customerId) {
  const r = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed')                         AS completed,
       COUNT(*) FILTER (WHERE status = 'missed' AND action_type = 'normal') AS missed,
       COUNT(*) FILTER (WHERE action_type = 'postponed')                    AS postponed,
       COUNT(*) FILTER (WHERE action_type = 'cancelled')                    AS cancelled
     FROM customer_sessions
     WHERE customer_id = $1`,
    [customerId]
  );
  const row = r.rows[0] || {};
  return {
    sessions_completed: parseInt(row.completed, 10) || 0,
    sessions_missed:    parseInt(row.missed, 10) || 0,
    sessions_postponed: parseInt(row.postponed, 10) || 0,
    sessions_cancelled: parseInt(row.cancelled, 10) || 0,
  };
}

// ─── Shared helper: validate 8 PM-previous-day cutoff for customer actions ─
function canModifySession(sessionDateStr) {
  // sessionDateStr is 'YYYY-MM-DD'. Cutoff = 20:00 local time on (session_date - 1 day).
  const [y, m, d] = sessionDateStr.split('-').map(Number);
  const cutoff = new Date(y, m - 1, d - 1, 20, 0, 0, 0);
  return Date.now() < cutoff.getTime();
}

// ─── Shared helper: find customer's trainer via mapping ─
async function findTrainerIdForCustomer(customerId) {
  const r = await pool.query(
    `SELECT trainer_id FROM trainer_customer_mapping WHERE customer_id = $1`,
    [customerId]
  );
  return r.rows[0]?.trainer_id || null;
}

// ─── POST /api/dashboard/session/postpone (customer) ─────
const postponeSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const customerId = req.user.customerId;
    if (!customerId) return res.status(403).json({ message: 'Only customers can postpone sessions.' });

    const { session_date } = req.body;
    const date = session_date || (() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return t.toISOString().slice(0, 10);
    })();

    if (!canModifySession(date)) {
      return res.status(400).json({ message: 'Session can only be modified before 8 PM of previous day' });
    }

    // Check postpone limit
    const limitRes = await pool.query(
      `SELECT postpone_limit FROM customers WHERE id = $1`, [customerId]
    );
    const postponeLimit = limitRes.rows[0]?.postpone_limit ?? 2;

    const usedRes = await pool.query(
      `SELECT COUNT(*) AS used FROM customer_sessions
       WHERE customer_id = $1 AND action_type = 'postponed'`,
      [customerId]
    );
    const postponedCount = parseInt(usedRes.rows[0].used, 10) || 0;
    if (postponedCount >= postponeLimit) {
      return res.status(400).json({ message: 'You have reached your postpone limit' });
    }

    const trainerId = await findTrainerIdForCustomer(customerId);
    if (!trainerId) return res.status(400).json({ message: 'No trainer assigned to you.' });

    const result = await pool.query(
      `INSERT INTO customer_sessions (customer_id, trainer_id, session_date, status, action_type)
       VALUES ($1, $2, $3, 'missed', 'postponed')
       ON CONFLICT (customer_id, session_date)
       DO UPDATE SET status = 'missed', action_type = 'postponed'
       RETURNING *`,
      [customerId, trainerId, date]
    );

    const counts = await getSessionCounts(customerId);
    return res.json({ session: result.rows[0], status: 'missed', customer_id: customerId, ...counts });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/dashboard/session/cancel (customer) ───────
const cancelSessionController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const customerId = req.user.customerId;
    if (!customerId) return res.status(403).json({ message: 'Only customers can cancel sessions.' });

    const { session_date } = req.body;
    const date = session_date || (() => {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return t.toISOString().slice(0, 10);
    })();

    if (!canModifySession(date)) {
      return res.status(400).json({ message: 'Session can only be modified before 8 PM of previous day' });
    }

    const trainerId = await findTrainerIdForCustomer(customerId);
    if (!trainerId) return res.status(400).json({ message: 'No trainer assigned to you.' });

    const result = await pool.query(
      `INSERT INTO customer_sessions (customer_id, trainer_id, session_date, status, action_type)
       VALUES ($1, $2, $3, 'missed', 'cancelled')
       ON CONFLICT (customer_id, session_date)
       DO UPDATE SET status = 'missed', action_type = 'cancelled'
       RETURNING *`,
      [customerId, trainerId, date]
    );

    const counts = await getSessionCounts(customerId);
    return res.json({ session: result.rows[0], status: 'missed', customer_id: customerId, ...counts });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/dashboard/progress/add ───────────────────
// Trainer adds/updates progress for a customer (upsert on customer_id + log_date)
const addProgressController = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const trainerId = req.user.trainerId;
    if (!trainerId) return res.status(403).json({ message: 'Only trainers can update progress.' });

    const { customer_id, log_date, ...fields } = req.body;
    const date = log_date || new Date().toISOString().slice(0, 10);

    // Verify mapping
    const map = await client.query(
      `SELECT 1 FROM trainer_customer_mapping WHERE trainer_id = $1 AND customer_id = $2`,
      [trainerId, customer_id]
    );
    if (map.rowCount === 0) {
      client.release();
      return res.status(403).json({ message: 'Customer not assigned to you.' });
    }

    await client.query('BEGIN');

    // Check if existing row exists for this date
    const existing = await client.query(
      `SELECT * FROM customer_progress WHERE customer_id = $1 AND log_date = $2`,
      [customer_id, date]
    );

    const trainerRes = await client.query(`SELECT name, mobileno FROM trainers WHERE id = $1`, [trainerId]);
    const modifiedBy = trainerRes.rows[0]?.name || trainerRes.rows[0]?.mobileno || `trainer:${trainerId}`;

    if (existing.rowCount > 0) {
      // Snapshot old row into history
      const old = existing.rows[0];
      await client.query(
        `INSERT INTO customer_progress_history (
          progress_id, customer_id, trainer_id, log_date,
          weight, neck, chest, upper_waist, lower_waist, hips, arms, thighs,
          pushups, plank_seconds, squats, lunges, deadlift, latpulldown, chest_press, shoulder_press,
          cycling_time, cycling_distance, jumping_jacks, burpees, high_knees, mountain_climbers, skipping,
          sit_and_reach, deep_squat_hold, hip_flexor_hold, shoulder_mobility, bridge_hold,
          diet_compliance, meals_per_day, protein_intake, water_intake, junk_food_per_week,
          steps_per_day, steps_source, sleep_hours, trainer_note,
          modifiedon, modifiedby
        ) SELECT
          id, customer_id, trainer_id, log_date,
          weight, neck, chest, upper_waist, lower_waist, hips, arms, thighs,
          pushups, plank_seconds, squats, lunges, deadlift, latpulldown, chest_press, shoulder_press,
          cycling_time, cycling_distance, jumping_jacks, burpees, high_knees, mountain_climbers, skipping,
          sit_and_reach, deep_squat_hold, hip_flexor_hold, shoulder_mobility, bridge_hold,
          diet_compliance, meals_per_day, protein_intake, water_intake, junk_food_per_week,
          steps_per_day, steps_source, sleep_hours, trainer_note,
          NOW(), $2
        FROM customer_progress WHERE id = $1`,
        [old.id, modifiedBy]
      );
    }

    // Build column list for upsert
    const PROGRESS_COLS = [
      'weight','neck','chest','upper_waist','lower_waist','hips','arms','thighs',
      'pushups','plank_seconds','squats','lunges','deadlift','latpulldown','chest_press','shoulder_press',
      'cycling_time','cycling_distance','jumping_jacks','burpees','high_knees','mountain_climbers','skipping',
      'sit_and_reach','deep_squat_hold','hip_flexor_hold','shoulder_mobility','bridge_hold',
      'diet_compliance','meals_per_day','protein_intake','water_intake','junk_food_per_week',
      'steps_per_day','sleep_hours','trainer_note',
    ];

    // Upsert
    const setCols = PROGRESS_COLS.map(c => `${c} = EXCLUDED.${c}`).join(', ');
    const colNames = ['customer_id', 'trainer_id', 'log_date', ...PROGRESS_COLS];
    const vals = [
      customer_id, trainerId, date,
      ...PROGRESS_COLS.map(c => fields[c] !== undefined && fields[c] !== '' ? fields[c] : null),
    ];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

    const result = await client.query(
      `INSERT INTO customer_progress (${colNames.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT (customer_id, log_date)
       DO UPDATE SET ${setCols}, updated_at = NOW()
       RETURNING *`,
      vals
    );

    await client.query('COMMIT');
    return res.json({ progress: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

// ─── POST /api/dashboard/health/steps/sync ──────────────
// Mobile app syncs step count from Health Connect / HealthKit
const syncStepsController = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const customerId = req.user.customerId;
    if (!customerId) return res.status(403).json({ message: 'Only customers can sync steps.' });

    const { steps_per_day, date } = req.body;
    const logDate = date || new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `INSERT INTO customer_progress (customer_id, log_date, steps_per_day, steps_source)
       VALUES ($1, $2, $3, 'api')
       ON CONFLICT (customer_id, log_date)
       DO UPDATE SET steps_per_day = $3, steps_source = 'api', updated_at = NOW()
       RETURNING id, customer_id, log_date, steps_per_day, steps_source`,
      [customerId, logDate, steps_per_day]
    );

    return res.json({ progress: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/customer/:id ────────────────────
// Dashboard analytics for a customer (used by both customer and trainer)
const getCustomerDashboardController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Streak — consecutive completed sessions ending today or yesterday
    const sessionsRes = await pool.query(
      `SELECT session_date, status FROM customer_sessions
       WHERE customer_id = $1 ORDER BY session_date DESC LIMIT 90`,
      [id]
    );
    const sessions = sessionsRes.rows;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].status !== 'completed') break;
      const sd = new Date(sessions[i].session_date);
      sd.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      // Allow streak to start from yesterday if no entry today
      if (i === 0 && sd.getTime() !== today.getTime()) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (sd.getTime() === yesterday.getTime()) {
          streak++;
          continue;
        } else {
          break;
        }
      }
      if (sd.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    // Session counts (last 30 days)
    const countsRes = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='completed') AS completed,
         COUNT(*) FILTER (WHERE status='missed') AS missed
       FROM customer_sessions
       WHERE customer_id = $1 AND session_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [id]
    );
    const sessionCounts = countsRes.rows[0];

    // 2. Steps — today + last 7 days trend
    const stepsRes = await pool.query(
      `SELECT log_date, steps_per_day FROM customer_progress
       WHERE customer_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY log_date ASC`,
      [id]
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySteps = stepsRes.rows.find(r =>
      new Date(r.log_date).toISOString().slice(0, 10) === todayStr
    );

    // 3. Latest progress (weight, waist trend)
    const trendRes = await pool.query(
      `SELECT log_date, weight, upper_waist, lower_waist FROM customer_progress
       WHERE customer_id = $1 ORDER BY log_date DESC LIMIT 10`,
      [id]
    );

    // 4. Latest trainer_note
    const noteRes = await pool.query(
      `SELECT trainer_note, log_date FROM customer_progress
       WHERE customer_id = $1 AND trainer_note IS NOT NULL
       ORDER BY log_date DESC LIMIT 1`,
      [id]
    );

    // 5. Today's session status
    const todaySessionRes = await pool.query(
      `SELECT status FROM customer_sessions
       WHERE customer_id = $1 AND session_date = CURRENT_DATE`,
      [id]
    );

    // 6. Customer details (static info + payment)
    const customerRes = await pool.query(
      `SELECT id, name, mobile, address, upload_photo, weight, height,
              fitness_goal, daily_routine, medical_conditions, smoking,
              alcohol_frequency, dietary_preference, special_focus,
              program_enrolled, amount_paid, total_sessions, start_date, age,
              postpone_limit
       FROM customers WHERE id = $1`,
      [id]
    );
    const customer_details = customerRes.rows[0] || null;

    // 7. Latest progress row
    const latestProgRes = await pool.query(
      `SELECT * FROM customer_progress
       WHERE customer_id = $1 ORDER BY log_date DESC LIMIT 1`,
      [id]
    );
    const latest_progress = latestProgRes.rows[0] || null;

    // 8. All-time session counts (authoritative, by action_type)
    const allCounts = await getSessionCounts(id);
    const sessions_completed = allCounts.sessions_completed;
    const total_sessions = customer_details?.total_sessions || 0;
    const sessions_remaining = Math.max(total_sessions - sessions_completed, 0);
    const postpone_limit = customer_details?.postpone_limit ?? 2;

    return res.json({
      streak,
      sessions: {
        completed: parseInt(sessionCounts.completed) || 0,
        missed: parseInt(sessionCounts.missed) || 0,
      },
      steps_today: todaySteps?.steps_per_day || null,
      steps_trend: stepsRes.rows,
      weight_trend: trendRes.rows.reverse(),
      latest_note: noteRes.rows[0] || null,
      today_session: todaySessionRes.rows[0]?.status || null,
      customer_details,
      latest_progress,
      sessions_completed,
      sessions_missed: allCounts.sessions_missed,
      sessions_postponed: allCounts.sessions_postponed,
      sessions_cancelled: allCounts.sessions_cancelled,
      sessions_remaining,
      total_sessions,
      postpone_limit,
      amount_paid: customer_details?.amount_paid || null,
      start_date: customer_details?.start_date || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/progress/:customerId ────────────
// Get latest progress row for a customer (used by trainer form pre-fill)
const getLatestProgressController = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const result = await pool.query(
      `SELECT * FROM customer_progress
       WHERE customer_id = $1 ORDER BY log_date DESC LIMIT 1`,
      [customerId]
    );
    return res.json({ progress: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/dashboard/sessions/today/:trainerId ───────
// Get today's session statuses for all of a trainer's customers
const getTodaySessionsController = async (req, res, next) => {
  try {
    const { trainerId } = req.params;
    const result = await pool.query(
      `SELECT cs.customer_id, cs.status
       FROM customer_sessions cs
       WHERE cs.trainer_id = $1 AND cs.session_date = CURRENT_DATE`,
      [trainerId]
    );
    const map = {};
    result.rows.forEach(r => { map[r.customer_id] = r.status; });
    return res.json({ sessions: map });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  markSessionController,
  postponeSessionController,
  cancelSessionController,
  addProgressController,
  syncStepsController,
  getCustomerDashboardController,
  getLatestProgressController,
  getTodaySessionsController,
};
