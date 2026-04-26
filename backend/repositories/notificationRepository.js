// Pure DB layer for notifications. No business logic, no event handling.
const { query } = require('../config/db');

const insertNotification = async ({
  recipientUserId,
  recipientRole,
  actorUserId = null,
  type,
  message,
  referenceTable = null,
  referenceId = null,
  metadata = null,
}) => {
  // ON CONFLICT DO NOTHING enforces idempotency at the DB layer — the unique
  // index on (recipient_user_id, type, reference_table, reference_id) means a
  // double-click cannot produce a duplicate row even if the event fires twice.
  const result = await query(
    `INSERT INTO notifications
       (recipient_user_id, recipient_role, actor_user_id, type, message,
        reference_table, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (recipient_user_id, type, reference_table, reference_id)
     DO NOTHING
     RETURNING *`,
    [
      recipientUserId,
      recipientRole,
      actorUserId,
      type,
      message,
      referenceTable,
      referenceId,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return result.rows[0] || null;
};

const listForRecipient = async ({ recipientUserId, limit = 50, onlyUnread = false }) => {
  const where = ['recipient_user_id = $1'];
  const params = [recipientUserId];
  if (onlyUnread) where.push('is_read = false');
  params.push(limit);

  const result = await query(
    `SELECT id, recipient_user_id, recipient_role, actor_user_id, type, message,
            reference_table, reference_id, metadata, is_read, read_at, created_at
       FROM notifications
      WHERE ${where.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params
  );
  return result.rows;
};

const countUnread = async (recipientUserId) => {
  const result = await query(
    `SELECT COUNT(*)::int AS unread
       FROM notifications
      WHERE recipient_user_id = $1 AND is_read = false`,
    [recipientUserId]
  );
  return result.rows[0]?.unread || 0;
};

const markRead = async ({ recipientUserId, notificationId }) => {
  const result = await query(
    `UPDATE notifications
        SET is_read = true, read_at = NOW()
      WHERE id = $1 AND recipient_user_id = $2 AND is_read = false
      RETURNING *`,
    [notificationId, recipientUserId]
  );
  return result.rows[0] || null;
};

const markAllRead = async (recipientUserId) => {
  const result = await query(
    `UPDATE notifications
        SET is_read = true, read_at = NOW()
      WHERE recipient_user_id = $1 AND is_read = false`,
    [recipientUserId]
  );
  return result.rowCount;
};

module.exports = {
  insertNotification,
  listForRecipient,
  countUnread,
  markRead,
  markAllRead,
};
